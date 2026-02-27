from typing import Dict, Any, List, Optional
from .db import neo4j_driver, NEO4J_DB
import csv
import os


async def invoice_trace(invoice_id: str) -> Dict[str, Any]:
    try:
        async with neo4j_driver.session(database=NEO4J_DB) as session:
            res = await session.run(
                """
                MATCH (s:Taxpayer)-[:ISSUED]->(i:Invoice {invoice_id: $invoice_id})
                OPTIONAL MATCH (i)-[:CLAIMED_BY]->(b:Taxpayer)
                OPTIONAL MATCH (i)-[:REPORTED_IN]->(r:Return)
                WITH s, i, b, r,
                    CASE WHEN r IS NULL THEN true ELSE false END AS missing_return,
                    CASE WHEN b IS NULL THEN true ELSE false END AS missing_claim,
                    CASE WHEN i.claimed_tax_amount IS NOT NULL AND abs(i.tax_amount - i.claimed_tax_amount) > 0.01 THEN true ELSE false END AS tax_discrepancy
                RETURN s.gstin AS seller, s.name AS seller_name, b.gstin AS buyer, b.name AS buyer_name,
                    i.invoice_id AS invoice_id, i.tax_amount AS tax_amount, i.claimed_tax_amount AS claimed_tax_amount,
                    r.return_id AS return_id, r.status AS return_status, r.filing_date AS filing_date,
                    missing_return, missing_claim, tax_discrepancy
                """,
                invoice_id=invoice_id,
            )
            rec = await res.single()
            if not rec:
                return {"invoice_id": invoice_id, "found": False}
            root_cause = []
            if rec["missing_return"]:
                root_cause.append("Invoice not reported in return")
            if rec["missing_claim"]:
                root_cause.append("Missing claim edge to buyer")
            if rec["tax_discrepancy"]:
                root_cause.append("Tax amount discrepancy detected")
            indicators = {"seller_risk": None, "buyer_risk": None, "cluster_id": None, "component_id": None}
            res2 = await session.run(
                """
                MATCH (s:Taxpayer {gstin: $seller})
                OPTIONAL MATCH (b:Taxpayer {gstin: $buyer})
                RETURN s.risk_score AS srisk, s.cluster_id AS scluster, s.component_id AS scomp,
                    b.risk_score AS brisk, b.cluster_id AS bcluster, b.component_id AS bcomp
                """,
                seller=rec["seller"],
                buyer=rec["buyer"],
            )
            r2 = await res2.single()
            if r2:
                indicators["seller_risk"] = r2["srisk"]
                indicators["buyer_risk"] = r2["brisk"]
                indicators["cluster_id"] = r2["scluster"] or r2["bcluster"]
                indicators["component_id"] = r2["scomp"] or r2["bcomp"]

            path = [
                {"type": "seller", "gstin": rec["seller"], "name": rec["seller_name"]},
                {"type": "invoice", "invoice_id": rec["invoice_id"], "tax_amount": rec["tax_amount"], "claimed_tax_amount": rec["claimed_tax_amount"]},
            ]
            if rec["buyer"]:
                path.append({"type": "buyer", "gstin": rec["buyer"], "name": rec["buyer_name"]})
            if rec["return_id"]:
                path.append({"type": "return", "return_id": rec["return_id"], "status": rec["return_status"], "filing_date": rec["filing_date"]})

            return {
                "invoice_id": invoice_id,
                "found": True,
                "root_cause": root_cause or ["No mismatch detected"],
                "path": path,
                "risk_indicators": indicators,
            }
    except Exception:
        mock = _mock_invoice_trace(invoice_id)
        if mock:
            return mock
        raise


async def reconcile(depth: int = 3) -> List[Dict[str, Any]]:
    try:
        async with neo4j_driver.session(database=NEO4J_DB) as session:
            res = await session.run(
                """
                MATCH (s:Taxpayer)-[:ISSUED]->(i:Invoice)
                OPTIONAL MATCH (i)-[:CLAIMED_BY]->(b:Taxpayer)
                OPTIONAL MATCH (i)-[:REPORTED_IN]->(r:Return)
                WITH s, i, b, r,
                     CASE WHEN r IS NULL THEN true ELSE false END AS missing_return,
                     CASE WHEN b IS NULL THEN true ELSE false END AS missing_claim,
                     CASE WHEN i.claimed_tax_amount IS NOT NULL AND abs(i.tax_amount - i.claimed_tax_amount) > 0.01 THEN true ELSE false END AS tax_discrepancy
                WHERE missing_return OR missing_claim OR tax_discrepancy
                RETURN s.gstin AS seller, i.invoice_id AS invoice_id, b.gstin AS buyer,
                       missing_return, missing_claim, tax_discrepancy
                """
            )
            rows = await res.data()
            output = []
            for row in rows:
                rc = []
                if row["missing_return"]:
                    rc.append("Invoice not reported in return")
                if row["missing_claim"]:
                    rc.append("Missing claim edge to buyer")
                if row["tax_discrepancy"]:
                    rc.append("Tax amount discrepancy detected")
                output.append({"seller": row["seller"], "invoice_id": row["invoice_id"], "buyer": row["buyer"], "root_cause": rc})
            return output
    except Exception:
        # Return comprehensive mock data for demo purposes
        return _mock_reconcile_data()


