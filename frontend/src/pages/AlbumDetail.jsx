import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Image as ImageIcon,
  Download,
  Share2,
  CheckCircle2,
  MoreVertical,
  Plus,
  X,
  Search,
  RefreshCw,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { API_BASE_URL } from "../config";
import RestoreDialog from "../components/RestoreDialog";

const AlbumDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);

  // Add Photos Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [libraryImages, setLibraryImages] = useState([]);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingPhotos, setAddingPhotos] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Restore Dialog State
  const [restoreTarget, setRestoreTarget] = useState(null); // the image object to restore
  const [authToken, setAuthToken] = useState("");
  const [brokenImageIds, setBrokenImageIds] = useState(new Set()); // track images that failed to load

  // Grab + cache the auth token once on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setAuthToken(session.access_token);
    });
  }, []);

  // Called when an <img> tag fires its onError event
  const handleImageError = (imageId) => {
    console.log(`[DEBUG] Image failed to load: ${imageId}`);
    setBrokenImageIds((prev) => {
      const next = new Set(prev);
      next.add(imageId);
      return next;
    });
  };

  // Called after a successful restore — update the image URL in local state
  const handleRestoreSuccess = (updatedImage) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === updatedImage.id
          ? { ...img, cloudinary_url: updatedImage.cloudinary_url }
          : img,
      ),
    );
    setBrokenImageIds((prev) => {
      const next = new Set(prev);
      next.delete(updatedImage.id);
      return next;
    });
    setRestoreTarget(null);
    setSuccessMsg("✅ Image successfully restored from Cloudinary backup!");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "cloudsync-photo.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      setSuccessMsg("Download started! 📥");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Download error:", err);
      window.open(url, "_blank");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };

      // Fetch images for this album, album details, and user library
      const [imgRes, albRes, libRes] = await Promise.all([
        fetch(`${API_BASE_URL}/albums/${id}/images`, { headers }),
        fetch(`${API_BASE_URL}/albums`, { headers }),
        fetch(`${API_BASE_URL}/images`, { headers }),
      ]);

      const imagesData = await imgRes.json();
      const albumsData = await albRes.json();
      const libraryData = await libRes.json();

      const currentAlbum = albumsData.find((a) => a.id === id);
      setAlbum(currentAlbum);
      setImages(imagesData);

      // Filter library images to only show those NOT in the current album
      const currentImageIds = new Set(imagesData.map((img) => img.id));
      setLibraryImages(
        libraryData.filter((img) => !currentImageIds.has(img.id)),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhotos = async () => {
    if (selectedLibraryIds.length === 0) return;

    try {
      setAddingPhotos(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/images-bulk`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageIds: selectedLibraryIds,
          album_id: id,
        }),
      });

      if (!response.ok) throw new Error("Failed to add photos");

      setShowAddModal(false);
      setSelectedLibraryIds([]);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingPhotos(false);
    }
  };

  const toggleSelection = (imgId) => {
    setSelectedLibraryIds((prev) =>
      prev.includes(imgId) ? prev.filter((i) => i !== imgId) : [...prev, imgId],
    );
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const getOptimizedImageUrl = (url) => {
    if (!url) return "";
    if (url.includes("cloudinary.com")) {
      return url.replace("/upload/", "/upload/f_auto,q_auto,w_auto,c_scale/");
    }
    return url;
  };

  if (loading)
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#FFC107] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate("/albums")}
            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#000B2B] shadow-soft hover:bg-[#FFC107] transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-[900] text-[#000B2B] tracking-tight">
              {album?.name || "Collection"}
            </h2>
            <p className="text-[#000B2B]/40 font-bold uppercase tracking-widest text-[10px]">
              {images.length} Photos in this album
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#000B2B] text-white px-8 py-4 rounded-full font-extrabold flex items-center gap-2 shadow-xl hover:scale-105 transition-all"
        >
          <Plus size={20} />
          Add Photos
        </button>
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-green-500 text-white p-4 rounded-2xl flex items-center gap-3 font-bold text-sm shadow-xl min-w-[300px]"
        >
          <CheckCircle2 size={18} />
          {successMsg}
          <button
            onClick={() => setSuccessMsg("")}
            className="ml-auto p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}

      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[60px] border-2 border-dashed border-[#000B2B]/5">
          <div className="w-24 h-24 bg-[#F7F7F7] rounded-full flex items-center justify-center mb-6">
            <ImageIcon className="text-[#000B2B]/20 w-10 h-10" />
          </div>
          <h3 className="text-2xl font-extrabold text-[#000B2B] mb-2 text-center">
            Empty Collection
          </h3>
          <p className="text-[#000B2B]/40 font-bold text-center">
            Add content from the dashboard and assign it to this album.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {images.map((image) => {
            const isBroken = brokenImageIds.has(image.id);
            return (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative rounded-[40px] overflow-hidden shadow-soft transition-all ${
                  isBroken
                    ? "bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800"
                    : "bg-white"
                }`}
              >
                <div className="aspect-[4/5] w-full h-full">
                  {isBroken ? (
                    // Broken image placeholder
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                        <ImageIcon className="w-7 h-7 text-red-400" />
                      </div>
                      <p className="text-xs font-bold text-red-500 text-center leading-tight">
                        Image missing
                        <br />
                        <span className="text-red-400 font-medium">
                          {image.original_name}
                        </span>
                      </p>
                      <button
                        id={`restore-btn-${image.id}`}
                        onClick={() => setRestoreTarget(image)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold rounded-full shadow-lg hover:opacity-90 active:scale-95 transition-all"
                      >
                        <RefreshCw size={12} />
                        Restore
                      </button>
                    </div>
                  ) : (
                    <img
                      src={getOptimizedImageUrl(image.cloudinary_url)}
                      alt={image.original_name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        console.error(
                          `[DEBUG] <img> error for ${image.original_name}:`,
                          e,
                        );
                        handleImageError(image.id);
                      }}
                    />
                  )}
                </div>

                {/* Hover overlay — only shown on healthy images */}
                {!isBroken && (
                  <div className="absolute inset-0 bg-gradient-to-t from-[#000B2B]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-extrabold text-sm truncate">
                        {image.original_name}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleDownload(
                              image.cloudinary_url,
                              image.original_name,
                            )
                          }
                          className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center text-white hover:bg-white hover:text-[#000B2B] transition-all"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Photos Modal */}
      <AnimatePresence>
        {showAddModal && (
          // ... (unchanged modal code)
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-[#000B2B]/40 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[48px] p-10 w-full max-w-4xl relative z-10 shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-8 shrink-0">
                <div>
                  <h2 className="text-2xl font-extrabold text-[#000B2B]">
                    Select Photos
                  </h2>
                  <p className="text-[#000B2B]/40 font-bold uppercase tracking-widest text-xs">
                    Choose assets from your library
                  </p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-10 h-10 rounded-full hover:bg-red-50 text-red-400 flex items-center justify-center transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* SearchBar */}
              <div className="relative mb-6 shrink-0">
                <Search
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-[#000B2B]/20"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search library..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F7F7F7] border-none rounded-2xl py-4 pl-14 pr-6 font-bold text-[#000B2B] focus:ring-2 focus:ring-[#FFC107] outline-none"
                />
              </div>

              {/* Library Grid */}
              <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                {libraryImages.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-[#000B2B]/40 font-bold uppercase tracking-widest text-sm">
                      Your library is empty or all photos are already here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {libraryImages
                      .filter((img) =>
                        img.original_name
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()),
                      )
                      .map((image) => (
                        <div
                          key={image.id}
                          onClick={() => toggleSelection(image.id)}
                          className={`relative aspect-square rounded-[32px] overflow-hidden cursor-pointer border-4 transition-all ${
                            selectedLibraryIds.includes(image.id)
                              ? "border-[#FFC107] scale-95 shadow-lg"
                              : "border-transparent"
                          }`}
                        >
                          <img
                            src={getOptimizedImageUrl(image.cloudinary_url)}
                            className="w-full h-full object-cover"
                          />
                          {selectedLibraryIds.includes(image.id) && (
                            <div className="absolute top-4 right-4 bg-[#FFC107] text-[#000B2B] rounded-full p-1 shadow-lg">
                              <CheckCircle2 size={16} bold={true} />
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="mt-10 pt-6 border-t border-[#000B2B]/5 flex justify-between items-center shrink-0">
                <p className="text-[#000B2B]/40 font-bold uppercase tracking-widest text-xs">
                  {selectedLibraryIds.length} Photos Selected
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-8 py-4 rounded-2xl font-extrabold text-[#000B2B] hover:bg-[#F7F7F7] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPhotos}
                    disabled={addingPhotos || selectedLibraryIds.length === 0}
                    className="bg-[#000B2B] text-white px-10 py-4 rounded-full font-extrabold shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {addingPhotos ? "Adding..." : "Add to Album"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Restore Dialog — triggered when a broken image's Restore button is clicked */}
      <RestoreDialog
        open={!!restoreTarget}
        image={restoreTarget}
        token={authToken}
        onSuccess={handleRestoreSuccess}
        onCancel={() => setRestoreTarget(null)}
      />
    </div>
  );
};

export default AlbumDetail;
