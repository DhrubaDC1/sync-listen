export type SyncMessage = 
  | { type: 'PLAY'; time: number; timestamp: number }
  | { type: 'PAUSE'; time: number; timestamp: number }
  | { type: 'SEEK'; time: number; timestamp: number }
  | { type: 'SOURCE'; source: string; sourceType: 'AUDIO' | 'YOUTUBE' }
  | { type: 'STATE_REQUEST' }
  | { type: 'STATE_SYNC'; time: number; playing: boolean; source: string; sourceType: 'AUDIO' | 'YOUTUBE'; timestamp: number };

export interface PlayerState {
  playing: boolean;
  currentTime: number;
  duration: number;
  source: string;
  sourceType: 'AUDIO' | 'YOUTUBE';
}
