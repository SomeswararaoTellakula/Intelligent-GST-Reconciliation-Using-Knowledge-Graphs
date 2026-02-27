CREATE CONSTRAINT taxpayer_gstin_unique IF NOT EXISTS
FOR (t:Taxpayer)
REQUIRE t.gstin IS UNIQUE;

CREATE CONSTRAINT invoice_id_unique IF NOT EXISTS
FOR (i:Invoice)
REQUIRE i.invoice_id IS UNIQUE;

CREATE INDEX taxpayer_state_idx IF NOT EXISTS
FOR (t:Taxpayer)
ON (t.state);

CREATE INDEX taxpayer_risk_idx IF NOT EXISTS
FOR (t:Taxpayer)
ON (t.risk_score);

CREATE INDEX invoice_date_idx IF NOT EXISTS
FOR (i:Invoice)
ON (i.invoice_date);

CREATE INDEX invoice_risk_idx IF NOT EXISTS
FOR (i:Invoice)
ON (i.risk_score);

CREATE INDEX return_id_idx IF NOT EXISTS
FOR (r:Return)
ON (r.return_id);
