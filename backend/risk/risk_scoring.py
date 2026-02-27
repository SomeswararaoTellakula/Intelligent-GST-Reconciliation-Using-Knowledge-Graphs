import os
from typing import Tuple
from neo4j import GraphDatabase
from loguru import logger

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "neo4j")
DB = os.getenv("NEO4J_DB", "neo4j")


def _normalize(value: float, min_v: float, max_v: float) -> float:
    if max_v == min_v:
        return 0.0
    return max(0.0, min(1.0, (value - min_v) / (max_v - min_v)))


def _bounded100(v: float) -> float:
    return round(max(0.0, min(100.0, v * 100.0)), 2)


def compute_taxpayer_risk():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session(database=DB) as session:
        logger.info("Computing mismatch counts per taxpayer")
        mismatch_counts = {
            rec["gstin"]: rec["mc"]
            for rec in session.run(
                """
                MATCH (t:Taxpayer)-[:ISSUED]->(i:Invoice)
                WHERE COALESCE(i.mismatch_flag,false) = true
                RETURN t.gstin AS gstin, count(i) AS mc
                """
            )
        }
        min_m = 0
        max_m = max(mismatch_counts.values()) if mismatch_counts else 1

        logger.info("Computing cluster mismatch counts")
        cluster_counts = {
            rec["cluster"]: rec["mc"]
            for rec in session.run(
                """
                MATCH (t:Taxpayer)-[:ISSUED]->(i:Invoice)
                WHERE COALESCE(i.mismatch_flag,false) = true AND exists(t.cluster_id)
                RETURN t.cluster_id AS cluster, count(i) AS mc
                """
            )
        }
        min_c = 0
        max_c = max(cluster_counts.values()) if cluster_counts else 1

        logger.info("Computing tax default flag")
        defaults = {
            rec["gstin"]: rec["df"]
            for rec in session.run(
                """
                MATCH (t:Taxpayer)
                OPTIONAL MATCH (t)-[:ISSUED]->(:Invoice)-[:REPORTED_IN]->(r:Return)
                WITH t, collect(DISTINCT r.status) AS statuses
                RETURN t.gstin AS gstin, CASE WHEN any(s IN statuses WHERE s='DEFAULT') THEN 1 ELSE 0 END AS df
                """
            )
        }

        logger.info("Fetch pagerank and degree ranges")
        pr_values = [rec["score"] for rec in session.run("MATCH (t:Taxpayer) WHERE exists(t.pagerank_score) RETURN t.pagerank_score AS score")]
        deg_values = [rec["score"] for rec in session.run("MATCH (t:Taxpayer) WHERE exists(t.degree_centrality) RETURN t.degree_centrality AS score")]
        pr_min, pr_max = (min(pr_values), max(pr_values)) if pr_values else (0.0, 1.0)
        deg_min, deg_max = (min(deg_values), max(deg_values)) if deg_values else (0.0, 1.0)

        logger.info("Compute and store taxpayer risk_score")
        result = session.run("MATCH (t:Taxpayer) RETURN t.gstin AS gstin, t.pagerank_score AS pr, t.degree_centrality AS deg, t.cluster_id AS cluster")
        for rec in result:
            gstin = rec["gstin"]
            pr_n = _normalize(rec.get("pr", 0.0) or 0.0, pr_min, pr_max)
            deg_n = _normalize(rec.get("deg", 0.0) or 0.0, deg_min, deg_max)
            mm_n = _normalize(mismatch_counts.get(gstin, 0), min_m, max_m)
            cl_count = cluster_counts.get(rec.get("cluster", -1), 0)
            cl_n = _normalize(cl_count, min_c, max_c)
            df_flag = defaults.get(gstin, 0)

            risk = (
                0.35 * mm_n +
                0.25 * pr_n +
                0.15 * deg_n +
                0.15 * cl_n +
                0.10 * (1.0 if df_flag else 0.0)
            )
            session.run(
                "MATCH (t:Taxpayer {gstin: $gstin}) SET t.risk_score = $score, t.risk_band = CASE WHEN $score < 40 THEN 'LOW' WHEN $score < 71 THEN 'MEDIUM' ELSE 'HIGH' END",
                gstin=gstin,
                score=_bounded100(risk),
            )
        logger.info("Taxpayer risk_score updated")


def compute_invoice_risk():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session(database=DB) as session:
        logger.info("Compute mismatch normalization range")
        mm_values = [rec["mc"] for rec in session.run("MATCH (i:Invoice) WHERE COALESCE(i.mismatch_flag,false)=true RETURN count(i) AS mc")]
        mm_min, mm_max = (0, max(mm_values) if mm_values else 1)

        logger.info("Set invoice mismatch flags based on reconciliation")
        # Mismatch: missing REPORTED_IN edge, tax amount discrepancy, missing CLAIMED_BY
        session.run(
            """
            MATCH (s:Taxpayer)-[:ISSUED]->(i:Invoice)
            OPTIONAL MATCH (i)-[:CLAIMED_BY]->(b:Taxpayer)
            OPTIONAL MATCH (i)-[:REPORTED_IN]->(r:Return)
            WITH s, i, b, r,
                 CASE WHEN r IS NULL THEN true ELSE false END AS missing_return,
                 CASE WHEN b IS NULL THEN true ELSE false END AS missing_claim,
                 i.tax_amount AS tax_amt
            SET i.mismatch_flag = (missing_return OR missing_claim)
            """
        )

        logger.info("Compute invoice risk by combining mismatch and counterpart risk")
        result = session.run(
            """
            MATCH (s:Taxpayer)-[:ISSUED]->(i:Invoice)
            OPTIONAL MATCH (i)-[:CLAIMED_BY]->(b:Taxpayer)
            RETURN i.invoice_id AS iid, COALESCE(i.mismatch_flag,false) AS mismatch,
                   COALESCE(s.risk_score,0) AS srisk, COALESCE(b.risk_score,0) AS brisk
            """
        )
        for rec in result:
            mm_n = 1.0 if rec["mismatch"] else 0.0
            prisk = _normalize((rec["srisk"] + rec["brisk"]) / 2.0, 0.0, 100.0)
            risk = 0.6 * mm_n + 0.4 * prisk
            score = _bounded100(risk)
            band = "LOW" if score < 40 else ("MEDIUM" if score < 71 else "HIGH")
            session.run(
                "MATCH (i:Invoice {invoice_id: $iid}) SET i.risk_score = $score, i.risk_band = $band",
                iid=rec["iid"],
                score=score,
                band=band,
            )
        logger.info("Invoice risk_score updated")


if __name__ == "__main__":
    compute_taxpayer_risk()
    compute_invoice_risk()
