
import { SportData } from './types';

export const SPORTS_CONFIG: Record<string, SportData> = {
  futbol: {
    id: 'futbol',
    name: 'Fútbol',
    icon: 'sports_soccer',
    color: '#4ADE80',
    coachName: 'Tactik',
    coachInstruction: 'Eres un entrenador de fútbol de élite. Habla con terminología táctica, enfócate en visión de juego, control orientado y explosividad.',
    statsTitle: 'Rendimiento Táctico',
    logLabel: 'Goles metidos',
    statsItems: [
      { label: 'Velocidad Punta', value: '32', subValue: 'km/h', icon: 'speed' },
      { label: 'Precisión Pase', value: '88', subValue: '%', icon: 'ads_click' },
      { label: 'Goles Totales', value: '0', subValue: 'goles', icon: 'sports_soccer' }
    ]
  },
  baloncesto: {
    id: 'baloncesto',
    name: 'Baloncesto',
    icon: 'sports_basketball',
    color: '#FF6B00',
    coachName: 'Hoop',
    coachInstruction: 'Eres un coach de baloncesto profesional. Enfócate en mecánica de tiro, salto vertical y IQ baloncestístico.',
    statsTitle: 'Métricas de Pista',
    logLabel: 'Puntos anotados',
    statsItems: [
      { label: 'Salto Vertical', value: '+5', subValue: 'cm', icon: 'straighten' },
      { label: 'Efectividad Tiro', value: '42', subValue: '%', icon: 'target' },
      { label: 'Puntos Hoy', value: '0', subValue: 'pts', icon: 'emoji_events' }
    ]
  },
  running: {
    id: 'running',
    name: 'Running',
    icon: 'directions_run',
    color: '#0EA5E9',
    coachName: 'Pace',
    coachInstruction: 'Eres un entrenador de atletismo. Enfócate en ritmos de carrera, VO2 Max, cadencia y umbral de lactato.',
    statsTitle: 'Análisis de Carrera',
    logLabel: 'Kilómetros hoy',
    statsItems: [
      { label: 'VO2 Max', value: '54', subValue: 'ml/kg', icon: 'insights' },
      { label: 'Ritmo Medio', value: '4:12', subValue: 'min/km', icon: 'speed' },
      { label: 'Distancia Hoy', value: '0', subValue: 'km', icon: 'route' }
    ]
  },
  fitness: {
    id: 'fitness',
    name: 'Fitness',
    icon: 'fitness_center',
    color: '#A1A1AA',
    coachName: 'Iron',
    coachInstruction: 'Eres un entrenador personal de gimnasio. Enfócate en técnica de levantamiento, hipertrofia y progresión de cargas.',
    statsTitle: 'Análisis de Fuerza',
    logLabel: 'Series completadas',
    statsItems: [
      { label: 'Volumen Total', value: '12k', subValue: 'kg', icon: 'fitness_center' },
      { label: 'Intensidad', value: '85', subValue: '%', icon: 'bolt' },
      { label: 'Series Hoy', value: '0', subValue: 'sets', icon: 'fitness_center' }
    ]
  }
};
