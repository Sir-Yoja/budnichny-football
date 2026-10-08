import React from 'react';
import { Player } from '../types/football';
import { getPositionBadgeColor, getWinRate, getRatingColor } from '../utils/footballHelpers';
import { Trophy, Flame, Target, Award } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  rank: number;
  onSelectPlayer: (player: Player) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, rank, onSelectPlayer }) => {
  const winRate = getWinRate(player);
  const ratingBadgeGradient = getRatingColor(player.rating);

  return (
    <div
      onClick={() => onSelectPlayer(player)}
      className="group glass-card hover:bg-slate-800/80 rounded-2xl p-4 transition-all duration-200 border border-slate-800 hover:border-emerald-500/40 cursor-pointer relative overflow-hidden active:scale-[0.99] no-select"
    >
      {/* Rank indicator top corner */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-lg text-[11px] font-black font-heading flex items-center justify-center ${
            rank === 1 ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20' :
            rank === 2 ? 'bg-slate-300 text-slate-950' :
            rank === 3 ? 'bg-amber-700 text-white' :
            'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            #{rank}
          </span>

          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getPositionBadgeColor(player.positionGroup)}`}>
            {player.position}
          </span>
        </div>

        {/* Overall Rating Badge */}
        <div className={`px-2.5 py-1 rounded-xl bg-gradient-to-br ${ratingBadgeGradient} font-heading font-black text-sm tracking-tight shadow-md`}>
          {player.rating}
        </div>
      </div>

      {/* Main Info Header */}
      <div className="flex items-center gap-3.5 mb-3">
        <div className="relative shrink-0">
          <img
            src={player.photoUrl}
            alt={player.name}
            className="w-12 h-12 rounded-xl object-cover border border-slate-700 group-hover:border-emerald-500/50 transition"
            loading="lazy"
          />
          {player.mvpCount > 5 && (
            <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow">
              <Trophy className="w-3 h-3 fill-slate-950" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-heading font-bold text-sm text-slate-100 group-hover:text-emerald-400 transition truncate">
              {player.name}
            </h3>
          </div>
          {player.nickname && (
            <p className="text-xs text-emerald-400 font-medium truncate">
              «{player.nickname}»
            </p>
          )}
          <p className="text-[11px] text-slate-400 font-medium">
            {player.matchesPlayed} матчей • {winRate}% побед
          </p>
        </div>
      </div>

      {/* Key Stats Bar */}
      <div className="grid grid-cols-4 gap-1.5 bg-slate-900/90 rounded-xl p-2 text-center border border-slate-800/80 mb-3">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
            <Target className="w-2.5 h-2.5 text-rose-400" /> Голы
          </span>
          <span className="text-xs font-bold text-white mt-0.5">{player.goals}</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
            <Flame className="w-2.5 h-2.5 text-amber-400" /> Пас
          </span>
          <span className="text-xs font-bold text-white mt-0.5">{player.assists}</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
            <Award className="w-2.5 h-2.5 text-emerald-400" /> Г+П
          </span>
          <span className="text-xs font-bold text-emerald-400 mt-0.5">{player.goals + player.assists}</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
            <Trophy className="w-2.5 h-2.5 text-amber-300" /> MVP
          </span>
          <span className="text-xs font-bold text-amber-300 mt-0.5">{player.mvpCount}</span>
        </div>
      </div>

      {/* Last 5 Form Badges */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
        <span className="text-slate-500 font-medium">Форма (5)</span>
        <div className="flex items-center gap-1">
          {player.form.map((res, i) => (
            <span
              key={i}
              className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${
                res === 'W'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : res === 'D'
                  ? 'bg-slate-600/20 text-slate-300 border border-slate-600/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
            >
              {res === 'W' ? 'В' : res === 'D' ? 'Н' : 'П'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
