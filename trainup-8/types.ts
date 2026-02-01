
export type SportType = 'futbol' | 'baloncesto' | 'running' | 'fitness';

export interface SportData {
  id: SportType;
  name: string;
  icon: string;
  color: string;
  coachName: string;
  coachInstruction: string;
  statsTitle: string;
  logLabel: string; // Etiqueta para el botón de añadir puntos (Goles, Puntos, Km, etc)
  statsItems: { label: string; value: string; subValue?: string; icon: string }[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  timestamp: string;
}

export enum AppScreen {
  INTRO = 'INTRO',
  ONBOARDING = 'ONBOARDING',
  SELECTION = 'SELECTION',
  DASHBOARD = 'DASHBOARD',
  SUMMARY = 'SUMMARY'
}

export enum DashboardTab {
  PANEL = 'PANEL',
  COACH = 'COACH',
  STATS = 'STATS',
  PROFILE = 'PROFILE'
}
