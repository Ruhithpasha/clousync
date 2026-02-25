import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  ChevronRight,
  Image as ImageIcon,
  ShieldCheck,
  AlertCircle,
  Database,
  Sparkles,
  Search,
  Eye,
  CheckCircle2,
  Trash2,
  Loader2,
  Zap,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { API_BASE_URL } from "../config";
import RestoreDialog from "../components/RestoreDialog";

const Restoration = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [authToken, setAuthToken] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [filter, setFilter] = useState("all"); // 'all' | 'missing'
  const [brokenIds, setBrokenIds] = useState(new Set());
  const [checkingIds, setCheckingIds] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setAuthToken(session.access_token);
        fetchRestorableImages(session.access_token);
      }
    });
  }, []);

  const fetchRestorableImages = async (token) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/restorable-images`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setImages(data);
      }
    } catch (err) {
      console.error("Error fetching restorable images:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleScanForMissing = async () => {
    if (images.length === 0) return;

    try {
      setScanning(true);
      const imageIds = images.map((img) => img.id);

      const response = await fetch(`${API_BASE_URL}/check-status-bulk`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageIds }),
      });

      if (response.ok) {
        const results = await response.json();
        const deleted = new Set(
          results.filter((r) => r.isDeleted).map((r) => r.id),
        );
        setBrokenIds(deleted);
        setFilter("missing");
        setCheckingIds(true);
      }
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setScanning(false);
    }
  };

  const handleRestoreSuccess = (updatedImage) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === updatedImage.id
          ? { ...img, cloudinary_url: updatedImage.cloudinary_url }
          : img,
      ),
    );
    setBrokenIds((prev) => {
      const next = new Set(prev);
      next.delete(updatedImage.id);
      return next;
    });
    setRestoreTarget(null);
    setSuccessMsg("✨ Image successfully restored and live again!");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const displayedImages =
    filter === "missing"
      ? images.filter((img) => brokenIds.has(img.id))
      : images;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0 },
  };

  return (
    <div className="space-y-10">
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/20">
            <Database size={12} />
            Storage Vault
          </div>
          <h2 className="text-5xl font-[900] text-[#000B2B] dark:text-white tracking-tighter leading-none">
            Media <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
              Restoration
            </span>
          </h2>
          <p className="text-[#000B2B]/40 dark:text-white/40 font-bold max-w-xl text-lg leading-relaxed">
            {filter === "missing"
              ? `Showing ${displayedImages.length} images that are currently missing from your cloud provider.`
              : "Access your secure Supabase backups. Preview any image and restore broken links instantly."}
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          {filter === "missing" ? (
            <button
              onClick={() => setFilter("all")}
              className="px-8 py-4 bg-white dark:bg-[#1e293b] text-[#000B2B] dark:text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-soft hover:shadow-xl transition-all border border-[#000B2B]/5 dark:border-white/5 active:scale-95 flex items-center gap-2"
            >
              <Eye size={16} />
              View All Backups
            </button>
          ) : (
            <button
              onClick={handleScanForMissing}
              disabled={scanning || images.length === 0}
              className="px-8 py-4 bg-[#000B2B] dark:bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
            >
              {scanning ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Search size={16} />
              )}
              {scanning ? "Polling Cloudinary..." : "Scan for Deleted Photos"}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#000B2B] text-[#FFC107] px-8 py-4 rounded-[32px] font-black shadow-2xl flex items-center gap-3 border-2 border-[#FFC107]/20 backdrop-blur-xl"
          >
            <Sparkles size={18} />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] bg-white dark:bg-[#1e293b] rounded-[48px] animate-pulse"
            />
          ))}
        </div>
      ) : displayedImages.length === 0 ? (
        <div className="bg-white dark:bg-[#1e293b] rounded-[60px] p-20 text-center space-y-6 shadow-soft border border-[#000B2B]/5 dark:border-white/5">
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-500">
            <CheckCircle2 size={40} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-[#000B2B] dark:text-white">
              All Clear!
            </h3>
            <p className="text-[#000B2B]/40 dark:text-white/40 font-bold text-lg">
              {filter === "missing"
                ? "No missing images detected. Your cloud storage is perfectly in sync!"
                : "No backups found. Upload images to start auto-recovery."}
            </p>
          </div>
          {filter === "missing" && (
            <button
              onClick={() => setFilter("all")}
              className="px-8 py-4 bg-[#F7F7F7] dark:bg-[#0f172a] text-[#000B2B] dark:text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-[#FFC107] transition-all"
            >
              Return to Gallery
            </button>
          )}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {displayedImages.map((image) => (
            <motion.div
              key={image.id}
              variants={itemVariants}
              whileHover={{ y: -12 }}
              className="group relative bg-white dark:bg-[#1e293b] rounded-[48px] overflow-hidden shadow-soft hover:shadow-2xl transition-all duration-500 border border-[#000B2B]/5 dark:border-white/5"
            >
              <div className="aspect-[3/4] w-full relative">
                {/* PREVIEW FROM SUPABASE BACKUP */}
                <img
                  src={image.supabase_preview_url || image.cloudinary_url}
                  alt={image.original_name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#000B2B] via-[#000B2B]/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                {/* Status Badges */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
                  <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] font-black text-[#000B2B] uppercase tracking-widest border border-white/50 flex items-center gap-1.5">
                    <ShieldCheck size={10} className="text-blue-500" />
                    S3 Backup
                  </div>
                  {brokenIds.has(image.id) && (
                    <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5 animate-pulse">
                      <Trash2 size={10} />
                      Missing in Cloud
                    </div>
                  )}
                </div>

                <div className="absolute bottom-6 left-6 right-6 space-y-5">
                  <div>
                    <h4 className="text-white font-[950] text-2xl tracking-tighter leading-none mb-1 truncate drop-shadow-xl">
                      {image.original_name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <p className="text-white/40 text-[10px] font-black uppercase tracking-widest truncate max-w-[120px]">
                        {image.public_id}
                      </p>
                      <div className="w-1 h-1 bg-white/20 rounded-full" />
                      <p className="text-[#FFC107] text-[10px] font-black uppercase tracking-widest">
                        {(image.file_size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setRestoreTarget(image)}
                    className={`w-full py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${
                      brokenIds.has(image.id)
                        ? "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20"
                        : "bg-white text-[#000B2B] hover:bg-[#FFC107]"
                    }`}
                  >
                    <RefreshCw
                      size={14}
                      className="group-hover:rotate-180 transition-transform duration-1000"
                    />
                    {brokenIds.has(image.id) ? "Restore File" : "Re-sync Now"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Logic Container for Restore Dialog */}
      <RestoreDialog
        open={!!restoreTarget}
        image={restoreTarget}
        token={authToken}
        onSuccess={handleRestoreSuccess}
        onCancel={() => setRestoreTarget(null)}
      />

      {/* Safe Box Illustration/Card */}
      <div className="relative group overflow-hidden bg-gradient-to-br from-[#000B2B] to-[#011440] rounded-[60px] p-12 text-white border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
          <div className="min-w-[200px]">
            <div className="w-32 h-32 bg-[#FFC107] rounded-[40px] flex items-center justify-center text-[#000B2B] shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-700">
              <Database size={56} />
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="text-4xl font-black tracking-tight leading-none">
              Your <span className="text-[#FFC107]">Immutable</span> <br />
              Backup Shield
            </h3>
            <p className="text-white/60 font-medium text-lg max-w-2xl leading-relaxed">
              Every photo you upload is mirrored to our private Supabase Storage
              server. If Cloudinary ever loses a file or you accidentally delete
              it from their console, you can pull it back here.
            </p>
            <div className="flex flex-wrap gap-8 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-[#FFC107]/50 transition-colors">
                  <Zap size={20} className="text-[#FFC107]" />
                </div>
                <span className="font-black uppercase tracking-widest text-[10px]">
                  Instant Recovery
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-blue-400/50 transition-colors">
                  <Eye size={20} className="text-blue-400" />
                </div>
                <span className="font-black uppercase tracking-widest text-[10px]">
                  Preview Original
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Restoration;
