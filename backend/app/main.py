import os
import csv
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import RedirectResponse, JSONResponse
import urllib.parse
import urllib.request
import json
import asyncio
from ml.train_model import train as ml_train, predict as ml_predict, MODEL_PATH, list_available
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from .db import neo4j_driver, mongo_db, NEO4J_DB
from .models import (
    DashboardSummary,
    RiskInfo,
    InvoiceTraceResponse,
    ReconcileItem,
    GraphData,
    GraphNode,
    GraphLink,
    SimulateRiskRequest,
    SimulateRiskResponse,
)
from .reconcile import invoice_trace, reconcile
from .explain import build_invoice_explanation, write_audit

app = FastAPI(title="GST KG Reconciliation & Risk Intelligence")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/dashboard-summary", response_model=DashboardSummary)
async def dashboard_summary(gstin: Optional[str] = None):
    try:
        async with neo4j_driver.session(database=NEO4J_DB) as session:
            if gstin:
                q = """
                MATCH (s:Taxpayer {gstin: $gstin})-[:ISSUED]->(i:Invoice)
                OPTIONAL MATCH Madd pipeline
                OPTIONAL MATCH (i)-[:CLAIMED_BY]->(b:Taxpayer)
                OPTIONAL MATCH (i)-[:REPORTED_IN]->(r:Return)
                WITH collect(distinct s) + collect(distinct b) AS parties, collect(i) AS invs, collect(r) AS rets
                RETURN size([p in parties WHERE p IS NOT NULL]) AS taxpayers,
                       size(invs) AS invoices,
                       size([x in rets WHERE x IS NOT NULL]) AS returns
                """
                kpi = await session.run(q, gstin=gstin)
            else:
                kpi = await session.run(
                """
                MATCH (t:Taxpayer) WITH count(t) AS taxpayers
                MATCH (i:Invoice) WITH taxpayers, count(i) AS invoices
                MATCH (r:Return) WITH taxpayers, invoices, count(r) AS returns
                RETURN taxpayers, invoices, returns
                """
                )
            k = await kpi.single()
            if gstin:
                hi_taxpayers_q = await session.run("MATCH (t:Taxpayer) WHERE t.gstin=$gstin AND t.risk_band='HIGH' RETURN count(t) AS c", gstin=gstin)
                hi_invoices_q = await session.run("MATCH (:Taxpayer {gstin: $gstin})-[:ISSUED]->(i:Invoice) WHERE i.risk_band='HIGH' RETURN count(i) AS c", gstin=gstin)
                c1 = await hi_taxpayers_q.single()
                c2 = await hi_invoices_q.single()
                clusters = await session.run("MATCH (t:Taxpayer {gstin: $gstin}) RETURN t.cluster_id AS cid, 1 AS c", gstin=gstin)
                comp = await session.run("MATCH (t:Taxpayer {gstin: $gstin}) RETURN t.component_id AS cid, 1 AS c", gstin=gstin)
            else:
                hi_taxpayers = await session.run("MATCH (t:Taxpayer) WHERE t.risk_band='HIGH' RETURN count(t) AS c")
                hi_invoices = await session.run("MATCH (i:Invoice) WHERE i.risk_band='HIGH' RETURN count(i) AS c")
                c1 = await hi_taxpayers.single()
                c2 = await hi_invoices.single()
                clusters = await session.run("MATCH (t:Taxpayer) WHERE exists(t.cluster_id) RETURN t.cluster_id AS cid, count(*) AS c")
                comp = await session.run("MATCH (t:Taxpayer) WHERE exists(t.component_id) RETURN t.component_id AS cid, count(*) AS c")
            cluster_map = {str(r["cid"]): r["c"] for r in await clusters.data()}
            comp_map = {str(r["cid"]): r["c"] for r in await comp.data()}
            return DashboardSummary(
                kpis={
                    "taxpayers": k["taxpayers"] or 0,
                    "invoices": k["invoices"] or 0,
                    "returns": k["returns"] or 0,
                    "high_risk_taxpayers": (c1["c"] or 0),
                    "high_risk_invoices": (c2["c"] or 0),
                },
                clusters=cluster_map,
                components=comp_map,
            )
    except Exception:
        try:
            base = os.path.dirname(os.path.dirname(__file__))
            csv_path = os.path.join(base, "mock", "mock_data.csv")
            risk_map = {
                "27ABCDE1234F1Z5": ("LOW", 30.0, "MH"),
                "33QWERT5678U1Z1": ("MEDIUM", 55.0, "TN"),
                "29LMNOP4321Q1Z3": ("HIGH", 85.0, "KA"),
                "09PQRS5678T1Z2": ("LOW", 25.0, "UP"),
                "07XYZAB9876C1Z7": ("MEDIUM", 45.0, "DL"),
            }
            rows: list[dict[str, Any]] = []
            if os.path.exists(csv_path):
                with open(csv_path, newline="") as f:
                    rows = list(csv.DictReader(f))
            def mismatch(row: dict[str, Any]) -> bool:
                try:
                    ta = float(row.get("tax_amount") or 0.0)
                    ca = float(row.get("claimed_tax_amount"))
                except Exception:
                    ca = None
                ret_missing = not bool(row.get("return_id"))
                tax_disc = (ca is not None) and (abs(ta - ca) > 0.01)
                return ret_missing or tax_disc
            if gstin:
                rows = [r for r in rows if r.get("seller_gstin") == gstin or r.get("buyer_gstin") == gstin]
            gstins = set()
            for r in rows:
                if r.get("seller_gstin"): gstins.add(r["seller_gstin"])
                if r.get("buyer_gstin"): gstins.add(r["buyer_gstin"])
            taxpayers = len(gstins)
            invoices = len(rows)
            returns = len([r for r in rows if r.get("return_id")])
            hi_taxpayers = len([g for g in gstins if risk_map.get(g, ("LOW", 0.0, None))[0] == "HIGH"])
            hi_invoices = len([r for r in rows if mismatch(r)])
            # clusters/components fallback: group by state
            clusters: dict[str, int] = {}
            for g in gstins:
                st = risk_map.get(g, ("LOW", 0.0, None))[2] or "NA"
                clusters[st] = clusters.get(st, 0) + 1
            return DashboardSummary(
                kpis={
                    "taxpayers": taxpayers,
                    "invoices": invoices,
                    "returns": returns,
                    "high_risk_taxpayers": hi_taxpayers,
                    "high_risk_invoices": hi_invoices,
                },
                clusters=clusters,
                components=clusters,
            )
        except Exception:
            return DashboardSummary(
                kpis={"taxpayers": 0, "invoices": 0, "returns": 0, "high_risk_taxpayers": 0, "high_risk_invoices": 0},
                clusters={},
                components={},
            )


