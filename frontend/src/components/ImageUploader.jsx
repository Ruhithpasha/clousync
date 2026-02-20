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
  Search,
  Sparkles
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { API_BASE_URL } from "../config";


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
  
  // Selection states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [movingToAlbumId, setMovingToAlbumId] = useState({}); // {imageId: albumId}
  const [isUpdating, setIsUpdating] = useState(null); // id of image being updated
  const [searchQuery, setSearchQuery] = useState("");
  const [profile, setProfile] = useState(null);
  
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
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setErrorMsg("");
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setErrorMsg("");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please login again.");

      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("originalName", selectedFile.name);
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
        throw new Error(errorData.error || "Upload failed");
      }

      // Reset selection
      setSelectedFile(null);
      setPreviewUrl(null);
      setSelectedAlbumId("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      await loadData();
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMsg(err.message);
    } finally {
      setUploading(false);
    }
  };

  const cancelSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
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
                    placeholder={profile?.plan === 'SUPER' ? "Magical Semantic Search..." : "Search photos by name or tags..."}
                    className="w-full bg-white border border-[#000B2B]/5 rounded-[32px] py-4 pl-12 pr-6 font-bold text-[#000B2B] shadow-soft focus:ring-2 focus:ring-[#FFC107] outline-none transition-all"
                />
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#000B2B]/20">
                    {profile?.plan === 'SUPER' ? <Sparkles size={20} className="text-[#FFC107]" /> : <Search size={20} />}
                </div>
            </div>
        </div>

        <div className="flex gap-4">
            <div className="bg-white px-6 py-4 rounded-[32px] shadow-soft border border-[#000B2B]/5">
                <p className="text-[#000B2B]/40 text-xs font-bold uppercase tracking-widest mb-1">Total Photos</p>
                <p className="text-3xl font-[800] text-[#000B2B]">{galleryImages.length}</p>
            </div>
            <div className="bg-[#FFC107] px-6 py-4 rounded-[32px] shadow-soft border border-[#000B2B]/5">
                <p className="text-[#000B2B]/40 text-xs font-bold uppercase tracking-widest mb-1">Albums</p>
                <p className="text-3xl font-[800] text-[#000B2B]">{albums.length}</p>
            </div>
        </div>

        <div className="flex gap-4">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/*"
            />
            {!selectedFile ? (
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
        {selectedFile && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white rounded-[40px] p-8 shadow-2xl border border-[#000B2B]/5 mb-12"
          >
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-full md:w-48 aspect-square rounded-3xl overflow-hidden bg-[#F7F7F7]">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
              
              <div className="flex-grow space-y-4 w-full">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-extrabold text-[#000B2B]">{selectedFile.name}</h3>
                    <p className="text-[#000B2B]/40 font-bold uppercase tracking-widest text-xs">Ready for Cloud Sync</p>
                  </div>
                  <button onClick={cancelSelection} className="p-2 hover:bg-red-50 text-red-400 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-grow max-w-sm">
                    <label className="block text-[10px] font-extrabold text-[#000B2B]/40 uppercase tracking-widest mb-2 px-1">Assign to Album</label>
                    <select 
                      value={selectedAlbumId}
                      onChange={(e) => setSelectedAlbumId(e.target.value)}
                      className="w-full bg-[#F7F7F7] border-none rounded-2xl py-4 px-6 font-bold text-[#000B2B] focus:ring-2 focus:ring-[#FFC107] outline-none transition-all appearance-none"
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
                        AI Powering Up...
                      </>
                    ) : (
                      <>
                        Sync to Cloud
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

      {/* Main Gallery Grid */}
      {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-[4/5] bg-white rounded-[40px] animate-pulse" />
              ))}
          </div>
      ) : galleryImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[60px] border-2 border-dashed border-[#000B2B]/5">
              <div className="w-24 h-24 bg-[#F7F7F7] rounded-full flex items-center justify-center mb-6">
                <ImageIcon className="text-[#000B2B]/20 w-10 h-10" />
              </div>
              <h3 className="text-2xl font-extrabold text-[#000B2B] mb-2 text-center">Your cloud is empty</h3>
              <p className="text-[#000B2B]/40 font-bold text-center">Start by uploading your first session or project photo.</p>
          </div>
      ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {galleryImages.map((image, idx) => (
              <motion.div 
                key={image.id}
                variants={itemVariants}
                className={`group relative rounded-[40px] overflow-hidden bg-white shadow-soft hover:shadow-xl transition-all duration-500 ${
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
                                    onClick={() => handleDelete(image.id)}
                                    disabled={isUpdating === image.id}
                                    className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-red-100 hover:bg-red-500 hover:text-white transition-colors border border-white/20"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#000B2B] hover:bg-[#FFC107] transition-colors shadow-lg">
                                    <Download size={18} />
                                </button>
                                <button className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white transition-colors border border-white/20">
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
