
export interface GeneratedImage {
  id: string;
  url: string;
  prompt?: string;
}

export type MascotState = 'idle' | 'thinking' | 'sprinting' | 'returning';

export interface GeneratedImageBatch {
  id: string;
  timestamp: number;
  prompt: string;
  images: GeneratedImage[];
  videoUrl?: string; // For 6K generated clip
  config: MockupConfig;
}

export interface FitCheckHistoryItem {
  id: string;
  timestamp: number;
  modelImage: string;
  outfitImage: string; // The final result
  garmentName: string;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type Resolution = '1K' | '2K' | '4K';
export type AestheticStyle = 'Modern Minimal' | 'Cyberpunk' | 'Organic/Eco' | 'High Luxury' | 'Retro 90s' | 'Streetwear';
export type GenerationMode = 'text' | 'upload' | '3d-scanner';
export type NavigationPage = 'mockup' | 'fitcheck';

export interface MockupConfig {
  mode: GenerationMode;
  prompt: string;
  style: AestheticStyle;
  ratio: AspectRatio;
  resolution: Resolution;
  image?: string; // Legacy single image
  images?: string[]; // Multiple Base64 images for upload/3d-scanner modes
  productUrl?: string; // For 3D Scanner product reference
  scannerView?: string; // Selected view for 3D scanner
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export const STYLES: { id: AestheticStyle; icon: string }[] = [
  { id: 'Modern Minimal', icon: 'layout-template' },
  { id: 'Streetwear', icon: 'shirt' },
  { id: 'Cyberpunk', icon: 'zap' },
  { id: 'Organic/Eco', icon: 'leaf' },
  { id: 'High Luxury', icon: 'diamond' },
  { id: 'Retro 90s', icon: 'radio' },
];

// Interface for Google AI Studio embedded key selection
export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// Interface for Prompt Builder Options
export interface PromptBuilderOption {
  id: string;
  label: string;
  text: string;
  tooltip: string;
  icon?: any; // Lucide icon component
}
