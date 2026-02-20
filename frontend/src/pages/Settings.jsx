import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Bell, Save, CheckCircle2, AlertCircle, Upload, Search, Zap, ArrowRight } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { API_BASE_URL } from '../config';


const Settings = () => {
  const [profile, setProfile] = useState({ 
    username: '', 
    avatar_url: '', 
    plan: 'FREE',
    storage_usage: 0,
    storage_limit: 104857600 
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('profile');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // UPI Checkout States
  const [showUPI, setShowUPI] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // MFA States
  const [mfaFactors, setMfaFactors] = useState([]);
  const [isEnrollingMfa, setIsEnrollingMfa] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [profileRes, mfaRes] = await Promise.all([
        fetch(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        supabase.auth.mfa.listFactors()
      ]);


      if (!profileRes.ok) throw new Error("Failed to load profile");
      const data = await profileRes.json();
      setProfile({ 
        username: data.username || '', 
        avatar_url: data.avatar_url || '',
        plan: data.plan || 'FREE',
        storage_usage: data.storage_usage || 0,
        storage_limit: data.storage_limit || 104857600
      });

      if (mfaRes.data) {
        setMfaFactors(mfaRes.data.all);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${API_BASE_URL}/profile`, {

        method: "PUT",
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });

      if (!response.ok) throw new Error("Update failed");
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      setMessage({ type: '', text: '' });
      const { data: { session } } = await supabase.auth.getSession();
      
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE_URL}/upload`, {

        method: "POST",
        headers: { 
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      
      setProfile(prev => ({ ...prev, avatar_url: data.cloudinary_url }));
      setMessage({ type: 'success', text: 'Avatar uploaded! Save changes to apply.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      setResettingPassword(true);
      setMessage({ type: '', text: '' });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      
      setMessage({ 
        type: 'success', 
        text: `A reset link has been sent to ${user.email}. Please check your inbox.` 
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleEnrollMfa = async () => {
    try {
      setIsEnrollingMfa(true);
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;

      setMfaFactorId(data.id);
      setMfaQrCode(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      setIsEnrollingMfa(false);
    }
  };

  const handleVerifyMfa = async () => {
    try {
      setIsVerifyingMfa(true);
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: mfaVerifyCode
      });

      if (verify.error) throw verify.error;

      setMessage({ type: 'success', text: "Two-factor authentication enabled successfully!" });
      setIsEnrollingMfa(false);
      setMfaQrCode("");
      await fetchProfile();
    } catch (err) {
        setMessage({ type: 'error', text: err.message });
    } finally {
        setIsVerifyingMfa(false);
    }
  };

  const handleUnenrollMfa = async (factorId) => {
    try {
        const { error } = await supabase.auth.mfa.unenroll({ factorId });
        if (error) throw error;
        setMessage({ type: 'success', text: "Two-factor authentication disabled." });
        await fetchProfile();
    } catch (err) {
        setMessage({ type: 'error', text: err.message });
    }
  };

  const handleManualConfirm = async () => {
    try {
        setIsVerifying(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${API_BASE_URL}/upgrade-plan`, {

            method: "POST",
            headers: { 
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ plan: checkoutPlan.type })
        });

        if (!response.ok) throw new Error("Upgrade failed");
        
        setShowUPI(false);
        setMessage({ type: 'success', text: `Upgrade requested for ${checkoutPlan.type}. Your storage will be updated shortly!` });
        await fetchProfile();
    } catch (err) {
        setMessage({ type: 'error', text: err.message });
    } finally {
        setIsVerifying(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const usagePercent = (profile.storage_usage / profile.storage_limit) * 100;

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#FFC107] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Navigation Tabs - Desktop */}
        <div className="md:col-span-1 space-y-2">
            {[
                { id: 'profile', icon: <User size={18} />, label: "Public Profile" },
                { id: 'security', icon: <Mail size={18} />, label: "Security" },
                { id: 'notifications', icon: <Bell size={18} />, label: "Notifications" },
                { id: 'billing', icon: <Shield size={18} />, label: "Billing" },
            ].map((tab) => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
                        activeTab === tab.id ? 'bg-white text-[#000B2B] shadow-soft' : 'text-[#000B2B]/40 hover:bg-white/50'
                    }`}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-8">
            <AnimatePresence mode="wait">
                {activeTab === 'profile' && (
                    <motion.div 
                        key="profile"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white rounded-[40px] p-10 shadow-soft border border-[#000B2B]/5"
                    >
                        <form onSubmit={handleUpdate} className="space-y-8">
                            {/* Avatar Section */}
                            <div className="flex items-center gap-8">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-[32px] bg-gradient-to-tr from-[#FFC107] to-purple-500 flex items-center justify-center overflow-hidden border-4 border-[#F7F7F7] shadow-xl">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={40} className="text-white/40" />
                                        )}
                                        {uploadingAvatar && (
                                            <div className="absolute inset-0 bg-[#000B2B]/60 backdrop-blur-sm flex items-center justify-center">
                                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#000B2B] text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white hover:scale-110 transition-transform cursor-pointer">
                                        <Upload size={18} />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                                    </label>
                                </div>
                                <div>
                                    <h4 className="text-xl font-extrabold text-[#000B2B]">Profile Picture</h4>
                                    <p className="text-[#000B2B]/40 text-xs font-bold uppercase tracking-widest mt-1">Updates live across all shared albums</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-extrabold text-[#000B2B]/40 uppercase tracking-widest mb-2 px-1">Display Username</label>
                                    <input 
                                        type="text"
                                        value={profile.username}
                                        onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                        placeholder="e.g. creative_sync"
                                        className="w-full bg-[#F7F7F7] border-none rounded-2xl py-4 px-6 font-bold text-[#000B2B] focus:ring-2 focus:ring-[#FFC107] outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-extrabold text-[#000B2B]/40 uppercase tracking-widest mb-2 px-1">Avatar URL (Direct Link)</label>
                                    <input 
                                        type="text"
                                        value={profile.avatar_url}
                                        onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                                        placeholder="https://example.com/photo.jpg"
                                        className="w-full bg-[#F7F7F7] border-none rounded-2xl py-4 px-6 font-bold text-[#000B2B] focus:ring-2 focus:ring-[#FFC107] outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {message.text && activeTab === 'profile' && (
                                <div className={`p-4 rounded-2xl flex items-center gap-3 font-bold text-sm ${
                                    message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
                                }`}>
                                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                    {message.text}
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={saving}
                                className="w-full bg-[#000B2B] text-white py-5 rounded-3xl font-extrabold text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? "Updating..." : "Save Changes"}
                                {!saving && <Save size={20} />}
                            </button>
                        </form>
                    </motion.div>
                )}

                {activeTab === 'security' && (
                    <motion.div 
                        key="security"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="bg-white rounded-[40px] p-10 shadow-soft border border-[#000B2B]/5">
                            <h4 className="text-xl font-extrabold text-[#000B2B] mb-2">Password & Authentication</h4>
                            <p className="text-[#000B2B]/40 text-sm font-bold mb-8">Secure your account with a strong password</p>
                            
                            {message.text && activeTab === 'security' && (
                                <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 font-bold text-sm ${
                                    message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
                                }`}>
                                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                    {message.text}
                                </div>
                            )}

                            <button 
                                onClick={handlePasswordReset}
                                disabled={resettingPassword}
                                className="bg-[#F7F7F7] text-[#000B2B] px-8 py-4 rounded-2xl font-bold w-full text-left flex justify-between items-center hover:bg-[#FFC107] transition-all group disabled:opacity-50"
                            >
                                <span>{resettingPassword ? "Sending reset link..." : "Change Account Password"}</span>
                                <Shield className="text-[#000B2B]/20 group-hover:text-[#000B2B]" size={20} />
                            </button>
                        </div>

                        <div className="bg-white rounded-[40px] p-10 shadow-soft border border-[#000B2B]/5">
                            <h4 className="text-xl font-extrabold text-[#000B2B] mb-2">Two-Factor Authentication</h4>
                            <p className="text-[#000B2B]/40 text-sm font-bold mb-8">Add an extra layer of security to your session</p>
                            
                            {mfaFactors.length > 0 ? (
                                <div className="space-y-4">
                                    {mfaFactors.map(factor => (
                                        <div key={factor.id} className="flex items-center justify-between p-6 bg-green-50/50 rounded-3xl border border-green-100">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-green-500 shadow-sm">
                                                    <Shield size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-extrabold text-[#000B2B]">App Authenticator</p>
                                                    <p className="text-xs text-[#000B2B]/40 font-bold uppercase tracking-widest">
                                                        {factor.status === 'verified' ? 'Active & Secure' : 'Click to Verify'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleUnenrollMfa(factor.id)}
                                                className="text-red-500 font-extrabold text-sm hover:underline"
                                            >
                                                Disable
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm">
                                            <Shield size={24} />
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-[#000B2B]">App Authenticator</p>
                                            <p className="text-xs text-[#000B2B]/40 font-bold uppercase tracking-widest">Currently Disabled</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleEnrollMfa}
                                        className="text-blue-500 font-extrabold text-sm hover:underline"
                                    >
                                        Enable
                                    </button>
                                </div>
                            )}

                            {/* MFA Enrollment Modal */}
                            <AnimatePresence>
                                {mfaQrCode && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#000B2B]/40 backdrop-blur-md">
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="bg-white rounded-[40px] p-10 w-full max-w-lg shadow-2xl relative overflow-hidden"
                                        >
                                            <div className="text-center mb-8">
                                                <h3 className="text-2xl font-extrabold text-[#000B2B]">Secure Your Account</h3>
                                                <p className="text-[#000B2B]/40 text-sm font-bold mt-2">Scan the QR code with Google Authenticator or Authy</p>
                                            </div>

                                            <div className="flex flex-col items-center gap-8">
                                                <div className="bg-white p-4 rounded-3xl border-4 border-[#F7F7F7] shadow-inner" dangerouslySetInnerHTML={{ __html: mfaQrCode }} />
                                                
                                                <div className="w-full space-y-4 text-center">
                                                    <div className="bg-[#F7F7F7] p-4 rounded-2xl">
                                                        <p className="text-[10px] font-extrabold text-[#000B2B]/40 uppercase tracking-widest mb-1">Manual Key</p>
                                                        <code className="text-[#000B2B] font-bold tracking-widest">{mfaSecret}</code>
                                                    </div>

                                                    <div className="space-y-4 pt-4">
                                                        <div>
                                                            <label className="block text-[10px] font-extrabold text-[#000B2B]/40 uppercase tracking-widest mb-2">Enter 6-digit Code</label>
                                                            <input 
                                                                type="text"
                                                                maxLength={6}
                                                                value={mfaVerifyCode}
                                                                onChange={(e) => setMfaVerifyCode(e.target.value)}
                                                                placeholder="000000"
                                                                className="w-full bg-[#F7F7F7] border-none rounded-2xl py-4 px-6 text-center text-2xl font-black tracking-[1em] text-[#000B2B] focus:ring-2 focus:ring-[#FFC107] outline-none"
                                                            />
                                                        </div>

                                                        <div className="flex gap-4">
                                                            <button 
                                                                onClick={() => setMfaQrCode("")}
                                                                className="flex-1 py-4 rounded-2xl font-extrabold text-[#000B2B] hover:bg-[#F7F7F7] transition-all"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button 
                                                                onClick={handleVerifyMfa}
                                                                disabled={isVerifyingMfa || mfaVerifyCode.length !== 6}
                                                                className="flex-1 bg-[#000B2B] text-white py-4 rounded-2xl font-extrabold shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                                                            >
                                                                {isVerifyingMfa ? "Verifying..." : "Confirm"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'notifications' && (
                    <motion.div 
                        key="notifications"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white rounded-[40px] p-10 shadow-soft border border-[#000B2B]/5 space-y-8"
                    >
                        <div>
                            <h4 className="text-xl font-extrabold text-[#000B2B] mb-2">Notification Preferences</h4>
                            <p className="text-[#000B2B]/40 text-sm font-bold">Control how you receive updates and alerts</p>
                        </div>

                        <div className="space-y-4">
                            {[
                                { title: "Album Updates", desc: "Notify when someone adds photos to shared albums", enabled: true },
                                { title: "Storage Alerts", desc: "Notify when you surpass 90% of your cloud limit", enabled: true },
                                { title: "New Sign-ins", desc: "Alert me when my account is logged in from a new device", enabled: false },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-4 border-b border-[#000B2B]/5 last:border-none">
                                    <div>
                                        <p className="font-extrabold text-[#000B2B]">{item.title}</p>
                                        <p className="text-xs text-[#000B2B]/40 font-bold">{item.desc}</p>
                                    </div>
                                    <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${item.enabled ? 'bg-[#FFC107]' : 'bg-[#E5E7EB]'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${item.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'billing' && (
                    <motion.div 
                        key="billing"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="bg-[#000B2B] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#FFC107]/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                            <div className="relative z-10">
                                <p className="text-[#FFC107] text-[10px] font-extrabold uppercase tracking-widest mb-2">Current Plan</p>
                                <h4 className="text-3xl font-[900] mb-6">CloudSync {profile.plan === 'FREE' ? 'Starter' : profile.plan === 'PRO' ? 'Professional' : 'Super Storage'}</h4>
                                <div className="flex items-end gap-2 mb-8">
                                    <span className="text-4xl font-[900]">
                                        {profile.plan === 'FREE' ? 'Free' : profile.plan === 'PRO' ? '₹10' : '₹50'}
                                    </span>
                                    {profile.plan !== 'FREE' && <span className="text-white/40 font-bold mb-1">/ month</span>}
                                </div>
                                
                                <div className="flex gap-4">
                                    {profile.plan === 'FREE' && (
                                        <>
                                            <button 
                                                onClick={() => { setCheckoutPlan({ type: 'PRO', price: 10 }); setShowUPI(true); }}
                                                className="bg-[#FFC107] text-[#000B2B] px-8 py-3 rounded-2xl font-extrabold text-sm hover:scale-105 transition-transform"
                                            >
                                                Upgrade to Pro (₹10)
                                            </button>
                                            <button 
                                                onClick={() => { setCheckoutPlan({ type: 'SUPER', price: 50 }); setShowUPI(true); }}
                                                className="bg-white text-[#000B2B] px-8 py-3 rounded-2xl font-extrabold text-sm hover:scale-105 transition-transform"
                                            >
                                                Go Super (₹50)
                                            </button>
                                        </>
                                    )}
                                    {profile.plan === 'PRO' && (
                                        <button 
                                            onClick={() => { setCheckoutPlan({ type: 'SUPER', price: 50 }); setShowUPI(true); }}
                                            className="bg-[#FFC107] text-[#000B2B] px-8 py-3 rounded-2xl font-extrabold text-sm hover:scale-105 transition-transform"
                                        >
                                            Upgrade to Super (₹50)
                                        </button>
                                    )}
                                    {profile.plan === 'SUPER' && (
                                        <span className="bg-white/10 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">Maximum Tier Active</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[40px] p-10 shadow-soft border border-[#000B2B]/5">
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <h4 className="text-xl font-extrabold text-[#000B2B]">Cloud Storage Usage</h4>
                                    <p className="text-[#000B2B]/40 text-xs font-bold uppercase tracking-widest mt-1">
                                        {formatSize(profile.storage_usage)} of {formatSize(profile.storage_limit)} used
                                    </p>
                                </div>
                                <p className="text-[#000B2B] font-[900]">{Math.min(usagePercent, 100).toFixed(1)}%</p>
                            </div>
                            <div className="w-full h-3 bg-[#F7F7F7] rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(usagePercent, 100)}%` }}
                                    className={`h-full rounded-full ${usagePercent > 90 ? 'bg-red-500' : 'bg-[#FFC107]'}`} 
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Danger Zone - Always visible or only on profile? Let's keep it visible */}
            <div className="bg-red-50 rounded-[40px] p-10 border border-red-100 space-y-4">
                <h4 className="text-xl font-extrabold text-red-600">Danger Zone</h4>
                <p className="text-red-600/60 font-medium">Permanently delete your account and all your cloud data. This action cannot be undone.</p>
                <button className="bg-red-600 text-white px-8 py-4 rounded-full font-extrabold text-sm shadow-lg hover:bg-red-700 transition-colors">
                    Delete Account
                </button>
            </div>
        </div>
      </div>
      {/* UPI Checkout Modal */}
      <AnimatePresence>
        {showUPI && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUPI(false)}
              className="absolute inset-0 bg-[#000B2B]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] p-10 relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FFC107] to-purple-500" />
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#FFC107]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-[#FFC107]" />
                </div>
                <h3 className="text-2xl font-[900] text-[#000B2B]">Upgrade to {checkoutPlan?.type}</h3>
                <p className="text-[#000B2B]/40 font-bold text-sm uppercase tracking-widest mt-1">Scan to Pay ₹{checkoutPlan?.price}</p>
              </div>

              <div className="bg-[#F7F7F7] p-6 rounded-[32px] mb-8 flex flex-col items-center">
                <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${import.meta.env.VITE_UPI_ID}%26pn=CloudSync%26am=${checkoutPlan?.price}%26cu=INR%26tn=PlanUpgrade_${profile.username}`} 
                        alt="UPI QR Code"
                        className="w-48 h-48"
                    />
                </div>
                <p className="text-[#000B2B] font-extrabold text-sm mb-1">{import.meta.env.VITE_UPI_ID}</p>
                <p className="text-[#000B2B]/40 text-[10px] font-bold uppercase tracking-widest">Merchant: CloudSync Pro</p>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={handleManualConfirm}
                  disabled={isVerifying}
                  className="w-full bg-[#000B2B] text-white py-4 rounded-2xl font-extrabold text-sm hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-[#000B2B]/20"
                >
                  {isVerifying ? "Confirming..." : "I have paid ₹" + checkoutPlan?.price}
                  {!isVerifying && <ArrowRight size={18} />}
                </button>
                <button 
                  onClick={() => setShowUPI(false)}
                  className="w-full text-[#000B2B]/40 font-bold text-xs uppercase tracking-widest hover:text-[#000B2B]"
                >
                  Cancel and go back
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-[#000B2B]/5 flex items-center justify-center gap-4 grayscale opacity-40">
                <img src="https://img.icons8.com/color/48/000000/google-pay.png" className="h-6" alt="GPay" />
                <img src="https://img.icons8.com/color/48/000000/phonepe.png" className="h-6" alt="PhonePe" />
                <img src="https://img.icons8.com/color/48/000000/bhim.png" className="h-6" alt="BHIM" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
