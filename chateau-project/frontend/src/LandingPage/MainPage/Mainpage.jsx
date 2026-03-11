import React from 'react';
import { Monitor, Smartphone, Download, ChevronRight } from 'lucide-react';

const Mainpage = () => {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=2000')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-slate-900/65 backdrop-brightness-75"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 container mx-auto px-6 text-center text-white">
        
        {/* Welcome Text */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-wider uppercase mb-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          Welcome to Chateau Reals
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-sm md:text-base text-gray-200 leading-relaxed mb-10">
          Your trusted homeowners association dedicated to maintaining property values, 
          fostering community spirit, and ensuring a safe, beautiful neighborhood for all residents.
        </p>

        {/* Info Tags */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-12">
          <div className="flex items-center gap-3 px-5 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm font-medium text-gray-100 select-none">
            <Monitor size={16} className="text-blue-400" />
            Web for HOA
          </div>
          <div className="flex items-center gap-3 px-5 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm font-medium text-gray-100 select-none">
            <Smartphone size={16} className="text-blue-400" />
            Mobile for Residents
          </div>
        </div>

        {/* Action Buttons with Routing */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          
          {/* Routes to DownloadPage section */}
          <a href="#download" className="w-full md:w-auto">
            <button className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20">
              Download Mobile App <Download size={18} />
            </button>
          </a>

          {/* Routes to Features section */}
          <a href="#features" className="w-full md:w-auto">
            <button className="w-full px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/30 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95">
              Explore Features <ChevronRight size={18} />
            </button>
          </a>

        </div>
      </div>
    </div>
  );
};

export default Mainpage;