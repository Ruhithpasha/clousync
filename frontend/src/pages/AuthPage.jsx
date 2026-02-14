import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, User, ArrowRight, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // MFA Login states
  const [showMfa, setShowMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Check if MFA is required
        const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalError) throw aalError;

        if (aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
            const factors = await supabase.auth.mfa.listFactors();
            if (factors.error) throw factors.error;
            
            const totpFactor = factors.data.all.find(f => f.factor_type === 'totp' && f.status === 'verified');
            if (totpFactor) {
                setMfaFactorId(totpFactor.id);
                setShowMfa(true);
                setLoading(false);
                return; // Stop here to show MFA UI
            }
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
            }
          }
        });
        if (error) throw error;
        alert('Verification email sent! Please check your inbox.');
      }
      navigate('/cloudinary');
    } catch (err) {
      setError(err.message);
    } finally {
      if (!showMfa) setLoading(false);
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    try {
        setIsVerifyingMfa(true);
        setError(null);

        const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
        if (challenge.error) throw challenge.error;

        const verify = await supabase.auth.mfa.verify({
            factorId: mfaFactorId,
            challengeId: challenge.data.id,
            code: mfaCode
        });

        if (verify.error) throw verify.error;

        navigate('/cloudinary');
    } catch (err) {
        setError(err.message);
    } finally {
        setIsVerifyingMfa(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] font-['Plus_Jakarta_Sans'] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-40" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white rounded-[40px] shadow-soft border border-[#000B2B]/5 p-10 overflow-hidden relative">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-[#000B2B] rounded-3xl flex items-center justify-center mb-4 shadow-xl shadow-[#000B2B]/20">
              <Upload className="w-8 h-8 text-[#FFC107]" />
            </div>
            <h1 className="text-3xl font-[800] text-[#000B2B] tracking-tighter">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-[#000B2B]/40 font-semibold mt-2">
              {isLogin ? 'Sign in to CloudSync Pro' : 'Start your cloud journey today'}
            </p>
          </div>

          <form onSubmit={showMfa ? handleMfaVerify : handleAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {showMfa ? (
                  <motion.div
                    key="mfa"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                        <div className="text-center">
                            <p className="text-[#000B2B]/40 font-bold uppercase tracking-widest text-[10px] mb-4">Enter your security code</p>
                            <input
                                type="text"
                                maxLength={6}
                                value={mfaCode}
                                onChange={(e) => setMfaCode(e.target.value)}
                                placeholder="000000"
                                className="w-full bg-[#F7F7F7] border-none rounded-3xl py-6 px-4 text-center text-4xl font-black tracking-[0.8em] text-[#000B2B] focus:ring-2 focus:ring-[#FFC107] outline-none"
                                autoFocus
                            />
                        </div>
                        
                        <button
                            type="submit"
                            disabled={isVerifyingMfa || mfaCode.length !== 6}
                            className="w-full bg-[#000B2B] text-white py-5 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-2 hover:bg-[#000B2B]/90 transition-all active:scale-95 disabled:opacity-50 shadow-xl"
                        >
                            {isVerifyingMfa ? 'Verifying...' : 'Verify & Continue'}
                            {!isVerifyingMfa && <ArrowRight className="w-5 h-5" />}
                        </button>

                        <button 
                            type="button"
                            onClick={() => setShowMfa(false)}
                            className="w-full text-[#000B2B]/40 font-bold text-xs uppercase tracking-widest hover:text-[#000B2B]"
                        >
                            Back to sign in
                        </button>
                  </motion.div>
              ) : (
                <motion.div key="auth" className="space-y-4">
                    <AnimatePresence mode="wait">
                    {!isLogin && (
                        <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        >
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#000B2B]/30" />
                            <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-[#F7F7F7] border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-[#000B2B] focus:ring-2 focus:ring-[#FFC107] outline-none transition-all"
                            required={!isLogin}
                            />
                        </div>
                        </motion.div>
                    )}
                    </AnimatePresence>

                    <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#000B2B]/30" />
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#F7F7F7] border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-[#000B2B] focus:ring-2 focus:ring-[#FFC107] outline-none transition-all"
                        required
                    />
                    </div>

                    <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#000B2B]/30" />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#F7F7F7] border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-[#000B2B] focus:ring-2 focus:ring-[#FFC107] outline-none transition-all"
                        required
                    />
                    </div>

                    {error && (
                    <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100 italic">
                        {error}
                    </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#000B2B] text-white py-5 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-2 hover:bg-[#000B2B]/90 transition-all active:scale-95 disabled:opacity-50 mt-6 shadow-xl"
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                        {!loading && <ArrowRight className="w-5 h-5" />}
                    </button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <div className="mt-8 text-center text-sm font-bold">
            <span className="text-[#000B2B]/40">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-[#000B2B] hover:underline"
            >
              {isLogin ? 'Create one now' : 'Sign In'}
            </button>
          </div>
        </div>

        {/* Admin Link & Home Button */}
        <div className="mt-8 flex flex-col items-center gap-4">
            <Link 
              to="/admin-auth"
              className="text-xs font-bold text-[#000B2B]/20 uppercase tracking-widest hover:text-[#FFC107] transition-colors"
            >
              Admin Portal Access
            </Link>
            <button 
                onClick={() => navigate('/')}
                className="text-xs font-extrabold text-[#000B2B]/30 uppercase tracking-[0.2em] hover:text-[#000B2B] transition-colors"
            >
                ← Back to Home
            </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
