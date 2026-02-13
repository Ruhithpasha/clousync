import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setMessage({ type: 'error', text: 'Passwords do not match' });
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Password has been reset successfully!' });
      setTimeout(() => navigate('/cloudinary'), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[48px] p-12 w-full max-w-md shadow-2xl border border-[#000B2B]/5"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#000B2B] rounded-3xl flex items-center justify-center text-[#FFC107] mx-auto mb-6 shadow-xl">
            <Lock size={32} />
          </div>
          <h2 className="text-3xl font-[900] text-[#000B2B]">Set New Password</h2>
          <p className="text-[#000B2B]/40 font-bold uppercase tracking-widest text-xs mt-2">Enter your secure credentials below</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div>
            <label className="block text-[10px] font-extrabold text-[#000B2B]/40 uppercase tracking-widest mb-2 px-1">New Password</label>
            <div className="relative">
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F7F7F7] border-none rounded-2xl py-4 px-6 font-bold text-[#000B2B] focus:ring-2 focus:ring-[#FFC107] outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-[#000B2B]/40 uppercase tracking-widest mb-2 px-1">Confirm New Password</label>
            <input 
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#F7F7F7] border-none rounded-2xl py-4 px-6 font-bold text-[#000B2B] focus:ring-2 focus:ring-[#FFC107] outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {message.text && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 font-bold text-sm ${
              message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#000B2B] text-white py-5 rounded-3xl font-extrabold text-lg shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Updating..." : "Update Password"}
            {!loading && <Save size={20} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
