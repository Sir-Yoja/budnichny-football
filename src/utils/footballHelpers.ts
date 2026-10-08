import { Player, PositionGroup } from '../types/football';

/**
 * Calculates Win Rate percentage
 */
export function getWinRate(player: Player): number {
  if (player.matchesPlayed === 0) return 0;
  return Math.round((player.wins / player.matchesPlayed) * 100);
}

/**
 * Returns position badge color class
 */
export function getPositionBadgeColor(group: PositionGroup): string {
  switch (group) {
    case 'FW':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    case 'MF':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'DF':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'GK':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    default:
      return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
}

export function getPositionRussianName(group: PositionGroup): string {
  switch (group) {
    case 'FW': return 'Нападающий';
    case 'MF': return 'Полузащитник';
    case 'DF': return 'Защитник';
    case 'GK': return 'Вратарь';
  }
}

/**
 * Rating color badge
 */
export function getRatingColor(rating: number): string {
  if (rating >= 88) return 'from-amber-400 to-yellow-600 text-slate-950 shadow-yellow-500/20';
  if (rating >= 83) return 'from-emerald-400 to-teal-600 text-slate-950 shadow-emerald-500/20';
  if (rating >= 78) return 'from-blue-400 to-indigo-600 text-white shadow-blue-500/20';
  return 'from-slate-400 to-slate-600 text-white shadow-slate-500/20';
}

/**
 * Smart Team Balancing Algorithm (Snake Draft / MMR Greedy Balance)
 */
export interface BalancedTeam {
  id: number;
  name: string;
  color: string;
  players: Player[];
  totalRating: number;
  avgRating: number;
  goalkeepersCount: number;
  attackersCount: number;
  defendersCount: number;
}

export function generateBalancedTeams(
  attendingPlayers: Player[],
  numTeams: 2 | 3 | 4 = 2
): BalancedTeam[] {
  if (attendingPlayers.length < numTeams) return [];

  // Sort players by Rating descending
  const sorted = [...attendingPlayers].sort((a, b) => b.rating - a.rating);

  const teamColors = [
    { name: 'Зеленые Драконы', color: '#10B981' },
    { name: 'Синие Молнии', color: '#3B82F6' },
    { name: 'Красные Дьяволы', color: '#EF4444' },
    { name: 'Белые Барсы', color: '#E2E8F0' }
  ];

  const teams: BalancedTeam[] = Array.from({ length: numTeams }, (_, i) => ({
    id: i + 1,
    name: teamColors[i].name,
    color: teamColors[i].color,
    players: [],
    totalRating: 0,
    avgRating: 0,
    goalkeepersCount: 0,
    attackersCount: 0,
    defendersCount: 0
  }));

  // Separate Goalkeepers first if any to distribute evenly
  const goalkeepers = sorted.filter(p => p.positionGroup === 'GK');
  const outfield = sorted.filter(p => p.positionGroup !== 'GK');

  // Distribute GKs
  goalkeepers.forEach((gk, idx) => {
    const targetTeam = teams[idx % numTeams];
    targetTeam.players.push(gk);
    targetTeam.totalRating += gk.rating;
    targetTeam.goalkeepersCount += 1;
  });

  // Greedy distribution for outfield players to balance overall MMR
  outfield.forEach((player) => {
    let lowestTeam = teams[0];
    for (let t of teams) {
      if (t.totalRating < lowestTeam.totalRating) {
        lowestTeam = t;
      }
    }

    lowestTeam.players.push(player);
    lowestTeam.totalRating += player.rating;

    if (player.positionGroup === 'FW') lowestTeam.attackersCount += 1;
    if (player.positionGroup === 'DF') lowestTeam.defendersCount += 1;
  });

  // Calculate averages
  teams.forEach(t => {
    t.avgRating = t.players.length > 0 ? Number((t.totalRating / t.players.length).toFixed(1)) : 0;
  });

  return teams;
}
