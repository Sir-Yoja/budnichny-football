import React, { useState, useMemo } from 'react';
import { Player, PositionGroup } from '../types/football';
import { PlayerCard } from './PlayerCard';
import { Search, Trophy, ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import { getPositionBadgeColor, getWinRate, getRatingColor } from '../utils/footballHelpers';

interface PlayerLeaderboardProps {
  players: Player[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectPlayer: (player: Player) => void;
  onOpenAddPlayer: () => void;
}

type SortField = 'rating' | 'goals' | 'assists' | 'winRate' | 'matchesPlayed' | 'mvpCount';

export const PlayerLeaderboard: React.FC<PlayerLeaderboardProps> = ({
  players,
  searchQuery,
  setSearchQuery,
  onSelectPlayer,
  onOpenAddPlayer
}) => {
  const [selectedGroup, setSelectedGroup] = useState<PositionGroup | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const filteredAndSortedPlayers = useMemo(() => {
    return players
      .filter((p) => {
        const matchesPosition = selectedGroup === 'ALL' || p.positionGroup === selectedGroup;
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.nickname && p.nickname.toLowerCase().includes(searchQuery.toLowerCase())) ||
          p.position.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesPosition && matchesSearch;
      })
      .sort((a, b) => {
        if (sortField === 'rating') return b.rating - a.rating;
        if (sortField === 'goals') return b.goals - a.goals;
        if (sortField === 'assists') return b.assists - a.assists;
        if (sortField === 'winRate') return getWinRate(b) - getWinRate(a);
        if (sortField === 'matchesPlayed') return b.matchesPlayed - a.matchesPlayed;
        if (sortField === 'mvpCount') return b.mvpCount - a.mvpCount;
        return 0;
      });
  }, [players, selectedGroup, searchQuery, sortField]);

  const positionTabs: { id: PositionGroup | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'Все игроки' },
    { id: 'FW', label: 'Нападающие' },
    { id: 'MF', label: 'Полузащитники' },
    { id: 'DF', label: 'Защитники' },
    { id: 'GK', label: 'Вратари' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>Общий Рейтинг Игроков</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Нажмите на игрока, чтобы открыть детальную статистику и карточку
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={onOpenAddPlayer}
          className="self-start md:self-auto px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-2"
        >
          <span>+ Добавить нового игрока</span>
        </button>
      </div>

      {/* Filter Tabs & Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Position Filter Pills (Scrollable on small mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          {positionTabs.map((tab) => {
            const isActive = selectedGroup === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedGroup(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-extrabold'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sorting Dropdown & View Mode Switcher */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          
          <div className="relative flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-400 hidden sm:inline">Сортировка:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-2"
            >
              <option value="rating" className="bg-slate-900 text-slate-200">Рейтинг (MMR)</option>
              <option value="goals" className="bg-slate-900 text-slate-200">Голы (⚽)</option>
              <option value="assists" className="bg-slate-900 text-slate-200">Голевые пасы (🅰️)</option>
              <option value="winRate" className="bg-slate-900 text-slate-200">Процент побед (%)</option>
              <option value="mvpCount" className="bg-slate-900 text-slate-200">Награды MVP (⭐)</option>
              <option value="matchesPlayed" className="bg-slate-900 text-slate-200">Матчи</option>
            </select>
          </div>

          {/* Toggle View Mode */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Сетка карточек"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Таблица"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Search Bar info if filtering */}
      {searchQuery && (
        <div className="flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-300">
            Результаты поиска по запросу «<strong className="text-emerald-400">{searchQuery}</strong>»: {filteredAndSortedPlayers.length} чел.
          </span>
          <button onClick={() => setSearchQuery('')} className="text-emerald-400 hover:underline">
            Сбросить
          </button>
        </div>
      )}

      {/* Content Rendering: Grid vs Responsive Mobile Table */}
      {filteredAndSortedPlayers.length === 0 ? (
        <div className="text-center py-12 glass-panel rounded-3xl space-y-3">
          <Search className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300 font-heading">Игроки не найдены</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Попробуйте изменить поисковый запрос или выбрать другую позицию.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedPlayers.map((player, idx) => (
            <PlayerCard
              key={player.id}
              player={player}
              rank={idx + 1}
              onSelectPlayer={onSelectPlayer}
            />
          ))}
        </div>
      ) : (
        /* Mobile-Optimized Responsive Table */
        <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-full">
              <thead>
                <tr className="bg-slate-900/90 text-[11px] font-bold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  <th className="py-3 px-4 text-center w-12">#</th>
                  <th className="py-3 px-4">Игрок</th>
                  <th className="py-3 px-3 text-center">Поз.</th>
                  <th className="py-3 px-3 text-center">MMR</th>
                  <th className="py-3 px-3 text-center">Игры</th>
                  <th className="py-3 px-3 text-center">Голы</th>
                  <th className="py-3 px-3 text-center">Пасы</th>
                  <th className="py-3 px-3 text-center">Победы %</th>
                  <th className="py-3 px-3 text-center">MVP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredAndSortedPlayers.map((player, idx) => {
                  const winRate = getWinRate(player);
                  const badgeGrad = getRatingColor(player.rating);
                  return (
                    <tr
                      key={player.id}
                      onClick={() => onSelectPlayer(player)}
                      className="hover:bg-slate-800/60 transition cursor-pointer"
                    >
                      <td className="py-3 px-4 text-center font-heading font-black text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={player.photoUrl}
                            alt={player.name}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white hover:text-emerald-400 transition">
                              {player.name}
                            </div>
                            {player.nickname && (
                              <div className="text-[10px] text-emerald-400 font-medium">
                                «{player.nickname}»
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPositionBadgeColor(player.positionGroup)}`}>
                          {player.position}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-lg bg-gradient-to-br ${badgeGrad} font-heading font-black text-xs`}>
                          {player.rating}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-semibold text-slate-300">
                        {player.matchesPlayed}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-rose-400">
                        {player.goals}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-amber-400">
                        {player.assists}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-teal-300">
                        {winRate}%
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-amber-300">
                        {player.mvpCount > 0 ? `⭐ ${player.mvpCount}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
