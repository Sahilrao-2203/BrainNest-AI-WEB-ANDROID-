import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

export const PlansPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activePlan, setActivePlan] = useState<'Free' | 'Student' | 'Pro'>('Free');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [selectedPlanName, setSelectedPlanName] = useState('');

  const [hoveredCard, setHoveredCard] = useState<'Free' | 'Student' | 'Pro' | null>(null);
  const [freeTilt, setFreeTilt] = useState({ x: 0, y: 0 });
  const [studentTilt, setStudentTilt] = useState({ x: 0, y: 0 });
  const [proTilt, setProTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (
    e: React.MouseEvent<HTMLDivElement>,
    setTilt: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  ) => {
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;
    }

    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Rotation of max 2 degrees
    const rotateX = ((centerY - y) / centerY) * 2;
    const rotateY = ((x - centerX) / centerX) * 2;
    
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = (
    setTilt: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>,
    plan: 'Free' | 'Student' | 'Pro'
  ) => {
    setTilt({ x: 0, y: 0 });
    setHoveredCard(prev => prev === plan ? null : prev);
  };

  const getCardStyle = (
    plan: 'Free' | 'Student' | 'Pro',
    tilt: { x: number; y: number }
  ) => {
    const isHovered = hoveredCard === plan;
    let baseTranslateY = 0;
    
    if (plan === 'Student') {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
      baseTranslateY = isDesktop ? -16 : 0;
    }
    
    let prefersReducedMotion = false;
    if (typeof window !== 'undefined') {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    const hoverScale = isHovered ? (prefersReducedMotion ? 1.01 : 1.03) : 1.0;
    const hoverTranslateY = isHovered ? (prefersReducedMotion ? 0 : -8) : 0;
    const totalTranslateY = baseTranslateY + hoverTranslateY;
    
    return {
      transform: `perspective(1000px) translateY(${totalTranslateY}px) scale(${hoverScale}) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
      transition: isHovered 
        ? 'transform 100ms linear, box-shadow 300ms ease, border-color 300ms ease' 
        : 'transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 300ms ease, border-color 300ms ease',
    };
  };

  const handleUpgrade = (planName: 'Student' | 'Pro') => {
    setSelectedPlanName(planName);
    setIsSuccessModalOpen(true);
    setActivePlan(planName);
  };

  return (
    <div className="bg-surface dark:bg-[#0F1115] text-on-surface min-h-screen flex flex-col font-body-md overflow-x-hidden relative w-full pb-16">
      {/* Ambient Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary-container opacity-20 blur-3xl z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-container opacity-10 blur-3xl z-0 pointer-events-none"></div>

      {/* Top Header */}
      <header className="w-full bg-surface-container-lowest/80 dark:bg-[#181B21]/80 backdrop-blur-md border-b border-outline-variant/30 sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors font-semibold text-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              <span>Back</span>
            </button>
            <div className="h-6 w-px bg-outline-variant/30 hidden md:block"></div>
            <div className="flex items-center gap-2">
              <img
                alt="StudyFlow AI Logo"
                className="w-7 h-7 object-contain"
                src={logo}
              />
              <span className="font-display-lg text-lg font-bold text-primary dark:text-[#bdc2ff] tracking-tight">StudyFlow AI</span>
            </div>
          </div>
          
          {user && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-container/20 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary dark:text-[#bdc2ff]">
                {user.name.charAt(0)}
              </div>
              <span className="text-xs font-semibold text-on-surface hidden sm:inline">{user.name}</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow z-10">
        {/* Hero Section */}
        <section className="relative pt-16 pb-12 px-6 overflow-hidden">
          <div className="max-w-[1200px] mx-auto relative z-10 text-center">
            <span className="inline-block py-1 px-3 rounded-full bg-primary-container/10 dark:bg-primary-container/30 text-secondary dark:text-[#68fadd] border border-secondary/20 font-label-sm text-xs font-semibold mb-6">
              StudyFlow Pro
            </span>
            <h1 className="font-display-lg text-3xl md:text-5xl font-bold text-primary dark:text-[#bdc2ff] mb-6">
              Elevate Your Engineering Journey
            </h1>
            <p className="font-body-lg text-base md:text-lg text-on-surface-variant max-w-2xl mx-auto mb-6 leading-relaxed">
              Unlock AI-powered tools designed specifically for rigorous academic environments. Master concepts faster with precision intelligence.
            </p>
          </div>
        </section>

        {/* Pricing Grid */}
        <section className="py-12 px-6">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
            {/* Free Tier */}
            <div 
              onMouseMove={(e) => handleMouseMove(e, setFreeTilt)}
              onMouseEnter={() => setHoveredCard('Free')}
              onMouseLeave={() => handleMouseLeave(setFreeTilt, 'Free')}
              style={getCardStyle('Free', freeTilt)}
              className={`bg-surface-container-lowest dark:bg-[#181B21] rounded-xl p-8 border shadow-sm flex flex-col h-full ${
                hoveredCard === 'Free' ? 'border-secondary/40 shadow-2xl z-20' : 'border-outline-variant/30 z-10'
              }`}
            >
              <h3 className={`font-headline-md text-xl font-bold text-primary dark:text-[#bdc2ff] mb-2 transition-transform duration-300 ${
                hoveredCard === 'Free' ? '-translate-y-0.5' : ''
              }`}>
                Free Tier
              </h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display-lg text-4xl font-bold text-on-surface">₹0</span>
                <span className="text-on-surface-variant text-sm font-medium">/mo</span>
              </div>
              <ul className={`flex flex-col gap-4 mb-8 flex-grow transition-all duration-300 ${
                hoveredCard === 'Free' ? 'opacity-100 translate-y-0' : 'opacity-90 translate-y-0.5'
              }`}>
                <li className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>Basic AI doubt solving (5 questions/day)</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>Limited syllabus access</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>Basic study recommendations</span>
                </li>
              </ul>
              <button 
                disabled 
                className="w-full py-3 rounded-lg border-2 border-outline-variant/40 text-on-surface-variant/60 font-semibold text-sm bg-surface/50 cursor-not-allowed"
              >
                {activePlan === 'Free' ? 'Current Plan' : 'Free Tier'}
              </button>
            </div>

            {/* Student Plan (Featured) */}
            <div 
              onMouseMove={(e) => handleMouseMove(e, setStudentTilt)}
              onMouseEnter={() => setHoveredCard('Student')}
              onMouseLeave={() => handleMouseLeave(setStudentTilt, 'Student')}
              style={getCardStyle('Student', studentTilt)}
              className={`bg-white/70 dark:bg-[#181B21]/90 rounded-xl p-8 border-2 shadow-2xl relative flex flex-col h-full ${
                hoveredCard === 'Student' 
                  ? 'border-secondary dark:border-[#68fadd] shadow-[0_20px_50px_rgba(0,107,92,0.2)] z-20' 
                  : 'border-secondary/50 dark:border-[#68fadd]/50 z-10'
              }`}
            >
              <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary-container text-on-primary px-4 py-1 rounded-full font-semibold text-xs shadow-md transition-transform duration-300 ${
                hoveredCard === 'Student' ? 'scale-[1.03]' : ''
              }`}>
                Most Popular
              </div>
              <h3 className={`font-headline-md text-xl font-bold text-primary dark:text-[#bdc2ff] mb-2 transition-transform duration-300 ${
                hoveredCard === 'Student' ? '-translate-y-0.5' : ''
              }`}>
                Student Plan
              </h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display-lg text-4xl font-bold text-on-surface">₹99</span>
                <span className="text-on-surface-variant text-sm font-medium">/month</span>
              </div>
              <ul className={`flex flex-col gap-4 mb-8 flex-grow transition-all duration-300 ${
                hoveredCard === 'Student' ? 'opacity-100 translate-y-0' : 'opacity-90 translate-y-0.5'
              }`}>
                <li className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>Unlimited AI doubts</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>Personalized study plans + Mood-based recommendations</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>Unlimited quizzes, notes generation + Exam Mode</span>
                </li>
              </ul>
              <button 
                onClick={() => handleUpgrade('Student')}
                className={`w-full py-3 rounded-lg bg-primary text-on-primary hover:opacity-90 font-semibold text-sm shadow-md transition-all duration-300 cursor-pointer ${
                  hoveredCard === 'Student' ? 'scale-[1.01] hover:brightness-110 shadow-lg' : ''
                }`}
              >
                {activePlan === 'Student' ? 'Current Plan' : 'Upgrade Now'}
              </button>
            </div>

            {/* Pro Plan */}
            <div 
              onMouseMove={(e) => handleMouseMove(e, setProTilt)}
              onMouseEnter={() => setHoveredCard('Pro')}
              onMouseLeave={() => handleMouseLeave(setProTilt, 'Pro')}
              style={getCardStyle('Pro', proTilt)}
              className={`bg-surface-container-lowest dark:bg-[#181B21] rounded-xl p-8 border shadow-sm flex flex-col h-full ${
                hoveredCard === 'Pro' ? 'border-primary dark:border-[#bdc2ff] shadow-2xl z-20' : 'border-outline-variant/30 z-10'
              }`}
            >
              <h3 className={`font-headline-md text-xl font-bold text-primary dark:text-[#bdc2ff] mb-2 transition-transform duration-300 ${
                hoveredCard === 'Pro' ? '-translate-y-0.5' : ''
              }`}>
                Pro Plan
              </h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display-lg text-4xl font-bold text-on-surface">₹199</span>
                <span className="text-on-surface-variant text-sm font-medium">/month</span>
              </div>
              <ul className={`flex flex-col gap-4 mb-8 flex-grow transition-all duration-300 ${
                hoveredCard === 'Pro' ? 'opacity-100 translate-y-0' : 'opacity-90 translate-y-0.5'
              }`}>
                <li className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>Everything in Student Plan</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>Advanced AI tutoring + Exam strategy coaching</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>Detailed analytics + Viva prep + Priority support</span>
                </li>
              </ul>
              <button 
                onClick={() => handleUpgrade('Pro')}
                className={`w-full py-3 rounded-lg border-2 border-primary text-primary dark:border-[#bdc2ff] dark:text-[#bdc2ff] hover:bg-surface-variant/40 font-semibold text-sm transition-all duration-300 cursor-pointer ${
                  hoveredCard === 'Pro' ? 'scale-[1.01] bg-primary/5 dark:bg-[#bdc2ff]/5 shadow-md' : ''
                }`}
              >
                {activePlan === 'Pro' ? 'Current Plan' : 'Upgrade to Pro'}
              </button>
            </div>

          </div>
        </section>
      </main>

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6 border border-outline-variant/30 shadow-2xl flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-secondary-container/20 flex items-center justify-center border border-secondary/30">
              <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <h3 className="font-headline-md text-xl font-bold text-on-surface">Plan Upgraded!</h3>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              Your subscription is now updated to the <strong className="text-primary dark:text-[#bdc2ff]">{selectedPlanName} Plan</strong>. Mock checkout integration simulated successfully.
            </p>
            <button 
              onClick={() => setIsSuccessModalOpen(false)}
              className="w-full py-2.5 rounded-lg bg-primary text-on-primary hover:opacity-90 font-semibold text-sm shadow-md transition-opacity cursor-pointer mt-2"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
