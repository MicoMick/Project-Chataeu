import React, { useEffect } from 'react';
import { UserPlus, Home, Settings, CheckCircle } from 'lucide-react';

const steps = [
  {
    number: '01',
    title:  'Register & Login',
    description: 'Set up your account and dive right into everything CHATEAU has to offer.',
    icon:   <UserPlus size={22} className="text-white" />,
  },
  {
    number: '02',
    title:  'Explore Facilities',
    description: 'Browse community amenities with panorama visualization and select your preferred spaces.',
    icon:   <Home size={22} className="text-white" />,
  },
  {
    number: '03',
    title:  'Manage Activities',
    description: 'Reserve facilities, track payments, report an issue, view announcements, and participate in elections.',
    icon:   <Settings size={22} className="text-white" />,
  },
  {
    number: '04',
    title:  'Stay Connected',
    description: 'Receive real-time updates and stay informed about your community activities.',
    icon:   <CheckCircle size={22} className="text-white" />,
  },
];

const HowItWorks = () => {
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('hw-visible'); obs.unobserve(e.target); }}),
      { threshold: 0.15 }
    );
    document.querySelectorAll('.hw-card').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="py-28 bg-slate-950 overflow-hidden relative">
      <style>{`
        @keyframes hwPop {
          from { opacity:0; transform:translateY(40px) scale(0.95); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        .hw-card { opacity:0; }
        .hw-card.hw-visible { animation: hwPop 0.65s cubic-bezier(.22,.68,0,1.2) forwards; }
      `}</style>

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#006837]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#FFF200]/5 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">

        {/* Header */}
        <div className="text-center mb-20 reveal">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#006837]/20 border border-[#006837]/30 rounded-full text-[#006837] text-xs font-black uppercase tracking-widest mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006837]" />
            Simple Steps
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">
            How It <span className="text-[#006837]">Works</span>
          </h2>
          <p className="max-w-2xl mx-auto text-slate-400 text-lg leading-relaxed">
            Four simple steps to a smarter, more connected neighborhood. Designed for residents, by people who love easy living.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connecting line — desktop only */}
          <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-[#006837]/40 to-transparent" />

          {steps.map((step, i) => (
            <div key={i} className="hw-card relative flex flex-col group" style={{ animationDelay: `${i * 120}ms` }}>

              {/* Icon + connector dot */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-[#006837] flex items-center justify-center shadow-xl shadow-[#006837]/30 group-hover:scale-110 group-hover:shadow-[#006837]/50 transition-all duration-300 mb-3">
                  {step.icon}
                </div>
                <span className="text-[#006837]/60 text-[10px] font-black uppercase tracking-[0.2em]">Step {step.number}</span>
              </div>

              {/* Card */}
              <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 group-hover:bg-white/10 group-hover:border-[#006837]/30 transition-all duration-300">
                <div className="text-5xl font-black text-white/5 mb-3 leading-none select-none">{step.number}</div>
                <h4 className="text-lg font-bold text-white mb-2">{step.title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
