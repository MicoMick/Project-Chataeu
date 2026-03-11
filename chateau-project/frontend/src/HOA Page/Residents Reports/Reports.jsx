import React, { useState } from 'react';
import { 
  Search, MoreHorizontal, Filter, FileText, AlertCircle, CheckCircle2, Clock, Eye, Trash2, Edit, X, User, MapPin, Tag, Calendar, Send,
  ChevronDown,
  ImageIcon,
  Maximize2
} from 'lucide-react';

const Reports = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  // --- ADDED STATE FOR FULL SCREEN IMAGE ---
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  const filters = ['All', 'Pending', 'In Progress', 'Resloved', 'On Hold'];

  const reportData = [
    { id: 1, resident: "Juan Cruz", category: "Maintenance", description: "Leaking Pipe", status: "Resolved", date: "Feb 2, 2026", rptNo: "RPT-001", imageUrl: "https://pinoybuilders.ph/wp-content/uploads/2023/08/iStock-157509845.jpg" },
    { id: 2, resident: "Dela Cruz", category: "Maintenance", description: "Tree Cutting", status: "Resolved", date: "Feb 10, 2026", rptNo: "RPT-002", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcStKvPnDYF4DEW4BlKfrpjJd877ixBl2_bGqQ&s=" },
    { id: 3, resident: "Jose Lito", category: "Noise", description: "Loud Cars", status: "In Progress", date: "Feb 6, 2026", rptNo: "RPT-003", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9_6PjUHQsYsdz6vdhcly0Vuflz3o14PejHw&s" },
    { id: 4, resident: "Maria Clara", category: "Cleanliness", description: "Dog Waste", status: "Pending", date: "Feb 7, 2026", rptNo: "RPT-004", imageUrl: "https://images.gmanews.tv/webpics/2017/08/rescuers-5-STRAY_DOGS_2017_08_20_18_38_38.jpg" },
    { id: 5, resident: "Sisa", category: "Other", description: "Other", status: "On Hold", date: "Feb 15, 2026", rptNo: "RPT-005", imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800" },
  ];

  const filteredReports = reportData.filter((report) => {
    const matchesFilter = activeFilter === 'All' || 
      (activeFilter === 'Resloved' ? report.status === 'Resolved' : report.status === activeFilter);

    const matchesSearch = report.resident.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusStyles = (status) => {
    switch (status) {
      case 'Resolved': 
        return 'bg-green-100 text-green-600';
      case 'In Progress':
        return 'bg-orange-100 text-orange-600';
      case 'Pending':           
        return 'bg-red-100 text-red-600';
      case 'On Hold':
        return 'bg-slate-200 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-500';
    }
  };

  const toggleMenu = (id) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm font-medium">Residents Report Issues</p>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm">
        
        {/* Toolbar */}
        <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all" 
              placeholder="Search Reports..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === filter 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Table Area */}
        <div className="relative">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Residents</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 text-sm font-bold text-slate-700">{report.resident}</td>
                  <td className="px-8 py-5 text-sm text-slate-600 font-medium">{report.category}</td>
                  <td className="px-8 py-5 text-sm text-slate-500">{report.description}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${getStatusStyles(report.status)}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm text-slate-600 font-medium">{report.date}</td>
                  
                  <td className="px-8 py-5 text-right relative">
                    <button 
                      onClick={() => toggleMenu(report.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative z-30"
                    >
                      <MoreHorizontal size={20} />
                    </button>

                    {openMenuId === report.id && (
                      <>
                        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenMenuId(null)}></div>
                        <div className="absolute right-8 top-12 w-40 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5">
                          <div className="p-1.5">
                            <button 
                              onClick={() => {
                                setSelectedReport(report);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                              View Details
                            </button>
                            <div className="my-1 border-t border-slate-50"></div>
                            <button className="w-full flex items-center px-4 py-2.5 text-[11px] font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- REPORT DETAILS OVERLAY --- */}
        {selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="p-6 flex justify-between items-start shrink-0">
                <div>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 w-fit ${getStatusStyles(selectedReport.status)}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${selectedReport.status === 'Resolved' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                        {selectedReport.status}
                    </span>
                </div>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div className="px-8 pb-10 overflow-y-auto custom-scrollbar">
                {/* Title Section */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedReport.description}</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{selectedReport.rptNo}</p>
                </div>

                {/* Metadata Grid */}
                <div className="flex flex-wrap gap-6 mb-8 text-slate-500">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <User size={18} className="text-slate-300" /> {selectedReport.resident}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <MapPin size={18} className="text-slate-300" /> Unit 5-B
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Tag size={18} className="text-slate-300" /> {selectedReport.category}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar size={18} className="text-slate-300" /> {selectedReport.date}
                    </div>
                </div>

                {/* --- UPDATED: REPORT IMAGE VIEW WITH CLICK TO VIEW --- */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                        <ImageIcon size={18} className="text-slate-400" /> Attached Photo
                    </h3>
                    <div 
                      onClick={() => setIsImageExpanded(true)}
                      className="relative cursor-pointer w-full h-64 rounded-3xl overflow-hidden border border-slate-100 bg-slate-50"
                    >
                        <img 
                          src={selectedReport.imageUrl} 
                          alt="Report attachment" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="bg-white/90 p-3 rounded-full shadow-lg">
                                <Maximize2 size={20} className="text-slate-900" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resident's Message */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                        <FileText size={18} className="text-slate-400" /> Resident's Message
                    </h3>
                    <div className="bg-slate-50/80 p-6 rounded-2xl text-slate-500 text-sm leading-relaxed font-medium border border-slate-100">
                        The issue was noticed earlier today. We require immediate assistance as this affects the daily convenience of the residents in this unit.
                    </div>
                </div>

                {/* Previous Feedback */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Previous Admin Feedback</h3>
                    <div className="bg-blue-50/40 p-6 rounded-2xl border border-blue-100/50">
                        <p className="text-slate-600 text-sm leading-relaxed mb-3 font-medium">
                            Acknowledged. Our team has been notified and is currently coordinating for the necessary repairs.
                        </p>
                        <p className="text-slate-400 text-[11px] font-bold">Sent on February 13, 2026</p>
                    </div>
                </div>

                <div className="border-t border-slate-100 my-8"></div>

                {/* New Feedback Form */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Send Feedback to Resident</h3>
                    
                    <div className="relative w-48">
                        <select className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer">
                            <option>Pending</option>
                            <option selected>In Progress</option>
                            <option>Resolved</option>
                            <option>On Hold</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>

                    <textarea 
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                        rows="4"
                        placeholder="Write your feedback or response to the resident..."
                    ></textarea>

                    <button className="flex items-center gap-2 bg-[#1e3a6a] hover:bg-[#152a4d] text-white px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-indigo-900/10">
                        <Send size={16} /> Send Feedback
                    </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- FULL SCREEN IMAGE LIGHTBOX --- */}
        {isImageExpanded && selectedReport && (
          <div 
            className="fixed inset-0 z-[200] bg-slate-900/95 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setIsImageExpanded(false)}
          >
            <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
              <X size={32} />
            </button>
            <img 
              src={selectedReport.imageUrl} 
              alt="Expanded view" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            />
          </div>
        )}

        {filteredReports.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">No reports found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;