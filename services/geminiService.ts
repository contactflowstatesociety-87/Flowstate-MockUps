
import { GoogleGenAI, Modality } from "@google/genai";
import { MockupConfig } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper for Base64 handling
const dataUrlToPart = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type");
    return { inlineData: { mimeType: mimeMatch[1], data: arr[1] } };
}

const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    return dataUrlToPart(dataUrl);
};

// ------------------------------------------------------------------
// FIT CHECK SERVICES
// ------------------------------------------------------------------

export const generateModelImage = async (userImage: File): Promise<string> => {
    const ai = getClient();
    const userImagePart = await fileToPart(userImage);
    const prompt = "You are an expert fashion photographer AI. Transform the person in this image into a full-body fashion model photo suitable for an e-commerce website. The background must be a clean, neutral studio backdrop (dark grey, #18181b). The person should have a neutral, professional model expression. Preserve the person's identity, unique features, and body type, but place them in a standard, relaxed standing model pose. The final image must be photorealistic. Return ONLY the final image.";
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [userImagePart, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE] },
    });
    return handleApiResponse(response);
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, garmentImage: File): Promise<string> => {
    const ai = getClient();
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentImagePart = await fileToPart(garmentImage);
    const prompt = `You are an expert virtual try-on AI. You will be given a 'model image' and a 'garment image'. Your task is to create a new photorealistic image where the person from the 'model image' is wearing the clothing from the 'garment image'. 
    
    Rules: 
    1. Complete Garment Replacement: Replace the original clothes with the new garment.
    2. Preserve the Model: Keep face, body shape, and skin tone identical.
    3. Realistic Fit: Ensure natural folds, shadows, and lighting match the scene.
    4. Streetwear Aesthetic: If the garment fits the style, enhance with a subtle cool, edgy vibe.
    Return ONLY the final image.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [modelImagePart, garmentImagePart, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE] },
    });
    return handleApiResponse(response);
};

export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string): Promise<string> => {
    const ai = getClient();
    const tryOnImagePart = dataUrlToPart(tryOnImageUrl);
    const prompt = `You are an expert fashion photographer AI. Take this image and regenerate it from a different perspective. The person, clothing, and background style must remain identical. The new perspective should be: "${poseInstruction}". Return ONLY the final image.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [tryOnImagePart, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE] },
    });
    return handleApiResponse(response);
};

const handleApiResponse = (response: any): string => {
    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find((part: any) => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }
    throw new Error("No image returned.");
};


// ------------------------------------------------------------------
// MOCKUP GENERATOR SERVICES
// ------------------------------------------------------------------

// Generate Video Clip using Veo 3.1
const generateVideo = async (ai: GoogleGenAI, config: MockupConfig): Promise<string | undefined> => {
  if (config.mode !== '3d-scanner') return undefined;

  const images = config.images || [];
  const refImage = images.length > 0 ? images[0] : undefined;

  let prompt = config.prompt;
  
  if (config.scannerView === 'multi-angle') {
    prompt = "A cinematic streetwear 'outfit check' video featuring a male model in an urban industrial setting. The shot focuses on the mid-section and upper legs to showcase the fit. The subject is wearing black cargo pants with high-contrast white paint splatter details and a black sweatshirt. He casually adjusts his clothing with one hand, revealing a silver ring and vascular detail. Camera Angle: Waist-Level / Mid-Shot. Camera Movement: Handheld / Floating, Slow Micro-Pan. Lighting: Natural Urban Diffused, High Contrast. Focal Points: Fabric texture, hand details.";
  } else {
    // For general 3D scanner use, requesting a turntable
    prompt = "A high-fidelity 360-degree turntable loop video of the product. Clean studio lighting, smooth rotation, showcasing all angles and details. 4K quality.";
  }

  const model = 'veo-3.1-generate-preview';
  
  try {
    const videoConfig: any = {
      numberOfVideos: 1,
      resolution: '1080p',
      aspectRatio: config.ratio === '9:16' || config.ratio === '16:9' ? config.ratio : '16:9'
    };

    const request: any = { model, prompt, config: videoConfig };

    if (refImage) {
      const [_, base64Data] = refImage.split(';base64,');
      request.image = { imageBytes: base64Data, mimeType: 'image/png' };
    }

    let operation = await ai.models.generateVideos(request);

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) {
      return `${videoUri}&key=${process.env.API_KEY}`;
    }
  } catch (e) {
    console.error("Video Generation Failed:", e);
    return undefined;
  }
  return undefined;
};

