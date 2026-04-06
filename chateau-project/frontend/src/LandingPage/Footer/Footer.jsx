import React from 'react';
import { Mail, MapPin, Facebook, ArrowUp } from 'lucide-react';
import ChateauLogo from '../../assets/ChataueLogo.png';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <footer className="bg-[#006837] text-white py-16 relative">
      <div className="container mx-auto px-6 lg:px-16">
        <div className="flex flex-col md:flex-row justify-center items-start gap-12 md:gap-32">
          
          {/* Brand Section */}
          <div className="flex flex-col items-start gap-4">
            <div className="flex-shrink-0">
              <img 
                src={ChateauLogo} 
                alt="Chateau Real Logo" 
                className="h-25 md:h-25 w-auto object-contain" 
              />
            </div>
            <p className="text-white/60 text-xs tracking-[0.2em] uppercase font-bold pl-1">
              Metropolis Greens
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-lg mb-2 text-[#FFF200]">Quick Links</h3>
            <ul className="space-y-3 text-white/80">
              <li><a href="#features" className="hover:text-[#FFF200] transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-[#FFF200] transition-colors">How It Works</a></li>
              <li><a href="#about" className="hover:text-[#FFF200] transition-colors">About Us</a></li>
              <li><a href="#download" className="hover:text-[#FFF200] transition-colors">Download App</a></li>
            </ul>
          </div>

          {/* Contact Section */}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-lg mb-2 text-[#FFF200]">Contact Us</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/80">
                <Mail size={20} className="text-[#FFF200]" />
                <a href="mailto:chateau@gmail.com" className="hover:text-white transition-colors">
                  chateau@gmail.com
                </a>
              </div>

              <div className="flex items-start gap-3 text-white/80">
                <MapPin size={20} className="mt-1 flex-shrink-0 text-[#FFF200]" />
                <span className="max-w-[250px]">
                  Metropolis Dr, Manggahan, General Trias, Cavite
                </span>
              </div>

              <div className="flex items-center gap-3 text-white/80">
                <Facebook size={20} className="text-[#FFF200]" />
                <a 
                  href="https://facebook.com/chateausubdivision" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-white transition-colors"
                >
                  Chateau Real
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll to Top Button - Now aligned to the Right */}
        <div className="flex justify-end mt-4 md:mt-0">
          <button 
            onClick={scrollToTop}
            className="group flex flex-col items-center gap-2 text-white/50 hover:text-[#FFF200] transition-all duration-300 cursor-pointer"
          >
            <div className="p-2.5 border border-white/10 rounded-full group-hover:border-[#FFF200] group-hover:bg-[#FFF200]/10 group-hover:-translate-y-1 transition-all">
              <ArrowUp size={18} />
            </div>
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold">Top</span>
          </button>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-8 text-center text-white/50 text-sm">
          <p>© 2026 CHATEAU. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;