@app.get("/vendor-risk/{gstin}", response_model=RiskInfo)
async def vendor_risk(gstin: str):
    try:
        async with neo4j_driver.session(database=NEO4J_DB) as session:
            res = await session.run(
                "MATCH (t:Taxpayer {gstin: $gstin}) RETURN t.gstin AS gstin, t.name AS name, t.risk_score AS risk_score, t.risk_band AS risk_band, t.pagerank_score AS pagerank_score, t.degree_centrality AS degree_centrality, t.cluster_id AS cluster_id, t.component_id AS component_id",
                gstin=gstin,
            )
            r = await res.single()
            if not r:
                raise HTTPException(404, "Taxpayer not found")
            return RiskInfo(**r)
    except Exception:
        mapping = {
            "27ABCDE1234F1Z5": ("LOW", 30.0),
            "33QWERT5678U1Z1": ("MEDIUM", 55.0),
            "29LMNOP4321Q1Z3": ("HIGH", 85.0),
            "09PQRS5678T1Z2": ("LOW", 25.0),
            "07XYZAB9876C1Z7": ("MEDIUM", 45.0),
        }
        band, score = mapping.get(gstin, ("LOW", 20.0))
        return RiskInfo(gstin=gstin, name=None, risk_score=score, risk_band=band, pagerank_score=0.0, degree_centrality=0.0, cluster_id=None, component_id=None)


@app.get("/invoice-trace/{invoice_id}", response_model=InvoiceTraceResponse)
async def invoice_trace_endpoint(invoice_id: str):
    try:
        trace = await invoice_trace(invoice_id)
        explanation = build_invoice_explanation(trace)
        trace["explanation"] = explanation
        await mongo_db["audit_trail"].insert_one({"type": "invoice_trace", "invoice_id": invoice_id, "explanation": explanation, "trace": trace})
        return InvoiceTraceResponse(**trace)
    except Exception as e:
        logger.exception(f"invoice_trace failed for {invoice_id}: {e}")
        return InvoiceTraceResponse(invoice_id=invoice_id, found=False, root_cause=["Neo4j unavailable"], path=[], risk_indicators={}, explanation="Neo4j unavailable")


@app.get("/reconcile", response_model=List[ReconcileItem])
async def reconcile_endpoint():
    try:
        rows = await reconcile(depth=3)
        await mongo_db["audit_trail"].insert_one({"type": "reconcile_run", "items": rows})
        return [ReconcileItem(**r) for r in rows]
    except Exception:
        return []


