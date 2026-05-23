import React, { useRef } from 'react';
import { X, Mail, Download, Printer } from 'lucide-react';
import ChateauLogo from '../../assets/ChataueLogo.png';
import html2canvas from 'html2canvas'; 
import { jsPDF } from 'jspdf'; 

const PaymentReports = ({ 
  isOpen, 
  onClose, 
  statementResId, 
  setStatementResId, 
  residentsList, 
  residentPayments, 
  residentProfile, 
  selectedPaymentProfile, 
  invTotalPaid, 
  invTotalOverdue, 
  invTotalDue 
}) => {
  const printRef = useRef(); 

  if (!isOpen) return null;

  // --- Email Handler ---
  const handleSendEmail = () => {
    if (residentProfile?.email) {
      const subject = "HOA Dues Statement - Chateau Real";
      const body = `Hello ${residentProfile.full_name},%0D%0A%0D%0AAttached is your current HOA dues statement.%0D%0ATotal Due: ₱${invTotalDue.toLocaleString()}%0D%0A%0D%0AThank you.`;
      window.location.href = `mailto:${residentProfile.email}?subject=${subject}&body=${body}`;
    } else {
      alert("Resident email not found.");
    }
  };

  // --- FIXED: Robust PDF Generation to avoid oklch crash while forcing a Download ---
  const handleDownloadPDF = async () => {
    const element = printRef.current;
    
    // We capture the canvas, but we pre-process the style to remove unsupported 'oklch' colors
    const canvas = await html2canvas(element, { 
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll('*').forEach(el => {
                const style = window.getComputedStyle(el);
                
                // If the computed color contains 'oklch', force it to a safe color
                if (style.color && style.color.includes('okl')) {
                    el.style.color = '#334155';
                }
                if (style.backgroundColor && style.backgroundColor.includes('okl')) {
                    if (style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                        el.style.backgroundColor = '#ffffff'; 
                    }
                }
                if (style.borderColor && style.borderColor.includes('okl')) {
                    el.style.borderColor = '#e2e8f0';
                }
            });
        }
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Statement_${residentProfile?.full_name || 'Resident'}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm no-print" onClick={onClose}></div>
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl relative animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[95vh] flex flex-col">
        
        {/* Modal Controls */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10 no-print shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-xl font-bold text-slate-900">Generate Statement</h2>
            <select 
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006837]"
              value={statementResId}
              onChange={(e) => setStatementResId(e.target.value)}
            >
              <option value="">-- Select Resident --</option>
              {residentsList.map(res => (
                <option key={res.id} value={res.id}>{res.full_name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDownloadPDF}
              disabled={!statementResId}
              className="flex items-center gap-2 px-4 py-2 bg-[#006837] hover:opacity-90 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download size={16} /> Download as PDF
            </button>
            
            <button 
              onClick={handleSendEmail}
              disabled={!statementResId || !residentProfile?.email}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Mail size={16} /> Send to Resident
            </button>

            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Print Area - Ref assigned here */}
        <div id="invoice-print-area" ref={printRef} className="bg-white p-10 w-full text-slate-800 font-sans text-xs leading-normal">
          
          <div className="border border-slate-300 rounded-md p-3 flex justify-between items-center mb-6 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <img src={ChateauLogo} alt="Chateau Logo" className="w-16 h-auto object-contain" />
              <div>
                <h2 className="text-lg font-extrabold text-[#006837] uppercase tracking-wide">Statement of Account</h2>
                <p className="text-[10px] text-slate-600 font-semibold tracking-wider uppercase">Chateau Real Homeowners Association, Inc.</p>
                <p className="text-[10px] text-slate-500">Metropolis Greens, Dasmariñas, Cavite</p>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-500 font-medium">
              <p>Email: chateaurealhoa@gmail.com</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 mb-6">
            <div className="col-span-12 border border-slate-200 rounded-md p-4 space-y-2">
              <div className="flex">
                <span className="w-32 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Registered Owner:</span>
                <span className="font-extrabold text-slate-900 text-sm">{residentProfile?.full_name || 'Select a Resident'}</span>
              </div>
              <div className="flex border-t border-slate-100 pt-2">
                <span className="w-32 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Block and Lot No:</span>
                <span className="font-bold text-slate-800">{selectedPaymentProfile?.address || '---'} {selectedPaymentProfile?.street || ''}</span>
              </div>
              <div className="flex border-t border-slate-100 pt-2">
                <span className="w-32 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Billing Period:</span>
                <span className="font-bold text-slate-800">{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex border-t border-slate-100 pt-2">
                <span className="w-32 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Statement Date:</span>
                <span className="font-bold text-slate-700">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#006837] text-white text-[10px] font-bold uppercase tracking-wider text-center py-1.5 rounded-t-md shrink-0">
            Association Dues Payment Record
          </div>

          <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-center text-[10px] uppercase tracking-wide">
                <th className="py-2 px-3 text-left border-r border-slate-300 w-1/4" rowSpan="2">Billing Period / Ref</th>
                <th className="py-1 px-2 border-b border-r border-slate-300" colSpan="2">Beginning Balances</th>
                <th className="py-2 px-2 border-r border-slate-300" rowSpan="2">Current Billing</th>
                <th className="py-2 px-2 border-r border-slate-300" rowSpan="2">Amount Due</th>
                <th className="py-1 px-2 border-b border-slate-300" colSpan="3">Payment Record</th>
              </tr>
              <tr className="bg-slate-50 text-slate-600 text-center text-[9px] font-bold border-b border-slate-300 uppercase tracking-tighter">
                <th className="py-1 px-2 border-r border-slate-300">Receivable</th>
                <th className="py-1 px-2 border-r border-slate-300">Advance</th>
                <th className="py-1 px-2 border-r border-slate-300">Date</th>
                <th className="py-1 px-2 border-r border-slate-300">Status</th>
                <th className="py-1 px-2">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              {statementResId ? (
                residentPayments.length > 0 ? (
                  residentPayments.map((item, idx) => {
                    const isPaid = item.status?.toLowerCase() === 'paid';
                    const amountNum = Number(item.amount || 0);

                    return (
                      <tr key={idx} className="border-b border-slate-300 text-center hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-left border-r border-slate-300 font-medium text-slate-800">
                          {item.reference_no || 'Monthly HOA Due'}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-300 text-slate-600">
                          ₱{!isPaid ? amountNum.toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-300 text-slate-400">₱0.00</td>
                        <td className="py-2 px-2 border-r border-slate-300 font-medium text-slate-800">
                          ₱{amountNum.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-300 font-bold text-slate-900">
                          ₱{(!isPaid ? amountNum : 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-300 text-slate-500 text-[10px]">
                          {item.paid_at ? new Date(item.paid_at).toLocaleDateString() : '-'}
                        </td>
                        <td className={`py-2 px-2 border-r border-slate-300 uppercase tracking-wider text-[9px] font-black ${isPaid ? 'text-green-600' : 'text-slate-400'}`}>
                          {item.status || 'unpaid'}
                        </td>
                        <td className="py-2 px-2 font-bold text-slate-700">
                          ₱{isPaid ? amountNum.toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400 italic bg-slate-50/30">No transaction records found for this resident account.</td>
                  </tr>
                )
              ) : (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400 italic bg-slate-50/30">Please select an administrative resident profile to load data.</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="border border-t-0 border-slate-300 rounded-b-md px-4 py-3 flex justify-between items-center mb-6 bg-slate-50/80">
            <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Total Ledger Amount Due:</span>
            <span className="text-base font-black text-[#006837]">
              ₱{invTotalDue.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </span>
          </div>

          <div className="mb-6">
            <h4 className="text-[10px] font-black text-[#006837] uppercase tracking-widest border-b border-slate-200 pb-1 mb-2">Breakdown of Current Ledger Dues</h4>
            <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-600">
              <div>
                <p className="flex justify-between w-64"><strong className="text-slate-800">Utilities, Security & Waste:</strong> <span className="font-medium text-slate-900">₱{invTotalDue > 0 ? (invTotalDue * 0.70).toLocaleString(undefined, {minimumFractionDigits: 2}) : "0.00"}</span></p>
                <p className="text-[8px] text-slate-400 mb-1.5">Electricity, water, guard salaries, and trash collection.</p>
              </div>
              <div>
                <p className="flex justify-between w-64"><strong className="text-slate-800">Amenities Fee:</strong> <span className="font-medium text-slate-900">₱{invTotalDue > 0 ? (invTotalDue * 0.15).toLocaleString(undefined, {minimumFractionDigits: 2}) : "0.00"}</span></p>
                <p className="text-[10px] text-slate-500 mb-1.5">Funding for community events and seasonal gatherings.</p>
                <p className="flex justify-between w-64"><strong className="text-slate-800">Repairs & Infrastructure:</strong> <span className="font-medium text-slate-900">₱{invTotalDue > 0 ? (invTotalDue * 0.15).toLocaleString(undefined, {minimumFractionDigits: 2}) : "0.00"}</span></p>
                <p className="text-[8px] text-slate-400">Maintaining road safety features and facility repair.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 border border-slate-200 rounded-md p-4 text-[10px] text-slate-600 bg-slate-50/30">
            <div className="col-span-8 space-y-1">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[9px] text-[#006837]">Instructions and Reminders:</p>
              <p>1. Please send your digital transaction screenshot proof of payment along with this SOA document directly to: <strong className="text-slate-900">chateaurealhoa@gmail.com</strong>.</p>
              <p>2. Subject format template for email submissions: <em className="text-slate-800 font-medium">Complete Name / Block No. / Lot No.</em></p>
              <p>3. Payments are verified and credited within 2-3 operational working business days.</p>
            </div>
            <div className="col-span-4 border-l border-slate-200 pl-4 space-y-1">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[9px] text-[#006837]">Terms and Conditions:</p>
              <p>Assessment cycles are calculated monthly. Past due accounts are subject to immediate administrative collections actions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentReports;