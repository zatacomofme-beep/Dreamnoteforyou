export interface User {
  id: string;
  name: string;
  isPro: boolean;
  avatar?: string;
}

export interface Dream {
  id: string;
  title: string; // Generated from analysis
  date: string; // ISO string
  audioUrl: string; // Blob URL for playback
  imageUrl?: string; // Base64 or URL (Fallback)
  videoUrl?: string; // Blob URL for Veo video
  videoStatus: 'pending' | 'processing' | 'completed' | 'failed'; // Track Veo generation
  videoPrompt: string; // Stored for delayed generation
  keyPoints: string[]; // Extracted from audio
  interpretation: string; // Short summary
  detailedAnalysis?: string; // Long form AI analysis
  mood?: string;
  color: string; // Hex color
  elements?: string[]; // New: For Dream Codex (e.g., "Fire", "Cat", "Flying")
}

export type ViewState = 'LIST' | 'ADD' | 'DETAIL' | 'PROFILE' | 'CODEX' | 'GALAXY' | 'ABOUT';

export interface PixelConfig {
  gap: number;
  speed: number;
  colors: string;
  noFocus?: boolean;
}