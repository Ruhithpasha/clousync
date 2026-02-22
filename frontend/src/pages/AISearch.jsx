import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Sparkles, 
  Image as ImageIcon, 
  ArrowRight, 
  Maximize2,
  X,
  Zap
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { API_BASE_URL } from "../config";

const AISearch = () => {
    const [query, setQuery] = useState("");
    const [allImages, setAllImages] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedImg, setSelectedImg] = useState(null);

    const fetchAllImages = async () => {
        try {
            setInitialLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`${API_BASE_URL}/images`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setAllImages(data);
            }
        } catch (err) {
            console.error("Failed to fetch images:", err);
        } finally {
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchAllImages();
    }, []);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim()) {
            setHasSearched(false);
            return;
        }

        try {
            setLoading(true);
            setHasSearched(true);
            const { data: { session } } = await supabase.auth.getSession();
            
            const response = await fetch(`${API_BASE_URL}/search-images?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (response.ok) {
                setResults(await response.json());
            }
        } catch (err) {
            console.error("Semantic search failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20">
            {/* Hero Section */}
            <div className="text-center space-y-4">
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-2 bg-[#FFC107]/10 text-[#FFC107] px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest mb-4"
                >
                    <Zap size={14} />
                    Neural Search Active
                </motion.div>
                <h2 className="text-5xl font-black text-[#000B2B] dark:text-white tracking-tight">
                    Tired of finding that <span className="text-[#FFC107]">one</span> image?
                </h2>
                <p className="text-xl text-[#000B2B]/40 dark:text-white/40 font-bold max-w-2xl mx-auto">
                    Just describe it in plain English, and our CLIP AI will scan your 
                    pixels to find it instantly. No tags required.
                </p>
            </div>

            {/* Search Box */}
            <div className="relative max-w-3xl mx-auto group">
                <form onSubmit={handleSearch}>
                    <input 
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (!e.target.value.trim()) setHasSearched(false);
                        }}
                        placeholder="e.g. 'a photo of me at the beach during sunset'..."
                        className="w-full bg-white dark:bg-[#1e293b] border-2 border-[#000B2B]/5 dark:border-white/5 rounded-[40px] py-8 pl-10 pr-40 font-bold text-xl shadow-2xl outline-none focus:border-[#FFC107] transition-all"
                    />
                    <button 
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#FFC107] text-[#000B2B] px-8 py-4 rounded-[28px] font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50"
                    >
                        {loading ? "Thinking..." : "Find It"}
                        <ArrowRight size={20} />
                    </button>
                    <Search className="absolute left-[-60px] top-1/2 -translate-y-1/2 text-[#FFC107] opacity-20 hidden lg:block" size={48} />
                </form>
            </div>

            {/* Results Area */}
            <div className="min-h-[400px]">
                {(loading || initialLoading) ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="aspect-square bg-white dark:bg-white/5 rounded-[32px] animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-8"
                    >
                        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-6">
                            <div>
                                <h3 className="text-2xl font-black dark:text-white">
                                    {hasSearched ? `${results.length} Matches Found` : `Entire Library (${allImages.length} Photos)`}
                                </h3>
                                <p className="text-[#000B2B]/40 dark:text-white/40 font-bold uppercase tracking-widest text-[10px] mt-1">
                                    {hasSearched ? `Neural ranking applied to your query` : `Discovering your history through AI`}
                                </p>
                            </div>
                            <div className="hidden md:flex items-center gap-3">
                                <div className="text-[10px] font-black text-[#FFC107] uppercase tracking-widest bg-[#FFC107]/10 px-4 py-2 rounded-full border border-[#FFC107]/20">
                                    Vector Matching: ON
                                </div>
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full">
                                    CLIP-ViT-B/32
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {(hasSearched ? results : allImages).map((image, idx) => (
                                <motion.div 
                                    key={image.id}
                                    variants={itemVariants}
                                    whileHover={{ y: -8, scale: 1.02 }}
                                    onClick={() => setSelectedImg(image)}
                                    className="group relative aspect-square rounded-[32px] overflow-hidden cursor-pointer shadow-soft border-2 border-transparent hover:border-[#FFC107] transition-all bg-white dark:bg-[#1e293b]"
                                >
                                    <img 
                                        src={image.cloudinary_url} 
                                        alt={image.original_name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    
                                    <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                        <p className="text-white text-[9px] font-black uppercase truncate mb-1">{image.original_name}</p>
                                        {hasSearched && (
                                            <div className="flex items-center gap-1.5">
                                                <div className="h-1.5 flex-grow bg-white/20 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-[#FFC107]" 
                                                        style={{ width: `${(image.similarity * 100)}%` }}
                                                    />
                                                </div>
                                                <p className="text-[#FFC107] text-[10px] font-black flex-shrink-0">
                                                    {(image.similarity * 100).toFixed(0)}%
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Maximize2 size={16} className="text-white" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {(hasSearched ? results : allImages).length === 0 && (
                            <div className="text-center py-32 bg-white dark:bg-[#1e293b]/50 rounded-[60px] border-2 border-dashed border-[#000B2B]/5">
                                <div className="w-20 h-20 bg-[#F7F7F7] dark:bg-[#0f172a] rounded-full flex items-center justify-center mx-auto mb-6">
                                    <ImageIcon size={32} className="text-[#000B2B]/10 dark:text-white/10" />
                                </div>
                                <h4 className="text-2xl font-black text-[#000B2B] dark:text-white mb-2">
                                    {hasSearched ? "No direct matches" : "Your library is empty"}
                                </h4>
                                <p className="text-[#000B2B]/40 dark:text-white/40 font-bold max-w-sm mx-auto">
                                    {hasSearched 
                                        ? "Try describing it differently or use more specific keywords." 
                                        : "Upload some photos to start using neural semantic search."}
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {selectedImg && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-[#000B2B]/95 backdrop-blur-xl flex items-center justify-center p-8"
                    >
                        <button 
                            onClick={() => setSelectedImg(null)}
                            className="absolute top-10 right-10 text-white/40 hover:text-white transition-colors"
                        >
                            <X size={40} />
                        </button>
                        
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="max-w-5xl w-full aspect-video rounded-[48px] overflow-hidden shadow-2xl relative"
                        >
                            <img 
                                src={selectedImg.cloudinary_url} 
                                className="w-full h-full object-contain bg-black/20"
                            />
                            <div className="absolute bottom-10 left-10 py-6 px-10 bg-white/10 backdrop-blur-2xl rounded-[32px] border border-white/10 max-w-sm">
                                <h4 className="text-white font-black text-2xl mb-2">{selectedImg.original_name}</h4>
                                <div className="flex gap-2">
                                    {selectedImg.tags?.map(tag => (
                                        <span key={tag} className="bg-[#FFC107] text-[#000B2B] px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AISearch;
