import os
from typing import Dict, Any
from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "gstkg")


def build_invoice_explanation(trace: Dict[str, Any]) -> str:
    if not trace.get("found"):
        return f"Invoice {trace.get('invoice_id')} not found in graph."
    rc = trace.get("root_cause", [])
    seller = next((n for n in trace["path"] if n["type"] == "seller"), {})
    buyer = next((n for n in trace["path"] if n["type"] == "buyer"), {})
    invoice = next((n for n in trace["path"] if n["type"] == "invoice"), {})
    indicators = trace.get("risk_indicators", {})

    risk_band = "HIGH" if (indicators.get("seller_risk", 0) or 0) >= 71 or (indicators.get("buyer_risk", 0) or 0) >= 71 else (
        "MEDIUM" if (indicators.get("seller_risk", 0) or 0) >= 41 or (indicators.get("buyer_risk", 0) or 0) >= 41 else "LOW"
    )

    parts = []
    parts.append(f"Invoice {invoice.get('invoice_id')} is {risk_band} risk")
    if indicators.get("cluster_id") is not None:
        parts.append(f" because involved party belongs to cluster {indicators['cluster_id']}")
    if rc:
        parts.append(f" with root causes: {', '.join(rc)}")
    mm_count = "unknown"
    # Placeholder historical mismatches count; would calculate from DB if necessary
    parts.append(f". Seller {seller.get('gstin')} and Buyer {buyer.get('gstin')} show risk scores {indicators.get('seller_risk')}, {indicators.get('buyer_risk')}.")
    parts.append(f" Tax amounts: reported {invoice.get('tax_amount')} vs claimed {invoice.get('claimed_tax_amount')}.")
    return " ".join(parts)


def write_audit(entry: Dict[str, Any]):
    mongo = MongoClient(MONGO_URI)
    mdb = mongo[MONGO_DB]
    mdb["audit_trail"].insert_one(entry)
