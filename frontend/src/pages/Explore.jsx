import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Search,
  ChevronRight,
  Image as ImageIcon,
  Heart,
  Palette,
  Map,
  ShoppingBag,
  Camera,
  Coffee,
  Trees,
  Car,
  Laptop,
  Smartphone,
  Baby,
  Flower2,
  Waves,
  Mountain,
  Music,
  PartyPopper
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { API_BASE_URL } from "../config";

const CATEGORY_ICON_MAP = {
  "NATURE": <Trees className="text-emerald-500" />,
  "PEOPLE": <Camera className="text-blue-500" />,
  "KIDS": <Baby className="text-pink-400" />,
  "FOOD": <Coffee className="text-orange-500" />,
  "ARCHITECTURE": <Palette className="text-purple-500" />,
  "TECHNOLOGY": <Laptop className="text-slate-500" />,
  "TRAVEL": <Map className="text-cyan-500" />,
  "ANIMALS": <Heart className="text-red-500" />,
  "VEHICLES": <Car className="text-indigo-500" />,
  "FASHION": <ShoppingBag className="text-pink-500" />,
  "DOCUMENTS": <ImageIcon className="text-yellow-500" />,
  "SPORTS": <ImageIcon className="text-blue-600" />,
  "ART": <Palette className="text-pink-600" />,
  "INTERIORS": <Heart className="text-orange-400" />,
  "SCREENSHOTS": <Smartphone className="text-slate-400" />,
  "FLOWERS": <Flower2 className="text-rose-400" />,
  "BEACH": <Waves className="text-blue-400" />,
  "MOUNTAINS": <Mountain className="text-stone-500" />,
  "MUSIC": <Music className="text-indigo-400" />,
  "CELEBRATIONS": <PartyPopper className="text-amber-500" />,
};

const Explore = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/images`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (response.ok) {
        setImages(await response.json());
      }
    } catch (err) {
      console.error("Error fetching images for explore:", err);
    } finally {
      setLoading(false);
    }
  };

  // Dynamically generate categories from actual image tags
  const dynamicCategories = Array.from(
    new Set(images.flatMap(img => img.tags || []))
  )
  .map(tagName => {
    const upperTag = tagName.toUpperCase();
    return {
      name: tagName,
      icon: CATEGORY_ICON_MAP[upperTag] || <Sparkles className="text-[#FFC107]" />
    };
  })
  .sort((a, b) => {
    const aKnown = CATEGORY_ICON_MAP[a.name.toUpperCase()] ? 1 : 0;
    const bKnown = CATEGORY_ICON_MAP[b.name.toUpperCase()] ? 1 : 0;
    return bKnown - aKnown || a.name.localeCompare(b.name);
  });

  const getImagesForCategory = (catName) => {
    return images.filter(img => 
      img.tags?.some(tag => tag.toUpperCase() === catName.toUpperCase())
    );
  };

  const filteredCategories = dynamicCategories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0 }
  };

  if (selectedCategory) {
    const categoryImages = getImagesForCategory(selectedCategory);
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedCategory(null)}
            className="p-3 bg-white dark:bg-[#1e293b] rounded-2xl border border-[#000B2B]/5 dark:border-white/5 shadow-soft hover:scale-105 transition-all"
          >
            <ChevronRight className="rotate-180" />
          </button>
          <div>
            <h3 className="text-3xl font-black text-[#000B2B] dark:text-white capitalize">{selectedCategory}</h3>
            <p className="text-[#000B2B]/40 dark:text-white/40 font-bold uppercase tracking-widest text-xs">
              {categoryImages.length} AI-Categorized Photos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categoryImages.map(image => (
            <motion.div 
              key={image.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="aspect-square rounded-3xl overflow-hidden group relative shadow-soft"
            >
              <img 
                src={image.cloudinary_url} 
                alt={image.original_name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <h3 className="text-3xl font-black text-[#000B2B] dark:text-white">Smart Collections</h3>
        <div className="relative max-w-2xl group">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search through AI-generated categories..."
            className="w-full bg-white dark:bg-[#1e293b] border border-[#000B2B]/5 dark:border-white/5 rounded-[32px] py-4 pl-12 pr-6 font-bold shadow-soft outline-none focus:ring-4 focus:ring-[#FFC107]/20 transition-all"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#000B2B]/20 group-focus-within:text-[#FFC107] transition-colors" size={20} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-white/50 dark:bg-white/5 rounded-[40px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {filteredCategories.map((cat) => {
                    const catImages = getImagesForCategory(cat.name);
                    return (
                        <motion.div
                            key={cat.name}
                            variants={itemVariants}
                            whileHover={{ y: -8, scale: 1.02 }}
                            onClick={() => setSelectedCategory(cat.name)}
                            className="bg-white dark:bg-[#1e293b] p-6 rounded-[40px] shadow-soft border border-[#000B2B]/5 dark:border-white/5 cursor-pointer group hover:shadow-xl transition-all"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#F7F7F7] dark:bg-[#0f172a] rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                        {cat.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-xl text-[#000B2B] dark:text-white capitalize">{cat.name}</h4>
                                        <p className="text-xs font-bold text-[#000B2B]/40 dark:text-white/40 uppercase tracking-widest">
                                            {catImages.length} items
                                        </p>
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-[#FFC107]/10 flex items-center justify-center text-[#FFC107] group-hover:bg-[#FFC107] group-hover:text-[#000B2B] transition-all">
                                    <ChevronRight size={18} />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 h-32 overflow-hidden rounded-2xl bg-[#F7F7F7] dark:bg-[#0f172a]">
                                {catImages.slice(0, 3).map((img, i) => (
                                    <img 
                                        key={img.id}
                                        src={img.cloudinary_url}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ))}
                                {catImages.length === 0 && (
                                    <div className="col-span-full h-full flex items-center justify-center text-[10px] font-black uppercase text-[#000B2B]/10 dark:text-white/10 tracking-widest">
                                        No Content Yet
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>
            
            {filteredCategories.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30">
                    <Sparkles size={64} className="mb-4" />
                    <p className="text-xl font-bold">No categories found matching "{searchQuery}"</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Explore;
