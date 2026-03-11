import React, { useState, useEffect } from 'react';
import { 
  Search, Download, Plus, MoreHorizontal, 
  CreditCard, AlertCircle, CheckCircle2, DollarSign,
  Edit2, Trash2, Bell, FileText, Upload, XCircle, X
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, iconColor, bgColor }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between flex-1">
    <div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
      <h3 className="text-3xl font-bold text-slate-900 mt-1">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${bgColor}`}>
      <Icon size={24} className={iconColor} />
    </div>
  </div>
);

const Payment = () => {
  const [activeTab, setActiveTab] = useState('all-payments');
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false); 
  const [autoNotify, setAutoNotify] = useState(true);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleActionClick = (e, id) => {
    e.stopPropagation();
    if (openMenuId === id) {
      setOpenMenuId(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const menuHeight = 240; 
      const spaceBelow = window.innerHeight - rect.bottom;
      
      let topPosition;
      if (spaceBelow < menuHeight) {
        topPosition = rect.top + window.scrollY - menuHeight - 8;
      } else {
        topPosition = rect.bottom + window.scrollY + 8;
      }

      setMenuPosition({
        top: topPosition,
        left: rect.left + window.scrollX - 190 
      });
      setOpenMenuId(id);
    }
  };

  // Updated payments array
  const payments = [
    { id: 1, name: "Juan Dela Cruz", address: "Blk 15 Lot 18 Gumamela St. Phase 1", type: "Monthly Dues", amount: "₱2,500", dueDate: "Jan 15, 2024", status: "Paid", paidDate: "Jan 15, 2024" },
    { id: 4, name: "Ana Garcia", address: "Blk 12 Lot 5 Jasmine St. Phase 2", type: "Monthly Dues", amount: "₱2,500", dueDate: "Jan 15, 2024", status: "Overdue", paidDate: "Jan 15, 2024" },
  ];

  // Logic added to filter payments based on name
  const filteredPayments = payments.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-600';
      case 'Pending': return 'bg-orange-100 text-orange-600';
      case 'Overdue': return 'bg-red-100 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const ModalOverlay = ({ title, subtitle, isOpen, onClose, children, actionLabel }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in duration-200 overflow-hidden">
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              {children}
            </div>

            <div className="flex gap-3 mt-10">
              <button onClick={onClose} className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all">
                Cancel
              </button>
              <button className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                {actionLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <ModalOverlay 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="Add Fee Category"
        subtitle="Adding Fee Category"
        actionLabel="Add Category"
      >
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Category Name</label>
            <input type="text" placeholder="e.g Monthly Dues" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Standard Rate (₱)</label>
              <input type="text" placeholder="0.00" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Billing Cycle</label>
              <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none">
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>One-time</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Grace Period (days)</label>
            <input type="text" placeholder="e.g 5" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Automated Notifications</p>
              <p className="text-xs text-slate-500">Send reminder 3 days before due date</p>
            </div>
            <button 
              onClick={() => setAutoNotify(!autoNotify)}
              className={`w-12 h-6 rounded-full transition-colors relative ${autoNotify ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoNotify ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </ModalOverlay>

      <ModalOverlay 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Due settings"
        subtitle="Residents Transaction Details"
        actionLabel="Save Changes"
      >
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Category Name</label>
            <input type="text" defaultValue="Juan Dela Cruz" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Standard Rate (₱)</label>
              <input type="text" defaultValue="2,500" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Billing Cycle</label>
              <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>One-time</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Grace Period (days)</label>
            <input type="text" defaultValue="5%" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Automated Notifications</p>
              <p className="text-xs text-slate-500">Send reminder 3 days before due date</p>
            </div>
            <button 
              onClick={() => setAutoNotify(!autoNotify)}
              className={`w-12 h-6 rounded-full transition-colors relative ${autoNotify ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoNotify ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </ModalOverlay>

      <ModalOverlay 
        isOpen={isEditTransactionOpen} 
        onClose={() => setIsEditTransactionOpen(false)}
        title="Edit Transaction"
        subtitle="Update Resident Payment Details"
        actionLabel="Update Transaction"
      >
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Resident Name</label>
            <input type="text" defaultValue="Juan Dela Cruz" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Amount (₱)</label>
              <input type="text" defaultValue="2,500" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Payment Status</label>
              <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option>Paid</option>
                <option>Pending</option>
                <option>Overdue</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Due Date</label>
              <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Payment Type</label>
              <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option>Monthly Dues</option>
                <option>Parking Fee</option>
                <option>Special Assessment</option>
              </select>
            </div>
          </div>
        </div>
      </ModalOverlay>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Payment Management</h1>
        <p className="text-slate-500 text-sm">Manage dues, view payments, and generate financial reports.</p>
      </div>

      {/* Updated Stats Grid */}
      <div className="flex flex-wrap gap-6 mb-8">
        <StatCard title="Total Collected" value="₱5,000" icon={DollarSign} iconColor="text-indigo-600" bgColor="bg-indigo-50" />
        <StatCard title="Pending Payments" value="0" icon={CreditCard} iconColor="text-blue-600" bgColor="bg-blue-50" />
        <StatCard title="Overdue" value="1" icon={AlertCircle} iconColor="text-red-600" bgColor="bg-red-50" />
        <StatCard title="Paid This Month" value="1" icon={CheckCircle2} iconColor="text-indigo-600" bgColor="bg-indigo-50" />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('all-payments')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'all-payments' ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          All Payments
        </button>
        <button 
          onClick={() => setActiveTab('due-settings')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'due-settings' ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Due Settings
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {activeTab === 'all-payments' ? (
          <>
            <div className="p-6 border-b border-slate-50 flex justify-between items-center gap-4">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search Payments..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
                <Download size={18} /> Export CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Address</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Type</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Paid Date</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {/* Updated to map over filteredPayments */}
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{p.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{p.address}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{p.type}</td>
                      <td className="px-6 py-4 text-sm text-slate-900 font-bold">{p.amount}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{p.dueDate}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${getStatusStyle(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{p.paidDate}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => handleActionClick(e, p.id)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          <MoreHorizontal size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {openMenuId && (
              <div 
                className="fixed w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-[9999] overflow-hidden py-2 animate-in fade-in zoom-in duration-200"
                style={{ top: menuPosition.top, left: menuPosition.left }}
                onClick={(e) => e.stopPropagation()}
              >
                <button className="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center">
                  Send Reminder
                </button>
                <button className="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center">
                  Download Receipt
                </button>
                <button className="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center">
                  Upload Proof Payment
                </button>
                <button 
                  onClick={() => { setIsEditTransactionOpen(true); setOpenMenuId(null); }}
                  className="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center border-t border-slate-50 mt-1 pt-3"
                >
                  Edit Transaction
                </button>
                <button className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-500 hover:bg-red-50 flex items-center">
                  Void / Cancel
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Fee Categories & Rules</h2>
                <p className="text-slate-500 text-sm mt-1">Define payment types, rates, penalties and notification settings.</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
              >
                <Plus size={18} /> Add Category
              </button>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rate (₱)</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Billing Cycle</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Grace Period</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Auto Notify</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-6 py-6 text-sm font-bold text-slate-900">Monthly Dues</td>
                    <td className="px-6 py-6 text-sm font-bold text-slate-900">₱2,500</td>
                    <td className="px-6 py-6 text-sm text-slate-600">Monthly</td>
                    <td className="px-6 py-6 text-sm text-slate-600">5%</td>
                    <td className="px-6 py-6 text-center">
                        <div className="inline-flex items-center cursor-pointer">
                          <div className={`w-10 h-5 rounded-full relative transition-colors ${autoNotify ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                               <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoNotify ? 'right-1' : 'left-1'}`}></div>
                          </div>
                        </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                        <div className="flex gap-4 justify-end">
                          <button 
                            onClick={() => setIsEditModalOpen(true)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                        </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payment;