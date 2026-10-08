import React, { useState } from 'react';
import { Player, Match, GoalEvent } from '../types/football';
import { X, Trophy, Plus, Check } from 'lucide-react';

interface AddMatchModalProps {
  players: Player[];
  isOpen: boolean;
  onClose: () => void;
  onAddMatch: (match: Match) => void;
}

export const AddMatchModal: React.FC<AddMatchModalProps> = ({
  players,
  isOpen,
  onClose,
  onAddMatch
}) => {
  if (!isOpen) return null;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('Манеж "Будничный Арена"');
  const [format, setFormat] = useState<'5x5' | '6x6' | '7x7'>('6x6');
  
  const [teamAName, setTeamAName] = useState('Зеленые Драконы');
  const [teamBName, setTeamBName] = useState('Черные Волки');

  const [teamAScore, setTeamAScore] = useState(7);
  const [teamBScore, setTeamBScore] = useState(5);

  const [teamAPlayerIds, setTeamAPlayerIds] = useState<string[]>(
    players.slice(0, 6).map(p => p.id)
  );
  const [teamBPlayerIds, setTeamBPlayerIds] = useState<string[]>(
    players.slice(6, 12).map(p => p.id)
  );

  const [mvpId, setMvpId] = useState<string>(players[0]?.id || '');
  const [notes, setNotes] = useState('');

  const togglePlayerA = (id: string) => {
    if (teamAPlayerIds.includes(id)) {
      setTeamAPlayerIds(teamAPlayerIds.filter(pId => pId !== id));
    } else {
      setTeamAPlayerIds([...teamAPlayerIds, id]);
      setTeamBPlayerIds(teamBPlayerIds.filter(pId => pId !== id));
    }
  };

  const togglePlayerB = (id: string) => {
    if (teamBPlayerIds.includes(id)) {
      setTeamBPlayerIds(teamBPlayerIds.filter(pId => pId !== id));
    } else {
      setTeamBPlayerIds([...teamBPlayerIds, id]);
      setTeamAPlayerIds(teamAPlayerIds.filter(pId => pId !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-generate goal events for demonstration
    const sampleGoals: GoalEvent[] = [];
    for (let i = 0; i < teamAScore; i++) {
      const scorer = players.find(p => teamAPlayerIds.includes(p.id)) || players[0];
      sampleGoals.push({
        id: `g-a-${i}`,
        minute: (i + 1) * 7,
        scorerId: scorer.id,
        scorerName: scorer.name,
        team: 'A'
      });
    }

    const newMatch: Match = {
      id: `m-${Date.now()}`,
      date,
      time: '20:30',
      location,
      venueId: 'v1',
      format,
      status: 'Completed',
      teamA: {
        name: teamAName,
        color: '#10B981',
        score: Number(teamAScore),
        playerIds: teamAPlayerIds
      },
      teamB: {
        name: teamBName,
        color: '#3B82F6',
        score: Number(teamBScore),
        playerIds: teamBPlayerIds
      },
      goals: sampleGoals,
      mvpId,
      notes
    };

    onAddMatch(newMatch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0c1222] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h2 className="text-base sm:text-lg font-black font-heading text-white">
              Записать результат матча
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar">
          
          {/* General Match Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Дата игры</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Манеж / Поле</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Формат</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="5x5">5x5</option>
                <option value="6x6">6x6</option>
                <option value="7x7">7x7</option>
              </select>
            </div>
          </div>

          {/* Scores input */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 font-heading">Результат встречи</div>
            
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-5 space-y-1">
                <input
                  type="text"
                  value={teamAName}
                  onChange={(e) => setTeamAName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-bold"
                />
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={teamAScore}
                  onChange={(e) => setTeamAScore(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl py-2 text-center text-2xl font-black font-heading text-white"
                />
              </div>

              <div className="col-span-2 text-center text-slate-500 font-bold text-xl">
                VS
              </div>

              <div className="col-span-5 space-y-1">
                <input
                  type="text"
                  value={teamBName}
                  onChange={(e) => setTeamBName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-blue-400 font-bold"
                />
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={teamBScore}
                  onChange={(e) => setTeamBScore(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-blue-500/40 rounded-xl py-2 text-center text-2xl font-black font-heading text-white"
                />
              </div>
            </div>
          </div>

          {/* Teams Roster Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Team A Roster */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-emerald-400 block">
                Состав Команды А ({teamAPlayerIds.length} чел.)
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-900/60 p-2 rounded-xl border border-slate-800 custom-scrollbar">
                {players.map(p => {
                  const inA = teamAPlayerIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlayerA(p.id)}
                      className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs font-semibold text-left transition ${
                        inA ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{p.name} ({p.position})</span>
                      {inA && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Team B Roster */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-400 block">
                Состав Команды Б ({teamBPlayerIds.length} чел.)
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-900/60 p-2 rounded-xl border border-slate-800 custom-scrollbar">
                {players.map(p => {
                  const inB = teamBPlayerIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlayerB(p.id)}
                      className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs font-semibold text-left transition ${
                        inB ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{p.name} ({p.position})</span>
                      {inB && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* MVP Selector */}
          <div>
            <label className="text-[11px] font-semibold text-amber-400 flex items-center gap-1 mb-1">
              <Trophy className="w-3.5 h-3.5" />
              <span>Игрок матча (MVP)</span>
            </label>
            <select
              value={mvpId}
              onChange={(e) => setMvpId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              {players.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  {p.name} ({p.position}) — MMR {p.rating}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Комментарий к матчу</label>
            <input
              type="text"
              placeholder="Например: Перестрелка на последних минутах, эпический камбэк!"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black font-heading text-sm shadow-xl shadow-emerald-500/20 transition active:scale-98 cursor-pointer"
          >
            СОХРАНИТЬ ПРОТОКОЛ МАТЧА
          </button>

        </form>

      </div>
    </div>
  );
};
