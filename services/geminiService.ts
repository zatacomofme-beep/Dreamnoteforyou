import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to convert Blob to Base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/wav;base64,")
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export interface AudioAnalysisResult {
  title: string;
  keyPoints: string[];
  interpretation: string;
  mood: string;
  color: string;
  imagePrompt: string;
}

export const processAudioDream = async (audioBlob: Blob): Promise<AudioAnalysisResult> => {
  const ai = getClient();
  const base64Audio = await blobToBase64(audioBlob);

  // 1. Analyze Audio with Gemini 2.5 Flash
  // We ask it to transcribe, summarize, and create a prompt for the image generator
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: audioBlob.type || 'audio/webm',
            data: base64Audio
          }
        },
        {
          text: `你是一位梦境分析师。请听这段梦境录音。
          1. 创建一个简短、富有诗意和画面感的标题（请使用中文）。
          2. 提取 3-4 个简洁的关键点（事件或感觉，请使用中文）。
          3. 写一句简短的心理学解读（请使用中文）。
          4. 探测整体情绪（请使用中文）。
          5. 挑选一个匹配梦境氛围的十六进制颜色代码。
          6. 创建一个富有创意、超现实的图像生成提示词（Image Generation Prompt）。注意：为了获得更好的生图效果，imagePrompt 字段请务必使用英文编写，描述要详细。`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          interpretation: { type: Type.STRING },
          mood: { type: Type.STRING },
          color: { type: Type.STRING },
          imagePrompt: { type: Type.STRING }
        },
        required: ["title", "keyPoints", "interpretation", "mood", "color", "imagePrompt"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to analyze audio");
  
  return JSON.parse(text) as AudioAnalysisResult;
};

export const generateDreamImage = async (prompt: string): Promise<string> => {
  const ai = getClient();
  
  // 2. Generate Image with Gemini 2.5 Flash Image ("Nano Banana")
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      // responseMimeType is NOT supported for image models
      // We rely on parsing the response parts
    }
  });

  // Extract image from response
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
};