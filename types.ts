export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type Resolution = '1K' | '2K' | '4K';
export type AestheticStyle = 'Modern Minimal' | 'Cyberpunk' | 'Organic/Eco' | 'High Luxury' | 'Retro 90s';

export interface MockupConfig {
  prompt: string;
  style: AestheticStyle;
  ratio: AspectRatio;
  resolution: Resolution;
  image?: string; // Base64 image for upload mode
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type MascotState = 'idle' | 'thinking' | 'sprinting' | 'returning';

export const STYLES: { id: AestheticStyle; icon: string }[] = [
  { id: 'Modern Minimal', icon: 'layout-template' },
  { id: 'Cyberpunk', icon: 'zap' },
  { id: 'Organic/Eco', icon: 'leaf' },
  { id: 'High Luxury', icon: 'diamond' },
  { id: 'Retro 90s', icon: 'radio' },
];

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey(): Promise<boolean>;
      openSelectKey(): Promise<void>;
    };
  }
}