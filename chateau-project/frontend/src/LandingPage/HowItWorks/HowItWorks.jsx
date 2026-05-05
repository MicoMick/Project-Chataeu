import React, { useEffect } from 'react'; // Added useEffect
import { UserPlus, Home, Settings, CheckCircle } from 'lucide-react';

const HowItWorks = () => {
  // Logic for scroll-triggered animation
  useEffect(() => {
    const observerOptions = { threshold: 0.2 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-pop-up');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.step-card-animate');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const steps = [
    {
      number: "01",
      title: "Register & Login",
      description: "Create your account in seconds. Once verified by your HOA, you’re ready to unlock everything your neighborhood has to offer.",
      icon: <UserPlus className="text-white" size={24} />,
    },
    {
      number: "02",
      title: "Explore Facilities",
      description: "Browse community amenities with panorama visualization and select your preferred spaces.",
      icon: <Home className="text-white" size={24} />,
    },
    {
      number: "03",
      title: "Manage Activities",
      description: "Reserve facilities, track payments, report an issue, view announcements, and participate in elections.",
      icon: <Settings className="text-white" size={24} />,
    },
    {
      number: "04",
      title: "Stay Connected",
      description: "Receive real-time updates and stay informed about your community activities.",
      icon: <CheckCircle className="text-white" size={24} />,
    },
  ];

  return (
    <section id="how-it-works" className="py-32 bg-[#F0F0F0] overflow-hidden">
      {/* Animation Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes stepPop {
          0% { opacity: 0; transform: translateY(40px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .step-card-animate { 
          opacity: 0; 
        }
        .animate-pop-up { 
          animation: stepPop 0.7s ease-out forwards; 
        }
      `}} />

      <div className="container mx-auto px-6 text-center">
        {/* Header Section */}
        <h2 className="text-5xl font-black mb-4 text-slate-900">How It Works</h2>
        <h3 className="text-2xl font-bold text-[#006837] mb-4">Simple Process, Powerful Results</h3>
        <p className="max-w-3xl mx-auto text-gray-600 text-lg mb-20">
          Four simple steps to a smarter, more connected neighborhood. Designed for residents, by people who love easy living.
        </p>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="step-card-animate relative flex flex-col items-center group"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              
              {/* Icon Bubble */}
              <div className="w-16 h-16 bg-[#006837] rounded-full flex items-center justify-center shadow-lg shadow-green-900/20 mb-[-32px] z-10 group-hover:scale-110 transition-transform duration-300">
                {step.icon}
              </div>

              {/* Step Card */}
              <div className="bg-white pt-12 pb-10 px-6 rounded-2xl shadow-xl shadow-gray-300/40 w-full min-h-[280px] flex flex-col items-center border border-gray-100 group-hover:border-[#006837]/30 transition-colors">
                <span className="text-5xl font-black text-black/[0.2] mb-4 tracking-tighter select-none">
                  {step.number}
                </span>
                <h4 className="text-xl font-bold text-slate-900 mb-3 text-center">
                  {step.title}
                </h4>
                <p className="text-gray-500 text-sm leading-relaxed text-center">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;