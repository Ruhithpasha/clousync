import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Home,
  Eye,
  EyeOff,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleAdminAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        },
      );

      if (authError) throw authError;

      // SUCCESS: Navigate immediately to the dashboard.
      // The ProtectedRoute and AuthContext will handle the profile check
      // during the dashboard mount, which prevents blocking the UI here.
      navigate("/admin");
    } catch (err) {
      setError(err.message);
    } finally {
      // We don't set loading to false if we're navigating to keep the transition smooth
      if (!error) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000B2B] font-['Plus_Jakarta_Sans'] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-grid-dark pointer-events-none opacity-20" />
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/5 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/10 p-10 overflow-hidden">
          {/* Admin Logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-[#FFC107] rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-[#FFC107]/20">
              <ShieldCheck className="w-10 h-10 text-[#000B2B]" />
            </div>
            <h1 className="text-3xl font-[900] text-white tracking-tighter">
              Admin Portal
            </h1>
            <p className="text-white/40 font-bold mt-2 uppercase tracking-[0.2em] text-[10px]">
              Secure Root Access Only
            </p>
          </div>

          <form onSubmit={handleAdminAuth} className="space-y-4">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="email"
                  placeholder="Admin Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 font-bold text-white focus:ring-2 focus:ring-[#FFC107] outline-none transition-all placeholder:text-white/20"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 font-bold text-white focus:ring-2 focus:ring-[#FFC107] outline-none transition-all placeholder:text-white/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#FFC107] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-sm font-bold text-center bg-red-400/10 p-4 rounded-2xl border border-red-400/20"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FFC107] text-[#000B2B] py-5 rounded-2xl font-[900] text-lg flex items-center justify-center gap-2 hover:bg-[#FFC107]/90 transition-all active:scale-95 disabled:opacity-50 mt-6 shadow-xl shadow-[#FFC107]/10"
              >
                {loading ? "Authenticating..." : "Enter Dashboard"}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center pt-8 border-t border-white/5">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white/40 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors"
            >
              <Home size={14} />
              Back to Home
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;
