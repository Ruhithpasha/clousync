import { motion } from 'framer-motion';
import { Upload, Shield, Share2, ArrowRight, Menu, X, Plus, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/cloudinary');
    }
  }, [user, loading, navigate]);

  const features = [
    {
      title: "Smart Cloud Sync",
      description: "Seamlessly synchronize your images across all devices with high-speed AI integration.",
      color: "bg-white",
      textColor: "text-[#000B2B]",
      icon: <Upload className="w-8 h-8" />
    },
    {
      title: "Managed Security",
      description: "Enterprise-grade protection for your memories. Encryption that never sleeps.",
      color: "bg-[#FFC107]",
      textColor: "text-[#000B2B]",
      icon: <Shield className="w-8 h-8" />
    },
    {
      title: "AI Organization",
      description: "Our AI automatically categorizes and tags your photos for instant discovery.",
      color: "bg-[#000B2B]",
      textColor: "text-white",
      icon: <Share2 className="w-8 h-8 text-[#FFC107]" />
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />

      {/* Navigation - Pill Shaped Navbar */}
      <nav className="fixed top-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-4xl">
        <div className="glass-pill rounded-full px-6 py-3 flex items-center justify-between shadow-soft">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#000B2B] rounded-full flex items-center justify-center">
              <Upload className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-[#000B2B] text-lg tracking-tight">CloudSync</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-[#000B2B]/70 hover:text-[#000B2B] transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-semibold text-[#000B2B]/70 hover:text-[#000B2B] transition-colors">Pricing</a>
            <a href="#about" className="text-sm font-semibold text-[#000B2B]/70 hover:text-[#000B2B] transition-colors">About</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/auth" className="hidden sm:block text-sm font-bold text-[#000B2B] px-4">Sign In</Link>
            <Link to="/auth" className="bg-[#FFC107] text-[#000B2B] px-6 py-2.5 rounded-full font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95">
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-44 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          <span className="bg-[#000B2B]/5 border border-[#000B2B]/10 rounded-full px-4 py-1.5 text-xs font-bold text-[#000B2B] uppercase tracking-widest">
            Ruhith Pasha Companies
          </span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-6xl md:text-8xl font-[800] text-[#000B2B] text-center leading-[0.95] tracking-tighter max-w-5xl mb-12"
        >
          MINIMAL CLOUD <br />
          <span className="text-[#000B2B]/40">INTELLIGENCE.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="text-lg md:text-xl text-[#000B2B]/60 text-center max-w-2xl mb-12 font-medium"
        >
          Scale your image management with AI-powered synchronization. 
          Built for people who value precision and minimalist design.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-4"
        >
          <Link to="/auth" className="bg-[#000B2B] text-white px-10 py-5 rounded-full font-extrabold text-lg flex items-center gap-2 group shadow-xl">
            Register Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* 3D Visual Mockup (Floating) */}
        <motion.div 
          initial={{ y: 0 }}
          animate={{ y: [-15, 15, -15] }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="mt-20 w-full max-w-4xl aspect-[16/9] bg-white rounded-[40px] shadow-2xl relative overflow-hidden p-4 border-8 border-white"
        >
          <img 
            src="/cloudsync_landing_hero.png" 
            alt="Dashboard" 
            className="w-full h-full object-cover rounded-[32px]"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#FFC107]/10 to-transparent pointer-events-none" />
        </motion.div>
      </section>

      {/* Features Grid - Asymmetrical Layout */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          <div className="lg:col-span-2">
             <motion.div 
              variants={itemVariants}
              className="bg-[#FFC107] h-full p-12 rounded-[40px] flex flex-col justify-between group cursor-pointer shadow-soft"
            >
              <div>
                <div className="w-16 h-16 bg-[#000B2B] rounded-3xl flex items-center justify-center mb-8">
                  <Plus className="w-8 h-8 text-[#FFC107]" />
                </div>
                <h2 className="text-4xl font-extrabold text-[#000B2B] mb-6 leading-tight">Manage every <br /> aspect of your <br /> cloud storage.</h2>
              </div>
              <p className="text-[#000B2B]/80 font-semibold text-lg max-sm">
                Control everything from a single minimal dashboard. No clutter, just performance.
              </p>
            </motion.div>
          </div>

          <motion.div 
            variants={itemVariants}
            className="bg-[#000B2B] p-12 rounded-[40px] text-white flex flex-col justify-between shadow-xl"
          >
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mb-8">
              <Shield className="w-8 h-8 text-[#FFC107]" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-4">Enterprise Security</h3>
              <p className="text-white/60 font-medium leading-relaxed">
                Your data is protected by high-level encryption standards.
              </p>
            </div>
          </motion.div>

          {features.map((feature, idx) => (
            <motion.div 
              key={idx}
              variants={itemVariants}
              className={`${feature.color} ${feature.textColor} p-12 rounded-[40px] flex flex-col justify-between border border-[#000B2B]/5 shadow-soft hover:shadow-lg transition-all`}
            >
              <div className="mb-8">{feature.icon}</div>
              <div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className={`${feature.textColor === 'text-white' ? 'text-white/60' : 'text-[#000B2B]/60'} font-medium`}>
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 px-6 relative overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-full h-full bg-grid opacity-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-2 lg:order-1"
          >
            <span className="text-[#FFC107] font-black text-xs uppercase tracking-[0.3em] mb-4 block">Our Story</span>
            <h2 className="text-5xl md:text-7xl font-[900] text-[#000B2B] leading-[0.9] tracking-tighter mb-8">
              Memories, <br />
              <span className="text-[#000B2B]/30">Uncomplicated.</span>
            </h2>
            <div className="space-y-6 text-lg text-[#000B2B]/60 font-medium max-w-xl">
              <p>
                CloudSync was born from a simple observation: cloud storage has become cluttered, slow, and overly complex. We built a platform that strips away the noise.
              </p>
              <p>
                Our philosophy is <strong>Performance by Design</strong>. By combining edge computing with minimalist UI, we’ve created the fastest way to sync, search, and secure your digital assets.
              </p>
              <div className="pt-8 grid grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[#000B2B] font-[900] text-2xl mb-1">99.9%</h4>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#000B2B]/40">Uptime Reliability</p>
                </div>
                <div>
                  <h4 className="text-[#000B2B] font-[900] text-2xl mb-1">Asia/Pac</h4>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#000B2B]/40">Primary Region</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="order-1 lg:order-2 relative"
          >
            <div className="w-full aspect-square bg-[#000B2B] rounded-[60px] overflow-hidden shadow-2xl relative translate-x-4 translate-y-4">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFC107]/40 to-transparent mix-blend-overlay" />
              <div className="absolute inset-x-0 bottom-0 p-12 bg-gradient-to-t from-[#000B2B] to-transparent">
                <p className="text-white font-[900] text-3xl leading-tight">Built for the <br /> modern creative.</p>
              </div>
            </div>
            {/* Floating Glass Element */}
            <motion.div 
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-10 -left-10 bg-white/40 backdrop-blur-xl border border-white/40 p-8 rounded-[40px] shadow-2xl hidden md:block"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#FFC107] rounded-2xl flex items-center justify-center shadow-lg">
                  <Shield className="text-[#000B2B] w-6 h-6" />
                </div>
                <div>
                  <p className="text-[#000B2B] font-black text-sm">SecureSync™</p>
                  <p className="text-[#000B2B]/40 text-[10px] font-extrabold uppercase tracking-widest">Active Protection</p>
                </div>
              </div>
              <div className="w-32 h-1.5 bg-[#000B2B]/10 rounded-full overflow-hidden">
                <div className="w-2/3 h-full bg-[#FFC107] animate-pulse" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center mb-16">
          <span className="bg-[#FFC107]/10 text-[#000B2B] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
            Pricing Plans
          </span>
          <h2 className="text-5xl md:text-6xl font-[800] text-[#000B2B] text-center tracking-tighter mb-6">
            Choose your <span className="text-[#000B2B]/40">capacity.</span>
          </h2>
          <p className="text-[#000B2B]/60 text-center max-w-xl font-medium">
            Transparent pricing for everyone. From personal archiving to professional storage management.
          </p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8"
        >
          {/* Starter Plan */}
          <motion.div 
            variants={itemVariants}
            className="bg-white p-10 rounded-[40px] border border-[#000B2B]/5 shadow-soft flex flex-col justify-between hover:scale-[1.02] transition-transform"
          >
            <div>
              <h3 className="text-2xl font-extrabold text-[#000B2B] mb-2">Starter</h3>
              <p className="text-[#000B2B]/40 text-sm font-bold uppercase tracking-widest mb-8 text-xs">For casual users</p>
              <div className="flex items-end gap-1 mb-8">
                <span className="text-4xl font-[900] text-[#000B2B]">Free</span>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-[#000B2B]/70 font-bold text-sm">
                  <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  </div>
                  100 MB Storage
                </li>
                <li className="flex items-center gap-3 text-[#000B2B]/70 font-bold text-sm">
                  <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  </div>
                  Basic Security
                </li>
                <li className="flex items-center gap-3 text-[#000B2B]/70 font-bold text-sm opacity-40">
                  <div className="w-5 h-5 bg-[#000B2B]/5 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#000B2B] rounded-full" />
                  </div>
                  AI Organization
                </li>
              </ul>
            </div>
            <Link to="/auth" className="w-full py-4 bg-[#F7F7F7] text-[#000B2B] rounded-2xl font-extrabold text-center hover:bg-[#000B2B]/5 transition-colors">
              Get Started
            </Link>
          </motion.div>

          {/* Professional Plan */}
          <motion.div 
            variants={itemVariants}
            className="bg-[#000B2B] p-10 rounded-[40px] shadow-2xl flex flex-col justify-between relative overflow-hidden scale-105"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FFC107]/20 to-transparent blur-2xl" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-2xl font-extrabold text-white">Pro</h3>
                <span className="bg-[#FFC107] text-[#000B2B] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">Popular</span>
              </div>
              <p className="text-white/40 text-sm font-bold uppercase tracking-widest mb-8 text-xs">For creators</p>
              <div className="flex items-end gap-1 mb-8">
                <span className="text-4xl font-[900] text-white">₹10</span>
                <span className="text-white/40 font-bold mb-1 text-sm">/ mo</span>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-white/70 font-bold text-sm">
                  <div className="w-5 h-5 bg-[#FFC107]/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-[#FFC107]" />
                  </div>
                  500 MB Storage
                </li>
                <li className="flex items-center gap-3 text-white/70 font-bold text-sm">
                  <div className="w-5 h-5 bg-[#FFC107]/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-[#FFC107]" />
                  </div>
                  AI Organization
                </li>
                <li className="flex items-center gap-3 text-white/70 font-bold text-sm">
                  <div className="w-5 h-5 bg-[#FFC107]/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-[#FFC107]" />
                  </div>
                  Priority Uploads
                </li>
              </ul>
            </div>
            <Link to="/auth" className="w-full py-4 bg-[#FFC107] text-[#000B2B] rounded-2xl font-extrabold text-center hover:scale-[1.02] transition-transform">
              Upgrade Now
            </Link>
          </motion.div>

          {/* Super Storage Plan */}
          <motion.div 
            variants={itemVariants}
            className="bg-white p-10 rounded-[40px] border border-[#000B2B]/5 shadow-soft flex flex-col justify-between hover:scale-[1.02] transition-transform"
          >
            <div>
              <h3 className="text-2xl font-extrabold text-[#000B2B] mb-2">Super</h3>
              <p className="text-[#000B2B]/40 text-sm font-bold uppercase tracking-widest mb-8 text-xs">For power users</p>
              <div className="flex items-end gap-1 mb-8">
                <span className="text-4xl font-[900] text-[#000B2B]">₹50</span>
                <span className="text-[#000B2B]/40 font-bold mb-1 text-sm">/ mo</span>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-[#000B2B]/70 font-bold text-sm">
                  <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  </div>
                  1 GB Storage
                </li>
                <li className="flex items-center gap-3 text-[#000B2B]/70 font-bold text-sm">
                  <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  </div>
                  Smart Metadata
                </li>
                <li className="flex items-center gap-3 text-[#000B2B]/70 font-bold text-sm">
                  <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  </div>
                  Dedicated Support
                </li>
              </ul>
            </div>
            <Link to="/auth" className="w-full py-4 bg-[#000B2B] text-white rounded-2xl font-extrabold text-center hover:bg-[#000B2B]/90 transition-colors">
              Get Super
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* CTA Footer Section */}
      <section className="bg-[#000B2B] rounded-t-[60px] pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <h2 className="text-white text-5xl md:text-7xl font-extrabold text-center mb-16 tracking-tight">Ready to synchronize <br /> your digital life?</h2>
          
          <div className="bg-white/5 border border-white/10 rounded-full p-2 flex items-center gap-4 mb-24 max-w-xl w-full">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="bg-transparent border-none outline-none text-white px-6 py-3 flex-grow font-medium"
            />
            <button className="bg-[#FFC107] text-[#000B2B] px-8 py-3 rounded-full font-bold shadow-soft whitespace-nowrap">
              Get Started
            </button>
          </div>

          <div className="w-full border-t border-white/10 pt-12 flex flex-col md:row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#FFC107] rounded-full flex items-center justify-center">
                <Upload className="w-4 h-4 text-[#000B2B]" />
              </div>
              <span className="font-extrabold text-white text-xl">CloudSync</span>
            </div>
            
            <div className="flex gap-12 text-white/40 font-bold text-sm uppercase tracking-widest">
              <a href="https://github.com/ruhithpasha" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
              <a href="https://www.linkedin.com/in/ruhith-pasha-8a3625245/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
            </div>
            
            <p className="text-white/20 text-xs font-bold uppercase tracking-widest">
              © 2026 CLOUDSYNC PRO. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
