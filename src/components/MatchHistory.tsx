import React, { useState } from 'react';
import { Match, Player } from '../types/football';
import { Calendar, MapPin, Trophy, PlusCircle, Sparkles, ChevronRight, Goal } from 'lucide-react';

interface MatchHistoryProps {
  matches: Match[];
  players: Player[];
  onOpenAddMatch: () => void;
  onSelectPlayer: (player: Player) => void;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({
  matches,
  players,
  onOpenAddMatch,
  onSelectPlayer
}) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const getPlayer = (id?: string) => players.find(p => p.id === id);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-400" />
            <span>Календарь & История Матчей</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Протоколы игр, авторы голов, голевые передачи и награды Лучшего игрока матча (MVP)
          </p>
        </div>

        <button
          onClick={onOpenAddMatch}
          className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition hover:opacity-95 flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Записать новый матч</span>
        </button>
      </div>

      {/* Match Cards List */}
      <div className="space-y-4">
        {matches.map((m) => {
          const mvpPlayer = getPlayer(m.mvpId);

          return (
            <div
              key={m.id}
              className="glass-card hover:bg-slate-800/80 rounded-3xl p-4 sm:p-5 border border-slate-800 hover:border-emerald-500/30 transition shadow-lg space-y-4"
            >
              {/* Top Match Info Row */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 text-xs text-slate-400">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                    Формат {m.format}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {m.date} ({m.time})
                  </span>
                </div>

                <div className="flex items-center gap-1 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span className="truncate max-w-[150px] sm:max-w-none">{m.location}</span>
                </div>
              </div>

              {/* Main Score Board */}
              <div className="grid grid-cols-12 gap-2 items-center text-center py-2">
                
                {/* Team A */}
                <div className="col-span-5 flex flex-col sm:flex-row items-center justify-end gap-2 text-right">
                  <div className="order-2 sm:order-1">
                    <h3 className="font-heading font-extrabold text-sm sm:text-base text-white">
                      {m.teamA.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {m.teamA.playerIds.length} игроков
                    </p>
                  </div>
                  <div
                    className="w-4 h-4 rounded-full order-1 sm:order-2 shrink-0 border border-white/20"
                    style={{ backgroundColor: m.teamA.color }}
                  ></div>
                </div>

                {/* Score */}
                <div className="col-span-2 flex flex-col items-center justify-center">
                  <div className="px-3 py-1.5 rounded-2xl bg-slate-950 border border-slate-800 font-heading font-black text-xl sm:text-2xl text-emerald-400 tracking-wider shadow-inner">
                    {m.teamA.score} : {m.teamB.score}
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">Финальный счет</span>
                </div>

                {/* Team B */}
                <div className="col-span-5 flex flex-col sm:flex-row items-center justify-start gap-2 text-left">
                  <div
                    className="w-4 h-4 rounded-full shrink-0 border border-white/20"
                    style={{ backgroundColor: m.teamB.color }}
                  ></div>
                  <div>
                    <h3 className="font-heading font-extrabold text-sm sm:text-base text-white">
                      {m.teamB.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {m.teamB.playerIds.length} игроков
                    </p>
                  </div>
                </div>

              </div>

              {/* Goal Scorers Preview */}
              {m.goals.length > 0 && (
                <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <Goal className="w-3.5 h-3.5 text-rose-400" />
                    <span>Хроника голов:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {m.goals.map((g) => (
                      <div key={g.id} className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                        <span className="text-emerald-400 font-bold">{g.minute}'</span>
                        <span className="font-bold text-white">⚽ {g.scorerName}</span>
                        {g.assistName && (
                          <span className="text-slate-400 font-medium">(пас: {g.assistName})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer MVP & Details */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                {mvpPlayer ? (
                  <div
                    onClick={() => onSelectPlayer(mvpPlayer)}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
                  >
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> MVP Матча:
                    </span>
                    <span className="font-bold text-slate-200 underline underline-offset-2">
                      {mvpPlayer.name} ({mvpPlayer.rating})
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-500 italic text-[11px]">MVP не был выбран</span>
                )}

                <button
                  onClick={() => setSelectedMatch(m)}
                  className="self-end sm:self-auto flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold text-xs"
                >
                  <span>Полный протокол</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Match Details Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[#0d1424] border border-slate-700/80 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="font-heading font-black text-base text-white">Протокол Матча</h3>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg"
              >
                Закрыть ✕
              </button>
            </div>

            <div className="text-center py-2 bg-slate-950/80 rounded-2xl border border-slate-800">
              <div className="text-2xl font-black font-heading text-emerald-400">
                {selectedMatch.teamA.score} : {selectedMatch.teamB.score}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {selectedMatch.teamA.name} vs {selectedMatch.teamB.name}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {selectedMatch.date} • {selectedMatch.location}
              </div>
            </div>

            {selectedMatch.notes && (
              <p className="text-xs text-slate-300 italic bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                «{selectedMatch.notes}»
              </p>
            )}

            {/* Teams Rosters in Modal */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="font-bold text-xs text-white mb-2 pb-1 border-b border-slate-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedMatch.teamA.color }}></span>
                  {selectedMatch.teamA.name}
                </div>
                <div className="space-y-1 text-xs">
                  {selectedMatch.teamA.playerIds.map(pId => {
                    const p = getPlayer(pId);
                    return p ? (
                      <div key={p.id} className="text-slate-300 font-medium">
                        • {p.name} <span className="text-slate-500 text-[10px]">({p.position})</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="font-bold text-xs text-white mb-2 pb-1 border-b border-slate-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedMatch.teamB.color }}></span>
                  {selectedMatch.teamB.name}
                </div>
                <div className="space-y-1 text-xs">
                  {selectedMatch.teamB.playerIds.map(pId => {
                    const p = getPlayer(pId);
                    return p ? (
                      <div key={p.id} className="text-slate-300 font-medium">
                        • {p.name} <span className="text-slate-500 text-[10px]">({p.position})</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>

            <div className="text-right pt-2">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
              >
                Понятно
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
