import React, { useState } from 'react';
import { 
  Megaphone, Clock, FileEdit, Eye, Plus, 
  Search, ChevronDown, MoreVertical, Pin, 
  AlertTriangle, MessageSquare, X, Paperclip, 
  Calendar, Trash2, Share2
} from 'lucide-react';

const Announcements = () => {
  const [activeCategory, setActiveCategory] = useState('All Categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  // --- NEW STATES FOR OVERLAYS AND LOGIC ---
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showDetailsOverlay, setShowDetailsOverlay] = useState(false);
  const [showCommentsOverlay, setShowCommentsOverlay] = useState(false);

  const [announcements, setAnnouncements] = useState([
    {
      id: 1,
      title: "Water Interruption Notice",
      content: "There will be a scheduled water interruption on February 10, 2026 from 8:00 AM to 5:00 PM for maintenance...",
      date: "Feb 2, 2026, 9:00 AM",
      author: "Maria Santos",
      views: 342,
      comments: 1,
      category: "Maintenance",
      isPinned: true,
      isAlert: true,
      status: "published"
    },
    {
      id: 2,
      title: "Annual HOA Meeting Schedule",
      content: "There will be a scheduled water interruption on February 10, 2026 from 8:00 AM to 5:00 PM for maintenance...",
      date: "Feb 2, 2026, 9:00 AM",
      author: "Maria Santos",
      views: 342,
      comments: 0,
      category: "General",
      status: "published"
    },
    {
      id: 3,
      title: "Monthly Dues Reminder",
      content: "There will be a scheduled water interruption on February 10, 2026 from 8:00 AM to 5:00 PM for maintenance...",
      date: "Feb 2, 2026, 9:00 AM",
      author: "Maria Santos",
      views: 342,
      comments: 0,
      category: "Financial",
      status: "published"
    },
    {
      id: 4,
      title: "Election Nominations Open",
      content: "There will be a scheduled water interruption on February 10, 2026 from 8:00 AM to 5:00 PM for maintenance...",
      date: "Feb 2, 2026, 9:00 AM",
      author: "Maria Santos",
      views: 342,
      comments: 0,
      category: "Election",
      status: "published"
    }
  ]);

  // --- PIN/UNPIN LOGIC ---
  const handleTogglePin = (id) => {
    setAnnouncements(announcements.map(ann => 
      ann.id === id ? { ...ann, isPinned: !ann.isPinned } : ann
    ));
    setOpenMenuId(null);
  };

  const stats = [
    { label: 'Published', count: 4, icon: Megaphone, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Scheduled', count: 4, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Drafts', count: 0, icon: FileEdit, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: 'Total Views', count: 342, icon: Eye, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  ];

  // --- SORTED AND FILTERED LOGIC ---
  const filteredAnnouncements = announcements
    .filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'All Categories' || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // Pinned items (true) come before unpinned items (false)
      if (a.isPinned === b.isPinned) return 0;
      return a.isPinned ? -1 : 1;
    });

  return (
    <div className="p-8 bg-slate-50 min-h-screen relative">
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="text-slate-500 text-sm">Post and manage community announcements.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
        >
          <Plus size={18} /> New Announcement
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
              <stat.icon size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stat.count}</div>
              <div className="text-xs font-medium text-slate-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex justify-between items-center mb-6 gap-4">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" 
            placeholder="Search Announcements..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <select 
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none"
          >
            <option>All Categories</option>
            <option>Maintenance</option>
            <option>General</option>
            <option>Financial</option>
            <option>Election</option>
            <option>Security</option>
            <option>Events</option>
            <option>Promotions</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((item) => (
            <div 
              key={item.id} 
              className={`bg-white p-6 rounded-[24px] border ${item.isAlert ? 'border-red-100' : 'border-slate-100'} shadow-sm relative group transition-all hover:shadow-md`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {item.isPinned && <Pin size={16} className="text-indigo-600 fill-indigo-600 rotate-45" />}
                    {item.isAlert && <AlertTriangle size={16} className="text-red-500" />}
                    <h3 className="font-bold text-slate-900 text-lg">{item.title}</h3>
                    <span className="px-2.5 py-0.5 bg-green-100 text-green-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                      {item.status}
                    </span>
                  </div>
                  
                  <p className="text-slate-500 text-sm mb-4 leading-relaxed max-w-4xl">
                    {item.content}
                  </p>

                  <div className="flex items-center gap-6 text-slate-400 text-xs font-medium">
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {item.date}</span>
                    <span>By {item.author}</span>
                    <span className="flex items-center gap-1.5"><Eye size={14} /> {item.views} views</span>
                    <span className="flex items-center gap-1.5"><MessageSquare size={14} /> {item.comments}</span>
                    <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">{item.category}</span>
                  </div>
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                  >
                    <MoreVertical size={20} />
                  </button>

                  {openMenuId === item.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)}></div>
                      
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-20 animate-in fade-in zoom-in duration-150 origin-top-right">
                        <button 
                          onClick={() => { setSelectedAnnouncement(item); setShowDetailsOverlay(true); setOpenMenuId(null); }}
                          className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => { setSelectedAnnouncement(item); setShowCommentsOverlay(true); setOpenMenuId(null); }}
                          className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          View Comments
                        </button>
                        <button className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                          Edit Announcement
                        </button>
                        <button 
                          onClick={() => handleTogglePin(item.id)}
                          className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          {item.isPinned ? 'Unpin' : 'Pin to Top'}
                        </button>
                        <div className="my-1 border-t border-slate-50"></div>
                        <button className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium">
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-[24px] border border-dashed border-slate-200">
            <p className="text-slate-500">No announcements found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* --- VIEW DETAILS OVERLAY --- */}
      {showDetailsOverlay && selectedAnnouncement && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Announcement Details</h2>
                <p className="text-slate-500 text-sm">Reviewing published information.</p>
              </div>
              <button onClick={() => setShowDetailsOverlay(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium">
                  {selectedAnnouncement.title}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900">
                  {selectedAnnouncement.category}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Content</label>
                <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 leading-relaxed min-h-[100px]">
                  {selectedAnnouncement.content}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Author</label>
                  <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900">
                    {selectedAnnouncement.author}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Date Posted</label>
                  <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900">
                    {selectedAnnouncement.date}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setShowDetailsOverlay(false)}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW COMMENTS OVERLAY --- */}
      {showCommentsOverlay && selectedAnnouncement && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Comments</h2>
                <p className="text-slate-500 text-sm">Engagement for "{selectedAnnouncement.title}"</p>
              </div>
              <button onClick={() => setShowCommentsOverlay(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto bg-slate-50/50">
              {selectedAnnouncement.comments > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-slate-900">Resident User</span>
                      <span className="text-[10px] text-slate-400">2h ago</span>
                    </div>
                    <p className="text-sm text-slate-600">This is very helpful, thank you for the update!</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-slate-400 text-sm font-medium">No comments yet on this post.</p>
                </div>
              )}
            </div>
            <div className="p-6 bg-white border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowCommentsOverlay(false)}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW ANNOUNCEMENT MODAL OVERLAY */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Create Announcement</h2>
                <p className="text-slate-500 text-sm">Post a new announcement to residents.</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                <input 
                  type="text"
                  placeholder="Enter Announcement Title"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                <div className="relative">
                  <select className="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none">
                    <option>Select Category</option>
                    <option>Maintenance</option>
                    <option>General</option>
                    <option>Financial</option>
                    <option>Election</option>
                    <option>Security</option>
                    <option>Events</option>
                    <option>Promotions</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Target Audience</label>
                <div className="relative">
                  <select className="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none">
                    <option>All Residents</option>
                    <option>Homeowners Only</option>
                    <option>Tenants Only</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Content</label>
                <textarea 
                  placeholder="Write your announcement here..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Attachments</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer">
                  <Paperclip className="text-slate-400" size={24} />
                  <span className="text-sm text-slate-500">Click to attach images or PDF files</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                <div className="flex gap-3">
                  <AlertTriangle className="text-red-500" size={20} />
                  <div>
                    <p className="text-sm font-bold text-red-900">Emergency / High Priority</p>
                    <p className="text-xs text-red-600">Highlights this announcement in red for residents</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Start Date</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                    />
                    <Calendar size={22} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">End Date</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                    />
                    <Calendar size={22} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-bold text-slate-700">Send Notification</p>
                  <p className="text-xs text-slate-500">Notify residents via email/push</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors"
              >
                Save as Draft
              </button>
              <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                Publish Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;