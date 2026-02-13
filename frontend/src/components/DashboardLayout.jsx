import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Image as ImageIcon, 
  FolderOpen, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Plus,
  Cloud,
  ChevronRight,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

const DashboardLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch("/api/profile", {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (err) {
        console.error("Failed to fetch profile in layout", err);
      }
    };
    fetchProfile();
  }, [user]);

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: "Overview", path: "/cloudinary" },
    { icon: <ImageIcon size={20} />, label: "Library", path: "/local" }, 
    { icon: <FolderOpen size={20} />, label: "Albums", path: "/albums" },
    { icon: <Settings size={20} />, label: "Settings", path: "/settings" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] font-['Plus_Jakarta_Sans'] flex overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-40 z-0" />

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="relative z-20 bg-[#000B2B] h-screen flex flex-col transition-all duration-300 shadow-2xl"
      >
        {/* Sidebar Header */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FFC107] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#FFC107]/20">
            <Cloud className="w-6 h-6 text-[#000B2B]" />
          </div>
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-white font-extrabold text-xl tracking-tight whitespace-nowrap"
              >
                CloudSync<span className="text-[#FFC107]">.</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-grow px-4 mt-8 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group relative ${
                location.pathname === item.path 
                ? 'bg-[#FFC107] text-[#000B2B]' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-bold whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {location.pathname === item.path && isSidebarOpen && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute right-4 w-1.5 h-1.5 bg-[#000B2B] rounded-full"
                />
              )}
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 space-y-2">
          {isSidebarOpen && (
            <div className="px-4 py-4 mb-4 bg-white/5 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FFC107] to-purple-500 overflow-hidden border-2 border-white/10 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-white/40" />
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-sm font-extrabold truncate">
                  {profile?.username || user?.email?.split('@')[0]}
                </p>
                <p className="text-white/40 text-xs font-bold truncate">
                  {profile?.plan ? profile.plan.charAt(0) + profile.plan.slice(1).toLowerCase() : 'Free'} Plan
                </p>
              </div>
            </div>
          )}
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all group"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-bold">Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 bg-[#FFC107] text-[#000B2B] rounded-full flex items-center justify-center shadow-lg border-2 border-[#000B2B] hover:scale-110 transition-transform"
        >
          {isSidebarOpen ? <X size={12} /> : <Plus size={12} />}
        </button>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-grow h-screen overflow-y-auto relative z-10 px-8 py-8 lg:px-12">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-extrabold text-[#000B2B] tracking-tight mb-1">
              {menuItems.find(i => i.path === location.pathname)?.label || "Dashboard"}
            </h2>
            <p className="text-[#000B2B]/40 font-bold uppercase tracking-widest text-xs">
              Welcome back to your digital cloud
            </p>
          </div>
          
          <div className="flex gap-4">
            <button className="bg-white p-3 rounded-2xl border border-[#000B2B]/5 shadow-soft hover:shadow-md transition-all">
                <Menu className="w-6 h-6 text-[#000B2B]" />
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
