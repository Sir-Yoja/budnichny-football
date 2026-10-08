import React from 'react';
import { Player, Match } from '../types/football';
import { getPositionBadgeColor, getPositionRussianName, getRatingColor, getWinRate } from '../utils/footballHelpers';
import { X, Trophy, Target, Flame, Award, Shield, Zap, Calendar } from 'lucide-react';

interface PlayerModalProps {
  player: Player | null;
  matches: Match[];
  onClose: () => void;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({ player, matches, onClose }) => {
  if (!player) return null;

  const winRate = getWinRate(player);
  const ratingBadgeGradient = getRatingColor(player.rating);

  // Filter player's matches
  const playerMatches = matches.filter(
    m => m.teamA.playerIds.includes(player.id) || m.teamB.playerIds.includes(player.id)
  );

  const attributesList = [
    { label: 'Скорость (PAC)', value: player.attributes.pace, icon: Zap },
    { label: 'Удар (SHO)', value: player.attributes.shooting, icon: Target },
    { label: 'Пас (PAS)', value: player.attributes.passing, icon: Flame },
    { label: 'Дриблинг (DRI)', value: player.attributes.dribbling, icon: Trophy },
    { label: 'Защита (DEF)', value: player.attributes.defending, icon: Shield },
    { label: 'Физика (PHY)', value: player.attributes.physical, icon: Award }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0d1424] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Top Header Background Banner */}
        <div className="relative h-28 sm:h-36 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-4 flex items-end justify-between border-b border-slate-800 shrink-0">
          <div className="absolute inset-0 bg-pitch-grid opacity-30"></div>
          
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center border border-slate-700 transition"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Player Position & Joined info */}
          <div className="relative z-10 flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getPositionBadgeColor(player.positionGroup)}`}>
              {player.position} • {getPositionRussianName(player.positionGroup)}
            </span>
            <span className="text-[11px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
              В лиге с {player.joinedYear}г.
            </span>
          </div>

          <div className={`relative z-10 px-3 py-1.5 rounded-2xl bg-gradient-to-br ${ratingBadgeGradient} font-heading font-black text-xl tracking-tight shadow-xl`}>
            {player.rating} <span className="text-[10px] font-normal uppercase block -mt-1 text-center">Опасно</span>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar">
          
          {/* Main Avatar & Title */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 -mt-10 sm:-mt-12 relative z-10 text-center sm:text-left">
            <img
              src={player.photoUrl}
              alt={player.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-[#0d1424] shadow-xl shrink-0"
            />

            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
                {player.name}
              </h2>
              {player.nickname && (
                <div className="text-sm font-semibold text-emerald-400">
                  «{player.nickname}»
                </div>
              )}
              {player.bio && (
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {player.bio}
                </p>
              )}
            </div>
          </div>

          {/* Stats Bar Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-900/90 rounded-2xl p-3 border border-slate-800">
            <div className="text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-[11px] text-slate-400 font-medium">Сыграно</div>
              <div className="text-lg font-black font-heading text-white mt-0.5">{player.matchesPlayed}</div>
            </div>

            <div className="text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-[11px] text-slate-400 font-medium">Голы + Пасы</div>
              <div className="text-lg font-black font-heading text-emerald-400 mt-0.5">{player.goals} + {player.assists}</div>
            </div>

            <div className="text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-[11px] text-slate-400 font-medium">Процент побед</div>
              <div className="text-lg font-black font-heading text-teal-300 mt-0.5">{winRate}%</div>
            </div>

            <div className="text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-[11px] text-slate-400 font-medium">Наград MVP</div>
              <div className="text-lg font-black font-heading text-amber-400 mt-0.5">{player.mvpCount}</div>
            </div>
          </div>

          {/* Attributes Breakdown Bar Charts */}
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-heading font-bold text-xs text-slate-200 uppercase tracking-wider">
                Футбольные навыки & Атрибуты
              </h3>
              <span className="text-[11px] text-slate-400">Рабочая нога: <strong className="text-emerald-400">{player.favoriteFoot || 'Правая'}</strong></span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {attributesList.map((attr, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <attr.icon className="w-3.5 h-3.5 text-emerald-400" />
                      {attr.label}
                    </span>
                    <span className="text-emerald-400 font-heading font-bold">{attr.value}</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${attr.value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Player Badges */}
          {player.badges && player.badges.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-heading font-bold text-xs text-slate-300 uppercase tracking-wider">
                Достижения & Награды
              </h3>
              <div className="flex flex-wrap gap-2">
                {player.badges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent Match History for this Player */}
          <div className="space-y-3 pt-2">
            <h3 className="font-heading font-bold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Последние игры игрока</span>
            </h3>

            {playerMatches.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-xl text-center">
                Матчи в базе пока не найдены
              </div>
            ) : (
              <div className="space-y-2">
                {playerMatches.slice(0, 4).map((m) => {
                  const isTeamA = m.teamA.playerIds.includes(player.id);
                  const playerTeam = isTeamA ? m.teamA : m.teamB;
                  const opponentTeam = isTeamA ? m.teamB : m.teamA;
                  const isWon = playerTeam.score > opponentTeam.score;
                  const isDraw = playerTeam.score === opponentTeam.score;
                  const isMvp = m.mvpId === player.id;

                  const goalsScored = m.goals.filter(g => g.scorerId === player.id).length;

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${isWon ? 'bg-emerald-400' : isDraw ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
                        <div>
                          <div className="font-semibold text-slate-200">
                            {playerTeam.name} {playerTeam.score} : {opponentTeam.score} {opponentTeam.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {m.date} • {m.location}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {goalsScored > 0 && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                            ⚽ {goalsScored}
                          </span>
                        )}
                        {isMvp && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                            ⭐ MVP
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded font-bold ${isWon ? 'text-emerald-400' : isDraw ? 'text-amber-400' : 'text-rose-400'}`}>
                          {isWon ? 'Победа' : isDraw ? 'Ничья' : 'Поражение'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-right shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
          >
            Закрыть профиль
          </button>
        </div>

      </div>
    </div>
  );
};
