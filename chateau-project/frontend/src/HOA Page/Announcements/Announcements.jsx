import React, { useState, useEffect, useRef } from 'react';
import { Megaphone, Clock, FileEdit, Plus, Search, MoreVertical, Pin, AlertTriangle, X, Paperclip, Calendar, Trash2, Send, CheckCircle2, FileIcon, Loader2, MessageSquare, Eye
} from 'lucide-react';
import { supabase } from '../supabaseAdmin';
import logger from '../auditlogger';

// --- ADDED: RequireRole Component ---
const RequireRole = ({ userRole, allowedRoles, children }) => {
  if (allowedRoles.includes(userRole) || userRole === 'super_admin') {
    return children;
  }
  return null; 
};

// --- ADDED: Helper function to determine category colors ---
const getCategoryColor = (category) => {
  switch (category?.toLowerCase()) {
    case 'general':
    case 'financial':
      return 'bg-green-100 text-green-700';
    case 'event':
      return 'bg-blue-100 text-blue-700';
    case 'maintenance':
      return 'bg-orange-100 text-orange-700';
    case 'election':
      return 'bg-red-100 text-red-700';
    case 'security':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

const Announcements = () => {
  const [activeCategory, setActiveCategory] = useState('All Categories');
  const [activeStatus, setActiveStatus] = useState('All Status');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showDetailsOverlay, setShowDetailsOverlay] = useState(false);
  const [showCommentsOverlay, setShowCommentsOverlay] = useState(false);
  const [showEditOverlay, setShowEditOverlay] = useState(false);
  
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [pendingPublishItem, setPendingPublishItem] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState(null);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // --- ADDED: Get Current Role ---
  const currentUserRole = localStorage.getItem('userRole') || 'resident';

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newContent, setNewContent] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- EXISTING LOG ACTION FUNCTION ---
  const logAction = async (action, details) => {
    try {
      await supabase.from('system_logs').insert([{
        activity: action,      
        severity: 'info',       
        user_email: 'chateauadmin@gmail.com', 
        details: details        
      }]);
    } catch (err) {
      console.error("Logging error:", err);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('announcements')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('announcements')
        .getPublicUrl(filePath);

      setAttachmentUrl(data.publicUrl);
      
      // --- ADDED: Audit Trail for File Upload ---
      await logAction('File Upload', `Uploaded an attachment to announcements: ${fileName}`);

      showToast("File uploaded successfully");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      
      await logAction('Delete', `Deleted announcement ID: ${id}`);
      
      setAnnouncements(announcements.filter(ann => ann.id !== id));
      setOpenMenuId(null);
      showToast("Announcement deleted successfully", "error");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleOpenEdit = (ann) => {
    setSelectedAnnouncement(ann);
    setNewTitle(ann.title);
    setNewCategory(ann.category);
    setNewContent(ann.content);
    setIsEmergency(ann.is_emergency);
    setStartDate(ann.start_date);
    setEndDate(ann.end_date);
    setAttachmentUrl(ann.attachment_url || ''); 
    setShowEditOverlay(true);
    setOpenMenuId(null);
  };

  const handleUpdateAnnouncement = async (status) => {
    if (!selectedAnnouncement || !selectedAnnouncement.id) {
      showToast("Error: Announcement not selected", "error");
      return;
    }

    if (!newTitle || !newContent) {
      showToast("Please fill in all required fields", "error");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('announcements')
        .update({
          title: newTitle,
          content: newContent,
          category: newCategory,
          is_emergency: isEmergency,
          status: status,
          start_date: startDate,
          end_date: endDate,
          attachment_url: attachmentUrl 
        })
        .eq('id', selectedAnnouncement.id); 

      if (error) throw error;

      await logAction('Update', `Updated announcement: ${newTitle} (Status: ${status})`);

      if (status === 'published') {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert([{
            title: isEmergency ? `🚨 EMERGENCY: ${newTitle}` : `New Announcement: ${newTitle}`,
            message: newContent.substring(0, 100) + "...",
            is_read: false,
            created_at: new Date().toISOString()
          }]);
        if (notifError) console.error("Notification Error:", notifError);
      }

      fetchAnnouncements();
      setShowEditOverlay(false);
      resetForm();
      showToast(`Announcement updated as ${status}`);
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const commentObj = {
      id: Date.now(),
      user: "Admin User",
      text: newComment,
      time: "Just now"
    };
    
    await logAction('Comment', `Added comment to: ${selectedAnnouncement.title}`);

    setAnnouncements(announcements.map(ann => 
      ann.id === selectedAnnouncement.id 
        ? { ...ann, comments: [...(ann.comments || []), commentObj] }
        : ann
    ));
    setSelectedAnnouncement(prev => ({...prev, comments: [...(prev.comments || []), commentObj]}));
    setNewComment('');
    showToast("Comment added");
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    
    await logAction('Delete Comment', `Removed comment from: ${selectedAnnouncement.title}`);

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
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setAttachmentUrl(''); 
    setSelectedAnnouncement(null);
  };

  const handleAddAnnouncement = async (status) => {
    if (!newTitle || !newContent) {
      showToast("Title and Content are required", "error");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert([{
          title: newTitle,
          content: newContent,
          category: newCategory,
          is_emergency: isEmergency,
          status: status,
          start_date: startDate,
          end_date: endDate,
          author_name: "Admin User",
          attachment_url: attachmentUrl 
        }])
        .select();

      if (error) throw error;
      
      await logAction('Create', `Created new announcement: ${newTitle} (Status: ${status})`);

      if (status === 'published') {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert([{
            title: isEmergency ? `🚨 EMERGENCY: ${newTitle}` : `Announcement: ${newTitle}`,
            message: newContent.substring(0, 100) + "...",
            is_read: false,
            created_at: new Date().toISOString()
          }]);
        if (notifError) console.error("Notification Error:", notifError);
      }

      fetchAnnouncements();
      setShowModal(false);
      resetForm();
      showToast(`Announcement ${status} successfully`);
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleConfirmPublish = async () => {
    if (!pendingPublishItem) return;
    
    setSelectedAnnouncement(pendingPublishItem);
    setNewTitle(pendingPublishItem.title);
    setNewContent(pendingPublishItem.content);
    setNewCategory(pendingPublishItem.category);
    setIsEmergency(pendingPublishItem.is_emergency);
    setStartDate(pendingPublishItem.start_date);
    setEndDate(pendingPublishItem.end_date);
    setAttachmentUrl(pendingPublishItem.attachment_url); 
    
    await handleUpdateAnnouncement('published');
    setShowPublishConfirm(false);
    setPendingPublishItem(null);
  };

  const handleTogglePin = async (id) => {
    try {
      const target = announcements.find(a => a.id === id);
      const newPinnedStatus = !target.is_pinned;
      
      // Update database
      const { error } = await supabase
        .from('announcements')
        .update({ is_pinned: newPinnedStatus })
        .eq('id', id);

      if (error) throw error;

      await logAction('Pin Toggle', `${newPinnedStatus ? 'Pinned' : 'Unpinned'} announcement: ${target.title}`);

      // Update local state
      setAnnouncements(announcements.map(ann => 
        ann.id === id ? { ...ann, is_pinned: newPinnedStatus } : ann
      ));
      setOpenMenuId(null);
      showToast("Pin status updated");
    } catch (error) {
      showToast("Error updating pin status: " + error.message, "error");
    }
  };

  const stats = [
    { label: 'Published', count: announcements.filter(a => a.status === 'published').length, icon: Megaphone, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Scheduled', count: 0, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Drafts', count: announcements.filter(a => a.status === 'draft').length, icon: FileEdit, color: 'text-slate-600', bg: 'bg-slate-50' },
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
    .sort((a, b) => (a.is_pinned === b.is_pinned ? 0 : a.is_pinned ? -1 : 1));

  return (
    <div className="p-8 bg-slate-50 min-h-screen relative">
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          background: transparent; bottom: 0; color: transparent; cursor: pointer;
          height: auto; left: 0; position: absolute; right: 0; top: 0; width: auto;
        }
      `}</style>

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
        
        {/* --- UPDATED RequireRole WRAPPER FOR NEW ANNOUNCEMENT (Added vice_president) --- */}
        <RequireRole userRole={currentUserRole} allowedRoles={['president', 'vice_president', 'secretary']}>
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            style={{ backgroundColor: '#006837' }}
            className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-bold hover:opacity-90 shadow-lg transition-all cursor-pointer">
            <Plus size={18} /> New Announcement
          </button>
        </RequireRole>
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
          <select value={activeStatus} onChange={(e) => setActiveStatus(e.target.value)} className="pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none appearance-none relative cursor-pointer">
            <option>All Status</option>
            <option>Published</option>
            <option>Drafts</option>
          </select>
          <select value={activeCategory} onChange={(e) => setActiveCategory(e.target.value)} className="pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none appearance-none cursor-pointer">
            <option>All Categories</option>
            {/* --- ADDED Event and synced all other options --- */}
            <option>Event</option>
            <option>Maintenance</option>
            <option>General</option>
            <option>Financial</option>
            <option>Election</option>
            <option>Security</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin"></div>
            <p className="text-[#006837] font-semibold animate-pulse tracking-wide">Loading Announcements...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="bg-white p-12 rounded-[24px] border border-dashed border-slate-200 text-center">
            <FileEdit size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium text-lg">No Announcements Found</p>
          </div>
        ) : (
          filteredAnnouncements.map((item) => (
            <div key={item.id} className={`bg-white p-6 rounded-[24px] border ${item.is_emergency ? 'border-red-100 bg-red-50/10' : 'border-slate-100'} shadow-sm relative group transition-all hover:shadow-md`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {item.is_pinned && <Pin size={16} className="text-indigo-600 fill-indigo-600 rotate-45" />}
                    {item.is_emergency && <AlertTriangle size={16} className="text-red-500" />}
                    <h3 className="font-bold text-slate-900 text-lg">{item.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${item.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-600'}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mb-4 leading-relaxed max-w-4xl">{item.content}</p>
                  <div className="flex items-center gap-6 text-slate-400 text-xs font-medium">
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {new Date(item.created_at).toLocaleDateString()}</span>
                    <span>By {item.author_name}</span>
                    {/* --- ADDED dynamic color utility --- */}
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getCategoryColor(item.category)}`}>{item.category}</span>
                    {item.attachment_url && <span className="flex items-center gap-1.5 text-indigo-600"><Paperclip size={14} /> Attachment</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => { setSelectedAnnouncement(item); setShowDetailsOverlay(true); }} 
                    title="View Details"
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye size={18} />
                  </button>
                  
                  {/* --- UPDATED RequireRole WRAPPER FOR ROW ACTIONS (Added vice_president) --- */}
                  <RequireRole userRole={currentUserRole} allowedRoles={['president', 'vice_president', 'secretary']}>
                    <button 
                      onClick={() => handleOpenEdit(item)} 
                      title="Edit Announcement"
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <FileEdit size={18} />
                    </button>
                  </RequireRole>

                  <RequireRole userRole={currentUserRole} allowedRoles={['president', 'vice_president', 'secretary']}>
                    {item.status === 'draft' && (
                      <button 
                        onClick={() => {
                          setPendingPublishItem(item);
                          setShowPublishConfirm(true);
                        }} 
                        title="Publish Now"
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Send size={18} />
                      </button>
                    )}
                  </RequireRole>

                  <RequireRole userRole={currentUserRole} allowedRoles={['president', 'vice_president', 'secretary']}>
                    <button 
                      onClick={() => handleTogglePin(item.id)} 
                      title={item.is_pinned ? 'Unpin' : 'Pin to Top'}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Pin size={18} className={item.is_pinned ? "fill-amber-600 text-amber-600" : ""} />
                    </button>
                  </RequireRole>

                  <RequireRole userRole={currentUserRole} allowedRoles={['president', 'vice_president', 'secretary']}>
                    <button 
                      onClick={() => { 
                        setPendingDeleteItem(item.id); 
                        setShowDeleteConfirm(true); 
                      }} 
                      title="Delete"
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </RequireRole>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Details Overlay */}
      {showDetailsOverlay && selectedAnnouncement && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Announcement Details</h2>
              <button onClick={() => { setShowDetailsOverlay(false); setSelectedAnnouncement(null); }} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                {/* --- ADDED dynamic color utility --- */}
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getCategoryColor(selectedAnnouncement.category)}`}>{selectedAnnouncement.category}</span>
                {selectedAnnouncement.is_emergency && <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><AlertTriangle size={12}/> Emergency</span>}
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-4">{selectedAnnouncement.title}</h1>
              <div className="flex items-center gap-6 text-slate-400 text-sm mb-8 pb-8 border-b border-slate-100">
                <span className="flex items-center gap-2"><Clock size={16} /> {new Date(selectedAnnouncement.created_at).toLocaleDateString()}</span>
                <span>By {selectedAnnouncement.author_name}</span>
              </div>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed mb-8">
                {selectedAnnouncement.content}
              </div>
              {selectedAnnouncement.attachment_url && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600"><FileIcon size={20} /></div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Attached Document</p>
                      <p className="text-xs text-slate-500">Official Announcement Attachment</p>
                    </div>
                  </div>
                  <a href={selectedAnnouncement.attachment_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">View File</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Announcement?</h3>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                  Are you sure you want to delete this? This action cannot be undone.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      handleDelete(pendingDeleteItem);
                      setShowDeleteConfirm(false);
                    }}
                    className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-100 cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                  <button 
                    onClick={() => { setShowDeleteConfirm(false); setPendingDeleteItem(null); }}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {showPublishConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-8 text-center">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Megaphone size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Publish Announcement?</h3>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                  This will make the announcement visible to all residents and send a notification.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleConfirmPublish}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 cursor-pointer"
                  >
                    Yes, Publish Now
                  </button>
                  <button 
                    onClick={() => { setShowPublishConfirm(false); setPendingPublishItem(null); }}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {(showModal || showEditOverlay) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{showEditOverlay ? 'Edit Announcement' : 'Create Announcement'}</h2>
                <p className="text-slate-500 text-sm">Post a new announcement to residents.</p>
              </div>
              <button onClick={() => { setShowModal(false); setShowEditOverlay(false); }} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf" />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Enter Announcement Title" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer">
                  {/* --- ADDED Event to new items drop down --- */}
                  <option>Event</option>
                  <option>Maintenance</option><option>General</option><option>Financial</option><option>Election</option><option>Security</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Content</label>
                <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Write your announcement here..." rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Attachments</label>
                {attachmentUrl ? (
                  <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-indigo-600 text-white rounded-lg"><FileIcon size={20} /></div>
                      <span className="text-sm font-medium text-indigo-900 truncate max-w-[200px]">File Attached</span>
                    </div>
                    <button onClick={() => setAttachmentUrl('')} className="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-wider">Remove</button>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 cursor-pointer transition-colors">
                    {isUploading ? <Loader2 className="text-indigo-500 animate-spin" size={24} /> : <Paperclip className="text-slate-400" size={24} />}
                    <span className="text-sm text-slate-500">{isUploading ? 'Uploading file...' : 'Click to attach images or PDF files'}</span>
                  </div>
                )}
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
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer" />
                    <Calendar size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">End Date</label>
                  <div className="relative">
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer" />
                    <Calendar size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button disabled={isUploading} onClick={() => showEditOverlay ? handleUpdateAnnouncement('draft') : handleAddAnnouncement('draft')} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 cursor-pointer disabled:opacity-50">Save as Draft</button>
              <button disabled={isUploading} onClick={() => showEditOverlay ? handleUpdateAnnouncement('published') : handleAddAnnouncement('published')} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 cursor-pointer disabled:opacity-50">{showEditOverlay ? 'Update Now' : 'Publish Now'}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Comments Modal */}
      {showCommentsOverlay && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Comments</h2>
                <p className="text-slate-500 text-sm">{selectedAnnouncement?.title}</p>
              </div>
              <button onClick={() => { setShowCommentsOverlay(false); setSelectedAnnouncement(null); }} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 h-[400px] overflow-y-auto bg-slate-50/50 space-y-4">
              {selectedAnnouncement?.comments?.length > 0 ? (
                selectedAnnouncement.comments.map((c) => (
                  <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-slate-900 text-sm">{c.user}</span>
                        <span className="text-slate-400 text-[10px]">{c.time}</span>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed">{c.text}</p>
                    </div>
                    <button onClick={() => handleDeleteComment(c.id)} className="ml-4 p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer" title="Delete Comment"><Trash2 size={16} /></button>
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
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment..." className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              <button onClick={handleAddComment} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"><Send size={18} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;