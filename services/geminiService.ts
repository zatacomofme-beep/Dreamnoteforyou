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
  videoPrompt: string;
}

export const processAudioDream = async (audioBlob: Blob): Promise<AudioAnalysisResult> => {
  const ai = getClient();
  const base64Audio = await blobToBase64(audioBlob);

  // 1. Analyze Audio with Gemini 2.5 Flash
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
          text: `你是一位超现实主义梦境导演。请听这段梦境录音。
          1. 创建一个简短、富有诗意和画面感的标题（请使用中文）。
          2. 提取 3-4 个简洁的关键点（事件或感觉，请使用中文）。
          3. 写一句简短的心理学解读（请使用中文）。
          4. 探测整体情绪（请使用中文）。
          5. 挑选一个匹配梦境氛围的十六进制颜色代码。
          6. 创建一个用于生成静态图片的提示词 (Image Generation Prompt)。
             * 必须使用英文。
             * 专注于构图、色彩和单一的超现实场景。
          7. 创建一个用于生成视频的提示词 (Video Generation Prompt)。
             * 必须使用英文。
             * 描述一种电影般的、梦幻的、超现实的视觉风格。
             * 强调光影、运动（例如：slow motion, floating, morphing, zooming）和氛围。
             * 它是给 Veo 视频生成模型使用的，所以要包含镜头语言（如：Cinematic shot, 8k, highly detailed）。`
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
          imagePrompt: { type: Type.STRING },
          videoPrompt: { type: Type.STRING }
        },
        required: ["title", "keyPoints", "interpretation", "mood", "color", "imagePrompt", "videoPrompt"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to analyze audio");
  
  return JSON.parse(text) as AudioAnalysisResult;
};

export const generateDreamImage = async (prompt: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const generateDreamVideo = async (prompt: string): Promise<string> => {
  // Function to execute the generation logic
  const executeGeneration = async () => {
    // Always create a new instance to get the latest key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    console.log("Starting video generation with prompt:", prompt);

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16'
      }
    });

    console.log("Video operation started...");

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      console.log("Polling video status...");
    }
    
    return operation;
  };

  // 1. Initial Key Check
  if (!(window as any).aistudio?.hasSelectedApiKey()) {
    await (window as any).aistudio?.openSelectKey();
  }

  let operation;
  try {
    operation = await executeGeneration();
  } catch (e: any) {
    // 2. Error Handling for 404 (likely API Key/Project issue)
    const errorString = e.message || JSON.stringify(e);
    if (errorString.includes("Requested entity was not found")) {
        console.warn("Veo 404 detected. Prompting for API Key...");
        await (window as any).aistudio?.openSelectKey();
        // Retry once
        operation = await executeGeneration();
    } else {
        throw e;
    }
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) {
    throw new Error("Video generation completed but no URI found.");
  }

  // Fetch the actual video bytes using the URI + API Key
  const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  
  // Return a local Object URL
  return URL.createObjectURL(blob);
};