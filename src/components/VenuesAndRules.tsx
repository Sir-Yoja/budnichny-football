import React from 'react';
import { Venue, Rule } from '../types/football';
import { ShieldCheck, MapPin, CheckCircle, Flame } from 'lucide-react';

interface VenuesAndRulesProps {
  venues: Venue[];
  rules: Rule[];
}

export const VenuesAndRules: React.FC<VenuesAndRulesProps> = ({ venues, rules }) => {
  return (
    <div className="space-y-8">
      
      {/* Rules Section */}
      <div className="space-y-4">
        <div className="bg-slate-900/80 p-4 sm:p-5 rounded-3xl border border-slate-800">
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>Правила Будничного Футбола</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Базовый регламент вечерних встреч для максимального кайфа и без травм
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="glass-card rounded-2xl p-4 border border-slate-800 space-y-2 hover:border-emerald-500/30 transition"
            >
              <div className="text-2xl">{rule.icon}</div>
              <h3 className="font-heading font-bold text-sm text-white">{rule.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{rule.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Venues Section */}
      <div className="space-y-4">
        <div className="bg-slate-900/80 p-4 sm:p-5 rounded-3xl border border-slate-800">
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-rose-400" />
            <span>Футбольные Манежи & Поля</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Локации проведения наших регулярных будничных игр
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {venues.map((v) => (
            <div
              key={v.id}
              className="glass-panel rounded-3xl overflow-hidden border border-slate-800 space-y-3 group hover:border-emerald-500/40 transition"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={v.imageUrl}
                  alt={v.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] font-bold text-emerald-400">
                  {v.indoor ? '🏠 Крытый манеж' : '☀️ Открытая арена'}
                </div>
              </div>

              <div className="p-4 space-y-3">
                <h3 className="font-heading font-bold text-base text-white group-hover:text-emerald-400 transition">
                  {v.name}
                </h3>

                <p className="text-xs text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{v.address}</span>
                </p>

                <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Покрытие: <strong className="text-slate-200">{v.surface}</strong></span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  {v.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
