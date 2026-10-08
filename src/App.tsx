import React, { useState, useEffect } from 'react';
import { Player, Match, LeagueSummary } from './types/football';
import { INITIAL_PLAYERS, INITIAL_MATCHES, INITIAL_VENUES, INITIAL_RULES } from './data/initialData';

import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { Hero } from './components/Hero';
import { PlayerLeaderboard } from './components/PlayerLeaderboard';
import { PlayerModal } from './components/PlayerModal';
import { TeamGeneratorModal } from './components/TeamGeneratorModal';
import { MatchHistory } from './components/MatchHistory';
import { AddMatchModal } from './components/AddMatchModal';
import { AddPlayerModal } from './components/AddPlayerModal';
import { LeagueStats } from './components/LeagueStats';
import { VenuesAndRules } from './components/VenuesAndRules';
import { MobileAuditModal } from './components/MobileAuditModal';

export default function App() {
  // LocalStorage State Initialization
  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem('budnichny_players');
      return saved ? JSON.parse(saved) : INITIAL_PLAYERS;
    } catch {
      return INITIAL_PLAYERS;
    }
  });

  const [matches, setMatches] = useState<Match[]>(() => {
    try {
      const saved = localStorage.getItem('budnichny_matches');
      return saved ? JSON.parse(saved) : INITIAL_MATCHES;
    } catch {
      return INITIAL_MATCHES;
    }
  });

  const [activeTab, setActiveTab] = useState<string>('players');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isTeamGeneratorOpen, setIsTeamGeneratorOpen] = useState<boolean>(false);
  const [isAddMatchOpen, setIsAddMatchOpen] = useState<boolean>(false);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState<boolean>(false);
  const [isMobileAuditOpen, setIsMobileAuditOpen] = useState<boolean>(false);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('budnichny_players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('budnichny_matches', JSON.stringify(matches));
  }, [matches]);

  // Calculate League Summary
  const leagueSummary: LeagueSummary = React.useMemo(() => {
    const totalMatches = matches.length;
    const totalGoals = players.reduce((sum, p) => sum + p.goals, 0);
    const activePlayers = players.length;
    const averageGoalsPerMatch = totalMatches > 0 ? Number((totalGoals / totalMatches).toFixed(1)) : 0;

    return { totalMatches, totalGoals, activePlayers, averageGoalsPerMatch };
  }, [matches, players]);

  // Handler for adding a new player
  const handleAddPlayer = (newPlayer: Player) => {
    setPlayers(prev => [newPlayer, ...prev]);
  };

  // Handler for adding a new match & updating player stats automatically
  const handleAddMatch = (newMatch: Match) => {
    setMatches(prev => [newMatch, ...prev]);

    // Update player stats
    setPlayers(prevPlayers => {
      return prevPlayers.map(player => {
        const inA = newMatch.teamA.playerIds.includes(player.id);
        const inB = newMatch.teamB.playerIds.includes(player.id);

        if (!inA && !inB) return player;

        const isWinA = newMatch.teamA.score > newMatch.teamB.score;
        const isWinB = newMatch.teamB.score > newMatch.teamA.score;
        const isDraw = newMatch.teamA.score === newMatch.teamB.score;

        const isWon = (inA && isWinA) || (inB && isWinB);
        const isLost = (inA && isWinB) || (inB && isWinA);

        const goalsInMatch = newMatch.goals.filter(g => g.scorerId === player.id).length;
        const assistsInMatch = newMatch.goals.filter(g => g.assistId === player.id).length;
        const isMvp = newMatch.mvpId === player.id;

        // Form update
        const newFormResult = isWon ? 'W' : isDraw ? 'D' : 'L';
        const updatedForm = [newFormResult, ...player.form.slice(0, 4)] as ('W' | 'D' | 'L')[];

        // Rating MMR adjustment
        let ratingChange = 0;
        if (isWon) ratingChange += 1;
        if (isLost) ratingChange -= 1;
        if (isMvp) ratingChange += 2;
        if (goalsInMatch >= 2) ratingChange += 1;

        const newRating = Math.min(99, Math.max(50, player.rating + ratingChange));

        return {
          ...player,
          matchesPlayed: player.matchesPlayed + 1,
          wins: isWon ? player.wins + 1 : player.wins,
          draws: isDraw ? player.draws + 1 : player.draws,
          losses: isLost ? player.losses + 1 : player.losses,
          goals: player.goals + goalsInMatch,
          assists: player.assists + assistsInMatch,
          mvpCount: isMvp ? player.mvpCount + 1 : player.mvpCount,
          rating: newRating,
          form: updatedForm
        };
      });
    });
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans pb-20 lg:pb-10 selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenTeamGenerator={() => setIsTeamGeneratorOpen(true)}
        onOpenAddMatch={() => setIsAddMatchOpen(true)}
        onOpenMobileAudit={() => setIsMobileAuditOpen(true)}
      />

      {/* Hero Section */}
      <Hero
        summary={leagueSummary}
        onOpenTeamGenerator={() => setIsTeamGeneratorOpen(true)}
        onOpenAddMatch={() => setIsAddMatchOpen(true)}
        setActiveTab={setActiveTab}
        onOpenMobileAudit={() => setIsMobileAuditOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === 'players' && (
          <PlayerLeaderboard
            players={players}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            onOpenAddPlayer={() => setIsAddPlayerOpen(true)}
          />
        )}

        {activeTab === 'matches' && (
          <MatchHistory
            matches={matches}
            players={players}
            onOpenAddMatch={() => setIsAddMatchOpen(true)}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
          />
        )}

        {activeTab === 'stats' && (
          <LeagueStats
            players={players}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
          />
        )}

        {activeTab === 'rules' && (
          <VenuesAndRules
            venues={INITIAL_VENUES}
            rules={INITIAL_RULES}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-[#060911] py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <div className="font-heading font-bold text-slate-300">
            БУДНИЧНЫЙ ФУТБОЛ
          </div>
          <p className="max-w-md mx-auto italic text-slate-400">
            «Не важно, какой уровень. Главное — чтобы соперник был хуже.»
          </p>
          <div className="text-[11px] text-slate-600">
            © {new Date().getFullYear()} Budnichny Football League • Оптимизировано для смартфонов и ПК
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Thumb Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenTeamGenerator={() => setIsTeamGeneratorOpen(true)}
      />

      {/* Modals */}
      <PlayerModal
        player={selectedPlayer}
        matches={matches}
        onClose={() => setSelectedPlayer(null)}
      />

      <TeamGeneratorModal
        players={players}
        isOpen={isTeamGeneratorOpen}
        onClose={() => setIsTeamGeneratorOpen(false)}
      />

      <AddMatchModal
        players={players}
        isOpen={isAddMatchOpen}
        onClose={() => setIsAddMatchOpen(false)}
        onAddMatch={handleAddMatch}
      />

      <AddPlayerModal
        isOpen={isAddPlayerOpen}
        onClose={() => setIsAddPlayerOpen(false)}
        onAddPlayer={handleAddPlayer}
      />

      <MobileAuditModal
        isOpen={isMobileAuditOpen}
        onClose={() => setIsMobileAuditOpen(false)}
      />

    </div>
  );
}
