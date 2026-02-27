from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class KPI(BaseModel):
    taxpayers: int
    invoices: int
    returns: int
    high_risk_taxpayers: int
    high_risk_invoices: int


class DashboardSummary(BaseModel):
    kpis: KPI
    clusters: Dict[str, int]
    components: Dict[str, int]


class RiskInfo(BaseModel):
    gstin: str
    name: Optional[str]
    risk_score: float
    risk_band: str
    pagerank_score: Optional[float] = None
    degree_centrality: Optional[float] = None
    cluster_id: Optional[int] = None
    component_id: Optional[int] = None


class TraceNode(BaseModel):
    type: str
    data: Dict[str, Any]


class InvoiceTraceResponse(BaseModel):
    invoice_id: str
    found: bool
    root_cause: List[str] = Field(default_factory=list)
    path: List[Dict[str, Any]] = Field(default_factory=list)
    risk_indicators: Dict[str, Any] = Field(default_factory=dict)
    explanation: Optional[str] = None


class ReconcileItem(BaseModel):
    seller: str
    invoice_id: str
    buyer: Optional[str]
    root_cause: List[str]


class GraphNode(BaseModel):
    id: str
    label: str
    properties: Dict[str, Any]


class GraphLink(BaseModel):
    source: str
    target: str
    type: str


class GraphData(BaseModel):
    nodes: List[GraphNode]
    links: List[GraphLink]


class SimulateRiskRequest(BaseModel):
    gstin: Optional[str] = None
    invoice_id: Optional[str] = None
    risk_threshold: Optional[int] = 70
    itc_simulation: Optional[bool] = False
    depth: Optional[int] = 2
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    cluster_id: Optional[int] = None


class SimulateRiskResponse(BaseModel):
    result: Dict[str, Any]
