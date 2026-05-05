import React from 'react';
import { Download } from 'lucide-react';
import ChateauGate from '../../assets/Chateau_Gate.jpg'; 

const Mainpage = () => {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* ADDED: Internal CSS for Animations since the Tailwind Plugin might be missing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes popupSlide {
          0% { opacity: 0; transform: translateY(20px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-pop-up {
          animation: popupSlide 1s ease-out forwards;
        }
        .delay-300 { animation-delay: 300ms; }
        .delay-500 { animation-delay: 500ms; }
        .fill-mode-both { animation-fill-mode: both; }
      `}} />

      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${ChateauGate})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-slate-900/65 backdrop-brightness-75"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 container mx-auto px-6 text-center text-white">
        
        {/* Welcome Text with Pop-up Animation - Added custom .animate-pop-up */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-wider uppercase mb-6 animate-pop-up animate-in fade-in zoom-in-50 slide-in-from-bottom-6 duration-1000 fill-mode-both">
          Welcome to Chateau Real
        </h1>

        {/* Subtitle with Pop-up Animation - Added custom .animate-pop-up and .delay-300 */}
        <p className="max-w-2xl mx-auto text-sm md:text-base text-gray-200 leading-relaxed mb-10 animate-pop-up delay-300 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-1000 fill-mode-both">
          Your trusted homeowners association dedicated to maintaining property values, 
          fostering community spirit, and ensuring a safe, beautiful neighborhood for all residents.
        </p>

        {/* Action Button with Pop-up Animation - Added custom .animate-pop-up and .delay-500 */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-pop-up delay-500 animate-in fade-in zoom-in-90 slide-in-from-bottom-2 duration-1000 fill-mode-both">
          
          {/* Routes to DownloadPage section */}
          <a href="#download" className="w-full md:w-auto cursor-pointer">
            <button 
              style={{ backgroundColor: '#006837' }} 
              className="w-full px-10 py-4 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 shadow-lg cursor-pointer"
            >
              Download Mobile App <Download size={18} />
            </button>
          </a>

        </div>
      </div>
    </div>
  );
};

export default Mainpage;