import { GoogleGenAI } from "@google/genai";
import { MockupConfig } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateMockupImage = async (config: MockupConfig): Promise<string> => {
  const ai = getClient();
  
  // Construct a specialized prompt based on style
  const stylePrompts: Record<string, string> = {
    'Modern Minimal': 'Clean lines, ample whitespace, matte finishes, neutral color palette, apple-style aesthetics, soft lighting.',
    'Cyberpunk': 'Neon lighting, dark background, chromatic aberration, futuristic interface, glowing elements, high contrast, wet pavement reflections.',
    'Organic/Eco': 'Natural textures, wood and stone elements, soft sunlight, green foliage accents, earthy tones, sustainable vibe.',
    'High Luxury': 'Gold accents, black marble, dramatic studio lighting, silk textures, premium finish, elegant serif typography.',
    'Retro 90s': 'Beige plastics, pixel art aesthetics, memphis design patterns, vibrant pastel accents, lo-fi noise texture.'
  };

  const basePrompt = config.image 
    ? `Create a high-fidelity product mockup using the provided product image. Context: ${config.prompt}. Style: ${stylePrompts[config.style]}`
    : `High fidelity professional UI design mockup or product shot of: ${config.prompt}. Style: ${stylePrompts[config.style]}`;

  const qualitySuffix = config.resolution === '4K' 
    ? " Photorealistic, 8k resolution, highly detailed, octane render, unreal engine 5."
    : " High quality, professional product photography.";

  const finalPrompt = basePrompt + qualitySuffix;

  const parts: any[] = [];
  
  // If user uploaded an image, add it to parts
  if (config.image) {
    try {
      // Expecting data:image/png;base64,.....
      if (config.image.includes(';base64,')) {
        const [mimeTypeStr, base64Data] = config.image.split(';base64,');
        const mimeType = mimeTypeStr.replace('data:', '');
        
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      } else {
        console.warn("Invalid image format provided (missing base64 header). Sending text only.");
      }
    } catch (e) {
      console.error("Error processing image data", e);
    }
  }

  parts.push({ text: finalPrompt });

  // Select model and config based on resolution
  const isHighRes = config.resolution === '2K' || config.resolution === '4K';
  // Use gemini-3-pro-image-preview for high res/quality, flash for speed/standard
  const model = isHighRes ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

  const imageConfig: any = {
    aspectRatio: config.ratio,
  };

  // Only gemini-3-pro-image-preview supports 'imageSize'
  if (isHighRes) {
    imageConfig.imageSize = config.resolution;
  }

  try {
    const response = await ai.models.generateContent({
      model: model, 
      contents: {
        parts: parts
      },
      config: {
        imageConfig: imageConfig
      }
    });

    let imageUrl: string | null = null;
    
    // Iterate to find the inline data which contains the image
    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      throw new Error("No image generated in the response.");
    }

    return imageUrl;

  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
};