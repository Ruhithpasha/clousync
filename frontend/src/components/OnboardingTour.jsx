import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Rocket,
  Zap,
  Heart,
  Image as ImageIcon,
  FolderOpen,
  Cloud
} from 'lucide-react';

const TOUR_STEPS = [
  {
    title: "Welcome to CloudSync Pro",
    description: "Your new intelligent cloud home. Let's take a 60-second tour of your new superpowers.",
    icon: <Rocket className="text-blue-500" size={32} />,
    color: "blue"
  },
  {
    title: "AI Neural Search",
    description: "Search for anything—'Sunset at the beach' or 'Golden retriever'—and our AI will find it instantly across all your photos.",
    icon: <Zap className="text-[#FFC107]" size={32} />,
    color: "amber"
  },
  {
    title: "Visual Memories",
    description: "Our AI automatically creates stunning visual stories and collages by matching similar moments in your collection.",
    icon: <Heart className="text-pink-500" size={32} />,
    color: "pink"
  },
  {
    title: "Smart Albums",
    description: "Organize your life into beautiful collections. Group photos by events, categories, or people.",
    icon: <FolderOpen className="text-purple-500" size={32} />,
    color: "purple"
  },
  {
    title: "Global Sync",
    description: "Upload once, access everywhere. Your content is securely synced to your private cloud vault.",
    icon: <Cloud className="text-emerald-500" size={32} />,
    color: "emerald"
  }
];

const OnboardingTour = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('cloudsync_onboarding_seen');
        if (!hasSeenTour) {
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const finishTour = () => {
        localStorage.setItem('cloudsync_onboarding_seen', 'true');
        setIsVisible(false);
    };

    const nextStep = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            finishTour();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    if (!isVisible) return null;

    const step = TOUR_STEPS[currentStep];

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[500] bg-[#000B2B]/60 backdrop-blur-md flex items-center justify-center p-6"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-white dark:bg-[#1e293b] max-w-lg w-full rounded-[48px] shadow-2xl overflow-hidden relative border border-white/10"
                >
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-black/5 dark:bg-white/5">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
                            className="h-full bg-blue-500"
                        />
                    </div>

                    <button 
                        onClick={finishTour}
                        className="absolute top-8 right-8 text-[#000B2B]/20 dark:text-white/20 hover:text-red-500 transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <div className="p-12 space-y-8 text-center">
                        <motion.div 
                            key={currentStep}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-24 h-24 bg-white dark:bg-white/5 rounded-[32px] flex items-center justify-center mx-auto shadow-xl"
                        >
                            {step.icon}
                        </motion.div>

                        <div className="space-y-4">
                            <motion.h3 
                                key={`title-${currentStep}`}
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="text-3xl font-black text-[#000B2B] dark:text-white tracking-tight"
                            >
                                {step.title}
                            </motion.h3>
                            <motion.p 
                                key={`desc-${currentStep}`}
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1, transition: { delay: 0.1 } }}
                                className="text-lg font-bold text-[#000B2B]/40 dark:text-white/40 leading-relaxed"
                            >
                                {step.description}
                            </motion.p>
                        </div>

                        <div className="flex items-center justify-between pt-8">
                            <button 
                                onClick={prevStep}
                                disabled={currentStep === 0}
                                className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-[#000B2B]/40 dark:text-white/40 hover:text-blue-500'}`}
                            >
                                <ChevronLeft size={16} />
                                Back
                            </button>

                            <div className="flex gap-2">
                                {TOUR_STEPS.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`w-2 h-2 rounded-full transition-all ${i === currentStep ? 'w-6 bg-blue-500' : 'bg-black/10 dark:bg-white/10'}`} 
                                    />
                                ))}
                            </div>

                            <button 
                                onClick={nextStep}
                                className="flex items-center gap-3 bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                {currentStep === TOUR_STEPS.length - 1 ? "Let's Start" : "Next"}
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Bottom Sparkle Overlay */}
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default OnboardingTour;
