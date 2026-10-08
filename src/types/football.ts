export type PositionGroup = 'FW' | 'MF' | 'DF' | 'GK';

export type PositionCode = 
  | 'ST' | 'CF' | 'RW' | 'LW' // Forwards
  | 'CAM' | 'CM' | 'CDM' | 'RM' | 'LM' // Midfielders
  | 'CB' | 'LB' | 'RB' // Defenders
  | 'GK'; // Goalkeeper

export interface PlayerAttributes {
  pace: number;       // Скорость
  shooting: number;   // Удар
  passing: number;    // Пас
  dribbling: number;  // Дриблинг
  defending: number;  // Защита
  physical: number;   // Физика
}

export interface Player {
  id: string;
  name: string;
  nickname?: string;
  photoUrl: string;
  position: PositionCode;
  positionGroup: PositionGroup;
  rating: number; // 50 - 99
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  mvpCount: number;
  form: ('W' | 'D' | 'L')[]; // last 5 matches
  attributes: PlayerAttributes;
  bio?: string;
  favoriteFoot?: 'Правая' | 'Левая' | 'Обе';
  joinedYear: number;
  badges: string[];
}

export interface GoalEvent {
  id: string;
  minute: number;
  scorerId: string;
  scorerName: string;
  assistId?: string;
  assistName?: string;
  team: 'A' | 'B';
}

export interface MatchTeam {
  name: string;
  color: string;
  score: number;
  playerIds: string[];
}

export interface Match {
  id: string;
  date: string;
  time: string;
  location: string;
  venueId: string;
  format: '5x5' | '6x6' | '7x7' | '8x8';
  teamA: MatchTeam;
  teamB: MatchTeam;
  goals: GoalEvent[];
  mvpId?: string;
  notes?: string;
  status: 'Completed' | 'Upcoming';
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  surface: 'Искусственная трава' | 'Паркет' | 'Резина' | 'Натуральный газон';
  features: string[];
  indoor: boolean;
  mapUrl?: string;
  imageUrl: string;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface LeagueSummary {
  totalMatches: number;
  totalGoals: number;
  activePlayers: number;
  averageGoalsPerMatch: number;
}
