import React, { useState, useEffect } from 'react';
import { X, Download, Calendar, FileText, DollarSign, Clock } from 'lucide-react';
import ChateauLogo from '../../assets/ChataueLogo.png'; // Ensure path is correct

const AuditSummary = ({ isOpen, onClose, collectibles, payables, agingReport }) => {
  const [reportPeriod, setReportPeriod] = useState('Monthly');
  const [isGenerating, setIsGenerating] = useState(false);

  // Dynamically load html2pdf so you don't have to install npm packages
  useEffect(() => {
    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  if (!isOpen) return null;

  // --- Date Filtering Logic ---
  const filterByDate = (data, dateField) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return data.filter(item => {
      if (!item[dateField]) return false;
      const itemDate = new Date(item[dateField]);
      
      if (reportPeriod === 'Daily') {
        return itemDate >= today;
      } else if (reportPeriod === 'Weekly') {
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        return itemDate >= lastWeek;
      } else if (reportPeriod === 'Monthly') {
        return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
      }
      return true; // All Time
    });
  };

  const filteredCollectibles = filterByDate(collectibles, 'paid_at');
  const filteredPayables = filterByDate(payables, 'created_at');
  const filteredAging = agingReport; 

  // --- Calculations ---
  const totalCollected = filteredCollectibles.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalExpenses = filteredPayables.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalOverdue = filteredAging.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  
  const verifiedCollectibles = filteredCollectibles.filter(c => c.audited).length;
  const verifiedPayables = filteredPayables.filter(p => p.status === 'verified').length;

  // --- FIXED: PDF Download Trigger ---
  const handleDownloadPDF = () => {
    if (!window.html2pdf) {
      alert("The PDF generator is still loading. Please wait a moment and try again.");
      return;
    }

    setIsGenerating(true);

    // Timeout prevents React's DOM update from colliding with the canvas capture
    setTimeout(() => {
      const element = document.getElementById('audit-pdf-content');
      
      const opt = {
        margin:       0.5,
        filename:     `Chateau_Audit_Summary_${reportPeriod.replace(' ', '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      window.html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          setIsGenerating(false);
        })
        .catch(err => {
          console.error("PDF Generation failed:", err);
          alert("An error occurred while creating the PDF.");
          setIsGenerating(false);
        });
    }, 150); 
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative animate-in fade-in zoom-in duration-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="text-[#006837]" size={24} /> Financial Audit Summary
            </h2>
            <p className="text-slate-500 text-sm">Generate and download historical audit reports.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Modal Toolbar */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-slate-400" />
            <select 
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 cursor-pointer"
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
            >
              <option value="Daily">Daily Report</option>
              <option value="Weekly">Weekly Report</option>
              <option value="Monthly">Monthly Report</option>
              <option value="All Time">All Time Record</option>
            </select>
          </div>

          <button 
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#006837] text-white rounded-xl font-bold text-sm hover:bg-[#004d29] transition-all disabled:opacity-50 cursor-pointer shadow-md"
          >
            <Download size={16} /> {isGenerating ? 'Generating PDF...' : 'Download as PDF'}
          </button>
        </div>

        {/* Report Preview Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 custom-scrollbar">
          
          {/* --- FIXED: Removed shadow-sm and added hardcoded HEX colors to bypass OKLCH parsing crashes --- */}
          <div id="audit-pdf-content" className="p-10 rounded-xl mx-auto w-full max-w-[800px] min-h-[1056px]" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
            
            {/* PDF Header */}
            <div className="flex justify-between items-start pb-6 mb-8" style={{ borderBottom: '2px solid #1e293b' }}>
              <div className="flex items-center gap-4">
                <img src={ChateauLogo} alt="Logo" crossOrigin="anonymous" className="w-16 h-16 object-contain" />
                <div>
                  <h1 className="text-2xl font-black tracking-wider uppercase" style={{ color: '#0f172a' }}>Chateau Real</h1>
                  <p className="text-sm font-bold" style={{ color: '#64748b' }}>Homeowners Association</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold" style={{ color: '#006837' }}>AUDIT SUMMARY</h2>
                <p className="text-sm font-semibold mt-1" style={{ color: '#475569' }}>Period: {reportPeriod}</p>
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Generated: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Financial Highlights */}
            <h3 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: '#94a3b8' }}>Financial Overview</h3>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
                <p className="text-xs font-bold uppercase" style={{ color: '#16a34a' }}>Total Collected</p>
                <h4 className="text-2xl font-black mt-1" style={{ color: '#15803d' }}>₱{totalCollected.toLocaleString()}</h4>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5' }}>
                <p className="text-xs font-bold uppercase" style={{ color: '#ea580c' }}>Total Expenses</p>
                <h4 className="text-2xl font-black mt-1" style={{ color: '#c2410c' }}>₱{totalExpenses.toLocaleString()}</h4>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2' }}>
                <p className="text-xs font-bold uppercase" style={{ color: '#dc2626' }}>Total Overdue</p>
                <h4 className="text-2xl font-black mt-1" style={{ color: '#b91c1c' }}>₱{totalOverdue.toLocaleString()}</h4>
              </div>
            </div>

            {/* Verification Stats */}
            <h3 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: '#94a3b8' }}>Audit Workflow Status</h3>
            <div className="flex gap-8 mb-8 rounded-xl p-6" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold" style={{ color: '#475569' }}>Collectibles Verified</span>
                  <span className="text-sm font-black" style={{ color: '#0f172a' }}>{verifiedCollectibles} / {filteredCollectibles.length}</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: '#e2e8f0' }}>
                  <div className="h-2 rounded-full" style={{ backgroundColor: '#006837', width: `${filteredCollectibles.length > 0 ? (verifiedCollectibles / filteredCollectibles.length) * 100 : 0}%` }}></div>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold" style={{ color: '#475569' }}>Payables Verified</span>
                  <span className="text-sm font-black" style={{ color: '#0f172a' }}>{verifiedPayables} / {filteredPayables.length}</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: '#e2e8f0' }}>
                  <div className="h-2 rounded-full" style={{ backgroundColor: '#006837', width: `${filteredPayables.length > 0 ? (verifiedPayables / filteredPayables.length) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>

            {/* Detailed Tables (Simplified for PDF) */}
            <h3 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: '#94a3b8' }}>Recent Transactions ({reportPeriod})</h3>
            
            {/* Collectibles Table */}
            <div className="mb-6">
              <h4 className="text-sm font-bold pb-1 mb-2" style={{ color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>Verified Incomes (Collectibles)</h4>
              <table className="w-full text-left text-xs" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="py-2" style={{ color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Date</th>
                    <th className="py-2" style={{ color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Resident</th>
                    <th className="py-2" style={{ color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Ref No.</th>
                    <th className="py-2 text-right" style={{ color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCollectibles.slice(0, 10).map(c => (
                    <tr key={c.id}>
                      <td className="py-2" style={{ color: '#475569', borderBottom: '1px solid #f1f5f9' }}>{new Date(c.paid_at).toLocaleDateString()}</td>
                      <td className="py-2 font-bold" style={{ color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>{c.profiles?.full_name || 'N/A'}</td>
                      <td className="py-2 font-mono" style={{ color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{c.reference_no}</td>
                      <td className="py-2 text-right font-bold" style={{ color: '#16a34a', borderBottom: '1px solid #f1f5f9' }}>₱{Number(c.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  {filteredCollectibles.length === 0 && <tr><td colSpan="4" className="py-4 text-center italic" style={{ color: '#94a3b8' }}>No records found for this period.</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Payables Table */}
            <div>
              <h4 className="text-sm font-bold pb-1 mb-2" style={{ color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>Verified Expenses (Payables)</h4>
              <table className="w-full text-left text-xs" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="py-2" style={{ color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Date</th>
                    <th className="py-2" style={{ color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Payee / Vendor</th>
                    <th className="py-2" style={{ color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Description</th>
                    <th className="py-2 text-right" style={{ color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayables.slice(0, 10).map(p => (
                    <tr key={p.id}>
                      <td className="py-2" style={{ color: '#475569', borderBottom: '1px solid #f1f5f9' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="py-2 font-bold" style={{ color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>{p.payee}</td>
                      <td className="py-2" style={{ color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{p.description}</td>
                      <td className="py-2 text-right font-bold" style={{ color: '#ea580c', borderBottom: '1px solid #f1f5f9' }}>₱{Number(p.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  {filteredPayables.length === 0 && <tr><td colSpan="4" className="py-4 text-center italic" style={{ color: '#94a3b8' }}>No records found for this period.</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Footer Signature Area */}
            <div className="mt-20 pt-8 flex justify-between" style={{ borderTop: '1px solid #e2e8f0' }}>
              <div className="text-center w-48">
                <div className="h-8 mb-2" style={{ borderBottom: '1px solid #1e293b' }}></div>
                <p className="text-xs font-bold uppercase" style={{ color: '#1e293b' }}>Prepared By</p>
                <p className="text-[10px]" style={{ color: '#64748b' }}>HOA Auditor</p>
              </div>
              <div className="text-center w-48">
                <div className="h-8 mb-2" style={{ borderBottom: '1px solid #1e293b' }}></div>
                <p className="text-xs font-bold uppercase" style={{ color: '#1e293b' }}>Noted By</p>
                <p className="text-[10px]" style={{ color: '#64748b' }}>HOA President / Treasurer</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditSummary;