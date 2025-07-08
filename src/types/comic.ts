export interface Character {
  id: string;
  name: string;
  description: string;
  images: string[];
  previewImages?: string[];
  persona?: string;
  voiceTone?: string;
  catchphrases?: string[];
}

export interface ComicConfig {
  textAI: "deepseek" | "deepseek-reasoning" | "grok" | "llamascout" | "mistral" | "openai" | "openai-audio" | "openai-fast" | "openai-large" | "openai-reasoning" | "openai-roblox" | "phi" | "qwen-coder" | "searchgpt" | "bidara" | "elixposearch" | "evil" | "hypnosis-tracy" | "midijourney" | "mirexa" | "rtist" | "sur" | "unity" | "gemini-2.0-pro" | "gemini-2.0-flash" | "gemini-2.0-flash-lite-preview" | "gemini-2.0-flash-native-audio" | "gemini-2.0-flash-preview-tts" | "gemini-2.0-pro-preview-tts" | "gemini-1.5-flash" | "gemini-1.5-flash-8b" | "gemini-1.5-pro" | "gemini-live-2.0-flash" | "gemini-live-2.0-flash-001" | "gemini-2.5-pro" | "gemini-2.5-flash" | "gemini-2.5-flash-lite-preview" | "gemini-2.5-flash-native-audio" | "gemini-2.5-flash-preview-tts" | "gemini-2.5-pro-preview-tts" | "gemini" | "huggingface";
  imageAI: "flux" | "kontext" | "turbo" | "gptimage" | "pollinations" | "huggingface" | "gemini-2.0-flash-image-generation" | "imagen-3.0-generate" | "imagen-3.0-ultra-generate" | "ver-2.0-generate" | "gemini-embeddings" | "gemini";
  style: "manga" | "western" | "golden-age" | "modern" | "cyberpunk" | "anime" | "noir" | "pop-art" | "pixel-art" | "3d" | "photorealistic";
  aspectRatio: "1:1" | "4:3" | "3:4" | "16:9";
  panelCount: number;
  pageCount: number;
  seed: number | null;
  promptBooster: boolean;
  speechBubbleFont: "comic-sans" | "anime" | "gothic" | "modern";
}

export interface ComicPanel {
  id: string;
  sceneDescription: string;
  dialogue: string;
  imageUrl?: string;
  promptUsed?: string;
  isGenerating?: boolean;
  error?: string;
}

export interface GenerationProgress {
  current: number;
  total: number;
  status: string;
}

export interface APIKeys {
  gemini?: string;
  huggingface?: string;
  pollinations?: string;
}

export interface ExportOptions {
  format: "pdf" | "zip" | "cbz" | "epub";
  quality: "low" | "medium" | "high";
  includeDialogue: boolean;
  watermark: boolean;
}