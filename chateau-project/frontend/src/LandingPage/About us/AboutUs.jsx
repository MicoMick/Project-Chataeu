import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const AboutUs = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=800",
      caption: "Serene Residential Streets"
    },
    {
      url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
      caption: "Modern Clubhouse & Facilities"
    },
    {
      url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800",
      caption: "Lush Green Parks"
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
                Chateau isn't just a place to live; it's a premier community designed for those who value 
                security, comfort, and connection. Nestled in a landscape of modern architecture and 
                lush greenery, our subdivision offers a sanctuary away from the hustle, without 
                compromising on convenience.
              </p>
              
              <p className="font-medium text-slate-800">
                Why wait in line at the HOA office when you can manage your home from your fingertips?
              </p>
              
              <p>
                The CHATAEU App is your key to a seamless lifestyle. By joining our digital platform, 
                you're not just paying dues—you're gaining instant access to facility bookings, real-time 
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
                      index === currentSlide ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <img 
                      src={slide.url} 
                      alt={slide.caption}
                      className="w-full h-full object-cover transform scale-105 group-hover:scale-100 transition-transform duration-700"
                    />
                    {/* Caption Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
                      <p className="text-white font-semibold text-xl">{slide.caption}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation Controls */}
              <button 
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-all opacity-0 group-hover:opacity-100"
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
    </section>
  );
};

export default AboutUs;