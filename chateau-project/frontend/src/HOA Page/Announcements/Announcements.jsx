import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Clock, FileEdit, Eye, Plus, 
  Search, ChevronDown, MoreVertical, Pin, 
  AlertTriangle, MessageSquare, X, Paperclip, 
  Calendar, Trash2, Share2, Send, CheckCircle2
} from 'lucide-react';

const Announcements = () => {
  const [activeCategory, setActiveCategory] = useState('All Categories');
  const [activeStatus, setActiveStatus] = useState('All Status');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  // --- NEW STATES FOR OVERLAYS AND LOGIC ---
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showDetailsOverlay, setShowDetailsOverlay] = useState(false);
  const [showCommentsOverlay, setShowCommentsOverlay] = useState(false);
  const [showEditOverlay, setShowEditOverlay] = useState(false);

  // --- TOAST STATE ---
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // --- FORM STATES ---
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newContent, setNewContent] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [newComment, setNewComment] = useState('');

  const [announcements, setAnnouncements] = useState([
    {
      id: 1,
      title: "Water Interruption Notice",
      content: "There will be a scheduled water interruption on February 10, 2026 from 8:00 AM to 5:00 PM for maintenance...",
      date: "Feb 2, 2026, 9:00 AM",
      author: "Maria Santos",
      views: 342,
      comments: [
        { id: 1, user: "Resident User", text: "This is very helpful, thank you!", time: "2h ago" }
      ],
      category: "Maintenance",
      isPinned: true,
      isAlert: true,
      status: "published"
    },
    {
      id: 2,
      title: "Annual HOA Meeting Schedule",
      content: "Annual community meeting regarding upcoming projects and budget approvals.",
      date: "Feb 2, 2026, 9:00 AM",
      author: "Maria Santos",
      views: 342,
      comments: [],
      category: "General",
      status: "published"
    }
  ]);

  // --- DELETE LOGIC ---
  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this announcement?")) {
      setAnnouncements(announcements.filter(ann => ann.id !== id));
      setOpenMenuId(null);
      showToast("Announcement deleted successfully", "error");
    }
  };

  // --- EDIT LOGIC ---
  const handleOpenEdit = (ann) => {
    setSelectedAnnouncement(ann);
    setNewTitle(ann.title);
    setNewCategory(ann.category);
    setNewContent(ann.content);
    setIsEmergency(ann.isAlert);
    setShowEditOverlay(true);
    setOpenMenuId(null);
  };

  const handleUpdateAnnouncement = (status) => {
    if (!newTitle || !newContent) {
      showToast("Please fill in all required fields", "error");
      return;
    }
    setAnnouncements(announcements.map(ann => 
      ann.id === selectedAnnouncement.id 
        ? { ...ann, title: newTitle, content: newContent, category: newCategory, isAlert: isEmergency, status: status }
        : ann
    ));
    setShowEditOverlay(false);
    resetForm();
    showToast(`Announcement updated as ${status}`);
  };

  // --- COMMENT LOGIC ---
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const commentObj = {
      id: Date.now(),
      user: "Admin User",
      text: newComment,
      time: "Just now"
    };
    setAnnouncements(announcements.map(ann => 
      ann.id === selectedAnnouncement.id 
        ? { ...ann, comments: [...ann.comments, commentObj] }
        : ann
    ));
    setSelectedAnnouncement(prev => ({...prev, comments: [...prev.comments, commentObj]}));
    setNewComment('');
    showToast("Comment added");
  };

  const handleDeleteComment = (commentId) => {
    if (!window.confirm("Delete this comment?")) return;

    setAnnouncements(announcements.map(ann => 
      ann.id === selectedAnnouncement.id 
        ? { ...ann, comments: ann.comments.filter(c => c.id !== commentId) }
        : ann
    ));
    
    setSelectedAnnouncement(prev => ({
      ...prev,
      comments: prev.comments.filter(c => c.id !== commentId)
    }));
    showToast("Comment removed", "error");
  };

  const resetForm = () => {
    setNewTitle('');
    setNewContent('');
    setNewCategory('General');
    setIsEmergency(false);
    setSelectedAnnouncement(null);
  };

  const handleAddAnnouncement = (status) => {
    if (!newTitle || !newContent) {
      showToast("Title and Content are required", "error");
      return;
    }

    const newEntry = {
      id: Date.now(),
      title: newTitle,
      content: newContent,
      date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
      author: "Admin User",
      views: 0,
      comments: [],
      category: newCategory,
      isPinned: false,
      isAlert: isEmergency,
      status: status
    };
    setAnnouncements([newEntry, ...announcements]);
    setShowModal(false);
    resetForm();
    showToast(`Announcement ${status} successfully`);
  };

  const handleTogglePin = (id) => {
    setAnnouncements(announcements.map(ann => 
      ann.id === id ? { ...ann, isPinned: !ann.isPinned } : ann
    ));
    setOpenMenuId(null);
    showToast("Pin status updated");
  };

  const stats = [
    { label: 'Published', count: announcements.filter(a => a.status === 'published').length, icon: Megaphone, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Scheduled', count: 0, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Drafts', count: announcements.filter(a => a.status === 'draft').length, icon: FileEdit, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: 'Total Views', count: announcements.reduce((acc, curr) => acc + (curr.views || 0), 0), icon: Eye, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  ];

  const filteredAnnouncements = announcements
    .filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'All Categories' || item.category === activeCategory;
      const matchesStatus = activeStatus === 'All Status' || 
                            (activeStatus === 'Published' && item.status === 'published') || 
                            (activeStatus === 'Drafts' && item.status === 'draft');
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

  return (
    <div className="p-8 bg-slate-50 min-h-screen relative">
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          background: transparent; bottom: 0; color: transparent; cursor: pointer;
          height: auto; left: 0; position: absolute; right: 0; top: 0; width: auto;
        }
      `}</style>

      {/* --- TOAST NOTIFICATION --- */}
      {toast.show && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl border ${
            toast.type === 'success' ? 'bg-white border-green-100' : 'bg-white border-red-100'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="text-green-500" size={20} />
            ) : (
              <AlertTriangle className="text-red-500" size={20} />
            )}
            <p className={`text-sm font-bold ${toast.type === 'success' ? 'text-slate-800' : 'text-red-900'}`}>
              {toast.message}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="text-slate-500 text-sm">Post and manage community announcements.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
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

      {/* Filters */}
      <div className="flex justify-between items-center mb-6 gap-4">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
            placeholder="Search Announcements..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <select value={activeStatus} onChange={(e) => setActiveStatus(e.target.value)} className="pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none appearance-none relative">
            <option>All Status</option>
            <option>Published</option>
            <option>Drafts</option>
          </select>
          <select value={activeCategory} onChange={(e) => setActiveCategory(e.target.value)} className="pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none appearance-none">
            <option>All Categories</option>
            <option>Maintenance</option>
            <option>General</option>
            <option>Financial</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {activeStatus === 'Drafts' && filteredAnnouncements.length === 0 ? (
          <div className="bg-white p-12 rounded-[24px] border border-dashed border-slate-200 text-center">
            <FileEdit size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium text-lg">There is no Drafts Yet</p>
          </div>
        ) : (
          filteredAnnouncements.map((item) => (
            <div key={item.id} className={`bg-white p-6 rounded-[24px] border ${item.isAlert ? 'border-red-100' : 'border-slate-100'} shadow-sm relative group transition-all hover:shadow-md`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {item.isPinned && <Pin size={16} className="text-indigo-600 fill-indigo-600 rotate-45" />}
                    {item.isAlert && <AlertTriangle size={16} className="text-red-500" />}
                    <h3 className="font-bold text-slate-900 text-lg">{item.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${item.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-600'}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mb-4 leading-relaxed max-w-4xl">{item.content}</p>
                  <div className="flex items-center gap-6 text-slate-400 text-xs font-medium">
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {item.date}</span>
                    <span>By {item.author}</span>
                    <span className="flex items-center gap-1.5"><Eye size={14} /> {item.views} views</span>
                    <span className="flex items-center gap-1.5"><MessageSquare size={14} /> {item.comments?.length || 0}</span>
                    <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">{item.category}</span>
                  </div>
                </div>

                <div className="relative">
                  <button onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg">
                    <MoreVertical size={20} />
                  </button>
                  {openMenuId === item.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)}></div>
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-20">
                        <button onClick={() => { setSelectedAnnouncement(item); setShowDetailsOverlay(true); setOpenMenuId(null); }} className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">View Details</button>
                        <button onClick={() => { setSelectedAnnouncement(item); setShowCommentsOverlay(true); setOpenMenuId(null); }} className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">View Comments</button>
                        <button onClick={() => handleOpenEdit(item)} className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">Edit Announcement</button>
                        <button onClick={() => handleTogglePin(item.id)} className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">{item.isPinned ? 'Unpin' : 'Pin to Top'}</button>
                        <div className="my-1 border-t border-slate-50"></div>
                        <button onClick={() => handleDelete(item.id)} className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium"><Trash2 size={16} className="mr-2"/> Delete</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- EDIT / CREATE MODAL --- */}
      {(showModal || showEditOverlay) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{showEditOverlay ? 'Edit Announcement' : 'Create Announcement'}</h2>
                <p className="text-slate-500 text-sm">Post a new announcement to residents.</p>
              </div>
              <button onClick={() => { setShowModal(false); setShowEditOverlay(false); }} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Enter Announcement Title" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none">
                  <option>Maintenance</option><option>General</option><option>Financial</option><option>Election</option><option>Security</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Content</label>
                <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Write your announcement here..." rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none resize-none" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Attachments</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 cursor-pointer">
                  <Paperclip className="text-slate-400" size={24} />
                  <span className="text-sm text-slate-500">Click to attach images or PDF files</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                <div className="flex gap-3">
                  <AlertTriangle className="text-red-500" size={20} />
                  <div>
                    <p className="text-sm font-bold text-red-900">Emergency / High Priority</p>
                    <p className="text-xs text-red-600">Highlights this announcement in red</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isEmergency} onChange={(e) => setIsEmergency(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-red-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Start Date</label>
                  <div className="relative">
                    <input type="date" className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                    <Calendar size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">End Date</label>
                  <div className="relative">
                    <input type="date" className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                    <Calendar size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => showEditOverlay ? handleUpdateAnnouncement('draft') : handleAddAnnouncement('draft')} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100">
                Save as Draft
              </button>
              <button onClick={() => showEditOverlay ? handleUpdateAnnouncement('published') : handleAddAnnouncement('published')} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">
                {showEditOverlay ? 'Update Now' : 'Publish Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW COMMENTS MODAL --- */}
      {showCommentsOverlay && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Comments</h2>
                <p className="text-slate-500 text-sm">{selectedAnnouncement?.title}</p>
              </div>
              <button onClick={() => { setShowCommentsOverlay(false); setSelectedAnnouncement(null); }} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 h-[400px] overflow-y-auto bg-slate-50/50 space-y-4">
              {selectedAnnouncement?.comments.length > 0 ? (
                selectedAnnouncement.comments.map((c) => (
                  <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-slate-900 text-sm">{c.user}</span>
                        <span className="text-slate-400 text-[10px]">{c.time}</span>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed">{c.text}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteComment(c.id)}
                      className="ml-4 p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete Comment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <MessageSquare size={32} />
                  <p className="text-sm">No comments yet. Be the first to reply!</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 items-center">
              <input 
                type="text" 
                value={newComment} 
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..." 
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button 
                onClick={handleAddComment}
                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW DETAILS MODAL --- */}
      {showDetailsOverlay && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${selectedAnnouncement?.isAlert ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {selectedAnnouncement?.category}
                </div>
                <button onClick={() => setShowDetailsOverlay(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">{selectedAnnouncement?.title}</h2>
              <div className="flex items-center gap-4 text-slate-500 text-xs mb-8 pb-6 border-b border-slate-100">
                <span className="flex items-center gap-1.5"><Clock size={14} /> {selectedAnnouncement?.date}</span>
                <span>By {selectedAnnouncement?.author}</span>
                <span className="flex items-center gap-1.5"><Eye size={14} /> {selectedAnnouncement?.views} views</span>
              </div>
              <p className="text-slate-600 leading-relaxed mb-8">{selectedAnnouncement?.content}</p>
              <div className="flex justify-end">
                <button onClick={() => setShowDetailsOverlay(false)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;