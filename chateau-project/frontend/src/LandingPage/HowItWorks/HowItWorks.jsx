import React from 'react';
import { UserPlus, Home, Settings, CheckCircle } from 'lucide-react';

const HowItWorks = () => {
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
      description: "Browse community amenities with 3D visualization and select your preferred spaces.",
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
    /* Updated background to #F0F0F0 */
    <section id="how-it-works" className="py-32 bg-[#F0F0F0]">
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
            <div key={index} className="relative flex flex-col items-center group">
              
              {/* Icon Bubble - Updated to Forest Green with Gold shadow hint */}
              <div className="w-16 h-16 bg-[#006837] rounded-full flex items-center justify-center shadow-lg shadow-green-900/20 mb-[-32px] z-10 group-hover:scale-110 transition-transform duration-300">
                {step.icon}
              </div>

              {/* Step Card */}
              <div className="bg-white pt-12 pb-10 px-6 rounded-2xl shadow-xl shadow-gray-300/40 w-full min-h-[280px] flex flex-col items-center border border-gray-100 group-hover:border-[#006837]/30 transition-colors">
                <span className="text-5xl font-black text-gray-100 mb-4 tracking-tighter">
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