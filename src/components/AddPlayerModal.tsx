import React, { useState } from 'react';
import { Player, PositionCode, PositionGroup } from '../types/football';
import { X, UserPlus } from 'lucide-react';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPlayer: (player: Player) => void;
}

export const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  isOpen,
  onClose,
  onAddPlayer
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [position, setPosition] = useState<PositionCode>('ST');
  const [positionGroup, setPositionGroup] = useState<PositionGroup>('FW');
  const [rating, setRating] = useState(80);
  const [bio, setBio] = useState('');

  const handlePositionChange = (pos: PositionCode) => {
    setPosition(pos);
    if (['ST', 'CF', 'RW', 'LW'].includes(pos)) setPositionGroup('FW');
    else if (['CAM', 'CM', 'CDM', 'RM', 'LM'].includes(pos)) setPositionGroup('MF');
    else if (['CB', 'LB', 'RB'].includes(pos)) setPositionGroup('DF');
    else setPositionGroup('GK');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPlayer: Player = {
      id: `p-${Date.now()}`,
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      photoUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random()*1000)}?w=400&auto=format&fit=crop&q=80`,
      position,
      positionGroup,
      rating: Number(rating),
      matchesPlayed: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      goals: 0,
      assists: 0,
      mvpCount: 0,
      form: ['W'],
      attributes: {
        pace: rating,
        shooting: Math.max(50, rating - 5),
        passing: rating,
        dribbling: rating,
        defending: Math.max(40, rating - 10),
        physical: rating
      },
      bio: bio.trim() || 'Новый игрок лиги Будничного футбола',
      joinedYear: new Date().getFullYear(),
      badges: ['🆕 Дебютант']
    };

    onAddPlayer(newPlayer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0c1222] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
              <UserPlus className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black font-heading text-white">
              Регистрация нового игрока
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
          
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Имя и Фамилия</label>
            <input
              type="text"
              placeholder="Например: Иван Петров"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Прозвище / Никнейм</label>
            <input
              type="text"
              placeholder="Например: Маэстро"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Позиция на поле</label>
              <select
                value={position}
                onChange={(e) => handlePositionChange(e.target.value as PositionCode)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ST">ST — Форвард</option>
                <option value="CAM">CAM — Атакующий ПЗ</option>
                <option value="CM">CM — Центральный ПЗ</option>
                <option value="RW">RW — Правый вингер</option>
                <option value="LW">LW — Левый вингер</option>
                <option value="CB">CB — Центральный защитник</option>
                <option value="LB">LB — Левый защитник</option>
                <option value="RB">RB — Правый защитник</option>
                <option value="GK">GK — Вратарь</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Начальный Рейтинг (MMR)</label>
              <input
                type="number"
                min="50"
                max="99"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Краткое описание / Стиль игры</label>
            <textarea
              rows={2}
              placeholder="Сильные стороны, опыт игры..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black font-heading text-xs shadow-xl shadow-emerald-500/20 transition cursor-pointer"
          >
            ДОБАВИТЬ ИГРОКА В ЛИГУ
          </button>

        </form>

      </div>
    </div>
  );
};
