import csv
import os
from datetime import datetime
from typing import Dict, Any

from neo4j import GraphDatabase, Transaction
from pymongo import MongoClient
from loguru import logger


NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "neo4j")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "gstkg")

DATA_PATH = os.getenv("GST_DATA_PATH", os.path.join(os.path.dirname(__file__), "../mock/mock_data.csv"))


def _merge_taxpayer(tx: Transaction, row: Dict[str, Any]):
    tx.run(
        """
        MERGE (s:Taxpayer {gstin: $seller_gstin})
        ON CREATE SET s.name = $seller_name, s.state = $seller_state, s.compliance_score = 0.0, s.risk_score = 0.0
        ON MATCH SET s.name = COALESCE($seller_name, s.name), s.state = COALESCE($seller_state, s.state)
        MERGE (b:Taxpayer {gstin: $buyer_gstin})
        ON CREATE SET b.name = $buyer_name, b.state = $buyer_state, b.compliance_score = 0.0, b.risk_score = 0.0
        ON MATCH SET b.name = COALESCE($buyer_name, b.name), b.state = COALESCE($buyer_state, b.state)
        MERGE (s)-[:SELLS_TO]->(b)
        """,
        seller_gstin=row["seller_gstin"],
        seller_name=row.get("seller_name"),
        seller_state=row.get("seller_state"),
        buyer_gstin=row["buyer_gstin"],
        buyer_name=row.get("buyer_name"),
        buyer_state=row.get("buyer_state"),
    )


def _merge_invoice(tx: Transaction, row: Dict[str, Any]):
    tx.run(
        """
        MATCH (s:Taxpayer {gstin: $seller_gstin})
        MATCH (b:Taxpayer {gstin: $buyer_gstin})
        MERGE (i:Invoice {invoice_id: $invoice_id})
        ON CREATE SET i.tax_amount = $tax_amount, i.claimed_tax_amount = $claimed_tax_amount, i.invoice_date = date($invoice_date), i.mismatch_flag = false, i.risk_score = 0.0
        ON MATCH SET i.tax_amount = COALESCE($tax_amount, i.tax_amount), i.claimed_tax_amount = COALESCE($claimed_tax_amount, i.claimed_tax_amount), i.invoice_date = COALESCE(date($invoice_date), i.invoice_date)
        MERGE (s)-[:ISSUED]->(i)
        MERGE (i)-[:CLAIMED_BY]->(b)
        """,
        seller_gstin=row["seller_gstin"],
        buyer_gstin=row["buyer_gstin"],
        invoice_id=row["invoice_id"],
        tax_amount=float(row["tax_amount"]),
        claimed_tax_amount=float(row["claimed_tax_amount"]) if row.get("claimed_tax_amount") else None,
        invoice_date=row["invoice_date"],
    )


def _merge_return(tx: Transaction, row: Dict[str, Any]):
    if not row.get("return_id"):
        return
    tx.run(
        """
        MERGE (r:Return {return_id: $return_id})
        ON CREATE SET r.filing_date = date($filing_date), r.status = $status
        ON MATCH SET r.filing_date = COALESCE(date($filing_date), r.filing_date), r.status = COALESCE($status, r.status)
        WITH r
        MATCH (i:Invoice {invoice_id: $invoice_id})
        MERGE (i)-[:REPORTED_IN]->(r)
        """,
        return_id=row["return_id"],
        filing_date=row.get("filing_date"),
        status=row.get("status"),
        invoice_id=row["invoice_id"],
    )


def ingest(csv_path: str = DATA_PATH):
    logger.info(f"Starting ingestion from {csv_path}")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    mongo = MongoClient(MONGO_URI)
    mdb = mongo[MONGO_DB]
    audit_collection = mdb["ingestion_audit"]

    counters = {"taxpayers": set(), "invoices": set(), "returns": set(), "relationships": 0}

    with driver.session(database=os.getenv("NEO4J_DB", "neo4j")) as session, open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        batch = []
        batch_size = 500

        def process_row(row):
            session.execute_write(_merge_taxpayer, row)
            session.execute_write(_merge_invoice, row)
            session.execute_write(_merge_return, row)
            counters["taxpayers"].add(row["seller_gstin"])
            counters["taxpayers"].add(row["buyer_gstin"])
            counters["invoices"].add(row["invoice_id"])
            if row.get("return_id"):
                counters["returns"].add(row["return_id"])
            counters["relationships"] += 3 if row.get("return_id") else 2

        for row in reader:
            batch.append(row)
            if len(batch) >= batch_size:
                for r in batch:
                    process_row(r)
                batch.clear()
        if batch:
            for r in batch:
                process_row(r)

    summary = {
        "timestamp": datetime.utcnow(),
        "taxpayers": len(counters["taxpayers"]),
        "invoices": len(counters["invoices"]),
        "returns": len(counters["returns"]),
        "relationships": counters["relationships"],
        "source": os.path.basename(csv_path),
    }
    audit_collection.insert_one(summary)
    logger.info(f"Ingestion complete: {summary}")


if __name__ == "__main__":
    ingest()
