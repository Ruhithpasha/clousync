import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { 
  Users, 
  HardDrive, 
  Image as ImageIcon, 
  TrendingUp, 
  Activity, 
  Search,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [latestActivity, setLatestActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch admin stats');
      
      const data = await response.json();
      setStats(data.stats);
      setLatestActivity(data.latestActivity);
    } catch (err) {
      console.error('Admin Fetch Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatStorage = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-[#FFC107] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-red-50 p-8 rounded-3xl border border-red-100 text-center">
      <p className="text-red-600 font-bold mb-4">{error}</p>
      <button onClick={fetchAdminData} className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold">Retry</button>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#FFC107] rounded-lg">
              <ShieldCheck className="w-5 h-5 text-[#000B2B]" />
            </div>
            <p className="text-[#FFC107] font-black uppercase tracking-widest text-[10px]">Administrator Access</p>
          </div>
          <h1 className="text-4xl font-[900] text-[#000B2B] tracking-tight">System Overview</h1>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white px-6 py-4 rounded-[32px] shadow-soft border border-[#000B2B]/5">
            <p className="text-[#000B2B]/40 text-[10px] font-bold uppercase tracking-widest mb-1">Last Update</p>
            <p className="text-[#000B2B] font-black flex items-center gap-2">
              <Clock size={14} className="text-[#FFC107]" />
              {format(new Date(), 'HH:mm:ss')}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Cloud Photos', value: stats.totalImages, icon: ImageIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Total Storage', value: formatStorage(stats.totalStorageUsed), icon: HardDrive, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Active Sessions', value: stats.planStats.SUPER || 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', sub: 'Super Users' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[40px] shadow-soft border border-[#000B2B]/5 hover:shadow-xl transition-all group"
          >
            <div className={`${stat.bg} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <stat.icon className={`w-7 h-7 ${stat.color}`} />
            </div>
            <p className="text-[#000B2B]/40 font-bold uppercase tracking-widest text-[10px] mb-1">{stat.label}</p>
            <h3 className="text-3xl font-[900] text-[#000B2B] tracking-tight">{stat.value}</h3>
            {stat.sub && (
              <p className="text-[10px] font-bold text-green-600 mt-2 bg-green-50 px-2 py-0.5 rounded-full inline-block">{stat.sub}</p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Latest Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-[50px] shadow-soft border border-[#000B2B]/5 overflow-hidden">
          <div className="p-8 border-b border-[#000B2B]/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#000B2B] rounded-2xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#FFC107]" />
              </div>
              <h2 className="text-xl font-[900] text-[#000B2B] tracking-tight">Recent Synchronization</h2>
            </div>
            <button className="text-[10px] font-black uppercase tracking-widest text-[#000B2B]/40 hover:text-[#000B2B] transition-colors">View All Logs</button>
          </div>
          
          <div className="p-4">
            <div className="space-y-2">
              {latestActivity.map((activity, i) => (
                <div key={i} className="flex items-center gap-6 p-4 rounded-3xl hover:bg-[#F7F7F7] transition-colors group">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#F7F7F7] flex-shrink-0 border border-[#000B2B]/10">
                    <img src={activity.cloudinary_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-[#000B2B] font-extrabold text-sm">{activity.original_name}</p>
                    <p className="text-[#000B2B]/40 text-xs font-bold">Uploaded by @{activity.profiles?.username || 'Unknown'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[#000B2B] font-bold text-xs">{format(new Date(activity.created_at), 'MMM d, HH:mm')}</p>
                    <div className="flex items-center justify-end gap-1 text-green-500 font-bold text-[9px] uppercase tracking-tighter mt-1">
                      <CheckCircle2 size={10} /> Sync Complete
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="bg-[#000B2B] rounded-[50px] p-10 text-white shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-[900] mb-2 tracking-tight">Revenue Model</h2>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-10">User Subscription Status</p>
            
            <div className="space-y-8">
              {['FREE', 'PRO', 'SUPER'].map((plan) => {
                const count = stats.planStats[plan] || 0;
                const percentage = (count / stats.totalUsers) * 100;
                const color = plan === 'SUPER' ? 'bg-[#FFC107]' : plan === 'PRO' ? 'bg-white' : 'bg-white/20';
                
                return (
                  <div key={plan}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-extrabold text-sm tracking-wide">{plan} Users</span>
                      <span className="font-black text-[#FFC107]">{count}</span>
                    </div>
                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className={`h-full ${color}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-12 pt-10 border-t border-white/10">
            <div className="bg-[#FFC107] p-6 rounded-[32px] text-[#000B2B]">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2">Growth Target</p>
              <div className="flex items-center justify-between">
                <h4 className="text-2xl font-black tracking-tight">74% Capacity</h4>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <ArrowUpRight size={20} className="font-black" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
