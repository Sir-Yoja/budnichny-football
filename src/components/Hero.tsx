import React from 'react';
import { Shuffle, Trophy, Flame, Play, ShieldAlert, Sparkles } from 'lucide-react';
import { LeagueSummary } from '../types/football';

interface HeroProps {
  summary: LeagueSummary;
  onOpenTeamGenerator: () => void;
  onOpenAddMatch: () => void;
  setActiveTab: (tab: string) => void;
  onOpenMobileAudit: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  summary,
  onOpenTeamGenerator,
  onOpenAddMatch,
  setActiveTab,
  onOpenMobileAudit
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-slate-900/90 via-[#0a101f] to-[#090d16] border-b border-slate-800/80 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-10 w-[300px] h-[200px] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Main Info */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Официальный портал будничного футбола</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-heading text-white tracking-tight leading-[1.15]">
              БУДНИЧНЫЙ <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
                ФУТБОЛ
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 font-medium italic max-w-xl mx-auto lg:mx-0 border-l-2 border-emerald-500/60 pl-3 py-1 bg-emerald-950/20 rounded-r-lg">
              «Не важно, какой уровень. Главное — чтобы соперник был хуже.»
            </p>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Общий рейтинг игроков, история матчей, автобалансировщик команд для вечерних тусовок 5x5 и 7x7, подробная статистика и фотогалерея.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                onClick={onOpenTeamGenerator}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition active:scale-95 cursor-pointer"
              >
                <Shuffle className="w-4 h-4 stroke-[2.5]" />
                <span>Составить составы на сегодня</span>
              </button>

              <button
                onClick={() => setActiveTab('players')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-white font-semibold text-sm border border-slate-700 transition active:scale-95 cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span>Рейтинг игроков</span>
              </button>

              <button
                onClick={onOpenAddMatch}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 font-semibold text-sm border border-emerald-500/30 transition active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                <span>Записать результат</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="lg:col-span-5">
            <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <span className="font-heading text-xs font-bold uppercase tracking-wider text-slate-200">
                    Статистика Сезона
                  </span>
                </div>

                <button
                  onClick={onOpenMobileAudit}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Аудит моб. версии</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800 text-center sm:text-left">
                  <div className="text-2xl sm:text-3xl font-black font-heading text-white">
                    {summary.totalMatches}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">Сыграно матчей</div>
                </div>

                <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800 text-center sm:text-left">
                  <div className="text-2xl sm:text-3xl font-black font-heading text-emerald-400">
                    {summary.activePlayers}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">Игроков в обойме</div>
                </div>

                <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800 text-center sm:text-left">
                  <div className="text-2xl sm:text-3xl font-black font-heading text-amber-400">
                    {summary.totalGoals}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">Забито голов</div>
                </div>

                <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800 text-center sm:text-left">
                  <div className="text-2xl sm:text-3xl font-black font-heading text-teal-400">
                    {summary.averageGoalsPerMatch}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">Голов за игру</div>
                </div>
              </div>

              {/* Next Match Banner */}
              <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 rounded-2xl p-3 border border-emerald-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
                  <div>
                    <div className="font-bold text-slate-200">Ближайший вечерний сбор</div>
                    <div className="text-slate-400 text-[11px]">Вторник, 20:30 • Манеж "Будничный"</div>
                  </div>
                </div>
                <button
                  onClick={onOpenTeamGenerator}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] transition shrink-0"
                >
                  Записаться
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
