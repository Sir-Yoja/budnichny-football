import React, { useState } from 'react';
import { Player } from '../types/football';
import { generateBalancedTeams, BalancedTeam } from '../utils/footballHelpers';
import { Shuffle, Check, Copy, CheckCircle2, X, Users, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TeamGeneratorModalProps {
  players: Player[];
  isOpen: boolean;
  onClose: () => void;
}

export const TeamGeneratorModal: React.FC<TeamGeneratorModalProps> = ({
  players,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(
    players.slice(0, 12).map(p => p.id) // Default first 12 attending
  );
  const [numTeams, setNumTeams] = useState<2 | 3 | 4>(2);
  const [generatedTeams, setGeneratedTeams] = useState<BalancedTeam[] | null>(null);
  const [copied, setCopied] = useState(false);

  const togglePlayer = (id: string) => {
    if (selectedPlayerIds.includes(id)) {
      setSelectedPlayerIds(selectedPlayerIds.filter(pId => pId !== id));
    } else {
      setSelectedPlayerIds([...selectedPlayerIds, id]);
    }
  };

  const handleSelectAll = () => {
    setSelectedPlayerIds(players.map(p => p.id));
  };

  const handleClearAll = () => {
    setSelectedPlayerIds([]);
  };

  const handleGenerate = () => {
    const attending = players.filter(p => selectedPlayerIds.includes(p.id));
    if (attending.length < numTeams) return;

    const result = generateBalancedTeams(attending, numTeams);
    setGeneratedTeams(result);

    // Confetti burst
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  const handleCopyTeamsText = () => {
    if (!generatedTeams) return;

    let text = `⚽ *БУДНИЧНЫЙ ФУТБОЛ — СОСТАВЫ НА СЕГОДНЯ*\n\n`;
    generatedTeams.forEach((t) => {
      text += `*${t.name}* (Ср. рейтинг: ${t.avgRating}):\n`;
      t.players.forEach((p, idx) => {
        text += `${idx + 1}. ${p.name} (${p.position}) - MMR ${p.rating}\n`;
      });
      text += `\n`;
    });
    text += `🔥 Всем удачи и честной игры!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const attendingPlayers = players.filter(p => selectedPlayerIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0c1222] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Shuffle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black font-heading text-white flex items-center gap-2">
                <span>Балансировщик Составов</span>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </h2>
              <p className="text-xs text-slate-400">
                Автоматическое распределение игроков по силе (MMR) и позициям
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center border border-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar">
          
          {/* Step 1: Select Attending Players */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="font-heading font-bold text-xs text-slate-200 uppercase tracking-wider">
                  1. Отметьте явившихся игроков ({selectedPlayerIds.length} из {players.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-[11px] text-emerald-400 hover:underline font-medium"
                >
                  Выбрать всех
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={handleClearAll}
                  className="text-[11px] text-slate-400 hover:underline font-medium"
                >
                  Сбросить
                </button>
              </div>
            </div>

            {/* Players Grid Toggle Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1 custom-scrollbar">
              {players.map((p) => {
                const isSelected = selectedPlayerIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlayer(p.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-left border transition active:scale-95 no-select ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center text-xs shrink-0 ${
                        isSelected ? 'bg-emerald-400 text-slate-950 font-bold' : 'border border-slate-700'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {p.position} • {p.rating} MMR
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Choose Number of Teams & Generate */}
          <div className="space-y-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-bold text-xs text-slate-200 uppercase tracking-wider">
                  2. На сколько команд делимся?
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Рекомендуемый формат: 2 команды по 5-7 человек
                </p>
              </div>

              <div className="flex items-center gap-2">
                {[2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setNumTeams(num as 2 | 3 | 4)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      numTeams === num
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {num} Команды
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={attendingPlayers.length < numTeams}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black font-heading text-sm shadow-xl shadow-emerald-500/20 transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shuffle className="w-5 h-5 stroke-[2.5]" />
              <span>СБАЛАНСИРОВАТЬ СОСТАВЫ РАВНОМЕРНО</span>
            </button>
          </div>

          {/* Step 3: Generated Teams Display */}
          {generatedTeams && (
            <div className="space-y-4 pt-2 border-t border-slate-800 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-sm text-emerald-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Результат Балансировки</span>
                </h3>

                <button
                  onClick={handleCopyTeamsText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Скопировано!' : 'Скопировать в чат'}</span>
                </button>
              </div>

              {/* Grid of Teams */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedTeams.map((team) => (
                  <div
                    key={team.id}
                    className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3 relative overflow-hidden"
                  >
                    {/* Team Header */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full shadow-sm"
                          style={{ backgroundColor: team.color }}
                        ></div>
                        <h4 className="font-heading font-bold text-sm text-white">
                          {team.name}
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 font-heading">
                          Ср. MMR {team.avgRating}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          Всего {team.players.length} игp.
                        </div>
                      </div>
                    </div>

                    {/* Team Roster List */}
                    <div className="space-y-1.5">
                      {team.players.map((p, pIdx) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] text-slate-500 font-bold w-4">
                              {pIdx + 1}.
                            </span>
                            <img
                              src={p.photoUrl}
                              alt={p.name}
                              className="w-6 h-6 rounded-md object-cover border border-slate-700"
                            />
                            <span className="font-semibold text-slate-200">{p.name}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                              {p.position}
                            </span>
                            <span className="text-xs font-bold text-emerald-400 font-heading">
                              {p.rating}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-right shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
