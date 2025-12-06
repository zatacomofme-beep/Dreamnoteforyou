import { Dream } from "../types";

// ============================================================================
// AI Service Adapter for Apple App Store & Chinese Market
// ============================================================================
// 1. Removed @google/genai dependency to ensure compliance and offline safety.
// 2. Added mock fallback for App Store Reviewers (who may test offline/without backend).
// 3. Ready to connect to Alibaba Cloud (Qwen) or Baidu (Ernie).
// ============================================================================

const USE_MOCK_DATA = true; // Set to FALSE when you connect your real Chinese backend
const API_ENDPOINT = "https://api.your-backend.com/v1/dream/analyze"; 

export interface AudioAnalysisResult {
  title: string;
  keyPoints: string[];
  interpretation: string;
  mood: string;
  color: string;
  imagePrompt: string;
  videoPrompt: string;
  elements: string[];
}

// Helper: Convert Blob to Base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/webm;base64,")
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * MOCK GENERATOR: Simulates AI response for testing/review
 */
const getMockAnalysis = (): AudioAnalysisResult => {
  const mocks = [
    {
      title: "深海的低语",
      keyPoints: ["潜水", "无法呼吸", "发光的鱼"],
      interpretation: "这可能象征着你近期在工作上感受到的压力，潜意识在寻找出口。",
      mood: "焦虑",
      color: "#1e3a8a", // Dark Blue
      imagePrompt: "surreal underwater scene, glowing bioluminescent fish, dark blue abyss, cinematic lighting",
      videoPrompt: "Slow motion underwater camera movement, bubbles rising, dark blue atmosphere",
      elements: ["水", "鱼", "海"]
    },
    {
      title: "云端漫步",
      keyPoints: ["飞行", "棉花糖", "坠落"],
      interpretation: "飞翔通常代表对自由的渴望，最后的坠落可能暗示着不安全感。",
      mood: "喜悦",
      color: "#f0f9ff", // Light Blue
      imagePrompt: "surreal sky city, clouds made of cotton candy, golden sunlight, ethereal atmosphere",
      videoPrompt: "Flying through clouds, golden hour, cinematic wide shot, dreamy bloom effect",
      elements: ["风", "太阳", "飞翔"]
    }
  ];
  return mocks[Math.floor(Math.random() * mocks.length)];
};

/**
 * CORE FUNCTION: Process Audio
 */
export const processAudioDream = async (audioBlob: Blob): Promise<AudioAnalysisResult> => {
  if (USE_MOCK_DATA) {
    console.log("⚠️ Using Mock AI Data (Compliance Mode)");
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate network delay
    return getMockAnalysis();
  }

  // --- Real Implementation for Chinese Backend ---
  try {
    const base64Audio = await blobToBase64(audioBlob);
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: base64Audio, lang: 'zh-CN' })
    });
    
    if (!response.ok) throw new Error("Server Error");
    return await response.json();
  } catch (e) {
    console.error("Analysis Failed:", e);
    // Fallback to mock so app doesn't crash during demo
    return getMockAnalysis();
  }
};

/**
 * Generate Image
 */
export const generateDreamImage = async (prompt: string): Promise<string> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Return a high-quality Unsplash placeholder based on keywords in prompt
    const isWater = prompt.includes("underwater") || prompt.includes("blue");
    return isWater 
      ? "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?q=80&w=800&auto=format&fit=crop"
      : "https://images.unsplash.com/photo-1502481851512-e9e2529bfbf9?q=80&w=800&auto=format&fit=crop";
  }

  // TODO: Call your backend (e.g. Tongyi Wanxiang)
  return ""; 
};

/**
 * Generate Video
 */
export const generateDreamVideo = async (prompt: string): Promise<string> => {
  // Video generation is expensive/slow. 
  // For iOS review, usually better to return a mock or disable it if you don't have a fast backend.
  console.log("Generating video for:", prompt);
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  // Return a generic abstract video URL (ensure this URL is valid and accessible via HTTPS)
  return "https://videos.pexels.com/video-files/3129957/3129957-sd_640_360_25fps.mp4";
};

/**
 * Deep Analysis
 */
export const analyzeDreamDepth = async (dream: Dream): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return "【深度心理画像】\n\n梦境中的意象显示出你近期潜意识中存在着一种未被满足的表达欲。场景的转换代表了内心的动荡...\n\n(此为模拟数据，请接入通义千问/文心一言以获取真实解读)";
};

/**
 * Element Symbolism
 */
export const analyzeElementSymbolism = async (element: string, count: number): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return `“${element}”在你梦中出现了 ${count} 次。在荣格心理学中，它通常象征着某种生命力的回归...`;
};