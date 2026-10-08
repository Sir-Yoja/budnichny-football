import React from 'react';
import { Player } from '../types/football';
import { Trophy, Target, Flame, Award, Sparkles, TrendingUp } from 'lucide-react';
import { getWinRate } from '../utils/footballHelpers';

interface LeagueStatsProps {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
}

export const LeagueStats: React.FC<LeagueStatsProps> = ({ players, onSelectPlayer }) => {
  // Top Scorers (Gold Boot)
  const topScorers = [...players].sort((a, b) => b.goals - a.goals).slice(0, 5);
  // Top Assists
  const topAssists = [...players].sort((a, b) => b.assists - a.assists).slice(0, 5);
  // Top MVP
  const topMvps = [...players].sort((a, b) => b.mvpCount - a.mvpCount).slice(0, 5);
  // Top Win Rate (min 10 games)
  const topWinRate = [...players]
    .filter(p => p.matchesPlayed >= 10)
    .sort((a, b) => getWinRate(b) - getWinRate(a))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900/80 p-4 sm:p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>Рекорды & Трофеи Сезона</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Зал славы любительской лиги «Будничный Футбол»
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
          <Sparkles className="w-4 h-4" />
          <span>Сезон 2025</span>
        </div>
      </div>

      {/* Leaderboard Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Golden Boot (Голы) */}
        <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 font-bold">
                ⚽
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-sm text-white">Золотая Бутса</h3>
                <p className="text-[10px] text-slate-400">Лучшие бомбардиры лиги</p>
              </div>
            </div>
            <Target className="w-5 h-5 text-rose-400" />
          </div>

          <div className="space-y-2">
            {topScorers.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => onSelectPlayer(p)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-md text-[10px] font-black font-heading flex items-center justify-center ${
                    idx === 0 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <img src={p.photoUrl} alt={p.name} className="w-7 h-7 rounded-md object-cover border border-slate-700" />
                  <div>
                    <div className="font-bold text-xs text-white hover:text-emerald-400 transition">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.position} • {p.matchesPlayed} игр</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-heading font-black text-sm text-rose-400">{p.goals}</span>
                  <span className="text-[10px] text-slate-500 block">голов</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Assist King (Голевые пасы) */}
        <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 font-bold">
                🅰️
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-sm text-white">Король Ассистов</h3>
                <p className="text-[10px] text-slate-400">Лучшие ассистенты</p>
              </div>
            </div>
            <Flame className="w-5 h-5 text-amber-400" />
          </div>

          <div className="space-y-2">
            {topAssists.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => onSelectPlayer(p)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-md text-[10px] font-black font-heading flex items-center justify-center ${
                    idx === 0 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <img src={p.photoUrl} alt={p.name} className="w-7 h-7 rounded-md object-cover border border-slate-700" />
                  <div>
                    <div className="font-bold text-xs text-white hover:text-emerald-400 transition">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.position} • {p.matchesPlayed} игр</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-heading font-black text-sm text-amber-400">{p.assists}</span>
                  <span className="text-[10px] text-slate-500 block">пасов</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. MVP Leaders */}
        <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 font-bold">
                ⭐
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-sm text-white">Лучшие игроки (MVP)</h3>
                <p className="text-[10px] text-slate-400">Количество наград MVP</p>
              </div>
            </div>
            <Award className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="space-y-2">
            {topMvps.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => onSelectPlayer(p)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-md text-[10px] font-black font-heading flex items-center justify-center ${
                    idx === 0 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <img src={p.photoUrl} alt={p.name} className="w-7 h-7 rounded-md object-cover border border-slate-700" />
                  <div>
                    <div className="font-bold text-xs text-white hover:text-emerald-400 transition">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.position} • {p.matchesPlayed} игр</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-heading font-black text-sm text-amber-300">⭐ {p.mvpCount}</span>
                  <span className="text-[10px] text-slate-500 block">наград</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Win Rate Leaders */}
        <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 font-bold">
                📈
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-sm text-white">Процент Побед (%)</h3>
                <p className="text-[10px] text-slate-400">Минимум 10 сыгранных матчей</p>
              </div>
            </div>
            <TrendingUp className="w-5 h-5 text-teal-400" />
          </div>

          <div className="space-y-2">
            {topWinRate.map((p, idx) => {
              const wr = getWinRate(p);
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectPlayer(p)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-md text-[10px] font-black font-heading flex items-center justify-center ${
                      idx === 0 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <img src={p.photoUrl} alt={p.name} className="w-7 h-7 rounded-md object-cover border border-slate-700" />
                    <div>
                      <div className="font-bold text-xs text-white hover:text-emerald-400 transition">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.wins} В / {p.losses} П</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-heading font-black text-sm text-teal-300">{wr}%</span>
                    <span className="text-[10px] text-slate-500 block">побед</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
