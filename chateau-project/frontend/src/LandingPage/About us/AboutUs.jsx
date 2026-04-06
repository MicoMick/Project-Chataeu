import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react'; // Added X and Maximize2
import CoverdCourt from '../../assets/CoverdCourt.jpg';
import ModelHouse1 from '../../assets/ModelHouse1.jpg';
import House2 from '../../assets/House2.jpg';

const AboutUs = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false); // New state for viewing

  const slides = [
    {
      url: CoverdCourt,
      caption: "Covered Basketball Court"
    },
    {
      url: ModelHouse1,
      caption: "Modern Home Interior" 
    },
    {
      url: House2,
      caption: "Beautiful Home Exterior"
    }
  ];

  const nextSlide = () => setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));

  // Auto-play slideshow
  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="about" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-6 lg:px-16">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          {/* Left Side: Persuasive Content */}
          <div className="w-full lg:w-1/2">
            <h4 className="text-[#006837] font-bold uppercase tracking-widest mb-3">Our Community</h4>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight">
              Elevate Your Living Experience at <span className="text-[#006837]">Chateau</span>
            </h2>
            
            <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
              <p>
                Chateau isn't just a place to live, it's a premier community designed for those who value 
                security, comfort, and connection. Nestled in a landscape of modern architecture and 
                lush greenery, our subdivision offers a sanctuary away from the hustle, without 
                compromising on convenience.
              </p>
              
              <p className="font-medium text-slate-800">
                Why wait in line at the HOA office when you can manage your home from your fingertips?
              </p>
              
              <p>
                The CHATAEU App is your key to a seamless lifestyle. By joining our digital platform, 
                you're not just paying dues you're gaining instant access to facility bookings, real-time 
                community updates, and a direct line to your HOA board. It’s about empowering you
                to shape the neighborhood you love.
              </p>
            </div>
          </div>

          {/* Right Side: Subdivision Slideshow */}
          <div className="w-full lg:w-1/2">
            <div className="relative group rounded-[2rem] overflow-hidden shadow-2xl border-8 border-white">
              {/* Image Container */}
              <div className="aspect-[4/5] md:aspect-square overflow-hidden bg-slate-100">
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                      index === currentSlide ? 'opacity-100 cursor-pointer' : 'opacity-0 pointer-events-none'
                    }`}
                    onClick={() => setIsLightboxOpen(true)} // Added click to open
                  >
                    <img 
                      src={slide.url} 
                      alt={slide.caption}
                      className="w-full h-full object-cover transform scale-105 group-hover:scale-100 transition-transform duration-700"
                    />
                    
                    {/* View Icon Overlay on Hover */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-white/20 backdrop-blur-md p-4 rounded-full text-white">
                            <Maximize2 size={32} />
                        </div>
                    </div>

                    {/* Caption Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
                      <p className="text-white font-semibold text-xl">{slide.caption}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation Controls */}
              <button 
                onClick={(e) => { e.stopPropagation(); prevSlide(); }} // Stop propagation so it doesn't trigger lightbox
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-all opacity-0 group-hover:opacity-100 z-10"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); nextSlide(); }} // Stop propagation so it doesn't trigger lightbox
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-all opacity-0 group-hover:opacity-100 z-10"
              >
                <ChevronRight size={24} />
              </button>

              {/* Indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {slides.map((_, index) => (
                  <div 
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentSlide ? 'bg-white w-6' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* --- ADDED LIGHTBOX OVERLAY WITH NAVIGATION --- */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Close Button */}
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors p-2 z-20"
            onClick={() => setIsLightboxOpen(false)}
          >
            <X size={40} />
          </button>

          {/* Lightbox Navigation - Prev */}
          <button 
            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-16 h-16 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all z-20"
          >
            <ChevronLeft size={48} />
          </button>

          {/* Lightbox Navigation - Next */}
          <button 
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-16 h-16 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all z-20"
          >
            <ChevronRight size={48} />
          </button>
          
          <img 
            src={slides[currentSlide].url} 
            alt={slides[currentSlide].caption} 
            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
          />
          
          <div className="absolute bottom-10 text-center px-4">
            <p className="text-white text-2xl font-bold tracking-wide">{slides[currentSlide].caption}</p>
            <p className="text-white/50 text-sm mt-2 font-medium uppercase tracking-widest">
                Slide {currentSlide + 1} of {slides.length}
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default AboutUs;