import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  X, 
  Image as ImageIcon, 
  Download, 
  Share2,
  AlertCircle,
  CheckCircle2,
  FolderPlus,
  Trash2,
  Tags,
  Sparkles,
  Calendar,
  LayoutGrid,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import { API_BASE_URL } from "../config";
import { useTheme } from "../context/ThemeContext";


const getOptimizedImageUrl = (url) => {
  if (!url) return '';
  if (url.includes('cloudinary.com')) {
    return url.replace('/upload/', '/upload/f_auto,q_auto,w_auto,c_scale/');
  }
  return url;
};

const ImageUploader = () => {
  const [galleryImages, setGalleryImages] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Selection states
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [movingToAlbumId, setMovingToAlbumId] = useState({}); // {imageId: albumId}
  const [isUpdating, setIsUpdating] = useState(null); // id of image being updated
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'timeline'
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [profile, setProfile] = useState(null);
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - 200 : scrollLeft + 200;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };
  
  const categories = [
    "All", "Nature", "People", "Documents", "Architecture", 
    "Food", "Technology", "Animals", "Travel", 
    "Sports", "Fashion", "Art", "Interiors", "Vehicles"
  ];

  const fileInputRef = useRef();

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { 'Authorization': `Bearer ${session.access_token}` };

      // Parallel fetch images and albums
      const [imgRes, albRes] = await Promise.all([
        fetch(`${API_BASE_URL}/images`, { headers }),
        fetch(`${API_BASE_URL}/albums`, { headers })
      ]);


      if (!imgRes.ok || !albRes.ok) throw new Error("Failed to sync with cloud");

      const [images, albumsData] = await Promise.all([
        imgRes.json(),
        albRes.json()
      ]);

      setGalleryImages(images);
      setAlbums(albumsData);

      // Fetch profile to check plan
      const profRes = await fetch(`${API_BASE_URL}/profile`, { headers });

      if (profRes.ok) {
        const profData = await profRes.json();
        setProfile(profData);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setErrorMsg("Failed to sync with cloud database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setSelectedFiles(files);
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    setErrorMsg("");
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setErrorMsg("");
      setUploadProgress({ current: 0, total: selectedFiles.length });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please login again.");

      // Upload sequentially for local CLIP stability
      for (let i = 0; i < selectedFiles.length; i++) {
        setUploadProgress({ current: i + 1, total: selectedFiles.length });
        const file = selectedFiles[i];
        
        const formData = new FormData();
        formData.append("image", file);
        formData.append("originalName", file.name);
        if (selectedAlbumId) {
          formData.append("albumId", selectedAlbumId);
        }

        const response = await fetch(`${API_BASE_URL}/upload`, {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Upload failed for ${file.name}`);
        }
      }

      // Reset selection
      setSelectedFiles([]);
      setPreviewUrls([]);
      setSelectedAlbumId("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      await loadData();
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMsg(err.message);
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const cancelSelection = () => {
    setSelectedFiles([]);
    setPreviewUrls([]);
    setSelectedAlbumId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMoveToAlbum = async (imageId, albumId) => {
    try {
      setIsUpdating(imageId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/images/${imageId}`, {

        method: "PUT",
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ album_id: albumId })
      });

      if (!response.ok) throw new Error("Failed to update album");

      // Update local state
      setGalleryImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, album_id: albumId } : img
      ));
      
      // Clear selection state
      setMovingToAlbumId(prev => {
        const next = { ...prev };
        delete next[imageId];
        return next;
      });
    } catch (err) {
      console.error("Update error:", err);
      setErrorMsg("Failed to move image to album.");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm("Are you sure you want to delete this image? It will be removed from your cloud storage permanently.")) return;

    try {
      setIsUpdating(imageId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/images/${imageId}`, {

        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error("Failed to delete image");

      setGalleryImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err) {
      console.error("Delete error:", err);
      setErrorMsg("Failed to delete image from cloud.");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleShare = async (imageId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/images/${imageId}/share`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error("Share failed");
      const { token } = await response.json();
      
      const shareUrl = `${API_BASE_URL}/s/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      
      setSuccessMsg("Self-destructing link (24h) copied to clipboard! ✨");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Share error:", err);
      setErrorMsg("Failed to generate share link.");
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'cloudsync-photo.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      setSuccessMsg("Download started! 📥");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Download error:", err);
      // Fallback
      window.open(url, '_blank');
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim().length === 0) {
      loadData();
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/search-images?query=${encodeURIComponent(query)}`, {

        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error("Search failed");
      const results = await response.json();
      setGalleryImages(results);
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  const groupImagesByDate = (images) => {
    const groups = {};
    images.forEach(image => {
      const date = new Date(image.created_at);
      let dateStr = format(date, 'MMMM d, yyyy');
      if (isToday(date)) dateStr = "Today";
      else if (isYesterday(date)) dateStr = "Yesterday";
      
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(image);
    });
    return groups;
  };

  const filteredImages = galleryImages.filter(img => 
    selectedCategory === "All" || img.tags?.includes(selectedCategory.toUpperCase())
  );

  const groupedImages = groupImagesByDate(filteredImages);

  return (
    <div className="space-y-8">
      {/* Action Bar / Stats */}
      <div className="flex flex-wrap gap-6 items-center justify-between mb-8">
        <div className="flex gap-4 flex-grow max-w-xl">
            <div className="relative w-full">
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search photos by name, category or tags..."
                    className="w-full bg-white dark:bg-[#1e293b] border border-[#000B2B]/5 dark:border-white/5 rounded-[32px] py-4 pl-12 pr-6 font-bold text-[#000B2B] dark:text-white shadow-soft focus:ring-2 focus:ring-[#FFC107] outline-none transition-all"
                />
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#000B2B]/20 dark:text-white/20">
                    <Sparkles size={20} className="text-[#FFC107]" />
                </div>
            </div>
        </div>

        <div className="flex gap-4">
            <div className="bg-white dark:bg-[#1e293b] px-6 py-4 rounded-[32px] shadow-soft border border-[#000B2B]/5 dark:border-white/5">
                <p className="text-[#000B2B]/40 dark:text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Total Photos</p>
                <p className="text-3xl font-[800] text-[#000B2B] dark:text-white">{galleryImages.length}</p>
            </div>
            <div className="bg-[#FFC107] px-6 py-4 rounded-[32px] shadow-soft border border-[#000B2B]/5 dark:border-white/5">
                <p className="text-[#000B2B]/40 text-xs font-bold uppercase tracking-widest mb-1">Albums</p>
                <p className="text-3xl font-[800] text-[#000B2B]">{albums.length}</p>
            </div>
        </div>

        <div className="flex gap-4">
            <div className="flex bg-white dark:bg-[#1e293b] p-1.5 rounded-[24px] border border-[#000B2B]/5 dark:border-white/5 shadow-soft shrink-0">
              <button 
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-[#FFC107] text-[#000B2B] shadow-sm' : 'text-[#000B2B]/20 dark:text-white/20'}`}
              >
                <LayoutGrid size={18} />
                <span className="text-[10px] font-black uppercase tracking-wider">Grid</span>
              </button>
              <button 
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${viewMode === 'timeline' ? 'bg-[#FFC107] text-[#000B2B] shadow-sm' : 'text-[#000B2B]/20 dark:text-white/20'}`}
              >
                <Calendar size={18} />
                <span className="text-[10px] font-black uppercase tracking-wider">Timeline</span>
              </button>
            </div>

            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/*"
                multiple
            />
            {selectedFiles.length === 0 ? (
              <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#000B2B] text-white px-8 py-4 rounded-full font-extrabold flex items-center gap-3 shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                  <Plus size={20} />
                  Add Content
              </button>
            ) : null}
        </div>
      </div>

      {/* Upload Preview & Album Selection Modal Style */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white dark:bg-[#1e293b] rounded-[40px] p-8 shadow-2xl border border-[#000B2B]/5 dark:border-white/5 mb-12"
          >
            <div className="flex flex-col md:flex-row gap-8 items-center w-full">
              <div className="flex -space-x-8 md:-space-x-12 overflow-hidden py-4 shrink-0">
                {previewUrls.slice(0, 3).map((url, i) => (
                  <div key={i} className="w-20 h-20 md:w-32 md:h-32 rounded-2xl md:rounded-3xl overflow-hidden border-2 md:border-4 border-white dark:border-[#1e293b] shadow-xl rotate-[-5deg] first:rotate-0 last:rotate-[5deg] transition-transform hover:rotate-0 hover:z-50 bg-[#F7F7F7] dark:bg-[#0f172a]">
                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ))}
                {previewUrls.length > 3 && (
                  <div className="w-20 h-20 md:w-32 md:h-32 rounded-2xl md:rounded-3xl bg-[#FFC107] flex items-center justify-center text-[#000B2B] font-black text-xs md:text-xl border-2 md:border-4 border-white dark:border-[#1e293b] shadow-xl rotate-[10deg]">
                    +{previewUrls.length - 3}
                  </div>
                )}
              </div>
              
              <div className="flex-grow space-y-4 w-full">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-extrabold text-[#000B2B] dark:text-white">
                      {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} Photos Selected`}
                    </h3>
                    <p className="text-[#000B2B]/40 dark:text-white/40 font-bold uppercase tracking-widest text-xs">Batch Cloud Sync Ready</p>
                  </div>
                  <button onClick={cancelSelection} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-grow max-sm:w-full">
                    <label className="block text-[10px] font-extrabold text-[#000B2B]/40 dark:text-white/40 uppercase tracking-widest mb-2 px-1">Assign Batch to Album</label>
                    <select 
                      value={selectedAlbumId}
                      onChange={(e) => setSelectedAlbumId(e.target.value)}
                      className="w-full bg-[#F7F7F7] dark:bg-[#0f172a] border-none rounded-2xl py-4 px-6 font-bold text-[#000B2B] dark:text-white focus:ring-2 focus:ring-[#FFC107] outline-none transition-all appearance-none"
                    >
                      <option value="">No Album (Default Library)</option>
                      {albums.map(album => (
                        <option key={album.id} value={album.id}>{album.name}</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    onClick={handleUpload}
                    disabled={uploading}
                    className="bg-[#FFC107] text-[#000B2B] px-10 py-4 rounded-2xl font-extrabold shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Sparkles size={18} className="animate-pulse" />
                        AI Syncing ({uploadProgress.current}/{uploadProgress.total})...
                      </>
                    ) : (
                      <>
                        Start Batch Sync
                        <CheckCircle2 size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {errorMsg && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-sm"
          >
              <AlertCircle size={18} />
              {errorMsg}
              <button onClick={() => setErrorMsg("")} className="ml-auto p-1 hover:bg-red-100 rounded-full transition-colors">
                  <X size={14} />
              </button>
          </motion.div>
      )}

      {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500 text-white p-4 rounded-2xl flex items-center gap-3 font-bold text-sm shadow-xl"
          >
              <CheckCircle2 size={18} />
              {successMsg}
              <button onClick={() => setSuccessMsg("")} className="ml-auto p-1 hover:bg-white/20 rounded-full transition-colors">
                  <X size={14} />
              </button>
          </motion.div>
      )}

      {/* Category Filter Bar with Slides */}
      <div className="relative flex items-center mb-4 group/slider px-1">
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 z-20 p-2 bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-md border border-[#000B2B]/10 dark:border-white/10 rounded-full shadow-xl transition-all active:scale-95"
        >
          <ChevronLeft size={20} className="text-[#000B2B] dark:text-white" />
        </button>

        <div 
          ref={scrollRef}
          className="flex overflow-x-auto py-2 gap-3 no-scrollbar scroll-smooth w-full px-12"
        >
            {categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-8 py-3 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
                        selectedCategory === cat 
                        ? 'bg-[#000B2B] dark:bg-[#FFC107] text-white dark:text-[#000B2B] shadow-xl scale-105' 
                        : 'bg-white dark:bg-[#1e293b] text-[#000B2B]/40 dark:text-white/40 hover:bg-[#F7F7F7] dark:hover:bg-[#334155] border border-[#000B2B]/5 dark:border-white/5'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>

        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 z-20 p-2 bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-md border border-[#000B2B]/10 dark:border-white/10 rounded-full shadow-xl transition-all active:scale-95"
        >
          <ChevronRight size={20} className="text-[#000B2B] dark:text-white" />
        </button>
      </div>

      {/* Main Gallery Grid */}
      {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-[4/5] bg-white dark:bg-[#1e293b] rounded-[40px] animate-pulse" />
              ))}
          </div>
      ) : filteredImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-[#1e293b] rounded-[60px] border-2 border-dashed border-[#000B2B]/5 dark:border-white/5">
              <div className="w-24 h-24 bg-[#F7F7F7] dark:bg-[#0f172a] rounded-full flex items-center justify-center mb-6">
                <ImageIcon className="text-[#000B2B]/20 dark:text-white/20 w-10 h-10" />
              </div>
              <h3 className="text-2xl font-extrabold text-[#000B2B] dark:text-white mb-2 text-center">No {selectedCategory} here yet</h3>
              <p className="text-[#000B2B]/40 dark:text-white/40 font-bold text-center">AI hasn't tagged any photos with this category.</p>
          </div>
      ) : viewMode === 'timeline' ? (
          <div className="space-y-12">
            {Object.keys(groupedImages).map(dateStr => (
              <div key={dateStr} className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-black text-[#000B2B] dark:text-white">{dateStr}</h3>
                  <div className="h-[1px] bg-[#000B2B]/5 dark:bg-white/10 flex-grow" />
                  <span className="text-xs font-bold text-[#000B2B]/20 dark:text-white/20 uppercase tracking-widest">{groupedImages[dateStr].length} items</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
                   {groupedImages[dateStr].map(image => (
                     <motion.div 
                        key={image.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="aspect-square relative rounded-3xl overflow-hidden group cursor-pointer border border-[#000B2B]/5 dark:border-white/5"
                      >
                         <img 
                            src={getOptimizedImageUrl(image.cloudinary_url)} 
                            alt={image.original_name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                         />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-center justify-center gap-2">
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleDownload(image.cloudinary_url, image.original_name); }}
                             className="p-2 bg-white rounded-full text-[#000B2B] hover:bg-[#FFC107] transition-all"
                           >
                             <Download size={14} />
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleShare(image.id); }}
                             className="p-2 bg-white rounded-full text-[#000B2B] hover:bg-[#FFC107] transition-all"
                           >
                             <Share2 size={14} />
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleDelete(image.id); }}
                             className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-all"
                           >
                             <Trash2 size={14} />
                           </button>
                         </div>
                      </motion.div>
                   ))}
                </div>
              </div>
            ))}
          </div>
      ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-4 gap-8"
          >
            {filteredImages.map((image, idx) => (
              <motion.div 
                key={image.id}
                variants={itemVariants}
                className={`group relative rounded-[40px] overflow-hidden bg-white dark:bg-[#1e293b] shadow-soft hover:shadow-xl transition-all duration-500 ${
                    idx % 3 === 0 ? 'lg:col-span-2 lg:row-span-2' : ''
                }`}
              >
                 <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-[#000B2B]/80 via-transparent to-transparent pointer-events-none" />
                 
                 <div className="aspect-[4/5] w-full h-full">
                    <img 
                        src={getOptimizedImageUrl(image.cloudinary_url)} 
                        alt={image.original_name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                 </div>

                  <div className="absolute bottom-6 left-6 right-6 z-20 transition-all duration-500">
                    <div className="flex items-center justify-between gap-3">
                        <div className="overflow-hidden">
                            <p className="text-white font-extrabold truncate text-lg tracking-tight drop-shadow-lg">
                                {image.original_name}
                            </p>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest">
                                {new Date(image.created_at).toLocaleDateString()}
                            </p>
                            {image.tags && image.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {image.tags.slice(0, 5).map((tag, i) => (
                                        <span key={i} className="px-2 py-1 bg-[#FFC107] rounded-full text-[9px] font-black text-[#000B2B] shadow-lg border border-white/20">
                                            #{tag.toUpperCase()}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                         <div className="flex flex-col gap-2">
                              <div className="flex gap-2 justify-end">
                                  <button 
                                     onClick={(e) => { e.stopPropagation(); handleDelete(image.id); }}
                                     disabled={isUpdating === image.id}
                                     className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-red-100 hover:bg-red-500 hover:text-white transition-colors border border-white/20"
                                 >
                                     <Trash2 size={18} />
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleDownload(image.cloudinary_url, image.original_name); }}
                                   className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#000B2B] hover:bg-[#FFC107] transition-colors shadow-lg"
                                 >
                                     <Download size={18} />
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleShare(image.id); }}
                                   className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white transition-colors border border-white/20"
                                 >
                                     <Share2 size={18} />
                                 </button>
                              </div>
                             
                             {/* Album Selector for Existing Image */}
                             <div className="relative group/album">
                                <select 
                                    className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-1.5 text-[10px] font-bold text-white outline-none appearance-none hover:bg-white/20 transition-all cursor-pointer"
                                    value={image.album_id || ""}
                                    disabled={isUpdating === image.id}
                                    onChange={(e) => handleMoveToAlbum(image.id, e.target.value)}
                                >
                                    <option value="" className="text-[#000B2B]">Default Library</option>
                                    {albums.map(alb => (
                                        <option key={alb.id} value={alb.id} className="text-[#000B2B]">{alb.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                                    <FolderPlus size={10} />
                                </div>
                             </div>
                        </div>
                    </div>
                 </div>

                 {/* Corner Badge */}
                 <div className="absolute top-6 right-6 z-20">
                    <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                        <CheckCircle2 size={12} className="text-green-500" />
                        <span className="text-[10px] font-extrabold text-[#000B2B] uppercase tracking-wider">Sync'd</span>
                    </div>
                 </div>
              </motion.div>
            ))}
          </motion.div>
      )}
    </div>
  );
};

export default ImageUploader;