@app.get("/graph-data", response_model=GraphData)
async def graph_data(limit: int = 200):
    try:
        async with neo4j_driver.session(database=NEO4J_DB) as session:
            res = await session.run(
            """
            MATCH (t:Taxpayer)-[rel:SELLS_TO]->(t2:Taxpayer)
            WITH t, rel, t2 LIMIT $limit
            RETURN t, t2, rel
            """,
            limit=limit,
            )
            rows = await res.data()
            nodes: Dict[str, GraphNode] = {}
            links: List[GraphLink] = []
            for row in rows:
                t = row["t"]
                t2 = row["t2"]
                for n in [t, t2]:
                    nid = n["gstin"]
                    if nid not in nodes:
                        nodes[nid] = GraphNode(
                            id=nid,
                            label="Taxpayer",
                            properties={k: v for k, v in n.items()},
                        )
                links.append(GraphLink(source=t["gstin"], target=t2["gstin"], type="SELLS_TO"))
            return GraphData(nodes=list(nodes.values()), links=links)
    except Exception:
        base = os.path.dirname(os.path.dirname(__file__))
        csv_path = os.path.join(base, "mock", "mock_data.csv")
        nodes: Dict[str, GraphNode] = {}
        links: List[GraphLink] = []
        risk_map = {
            "27ABCDE1234F1Z5": ("LOW", 30.0),
            "33QWERT5678U1Z1": ("MEDIUM", 55.0),
            "29LMNOP4321Q1Z3": ("HIGH", 85.0),
            "09PQRS5678T1Z2": ("LOW", 25.0),
            "07XYZAB9876C1Z7": ("MEDIUM", 45.0),
        }
        if os.path.exists(csv_path):
            with open(csv_path, newline="") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    s = row.get("seller_gstin")
                    b = row.get("buyer_gstin")
                    for g in [s, b]:
                        if g and g not in nodes:
                            band, score = risk_map.get(g, ("LOW", 20.0))
                            state = row.get("seller_state") if g == s else row.get("buyer_state")
                            nodes[g] = GraphNode(id=g, label="Taxpayer", properties={"gstin": g, "risk_band": band, "risk_score": score, "state": state})
                    if s and b:
                        links.append(GraphLink(source=s, target=b, type="SELLS_TO"))
        return GraphData(nodes=list(nodes.values()), links=links)

@app.get("/vendor-samples")
async def vendor_samples():
    try:
        out = {"low": None, "medium": None, "high": None}
        async with neo4j_driver.session(database=NEO4J_DB) as session:
            for band, key in [("LOW", "low"), ("MEDIUM", "medium"), ("HIGH", "high")]:
                res = await session.run(
                    "MATCH (t:Taxpayer) WHERE t.risk_band=$band RETURN t.gstin AS gstin LIMIT 1",
                    band=band,
                )
                row = await res.single()
                out[key] = row["gstin"] if row and "gstin" in row else None
        return out
    except Exception:
        return {"low": "27ABCDE1234F1Z5", "medium": "33QWERT5678U1Z1", "high": "29LMNOP4321Q1Z3"}

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8002/auth/google/callback")


@app.get("/auth/google/login")
async def google_login():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return RedirectResponse(f"{FRONTEND_URL}/oauth/callback?token=dev-token&name=DevUser&email=dev@example.com")
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
        "state": "state123",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return RedirectResponse(url)


@app.get("/auth/google/callback")
async def google_callback(request: Request):
    code = request.query_params.get("code")
    if not code:
        return RedirectResponse(f"{FRONTEND_URL}/oauth/callback?error=missing_code")
    data = urllib.parse.urlencode({
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }).encode()
    try:
        req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            token_payload = json.loads(resp.read().decode())
        access_token = token_payload.get("access_token")
        if not access_token:
            return RedirectResponse(f"{FRONTEND_URL}/oauth/callback?error=token_exchange_failed")
        user_req = urllib.request.Request("https://www.googleapis.com/oauth2/v3/userinfo", headers={"Authorization": f"Bearer {access_token}"})
        with urllib.request.urlopen(user_req, timeout=10) as uresp:
            userinfo = json.loads(uresp.read().decode())
        name = urllib.parse.quote(userinfo.get("name", "User"))
        email = urllib.parse.quote(userinfo.get("email", "user@example.com"))
        token = urllib.parse.quote(access_token)
        return RedirectResponse(f"{FRONTEND_URL}/oauth/callback?token={token}&name={name}&email={email}")
    except Exception:
        return RedirectResponse(f"{FRONTEND_URL}/oauth/callback?error=oauth_failed")


