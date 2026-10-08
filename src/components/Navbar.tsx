import React, { useState } from 'react';
import { Trophy, Users, Calendar, Shuffle, BarChart3, ShieldCheck, PlusCircle, Search, Menu, X, Smartphone } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenTeamGenerator: () => void;
  onOpenAddMatch: () => void;
  onOpenMobileAudit: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onOpenTeamGenerator,
  onOpenAddMatch,
  onOpenMobileAudit
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const navItems = [
    { id: 'players', label: 'Игроки & Рейтинг', icon: Users },
    { id: 'matches', label: 'Матчи & Календарь', icon: Calendar },
    { id: 'generator', label: 'Балансир Составов', icon: Shuffle },
    { id: 'stats', label: 'Статистика & Рекорды', icon: BarChart3 },
    { id: 'rules', label: 'Правила & Манежи', icon: ShieldCheck }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 transition-all">
      {/* Top Banner Tagline */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 border-b border-emerald-500/20 py-1.5 px-3 text-xs text-emerald-300 flex items-center justify-between font-medium">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span className="truncate font-heading tracking-wide">
            БУДНИЧНЫЙ ФУТБОЛ: <span className="text-slate-200 font-normal">«Не важно, какой уровень. Главное — чтобы соперник был хуже.»</span>
          </span>
        </div>

        <button
          onClick={onOpenMobileAudit}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 text-[11px] font-semibold transition shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Анализ & Мобильный статус</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('players')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 font-black shadow-lg shadow-emerald-500/20 border border-emerald-300/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
                БУДНИЧНЫЙ ФУТБОЛ
              </span>
              <p className="text-[10px] text-slate-400 font-medium -mt-1 hidden sm:block">
                Любительская лига вечернего футбола
              </p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'generator') {
                      onOpenTeamGenerator();
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Actions & Search */}
          <div className="flex items-center gap-2">
            {/* Quick Mobile Search Button Toggle */}
            <div className="relative">
              {searchOpen ? (
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 w-48 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Поиск игрока..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                  />
                  <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition"
                  title="Поиск"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Team Generator Shortcut */}
            <button
              onClick={onOpenTeamGenerator}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 hover:opacity-95 transition"
            >
              <Shuffle className="w-4 h-4" />
              <span>Составить составы</span>
            </button>

            {/* Add Match Shortcut */}
            <button
              onClick={onOpenAddMatch}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
              title="Записать матч"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Записать счет</span>
            </button>

            {/* Mobile Burger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700 transition"
              aria-label="Открыть меню"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-[#0c1220] px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top duration-200">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Навигация по сайту</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'generator') {
                    onOpenTeamGenerator();
                  } else {
                    setActiveTab(item.id);
                  }
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-900/50 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                <span className="text-slate-600 text-xs">→</span>
              </button>
            );
          })}

          <div className="pt-2 border-t border-slate-800 flex gap-2">
            <button
              onClick={() => {
                onOpenMobileAudit();
                setMobileMenuOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 text-emerald-400 text-xs font-semibold border border-slate-700"
            >
              <Smartphone className="w-4 h-4" />
              <span>Анализ мобильных ошибок</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
