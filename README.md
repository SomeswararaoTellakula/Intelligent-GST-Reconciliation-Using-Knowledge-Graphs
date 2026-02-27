# Intelligent GST Reconciliation Using Knowledge Graphs

End-to-end demo platform for GST invoice reconciliation, vendor risk analysis, and audit reporting. The system provides a smooth workflow with mock fallbacks so it runs without any external databases.

## Features

- GSTIN selection → invoice reconciliation → risk analysis → dashboard → audit report
- Neo4j + MongoDB integration with robust mock data fallback (works offline)
- Visual analytics: force graph, Sankey, heatmaps, box plot, trend charts and KPIs
- Workflow event logging and one-click audit report generation

## Architecture

- Frontend: React + Vite + Tailwind (TypeScript)
- Backend: FastAPI (Python)
- Optional data stores: Neo4j (graph), MongoDB (workflow events)
- Mock CSV and in-memory generators enable full demo without databases

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+

Databases are optional. If Neo4j/MongoDB are not configured, the backend serves realistic mock data.

## Quick Start

1) Backend (port 8002)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8002
```

2) Frontend (port 5173)

```bash
cd frontend
npm install
# If backend uses a non-default URL, create .env and set VITE_API_URL
# Example: echo 'VITE_API_URL=http://localhost:8002' > .env
npm run dev
```

Open http://localhost:5173 in your browser.

## Demo Flow

Use the following samples for a smooth judging/demo experience:

- Low risk: GSTIN 27ABCDE1234F1Z5, Invoice INV1001
- Medium risk: GSTIN 33QWERT5678U1Z1, Invoice INV2002
- High risk: GSTIN 29LMNOP4321Q1Z3, Invoice INV3003

Typical steps:

1. Select GSTIN (SelectGstin page)
2. Reconcile: enter invoice ID and submit (Reconcile page)
3. Risk Analysis: review multiple graphs and metrics
4. Save → Dashboard: KPIs update with mock-backed values when offline
5. Generate Audit Report: from Dashboard, click “Generate Audit Report”

## Configuration

- Frontend base URL: `VITE_API_URL` (default: `http://localhost:8002`)
- Backend expects optional environment variables for Neo4j/MongoDB if you enable them (not required for mock demo).

## Key Endpoints (Backend)

- `GET /dashboard-summary` – KPIs and clusters; returns mock data if DB unavailable
- `GET /invoice-trace/{invoice_id}` – Finds seller→invoice→buyer path with root causes
- `GET /reconcile` – Lists invoices with mismatches and risk bands (mock supported)
- `GET /graph-data` – Network graph data for visualizations (mock supported)
- `POST /workflow/*` – Records workflow steps (mock/MongoDB)
- `GET /report/export` – Exports a simple JSON report blob

## Troubleshooting

- Blank visualizations: ensure the backend is running on port 8002 and the frontend `VITE_API_URL` matches.
- Auth redirect to /login: if you see 401, clear storage or ensure token handling is off for your flow.

## Scripts

- Frontend:
  - `npm run dev` – Start Vite dev server
  - `npm run build` – Production build
  - `npm run preview` – Preview production build
- Backend:
  - `python -m uvicorn app.main:app --reload --port 8002` – Dev server

## Repository

GitHub: https://github.com/SomeswararaoTellakula/Intelligent-GST-Reconciliation-Using-Knowledge-Graphs

