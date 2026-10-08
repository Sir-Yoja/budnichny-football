import React from 'react';
import { Users, Calendar, Shuffle, BarChart3, ShieldCheck } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenTeamGenerator: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenTeamGenerator
}) => {
  const items = [
    { id: 'players', label: 'Игроки', icon: Users },
    { id: 'matches', label: 'Матчи', icon: Calendar },
    { id: 'generator', label: 'Балансир', icon: Shuffle, isSpecial: true },
    { id: 'stats', label: 'Рекорды', icon: BarChart3 },
    { id: 'rules', label: 'Правила', icon: ShieldCheck }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#090d16]/95 backdrop-blur-xl border-t border-slate-800/80 pb-safe pt-1.5 px-2">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isSpecial) {
            return (
              <button
                key={item.id}
                onClick={onOpenTeamGenerator}
                className="flex flex-col items-center justify-center -mt-5 transition-transform active:scale-95"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 border-2 border-[#090d16]">
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-bold text-emerald-400 mt-0.5">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl min-w-[56px] transition-all active:scale-95 ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400 stroke-[2.5]' : 'text-slate-400'}`} />
              <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
