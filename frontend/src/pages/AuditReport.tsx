import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReconciliationModel } from '../models/ReconciliationModel';
import { AuditReportModel, AuditReport } from '../models/AuditReportModel';

function exportCSV(model: AuditReportModel) {
  const csv = model.exportToCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'audit_report.csv';
  a.click();
}

function exportJSON(model: AuditReportModel) {
  const json = model.exportToJSON();
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'audit_report.json';
  a.click();
}

export default function AuditReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [report, setReport] = useState<AuditReport | null>(null);
  const [auditModel, setAuditModel] = useState<AuditReportModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const reconciliationData = location.state?.reconciliationData;
    const gstin = location.state?.gstin;
    const dashboardData = location.state?.dashboardData;
    
    if (reconciliationData) {
      const reconModel = new ReconciliationModel(reconciliationData);
      const auditReportModel = new AuditReportModel(reconModel, gstin, 'Current Period', dashboardData);
      setAuditModel(auditReportModel);
      setReport(auditReportModel.getReport());
      setLoading(false);
    } else {
      // Fallback: try to get data from API
      navigate('/reconciliation');
    }
  }, [location, navigate]);

  if (loading) return <div className="p-4">Loading audit report...</div>;
  if (!report) return <div className="p-4 text-red-400">No audit data available</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">GST ITC Audit Report</h1>
          <p className="text-gray-400">
            Generated on {report.generatedAt.toLocaleString()}
            {report.gstin && ` • GSTIN: ${report.gstin}`}
            {` • Period: ${report.period}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            className="px-4 py-2 bg-brand rounded" 
            onClick={() => auditModel && exportCSV(auditModel)}
          >
            Export CSV
          </button>
          <button 
            className="px-4 py-2 bg-green-600 rounded" 
            onClick={() => auditModel && exportJSON(auditModel)}
          >
            Export JSON
          </button>
          <button 
            className="px-4 py-2 bg-gray-700 rounded" 
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Financial Impact Summary */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">Financial Impact Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-800/30 rounded">
            <div className="text-2xl font-bold">₹{report.financialImpact.totalITCClaimed.toLocaleString()}</div>
            <div className="text-sm text-gray-400">Total ITC Claimed</div>
          </div>
          <div className="text-center p-4 bg-green-800/30 rounded">
            <div className="text-2xl font-bold">₹{report.financialImpact.validITC.toLocaleString()}</div>
            <div className="text-sm text-gray-400">Valid ITC</div>
          </div>
          <div className="text-center p-4 bg-red-800/30 rounded">
            <div className="text-2xl font-bold">₹{report.financialImpact.itcAtRisk.toLocaleString()}</div>
            <div className="text-sm text-gray-400">ITC at Risk</div>
          </div>
          <div className="text-center p-4 bg-yellow-800/30 rounded">
            <div className="text-2xl font-bold">{report.financialImpact.exposurePercentage.toFixed(1)}%</div>
            <div className="text-sm text-gray-400">Exposure Percentage</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-red-800/20 rounded">
            <div className="text-lg font-bold">{report.financialImpact.highRiskVendors}</div>
            <div className="text-sm text-gray-400">High Risk Vendors</div>
          </div>
          <div className="text-center p-3 bg-yellow-800/20 rounded">
            <div className="text-lg font-bold">{report.financialImpact.moderateRiskVendors}</div>
            <div className="text-sm text-gray-400">Moderate Risk Vendors</div>
          </div>
          <div className="text-center p-3 bg-green-800/20 rounded">
            <div className="text-lg font-bold">{report.financialImpact.lowRiskVendors}</div>
            <div className="text-sm text-gray-400">Low Risk Vendors</div>
          </div>
        </div>
      </div>

      {/* ITC Risk Breakdown Table */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">ITC Risk Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-2">Vendor</th>
                <th className="text-left p-2">Invoice No</th>
                <th className="text-right p-2">ITC Amount</th>
                <th className="text-left p-2">Issue Type</th>
                <th className="text-left p-2">Risk Level</th>
                <th className="text-left p-2">Root Cause</th>
              </tr>
            </thead>
            <tbody>
              {report.auditItems.map((item, index) => (
                <tr key={index} className="border-b border-gray-800">
                  <td className="p-2">{item.vendor}</td>
                  <td className="p-2">{item.invoiceNo}</td>
                  <td className="text-right p-2">₹{item.itcAmount.toLocaleString()}</td>
                  <td className="p-2">{item.issueType}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.riskLevel === 'HIGH' ? 'bg-red-600' :
                      item.riskLevel === 'MEDIUM' ? 'bg-yellow-600' :
                      'bg-green-600'
                    }`}>
                      {item.riskLevel}
                    </span>
                  </td>
                  <td className="p-2">{item.rootCause.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Risk Profiles */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">Vendor Risk Profiles</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-2">Vendor</th>
                <th className="text-right p-2">Filing Consistency</th>
                <th className="text-right p-2">Mismatch Count</th>
                <th className="text-right p-2">Total Exposure</th>
                <th className="text-right p-2">Network Risk Score</th>
                <th className="text-left p-2">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {report.vendorRiskProfiles.map((vendor, index) => (
                <tr key={index} className="border-b border-gray-800">
                  <td className="p-2">{vendor.vendor}</td>
                  <td className="text-right p-2">{vendor.filingConsistency.toFixed(1)}%</td>
                  <td className="text-right p-2">{vendor.mismatchCount}</td>
                  <td className="text-right p-2">₹{vendor.totalExposure.toLocaleString()}</td>
                  <td className="text-right p-2">{vendor.networkRiskScore.toFixed(1)}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      vendor.riskLevel === 'HIGH' ? 'bg-red-600' :
                      vendor.riskLevel === 'MEDIUM' ? 'bg-yellow-600' :
                      'bg-green-600'
                    }`}>
                      {vendor.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Root Cause Analysis */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">Root Cause Analysis</h2>
        <div className="grid gap-4">
          {report.rootCauseBreakdown.map((cause, index) => (
            <div key={index} className="flex justify-between items-center">
              <div className="flex-1">
                <div className="font-medium">{cause.cause}</div>
                <div className="text-sm text-gray-400">{cause.count} cases</div>
              </div>
              <div className="text-right">
                <div className="font-bold">₹{cause.amount.toLocaleString()}</div>
                <div className="text-sm text-gray-400">{cause.percentage.toFixed(1)}% of total risk</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Graph Audit Trails */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Graph Audit Trails</h2>
        <div className="grid gap-4">
          {report.graphAuditTrails.map((trail, index) => (
            <div key={index} className="border border-gray-700 rounded p-4">
              <h3 className="font-semibold mb-2">Audit Trail: {trail.invoice}</h3>
              <div className="grid gap-2 text-sm">
                <div><span className="text-gray-400">Buyer:</span> {trail.buyer}</div>
                <div><span className="text-gray-400">Invoice:</span> {trail.invoice}</div>
                <div><span className="text-gray-400">Supplier:</span> {trail.supplier}</div>
                <div><span className="text-gray-400">GSTR-1 Status:</span> 
                  <span className={trail.gstr1Status === 'Not Filed' ? 'text-red-400' : 'text-green-400'}>
                    {trail.gstr1Status}
                  </span>
                </div>
                <div><span className="text-gray-400">GSTR-3B Payment:</span> 
                  <span className={trail.gstr3bPayment === 'Underpaid' ? 'text-red-400' : 'text-green-400'}>
                    {trail.gstr3bPayment}
                  </span>
                </div>
                <div><span className="text-gray-400">Result:</span> {trail.result}</div>
              </div>
              <div className="mt-3 p-3 bg-gray-800 rounded">
                <h4 className="font-medium mb-2 text-sm">Audit Path:</h4>
                <div className="text-sm text-gray-400">
                  {trail.path.map((step, i) => (
                    <div key={i} className="ml-4">→ {step}</div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}