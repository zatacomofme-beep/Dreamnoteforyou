export interface Dream {
  id: string;
  title: string; // Generated from analysis
  date: string; // ISO string
  audioUrl: string; // Blob URL for playback
  imageUrl?: string; // Base64 or URL
  keyPoints: string[]; // Extracted from audio
  interpretation: string; // Short summary
  mood?: string;
  color: string; // Hex color
}

export type ViewState = 'LIST' | 'ADD' | 'DETAIL';

export interface PixelConfig {
  gap: number;
  speed: number;
  colors: string;
  noFocus?: boolean;
}