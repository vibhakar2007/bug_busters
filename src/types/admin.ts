import { Participant } from './participant';
import { ParticipantActivity } from './activity';
import { Quiz } from './quiz';

export interface AdminOverviewStats {
  totalQuizzes: number;
  totalParticipants: number;
  activeParticipants: number;
  completedParticipants: number;
  flaggedParticipants: number;
  averageScorePercentage: number;
  totalViolationsLogged: number;
}

export interface LiveMonitorData {
  participants: Participant[];
  recentActivities: ParticipantActivity[];
  stats: {
    total: number;
    active: number;
    completed: number;
    flagged: number;
    totalViolations: number;
  };
}

export interface ParticipantDetailView extends Participant {
  activities: ParticipantActivity[];
  quiz?: Quiz;
}