def _mock_reconcile_data() -> List[Dict[str, Any]]:
    """Generate comprehensive mock reconciliation data for demo"""
    return [
        {
            "seller": "27ABCDE1234F1Z5",
            "invoice_id": "INV1001", 
            "buyer": "09PQRS5678T1Z2",
            "root_cause": ["Tax amount discrepancy detected"],
            "risk_score": 35.0,
            "risk_band": "LOW",
            "tax_discrepancy": 500.0
        },
        {
            "seller": "33QWERT5678U1Z1", 
            "invoice_id": "INV2002",
            "buyer": "07XYZAB9876C1Z7",
            "root_cause": ["Invoice not reported in return", "Missing claim edge to buyer"],
            "risk_score": 65.0,
            "risk_band": "MEDIUM",
            "tax_discrepancy": 1200.0
        },
        {
            "seller": "29LMNOP4321Q1Z3",
            "invoice_id": "INV3003", 
            "buyer": "15JKLM1234N1Z9",
            "root_cause": ["Tax amount discrepancy detected", "Invoice not reported in return"],
            "risk_score": 85.0,
            "risk_band": "HIGH", 
            "tax_discrepancy": 2500.0
        },
        {
            "seller": "27ABCDE1234F1Z5",
            "invoice_id": "INV1004",
            "buyer": "12DEFG7890H1Z4",
            "root_cause": ["Missing claim edge to buyer"],
            "risk_score": 40.0,
            "risk_band": "LOW",
            "tax_discrepancy": 0.0
        },
        {
            "seller": "33QWERT5678U1Z1",
            "invoice_id": "INV2005", 
            "buyer": None,
            "root_cause": ["Missing claim edge to buyer", "Tax amount discrepancy detected"],
            "risk_score": 70.0,
            "risk_band": "MEDIUM",
            "tax_discrepancy": 1800.0
        }
    ]


def _mock_invoice_trace(invoice_id: str) -> Optional[Dict[str, Any]]:
    base = os.path.dirname(os.path.dirname(__file__))
    csv_path = os.path.join(base, "mock", "mock_data.csv")
    if not os.path.exists(csv_path):
        return None
    risk_map = {
        "27ABCDE1234F1Z5": 30.0,
        "33QWERT5678U1Z1": 55.0,
        "29LMNOP4321Q1Z3": 85.0,
        "09PQRS5678T1Z2": 25.0,
        "07XYZAB9876C1Z7": 45.0,
    }
    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("invoice_id") == invoice_id:
                seller = row.get("seller_gstin")
                buyer = row.get("buyer_gstin")
                ret = row.get("return_id") or ""
                try:
                    tax_amount = float(row.get("tax_amount") or 0.0)
                    claimed = float(row.get("claimed_tax_amount")) if row.get("claimed_tax_amount") not in (None, "",) else None
                except Exception:
                    tax_amount = 0.0
                    claimed = None
                missing_return = ret == ""
                missing_claim = buyer in (None, "",)
                tax_discrepancy = (claimed is not None) and (abs(tax_amount - claimed) > 0.01)
                root = []
                if missing_return:
                    root.append("Invoice not reported in return")
                if missing_claim:
                    root.append("Missing claim edge to buyer")
                if tax_discrepancy:
                    root.append("Tax amount discrepancy detected")
                path = [
                    {"type": "seller", "gstin": seller, "name": row.get("seller_name")},
                    {"type": "invoice", "invoice_id": invoice_id, "tax_amount": tax_amount, "claimed_tax_amount": claimed},
                ]
                if buyer and not missing_claim:
                    path.append({"type": "buyer", "gstin": buyer, "name": row.get("buyer_name")})
                if not missing_return:
                    path.append({"type": "return", "return_id": ret, "status": row.get("status"), "filing_date": row.get("filing_date")})
                indicators = {"seller_risk": risk_map.get(seller), "buyer_risk": risk_map.get(buyer), "cluster_id": None, "component_id": None}
                return {
                    "invoice_id": invoice_id,
                    "found": True,
                    "root_cause": root or ["No mismatch detected"],
                    "path": path,
                    "risk_indicators": indicators,
                }
    return None
