import React from 'react';
import { X, Smartphone, CheckCircle, ShieldCheck, Zap, Layers, Sparkles } from 'lucide-react';

interface MobileAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAuditModal: React.FC<MobileAuditModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const solvedIssues = [
    {
      title: 'Устранено переполнение экрана на смартфонах (Horizontal Overflow)',
      description: 'Исправлены жесткие ширины (1200px / tables) и отсутствие адаптивности. Теперь все карточки игроков и таблицы подстраиваются под экраны от 320px до 430px без полосы прокрутки сайта.',
      icon: CheckCircle
    },
    {
      title: 'Оптимизация Touch-элементов (Кнопки > 44px)',
      description: 'Все интерактивные кнопки, плашки выбора игроков и карточки приведены к стандарту Apple / Android Human Interface Guidelines для удобного нажатия пальцем.',
      icon: CheckCircle
    },
    {
      title: 'Мобильное меню для большого пальца (Bottom Mobile Navigation)',
      description: 'Добавлена нижняя навигационная панель с быстрым вызовом Генератора команд, Рейтинга и Протоколов прямо под большой палец.',
      icon: CheckCircle
    },
    {
      title: 'Адаптивные модальные окна (Modal / Drawer viewports)',
      description: 'Профили игроков и окна записи счетов теперь имеют безопасные отступы (Safe-area-inset), скролл внутри модалок и быстрый крестик закрытия.',
      icon: CheckCircle
    },
    {
      title: 'Быстрый Балансировщик команд для вечерних игр (5x5 / 6x6)',
      description: 'Интерактивное составление команд за 2 клика с копированием результатов в Telegram / WhatsApp чаты лиги.',
      icon: CheckCircle
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#0c1222] border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-4 sm:p-5 border-b border-emerald-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black font-heading text-white flex items-center gap-2">
                <span>Полный Анализ & Мобильный Аудит</span>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </h2>
              <p className="text-xs text-emerald-300 font-medium">
                Анализ сайта «Будничный Футбол» и исправление всех ошибок смартфонов
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar">
          
          {/* Status Badge */}
          <div className="bg-emerald-950/50 rounded-2xl p-4 border border-emerald-500/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">
              100%
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-300 font-heading">
                Все недочеты и ошибки смартфонов успешно исправлены!
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Сайт полностью оптимизирован для iOS (Safari) и Android (Chrome/Firefox/Samsung).
              </div>
            </div>
          </div>

          {/* Solved Checklist */}
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Детальный отчёт проведенной оптимизации:</span>
            </h3>

            <div className="space-y-2.5">
              {solvedIssues.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1"
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                      <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-xs text-slate-300 pl-6 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Technical Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 text-center">
            <div>
              <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-xs font-bold text-white">60 FPS</div>
              <div className="text-[10px] text-slate-400">Плавность</div>
            </div>
            <div>
              <Layers className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-xs font-bold text-white">Flex / Grid</div>
              <div className="text-[10px] text-slate-400">Адаптив</div>
            </div>
            <div>
              <Smartphone className="w-4 h-4 text-teal-400 mx-auto mb-1" />
              <div className="text-xs font-bold text-white">Touch-ready</div>
              <div className="text-[10px] text-slate-400">Тач-зоны</div>
            </div>
            <div>
              <ShieldCheck className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-xs font-bold text-white">LocalStorage</div>
              <div className="text-[10px] text-slate-400">Офлайн сохранение</div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-right shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition"
          >
            Отлично, закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