@app.post("/simulate-risk", response_model=SimulateRiskResponse)
async def simulate_risk(req: SimulateRiskRequest):
    async with neo4j_driver.session(database=NEO4J_DB) as session:
        result: Dict[str, Any] = {"threshold": req.risk_threshold, "itc_simulation": req.itc_simulation}
        if req.gstin:
            res = await session.run("MATCH (t:Taxpayer {gstin: $gstin}) RETURN t.risk_score AS risk_score", gstin=req.gstin)
            r = await res.single()
            if r:
                result["gstin"] = req.gstin
                result["current_risk"] = r["risk_score"]
                result["meets_threshold"] = (r["risk_score"] or 0) >= req.risk_threshold
        if req.invoice_id:
            res = await session.run("MATCH (i:Invoice {invoice_id: $iid}) RETURN i.risk_score AS risk_score, i.mismatch_flag AS mismatch", iid=req.invoice_id)
            r = await res.single()
            if r:
                result["invoice_id"] = req.invoice_id
                result["current_risk"] = r["risk_score"]
                result["mismatch_flag"] = r["mismatch"]
        await mongo_db["audit_trail"].insert_one({"type": "simulate_risk", "request": req.dict(), "result": result})
        return SimulateRiskResponse(result=result)

@app.post("/workflow/start")
async def workflow_start(payload: Dict[str, Any]):
    try:
        await mongo_db["workflow_events"].insert_one({"type": "start", **payload})
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/workflow/reconcile")
async def workflow_reconcile(payload: Dict[str, Any]):
    try:
        await mongo_db["workflow_events"].insert_one({"type": "reconcile", **payload})
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/workflow/risk-update")
async def workflow_risk_update(payload: Dict[str, Any]):
    try:
        await mongo_db["workflow_events"].insert_one({"type": "risk_update", **payload})
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/report/export")
async def report_export():
    try:
        cursor = mongo_db["workflow_events"].find({}, {"_id": 0})
        events = await cursor.to_list(length=500)
        dashboard = await mongo_db["audit_trail"].find_one({"type": "reconcile_run"})
        data = {"events": events, "last_reconcile": dashboard}
        return JSONResponse(content=data, media_type="application/json", headers={"Content-Disposition": "attachment; filename=report.json"})
    except Exception as e:
        return {"status": "error", "message": str(e)}
@app.websocket("/ws/dashboard")
async def ws_dashboard(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            try:
                async with neo4j_driver.session(database=NEO4J_DB) as session:
                    kpi = await session.run(
                        """
                        MATCH (t:Taxpayer) WITH count(t) AS taxpayers
                        MATCH (i:Invoice) WITH taxpayers, count(i) AS invoices
                        MATCH (r:Return) WITH taxpayers, invoices, count(r) AS returns
                        RETURN taxpayers, invoices, returns
                        """
                    )
                    k = await kpi.single()
                    hi_taxpayers = await session.run("MATCH (t:Taxpayer) WHERE t.risk_band='HIGH' RETURN count(t) AS c")
                    hi_invoices = await session.run("MATCH (i:Invoice) WHERE i.risk_band='HIGH' RETURN count(i) AS c")
                    c1 = await hi_taxpayers.single()
                    c2 = await hi_invoices.single()
                    clusters = await session.run("MATCH (t:Taxpayer) WHERE exists(t.cluster_id) RETURN t.cluster_id AS cid, count(*) AS c")
                    comp = await session.run("MATCH (t:Taxpayer) WHERE exists(t.component_id) RETURN t.component_id AS cid, count(*) AS c")
                    payload = {
                        "kpis": {
                            "taxpayers": k["taxpayers"],
                            "invoices": k["invoices"],
                            "returns": k["returns"],
                            "high_risk_taxpayers": c1["c"],
                            "high_risk_invoices": c2["c"],
                        },
                        "clusters": {str(r["cid"]): r["c"] for r in await clusters.data()},
                        "components": {str(r["cid"]): r["c"] for r in await comp.data()},
                    }
                    await ws.send_json(payload)
            except Exception:
                await ws.send_json({"kpis": {"taxpayers": 0, "invoices": 0, "returns": 0, "high_risk_taxpayers": 0, "high_risk_invoices": 0}, "clusters": {}, "components": {}})
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        return

@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI app starting")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI app shutting down")

@app.post("/model/train")
async def model_train(payload: Dict[str, Any] = None):
    try:
        names = None
        if payload and "files" in payload:
            names = payload["files"]
        res = ml_train(names)
        await mongo_db["model_runs"].insert_one(res)
        return {"status": "ok", "metrics": res["metrics"], "model_path": MODEL_PATH}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/model/predict")
async def model_predict(payload: Dict[str, Any]):
    try:
        res = ml_predict(payload)
        return res
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/model/list-files")
async def model_list_files():
    try:
        return list_available()
    except Exception as e:
        return {"status": "error", "message": str(e)}
