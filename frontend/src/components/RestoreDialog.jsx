/**
 * RestoreDialog
 *
 * Smart restore modal — uses the image's Supabase metadata (public_id) to
 * call Cloudinary's native backup restore API. No local file required.
 *
 * Props:
 *   open      — boolean, whether to show the dialog
 *   image     — the image object from Supabase { id, original_name, public_id, cloudinary_url, ... }
 *   token     — Supabase auth token (Bearer)
 *   onSuccess — called with the updated image object after a successful restore
 *   onCancel  — called when the user closes/cancels
 */

import { useState } from "react";
import { API_BASE_URL } from "../config";

const RestoreDialog = ({ open, image, token, onSuccess, onCancel }) => {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [restoredUrl, setRestoredUrl] = useState("");

  if (!open || !image) return null;

  const handleRestore = async () => {
    if (!image?.id) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      console.log(`[DEBUG] Attempting restore for image ID: ${image.id}`);
      const response = await fetch(
        `${API_BASE_URL}/images/${image.id}/restore`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(
          data.message || data.error || "Restore failed. Please try again.",
        );
        setStatus("error");
        return;
      }

      setRestoredUrl(data.restoredUrl);
      setStatus("success");

      // Notify parent after a short delay so user can see the success state
      setTimeout(() => {
        if (onSuccess) onSuccess(data.image);
      }, 1800);
    } catch (err) {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  };

  const handleClose = () => {
    setStatus("idle");
    setErrorMsg("");
    setRestoredUrl("");
    if (onCancel) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div
          className={`h-2 w-full transition-all duration-500 ${
            status === "success"
              ? "bg-emerald-400"
              : status === "error"
                ? "bg-red-400"
                : status === "loading"
                  ? "bg-yellow-400 animate-pulse"
                  : "bg-gradient-to-r from-blue-500 to-purple-500"
          }`}
        />

        <div className="p-8 space-y-6">
          {/* Icon + Title */}
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                status === "success"
                  ? "bg-emerald-100 dark:bg-emerald-900/30"
                  : status === "error"
                    ? "bg-red-100 dark:bg-red-900/30"
                    : "bg-blue-100 dark:bg-blue-900/30"
              }`}
            >
              {status === "success" ? (
                <svg
                  className="w-7 h-7 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : status === "error" ? (
                <svg
                  className="w-7 h-7 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : status === "loading" ? (
                <svg
                  className="w-7 h-7 text-blue-500 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              ) : (
                <svg
                  className="w-7 h-7 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">
                {status === "success"
                  ? "Image Restored!"
                  : status === "error"
                    ? "Restore Failed"
                    : status === "loading"
                      ? "Restoring…"
                      : "Restore Image"}
              </h2>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                {status === "idle" ? "From Supabase Storage backup" : ""}
              </p>
            </div>
          </div>

          {/* Image info card */}
          {status === "idle" && (
            <div className="bg-gray-50 dark:bg-[#0f172a] rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  File Name
                </span>
                <span className="font-bold text-gray-800 dark:text-white truncate max-w-[200px]">
                  {image.original_name}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  Cloudinary ID
                </span>
                <code className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg font-mono truncate max-w-[200px]">
                  {image.public_id}
                </code>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  Method
                </span>
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-lg font-bold">
                  Supabase Storage (Free)
                </span>
              </div>
            </div>
          )}

          {/* Loading state */}
          {status === "loading" && (
            <div className="text-center py-4 space-y-3">
              <div className="flex justify-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Contacting Cloudinary backup servers…
              </p>
            </div>
          )}

          {/* Success state */}
          {status === "success" && (
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 text-center">
                <p className="text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                  ✓ Successfully restored from Cloudinary backup
                </p>
                <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1 opacity-70">
                  The image is now live again on Cloudinary
                </p>
              </div>
              {restoredUrl && (
                <img
                  src={restoredUrl}
                  alt="Restored"
                  className="w-full h-40 object-cover rounded-2xl border-2 border-emerald-200 dark:border-emerald-800"
                />
              )}
            </div>
          )}

          {/* Error state */}
          {status === "error" && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 space-y-2">
              <p className="text-red-700 dark:text-red-300 font-bold text-sm">
                Could not restore image
              </p>
              <p className="text-red-600 dark:text-red-400 text-xs leading-relaxed">
                {errorMsg}
              </p>
              <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                <p className="text-xs text-red-500 dark:text-red-400 font-semibold">
                  💡 Tip: Only images uploaded after the backup system was
                  enabled can be restored. For older images, re-upload the
                  original file manually.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {status === "idle" && (
              <>
                <button
                  id="restore-image-btn"
                  onClick={handleRestore}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-blue-500/25"
                >
                  Restore from Backup
                </button>
                <button
                  onClick={handleClose}
                  className="px-5 py-3 bg-gray-100 dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-800 active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </>
            )}
            {status === "error" && (
              <>
                <button
                  onClick={handleRestore}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 active:scale-95 transition-all"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="px-5 py-3 bg-gray-100 dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-800 active:scale-95 transition-all"
                >
                  Close
                </button>
              </>
            )}
            {(status === "success" || status === "loading") && (
              <button
                onClick={handleClose}
                disabled={status === "loading"}
                className="flex-1 py-3 bg-gray-100 dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "success" ? "Done" : "Please wait…"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestoreDialog;
