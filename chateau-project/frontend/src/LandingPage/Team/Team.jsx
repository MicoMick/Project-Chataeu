import React from 'react';
import RaffyTuvilla from '../../assets/RaffyTuvilla.png'; 
import MichaelNocum from '../../assets/MichaelNocum.png';
import JanetVillar from '../../assets/JanetVillar.png';
import JoevyMelegrito from '../../assets/JoevyMelegrito.png';
import DivineArenas from '../../assets/DivineArenas.png';
import DaisyJimenez from '../../assets/DaisyJimenez.png';
import BabyArboleda from '../../assets/BabyArboleda.png';
import RonelSantos from '../../assets/RonelSantos.png';
import MarkAlvinTahir from '../../assets/MarkAlvinTahir.png';


const Team = () => {
  const teamMembers = [
    { name: "Raffy Tuvilla", role: "President", url: RaffyTuvilla }, 
    { name: "Michael Nocum", role: "Vice President", url: MichaelNocum },
    { name: "Janet Villar", role: "Treasurer", url: JanetVillar },
    { name: "Joevy Melegrito", role: "Secretary", url: JoevyMelegrito },
    { name: "Divine Arenas", role: "Auditor", url: DivineArenas },
    { name: "Daisy Jimenez", role: "Board of Directors", url: DaisyJimenez },
    { name: "Baby Arboleda", role: "Board of Directors", url: BabyArboleda },
    { name: "Jessica Taylor", role: "Board of Directors", url: RonelSantos },
    { name: "David Anderson", role: "Board of Directors", url: MarkAlvinTahir },
  ];

  return (
    <section id="team" className="py-24 bg-[#F7FAFC]">
      <div className="container mx-auto px-6 text-center">
        <h4 className="text-[#006837] font-bold uppercase tracking-widest mb-3 text-sm">Meet Our People</h4>
        <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-900">Board of Directors</h2>
        <p className="max-w-2xl mx-auto text-slate-600 mb-16 text-lg">
          The Board of Directors is here to serve <span className="text-[#006837] font-semibold">Chateau Real</span>, working to make your neighborhood experience simple, smart, and secure.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-center">
          {teamMembers.map((member, index) => (
            <div 
              key={index} 
              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group"
            >
              {/* Image Element */}
              <img 
                src={member.url} 
                alt={member.name}
                className="w-24 h-24 rounded-full object-cover mb-6 border-2 border-white shadow-md group-hover:scale-105 transition-transform duration-300"
              />
              
              <h3 className="text-xl font-bold mb-1 text-slate-800">{member.name}</h3>
              <p className="text-[#006837] font-medium text-sm mb-3">
                {member.role}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Team;