import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import { 
  Sparkles, 
  Heart, 
  Trash2, 
  Maximize2, 
  X, 
  Clock, 
  Image as ImageIcon,
  Zap,
  Layout,
  DownloadCloud,
  Cloud
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { API_BASE_URL } from "../config";

const PRINT_STYLES = `
  @media print {
    body * {
      visibility: hidden;
    }
    #printable-collage, #printable-collage * {
      visibility: visible;
    }
    #printable-collage {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      background: white !important;
      color: black !important;
      padding: 40px !important;
    }
    .no-print, .no-export {
      display: none !important;
    }
    input {
      border: none !important;
      background: transparent !important;
      color: black !important;
      text-align: center !important;
      width: 100% !important;
    }
    img {
      break-inside: avoid;
      border-radius: 20px !important;
    }
    .export-only { display: none !important; }
  }

  .export-only { display: none; }
  .export-canvas .export-only { display: flex !important; }

  .export-canvas .no-export {
    display: none !important;
  }

  .export-canvas .grid {
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important;
    grid-auto-rows: 260px !important;
    gap: 20px !important;
    width: 1040px !important;
    margin: 0 auto !important;
  }

  .export-canvas .main-moment {
    grid-column: span 2 / span 2 !important;
    grid-row: span 2 / span 2 !important;
    height: 540px !important;
  }

  .export-canvas .featured-similar {
    grid-column: span 2 !important;
    height: 260px !important;
  }

  .export-canvas .square-moment {
    height: 260px !important;
  }

  .export-canvas img {
    border-radius: 32px !important;
    height: 100% !important;
    width: 100% !important;
    object-fit: cover !important;
  }

  .export-canvas {
    width: 1200px !important;
    padding: 80px 0 !important;
    background: #000B2B !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 60px !important;
    align-items: center !important;
  }

  .export-watermark {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 40px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 32px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
`;

const Memories = () => {
    const [images, setImages] = useState([]);
    const [savedMemories, setSavedMemories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeMemory, setActiveMemory] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState("discovery"); // 'discovery' or 'library'
    const [toast, setToast] = useState(null);
    const [storyName, setStoryName] = useState("");
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const collageRef = useRef(null);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        await Promise.all([fetchImages(), fetchSavedMemories()]);
        setLoading(false);
    };

    const fetchImages = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${API_BASE_URL}/images`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (response.ok) setImages(await response.json());
        } catch (err) {
            console.error("Failed to fetch images:", err);
        }
    };

    const fetchSavedMemories = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${API_BASE_URL}/api/memories`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (response.ok) setSavedMemories(await response.json());
        } catch (err) {
            console.error("Failed to fetch saved memories:", err);
        }
    };

    const generateMemory = async (sourceImage) => {
        try {
            setIsGenerating(true);
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${API_BASE_URL}/images/${sourceImage.id}/similar`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.memories.length === 0) {
                    setToast({
                        message: "No strong visual matches found for this photo yet.",
                        type: "error"
                    });
                    return;
                }
                setStoryName(`Story of ${data.source.original_name.split('.')[0]}`);
                setActiveMemory(data);
            }
        } catch (err) {
            console.error("Memory generation failed:", err);
            setToast({ message: "Connection to AI engine lost.", type: "error" });
        } finally {
            setIsGenerating(false);
        }
    };

    const saveMemory = async () => {
        if (!activeMemory) return;
        try {
            setIsSaving(true);
            const { data: { session } } = await supabase.auth.getSession();
            
            const isUpdate = !!activeMemory.id;
            const url = isUpdate 
                ? `${API_BASE_URL}/api/memories/${activeMemory.id}`
                : `${API_BASE_URL}/api/memories`;
            const method = isUpdate ? "PUT" : "POST";

            const body = isUpdate 
                ? { name: storyName }
                : {
                    name: storyName || `Story: ${activeMemory.source.original_name}`,
                    sourceImageId: activeMemory.source.id,
                    imageIds: [activeMemory.source.id, ...activeMemory.memories.map(m => m.id)]
                };

            const response = await fetch(url, {
                method,
                headers: { 
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                setToast({ 
                    message: isUpdate ? "Story renamed successfully!" : "Memory saved to your private collection!", 
                    type: "success" 
                });
                await fetchSavedMemories();
                if (!isUpdate) {
                    setActiveMemory(null);
                    setViewMode("library");
                }
            }
        } catch (err) {
            console.error("Failed to save memory:", err);
            setToast({ message: "Failed to save memory.", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    const viewSavedDetail = async (memId) => {
        try {
            setIsGenerating(true);
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${API_BASE_URL}/api/memories/${memId}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setStoryName(data.name);
                setActiveMemory({
                    id: data.id,
                    source: data.source_image,
                    memories: data.images.filter(img => img.id !== data.source_image_id)
                });
            }
        } catch (err) {
            console.error("Failed to load memory detail:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const deleteSavedMemory = async (e, memId) => {
        if (e) e.stopPropagation();
        
        if (!itemToDelete) {
            setItemToDelete(memId);
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`${API_BASE_URL}/api/memories/${memId}`, {
                method: "DELETE",
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            await fetchSavedMemories();
            setToast({ message: "Memory removed.", type: "success" });
            setItemToDelete(null);
        } catch (err) {
            console.error("Failed to delete memory:", err);
        }
    };

    const exportAsImage = async () => {
        if (!collageRef.current) return;
        try {
            setIsExporting(true);
            setToast({ message: "AI is developing your HD Memory... 🧪", type: "info" });
            
            // Temporary class for export styling
            collageRef.current.classList.add('export-canvas');
            
            const canvas = await html2canvas(collageRef.current, {
                useCORS: true,
                scale: 2,
                backgroundColor: "#000B2B",
                logging: false,
                width: 1200,
                onclone: (clonedDoc) => {
                    const el = clonedDoc.getElementById('printable-collage');
                    if (el) {
                        el.style.width = '1200px';
                        el.style.display = 'flex';
                        el.style.flexDirection = 'column';
                        el.style.alignItems = 'center';
                    }
                }
            });

            collageRef.current.classList.remove('export-canvas');

            const image = canvas.toDataURL("image/png", 1.0);
            const link = document.createElement("a");
            link.href = image;
            link.download = `CloudSync_Memory_${storyName.replace(/\s+/g, '_') || 'Story'}.png`;
            link.click();
            
            setToast({ message: "Gallery-grade collage saved! 🎨✨", type: "success" });
        } catch (err) {
            console.error("Export failed:", err);
            collageRef.current?.classList.remove('export-canvas');
            setToast({ message: "Export failed. Please try again.", type: "error" });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto pb-20 space-y-12">
            <style>{PRINT_STYLES}</style>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 bg-pink-500/10 text-pink-500 px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest">
                        <Heart size={14} fill="currentColor" />
                        AI Storytelling
                    </div>
                    <h2 className="text-5xl font-black text-[#000B2B] dark:text-white tracking-tight">
                        Visual <span className="text-pink-500">Memories</span>
                    </h2>
                    
                    {/* View Switcher */}
                    <div className="flex gap-2 p-1.5 bg-black/5 dark:bg-white/5 rounded-2xl w-fit">
                        <button 
                            onClick={() => setViewMode("discovery")}
                            className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${viewMode === 'discovery' ? 'bg-white dark:bg-[#1e293b] shadow-lg text-[#000B2B] dark:text-white' : 'text-[#000B2B]/40 dark:text-white/40'}`}
                        >
                            Discover
                        </button>
                        <button 
                            onClick={() => setViewMode("library")}
                            className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${viewMode === 'library' ? 'bg-white dark:bg-[#1e293b] shadow-lg text-[#000B2B] dark:text-white' : 'text-[#000B2B]/40 dark:text-white/40'}`}
                        >
                            My Collection ({savedMemories.length})
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="aspect-square bg-white dark:bg-white/5 rounded-[32px] animate-pulse" />
                    ))}
                </div>
            ) : (
                <>
                    {viewMode === "discovery" ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {images.slice(0, 12).map((img) => (
                                <motion.div 
                                    key={img.id}
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    className="group relative aspect-[4/5] rounded-[40px] overflow-hidden cursor-pointer shadow-soft bg-white dark:bg-[#1e293b]"
                                    onClick={() => generateMemory(img)}
                                >
                                    <img src={img.cloudinary_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute bottom-6 left-6 right-6 opacity-0 group-hover:opacity-100 transition-all">
                                        <button className="w-full bg-white text-[#000B2B] py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-pink-500 hover:text-white transition-colors">
                                            Create Story
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {savedMemories.map((mem) => (
                                <motion.div
                                    key={mem.id}
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => viewSavedDetail(mem.id)}
                                    className="bg-white dark:bg-[#1e293b] p-6 rounded-[48px] shadow-soft cursor-pointer group hover:shadow-2xl transition-all"
                                >
                                    <div className="aspect-video rounded-[32px] overflow-hidden mb-6 relative">
                                        <img src={mem.source_image.cloudinary_url} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white">
                                                    <Heart size={14} fill="currentColor" />
                                                </div>
                                                <span className="text-white font-black text-xs uppercase tracking-widest">{mem.image_ids.length} Moments</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-black text-xl dark:text-white mb-1">{mem.name}</h4>
                                            <p className="text-xs font-bold text-[#000B2B]/40 dark:text-white/40 uppercase tracking-widest">Saved {new Date(mem.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <button 
                                            onClick={(e) => deleteSavedMemory(e, mem.id)}
                                            className="p-4 rounded-2xl bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                            {savedMemories.length === 0 && (
                                <div className="col-span-full py-20 text-center bg-white/50 dark:bg-white/5 rounded-[60px] border-2 border-dashed border-black/5">
                                    <Sparkles size={64} className="mx-auto mb-6 opacity-20" />
                                    <h4 className="text-2xl font-black dark:text-white mb-2">No Saved Memories</h4>
                                    <p className="text-[#000B2B]/40 dark:text-white/40 font-bold">Discover new stories and save them here.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Memory Modal / Collage */}
            <AnimatePresence>
                {activeMemory && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-[#000B2B]/95 backdrop-blur-2xl overflow-y-auto"
                    >
                        <div className="max-w-6xl mx-auto px-6 py-20 relative text-white">
                            <button 
                                onClick={() => setActiveMemory(null)}
                                className="absolute top-10 right-10 text-white/40 hover:text-white transition-colors p-4"
                            >
                                <X size={40} />
                            </button>

                            <div className="space-y-12" id="printable-collage" ref={collageRef}>
                                {/* Memory Header */}
                                <div className="text-center space-y-6">
                                    <div className="max-w-xl mx-auto">
                                        <input 
                                            type="text"
                                            value={storyName}
                                            onChange={(e) => setStoryName(e.target.value)}
                                            className="w-full bg-white/5 border-b-2 border-white/10 hover:border-pink-500 focus:border-pink-500 text-3xl md:text-5xl font-black text-center outline-none transition-all pb-2"
                                            placeholder="Name your story..."
                                        />
                                    </div>
                                    <div className="flex items-center justify-center gap-4 text-white/40 text-xs font-black uppercase tracking-widest no-export">
                                        <Clock size={14} />
                                        AI Match Score: Strong
                                        <span className="w-1 h-1 bg-white/20 rounded-full" />
                                        {activeMemory.memories.length + 1} Related Moments
                                    </div>
                                </div>

                                {/* Collage Layout */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {/* Main Image */}
                                    <motion.div 
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="col-span-2 row-span-2 aspect-square rounded-[60px] overflow-hidden shadow-2xl relative group bg-white/5 main-moment"
                                    >
                                        <img 
                                            src={`${activeMemory.source.cloudinary_url}${activeMemory.source.cloudinary_url.includes('?') ? '&' : '?'}v=collage`} 
                                            className="w-full h-full object-cover" 
                                            crossOrigin="anonymous" 
                                        />
                                        <div className="absolute inset-0 bg-pink-500/20 mix-blend-overlay no-export" />
                                        <div className="absolute bottom-10 left-10 no-export">
                                            <span className="bg-pink-500 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-lg">Key Moment</span>
                                        </div>
                                    </motion.div>

                                    {/* Similar Moments */}
                                    {activeMemory.memories.map((img, idx) => (
                                        <motion.div 
                                            key={img.id}
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1, transition: { delay: idx * 0.1 } }}
                                            className={`rounded-[40px] overflow-hidden shadow-xl relative aspect-square group bg-white/5 square-moment ${idx === 0 ? 'md:col-span-2 md:aspect-video featured-similar' : ''}`}
                                        >
                                            <img 
                                                src={`${img.cloudinary_url}${img.cloudinary_url.includes('?') ? '&' : '?'}v=collage`} 
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                                crossOrigin="anonymous" 
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center no-export">
                                                <p className="text-[#FFC107] font-black text-xs uppercase tracking-widest">Visual Match</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                                
                                {/* Controls */}
                                <div className="flex items-center justify-center gap-6 pt-8 no-export">
                                    <button 
                                        onClick={saveMemory}
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-3 bg-pink-500 text-white px-10 py-5 rounded-[32px] font-black uppercase tracking-widest hover:bg-pink-600 transition-all shadow-xl shadow-pink-500/20 disabled:opacity-50 no-print"
                                    >
                                        {isSaving ? "Updating..." : (
                                            activeMemory.id ? <><Sparkles size={20} /> Update Story Name</> : <><Heart size={20} fill="currentColor" /> Save to My Stories</>
                                        )}
                                    </button>
                                    <button 
                                        onClick={exportAsImage}
                                        disabled={isExporting}
                                        className="inline-flex items-center gap-3 bg-white/10 border border-white/10 text-white px-10 py-5 rounded-[32px] font-black uppercase tracking-widest hover:bg-white/20 transition-all backdrop-blur-md no-print disabled:opacity-50"
                                    >
                                        <DownloadCloud size={20} />
                                        {isExporting ? "Exporting..." : "Export HD Image"}
                                    </button>
                                    <button 
                                        className="inline-flex items-center gap-3 bg-white/10 border border-white/10 text-white px-10 py-5 rounded-[32px] font-black uppercase tracking-widest hover:bg-white/20 transition-all backdrop-blur-md no-print"
                                        onClick={() => window.print()}
                                    >
                                        <Layout size={20} />
                                        Print Collage
                                    </button>
                                </div>
                                
                                {/* Professional Export Footer (Visible in Export/Print) */}
                                <div className="hidden export-only print:flex items-center justify-between pt-12 border-t border-white/5 opacity-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-[#FFC107] rounded-xl flex items-center justify-center">
                                            <Cloud size={24} className="text-[#000B2B]" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-lg font-black tracking-tight">CloudSync<span className="text-[#FFC107]">.</span></p>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Visual Memory System (VMS)</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Authenticity Key</p>
                                        <p className="font-mono text-[10px] text-[#FFC107]">AI-CERT-{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                                    </div>
                                </div>
                                
                                {/* Print-only Footer */}
                                <div className="hidden print:block text-center pt-8 border-t border-black/10 text-black/40 text-[10px] font-black uppercase tracking-[0.3em]">
                                    Created with CloudSync AI Visual Memories • {new Date().toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Spinner for generation */}
            <AnimatePresence>
                {isGenerating && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] bg-white/80 dark:bg-[#000B2B]/80 backdrop-blur-md flex flex-col items-center justify-center"
                    >
                        <div className="relative">
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="w-24 h-24 border-8 border-pink-500/20 border-t-pink-500 rounded-full"
                            />
                            <Zap className="absolute inset-0 m-auto text-pink-500 animate-pulse" size={32} />
                        </div>
                        <p className="mt-8 text-2xl font-black text-[#000B2B] dark:text-white uppercase tracking-tighter">AI Curating your memories...</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-4 bg-white dark:bg-[#1e293b] text-[#000B2B] dark:text-white px-8 py-5 rounded-[32px] shadow-2xl border border-black/5 dark:border-white/10 backdrop-blur-3xl min-w-[320px]"
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${toast.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-pink-500/10 text-pink-500'}`}>
                            {toast.type === 'error' ? <X size={20} /> : <Zap size={20} />}
                        </div>
                        <div className="flex-grow">
                            <p className="text-sm font-black uppercase tracking-widest">{toast.type === 'error' ? 'Oops!' : 'Notice'}</p>
                            <p className="text-xs font-bold text-[#000B2B]/40 dark:text-white/40">{toast.message}</p>
                        </div>
                        <button onClick={() => setToast(null)} className="text-[#000B2B]/20 dark:text-white/20 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Confirmation Overlay */}
            <AnimatePresence>
                {itemToDelete && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[250] bg-[#000B2B]/40 backdrop-blur-sm flex items-center justify-center p-6"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white dark:bg-[#1e293b] p-8 rounded-[40px] shadow-2xl max-w-sm w-full text-center space-y-6 border border-black/5"
                        >
                            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={40} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-[#000B2B] dark:text-white mb-2">Delete Story?</h4>
                                <p className="text-sm font-bold text-[#000B2B]/40 dark:text-white/40">This will permanently remove this visual story from your collection.</p>
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setItemToDelete(null)}
                                    className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-black/5 dark:bg-white/5 text-[#000B2B] dark:text-white hover:bg-black/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => deleteSavedMemory(null, itemToDelete)}
                                    className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors"
                                >
                                    Confirm
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Memories;

