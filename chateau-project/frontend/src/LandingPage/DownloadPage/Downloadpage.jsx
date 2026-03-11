import React from 'react';
import { Smartphone, Star, Download } from 'lucide-react';

const Downloadpage = () => {
  const residentFeatures = [
    "Reserve facilities with 3D preview",
    "Track and pay dues",
    "Report neighborhood issues directly to HOA",
    "Vote in community elections",
    "Receive instant announcements"
  ];

  return (
    <section id="download" className="relative py-24 md:py-32 bg-gradient-to-br from-[#006837] to-[#FFF200] overflow-hidden">
      <div className="container mx-auto px-6 lg:px-16 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-24">
          
          <div className="w-full lg:w-1/2 text-white text-left animate-in fade-in slide-in-from-left-6 duration-700">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-black/20 backdrop-blur-md border border-white/20 rounded-full text-xs font-semibold mb-6 tracking-wide shadow-inner">
              <Smartphone size={15} className="text-[#FFF200]" />
              <span className="text-white">Mobile App for Residents</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 leading-tight uppercase tracking-tight text-white drop-shadow-md">
              Download CHATEAU <br /> App on Your Phone
            </h2>
            
            <p className="text-lg text-white/90 leading-relaxed mb-10 max-w-xl">
              Scan the QR code or click the download button to get the CHATEAU mobile app. 
            </p>

            <ul className="space-y-4 mb-12">
              {residentFeatures.map((item, index) => (
                <li key={index} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shadow-md">
                    <Star size={13} className="text-[#FFF200] fill-[#FFF200]" />
                  </div>
                  <span className="text-base font-medium text-white">{item}</span>
                </li>
              ))}
            </ul>

            {/* Blue Hover Button */}
            <button className="flex items-center gap-3 bg-white text-[#006837] px-9 py-4 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition-all shadow-xl shadow-green-950/30 active:scale-95 group">
              <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
              Download Now
            </button>
          </div>

          <div className="w-full lg:w-1/3 flex justify-center lg:justify-end perspective">
            <div className="relative group">
              <div className="w-[300px] h-[600px] bg-slate-900 border-4 border-slate-800 rounded-[3rem] p-3 shadow-2xl transition-transform duration-500 group-hover:scale-105">
                <div className="w-full h-full bg-[#f8fafc] rounded-[2.2rem] flex flex-col items-center justify-center p-6 text-center border-2 border-slate-800">
                  <span className="text-xs font-bold text-[#006837] uppercase tracking-widest mt-6 mb-1">CHATEAU</span>
                  <h3 className="text-2xl font-black text-slate-950 mb-1 leading-tight">Scan To<br/>Download</h3>
                  <div className="bg-white p-5 rounded-3xl shadow-xl border border-gray-200">
                    <img 
                      src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=CHATEAU-APP-DOWNLOAD" 
                      alt="App Download QR Code" 
                      className="w-40 h-40 md:w-48 md:h-48"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="absolute top-[-15%] left-[-15%] w-[500px] h-[500px] bg-[#FFF200] rounded-full blur-[150px] opacity-5"></div>
      <div className="absolute bottom-[-15%] right-[-15%] w-[500px] h-[500px] bg-[#006837] rounded-full blur-[150px] opacity-900"></div>
    </section>
  );
};

export default Downloadpage;