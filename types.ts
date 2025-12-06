export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Dino extends Rect {
  dy: number; // Vertical velocity
  jumpPower: number;
  grounded: boolean;
  color: string;
}

export interface Obstacle extends Rect {
  id: number;
  type: 'CACTUS_SMALL' | 'CACTUS_LARGE' | 'BIRD';
  speedOffset: number; // For variety
}

export interface Cloud {
  x: number;
  y: number;
  w: number;
  speed: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}