// Helper to run a single image generation task
const generateSingleImage = async (ai: GoogleGenAI, config: MockupConfig, index: number): Promise<string> => {
  const stylePrompts: Record<string, string> = {
    'Modern Minimal': 'Clean lines, ample whitespace, matte finishes, neutral color palette, apple-style aesthetics, soft lighting.',
    'Cyberpunk': 'Neon lighting, dark background, chromatic aberration, futuristic interface, glowing elements, high contrast, wet pavement reflections.',
    'Organic/Eco': 'Natural textures, wood and stone elements, soft sunlight, green foliage accents, earthy tones, sustainable vibe.',
    'High Luxury': 'Gold accents, black marble, dramatic studio lighting, silk textures, premium finish, elegant serif typography.',
    'Retro 90s': 'Beige plastics, pixel art aesthetics, memphis design patterns, vibrant pastel accents, lo-fi noise texture.',
    'Streetwear': 'Urban gritty texture, high-contrast flash photography, hypebeast aesthetic, raw concrete backgrounds, graffiti accents, cinematic color grading.'
  };

  let finalPrompt = "";
  const parts: any[] = [];
  const tools: any[] = [];

  if (config.productUrl) {
    tools.push({ googleSearch: {} });
    finalPrompt += ` Use Google Search to find details about this product: ${config.productUrl}. Ensure accurate materials and colors.`;
  }
  
  // Handle Multiple Images (Upload or 3D Scanner)
  if (config.images && config.images.length > 0) {
    // Add all images to the request
    config.images.forEach(img => {
      try {
        if (img.includes(';base64,')) {
           const [mimeTypeStr, base64Data] = img.split(';base64,');
           const mimeType = mimeTypeStr.replace('data:', '');
           parts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
        }
      } catch (e) { console.error("Error processing image", e); }
    });

    if (config.mode === '3d-scanner') {
        // 3D Scanner Logic (Split 2 Studio / 2 Lifestyle)
        if (index <= 1) {
            finalPrompt += `
            TASK: Create a 100% accurate 3D Digital Twin/Replica of the uploaded product(s).
            BACKGROUND: Pure white #FFFFFF studio background.
            RULES: DO NOT ALTER THE PRODUCT. Preserve all logos, proportions, stitching, and colors exactly as shown in the reference images. Zero hallucinations. High fidelity studio lighting.
            VIEW: ${index === 0 ? "Front 3/4 Perspective" : "Back/Side Detail View"}.
            `;
        } else {
            finalPrompt += `
            TASK: Composite the uploaded product(s) into a high-end lifestyle photoshoot.
            CONTEXT: ${config.prompt || 'Urban environment'}.
            STYLE: ${stylePrompts[config.style]}.
            RULES: The product must remain 100% identical to the reference images. Do not change the design or logos. Integrate realistic lighting and shadows from the scene onto the product.
            VIEW: ${index === 2 ? "In-context Hero Shot" : "Close-up Texture Detail"}.
            `;
        }
    } else {
        // Upload Mode (Multi-Product Composition)
        finalPrompt += `
        TASK: Create a professional product photography composition using ALL the uploaded product images.
        SCENE: ${config.prompt}.
        STYLE: ${stylePrompts[config.style]}.
        RULES: Arrange the products naturally within the scene. DO NOT ALTER the appearance, logos, or colors of the products themselves. They must look exactly like the reference photos. High quality composite.
        VARIATION: ${index === 0 ? "Wide angle layout" : index === 1 ? "Close up arrangement" : index === 2 ? "Top down flatlay" : "Creative perspective"}.
        `;
    }

    finalPrompt += ` QUALITY: Photorealistic, 8k resolution, highly detailed, octane render, raw photo, masterpiece.`;

  } else {
    // Standard Text Logic
    const basePrompt = `High fidelity professional UI design mockup or product shot of: ${config.prompt}. Style: ${stylePrompts[config.style]}`;
    const realismSuffix = " Photorealistic, 8k resolution, highly detailed, octane render, unreal engine 5, raw photo, masterpiece, sharp focus.";
    const variation = index === 0 ? " " : index === 1 ? " (Alternate angle)" : index === 2 ? " (Close up detail)" : " (Wide contextual shot)";
    
    finalPrompt = basePrompt + variation + realismSuffix;

    // Single Legacy Image
    if (config.image) {
      try {
        if (config.image.includes(';base64,')) {
          const [mimeTypeStr, base64Data] = config.image.split(';base64,');
          const mimeType = mimeTypeStr.replace('data:', '');
          parts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
        }
      } catch (e) {}
    }
  }

  parts.push({ text: finalPrompt });

  const model = 'gemini-3-pro-image-preview';

  const imageConfig: any = {
    aspectRatio: config.ratio,
    imageSize: config.resolution === '4K' ? '4K' : (config.resolution === '2K' ? '2K' : '1K'), 
  };

  const response = await ai.models.generateContent({
    model: model, 
    contents: { parts: parts },
    config: { imageConfig: imageConfig, tools: tools.length > 0 ? tools : undefined }
  });

  if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  
  throw new Error("No image generated");
};

export const generateMockupBatch = async (config: MockupConfig): Promise<{images: string[], video?: string}> => {
  const ai = getClient();
  const imagePromises = [0, 1, 2, 3].map(i => generateSingleImage(ai, config, i));
  
  let videoPromise: Promise<string | undefined> = Promise.resolve(undefined);
  if (config.mode === '3d-scanner') {
    videoPromise = generateVideo(ai, config);
  }
  
  const [images, video] = await Promise.all([Promise.all(imagePromises), videoPromise]);
  return { images, video };
};
