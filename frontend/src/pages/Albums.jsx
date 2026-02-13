import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, Image as ImageIcon, MoreHorizontal, LayoutGrid, List, AlertCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Albums = () => {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Create Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const fetchAlbums = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/albums", {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error("Could not load albums");
      const data = await response.json();
      setAlbums(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName) return;

    try {
      setCreating(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch("/api/albums", {
        method: "POST",
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName, description: newDesc })
      });

      if (!response.ok) throw new Error("Failed to create album");
      
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      fetchAlbums();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Action Bar */}
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-xl p-4 rounded-[32px] border border-white shadow-soft">
        <div>
          <h3 className="text-xl font-extrabold text-[#000B2B]">Your Collections</h3>
          <p className="text-[#000B2B]/40 text-[10px] font-bold uppercase tracking-widest">Organize your cloud assets</p>
        </div>

        <button 
          onClick={() => setShowCreate(true)}
          className="bg-[#000B2B] text-white px-8 py-4 rounded-full font-extrabold flex items-center gap-2 shadow-xl hover:scale-105 transition-all active:scale-95"
        >
            <FolderPlus size={20} />
            Create Album
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Album Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square bg-white rounded-[40px] animate-pulse" />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[60px] border-2 border-dashed border-[#000B2B]/5">
            <div className="w-24 h-24 bg-[#F7F7F7] rounded-full flex items-center justify-center mb-6">
              <FolderPlus className="text-[#000B2B]/20 w-10 h-10" />
            </div>
            <h3 className="text-2xl font-extrabold text-[#000B2B] mb-2 text-center">No albums yet</h3>
            <p className="text-[#000B2B]/40 font-bold text-center">Create a collection to group your photo sessions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {albums.map((album) => (
              <motion.div 
                  key={album.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -10 }}
                  onClick={() => navigate(`/albums/${album.id}`)}
                  className="group cursor-pointer"
              >
                  <div className="aspect-square rounded-[40px] overflow-hidden mb-6 relative shadow-soft border border-white transition-all duration-500 bg-white">
                      {/* Replace with actual cover logic if needed */}
                      <div className="w-full h-full bg-gradient-to-br from-[#000B2B] to-[#000B2B]/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                        <ImageIcon size={48} className="text-[#FFC107]/20" />
                      </div>
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-[#000B2B]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          <button className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-[#000B2B] shadow-lg hover:bg-[#FFC107]">
                              <MoreHorizontal size={20} />
                          </button>
                      </div>
                  </div>
                  <h3 className="text-xl font-extrabold text-[#000B2B] mb-1 group-hover:text-[#FFC107] transition-colors line-clamp-1">{album.name}</h3>
                  <p className="text-[#000B2B]/40 font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                      {album.description || "Project Collection"}
                  </p>
              </motion.div>
          ))}
        </div>
      )}

      {/* Create Album Modal/Slideover */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="absolute inset-0 bg-[#000B2B]/40 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[48px] p-10 w-full max-w-lg relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-extrabold text-[#000B2B]">New Collection</h2>
                  <p className="text-[#000B2B]/40 font-bold uppercase tracking-widest text-xs">Define a new album container</p>
                </div>
                <button 
                  onClick={() => setShowCreate(false)}
                  className="w-10 h-10 rounded-full hover:bg-red-50 text-red-400 flex items-center justify-center transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#000B2B]/40 uppercase tracking-widest mb-2 px-1">Name</label>
                  <input 
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    placeholder="e.g. Summer Shoot 2025"
                    className="w-full bg-[#F7F7F7] border-none rounded-2xl py-4 px-6 font-bold text-[#000B2B] focus:ring-2 focus:ring-[#FFC107] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#000B2B]/40 uppercase tracking-widest mb-2 px-1">Description</label>
                  <textarea 
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Describe this collection..."
                    className="w-full bg-[#F7F7F7] border-none rounded-2xl py-4 px-6 font-bold text-[#000B2B] focus:ring-2 focus:ring-[#FFC107] outline-none transition-all h-24 resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={creating || !newName}
                  className="w-full bg-[#000B2B] text-white py-5 rounded-3xl font-extrabold text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Confirm Creation"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Albums;