import React from 'react';
import { ClipboardList, CalendarCheck, CreditCard, Vote, Bell, Box } from 'lucide-react';

const Features = () => {
  const featureList = [
    {
      title: "Residents Reports",
      description: "Easily report neighborhood issues, maintenance requests, or concerns directly to the HOA officers.",
      icon: <ClipboardList className="text-white" size={24} />,
    },
    {
      title: "Facility Reservation",
      description: "Book community amenities with 3D visualization to preview before reserving.",
      icon: <CalendarCheck className="text-white" size={24} />,
    },
    {
      title: "Monthly Dues Payment",
      description: "Track dues, view payment history, and manage transactions transparently.",
      icon: <CreditCard className="text-white" size={24} />,
    },
    {
      title: "Online Elections",
      description: "Participate in trusted digital voting for HOA officers with real-time results.",
      icon: <Vote className="text-white" size={24} />,
    },
    {
      title: "Community Announcements",
      description: "Stay informed with instant notifications and community updates.",
      icon: <Bell className="text-white" size={24} />,
    },
    {
      title: "3D Facility View",
      description: "Explore community facilities in immersive 3D before making reservations.",
      icon: <Box className="text-white" size={24} />,
    }
  ];

  return (
    <section id="features" className="py-24 bg-[#F7FAFC]">
      <div className="container mx-auto px-6 text-center">
        <h4 className="text-[#006837] font-bold uppercase tracking-widest mb-3 text-sm">Capabilities</h4>
        <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-900">Features</h2>
        <p className="max-w-2xl mx-auto text-slate-600 mb-16 text-lg">
          Bringing your neighborhood to your fingertips. Stay connected with what matters and enjoy a smarter way to live at <span className="text-[#006837] font-semibold">Chateau Real</span>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-center">
          {featureList.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group"
            >
              {/* Icon Background - Unified Forest Green */}
              <div className="bg-[#006837] p-4 rounded-2xl mb-6 shadow-lg shadow-green-900/10 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              
              <h3 className="text-xl font-bold mb-3 text-slate-800">{feature.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;