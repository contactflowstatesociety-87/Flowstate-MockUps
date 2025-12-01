
import { GoogleGenAI, Modality } from "@google/genai";
import { MockupConfig, EngineMode } from "../types";
import type { Operation, GenerateVideosResponse } from "@google/genai";

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
// ENGINE SERVICE
// ------------------------------------------------------------------

const modeHeaderMap: Record<string, string> = {
  default: "Mode Default5X. Use the full Flowstate Society 5X Generation Engine. You must generate one of each style (Strict, Flexible, Ecommerce, Luxury, Complex) to provide a full range of options.",
  strict: "Mode Strict. Activate Strict Only Mode. Generate only strict outputs with locked lighting, locked camera, and zero creative variation.",
  flexible: "Mode Flexible. Activate Flexible Only Mode. Generate only flexible premium creative outputs while keeping product details accurate.",
  ecommerce: "Mode Ecommerce. Activate Ecommerce Optimized Mode for clean white or light gray backgrounds and marketplace ready outputs.",
  luxury: "Mode Luxury. Activate Luxury Brand Advertising Mode with cinematic lighting and premium commercial style while preserving product accuracy.",
  complex: "Mode ComplexMaterial. Activate Complex Material Mode for highly accurate soft shell, down, fleece, nylon, leather, and other technical fabrics.",
  "3d-mockup": "Mode 3D Mockup Lab. Activate strict high-fidelity 3D reconstruction mode."
};

const getModeHeader = (mode: EngineMode) => modeHeaderMap[mode] || modeHeaderMap['default'];

interface GenerationResult {
    base64: string;
    mimeType: string;
}

const transformImage = async (base64Images: string | string[], mimeType: string, prompt: string): Promise<GenerationResult> => {
    const ai = getClient();
    const images = Array.isArray(base64Images) ? base64Images : [base64Images];
    const parts: any[] = images.filter(Boolean).map(b64 => ({ inlineData: { data: b64, mimeType } }));
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE] },
    });

    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find((part: any) => part.inlineData);
        if (imagePart?.inlineData) {
            return { base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType || 'image/png' };
        }
    }
    const blockReason = response.promptFeedback?.blockReason;
    if (blockReason) {
         throw new Error(`Generation blocked: ${blockReason}`);
    }
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
         throw new Error(`Generation stopped: ${finishReason}`);
    }
    throw new Error("No image generated.");
};

export const engineService = {
  generateStrictFlatLay: async (base64Image: string, mimeType: string, mode: EngineMode) => {
    const header = getModeHeader(mode);
    const prompt = `${header}\nPHASE 1: STRICT MODE FLAT LAY\nGenerate an ULTRA-HIGH RESOLUTION 8K studio flat lay. Rules: Extract Product Truth. Preserve silhouette, logos, stitching. CRITICAL: EXACT COPY REQUIRED. DO NOT CHANGE LOGO. Clean gradient background. Soft lighting.`;
    return transformImage(base64Image, mimeType, prompt);
  },

  generateStrict3DMockup: async (base64Images: string[], mimeType: string, mode: EngineMode) => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 2: STRICT 3D MOCKUP & DIGITAL TWIN
Generate an ULTRA-HIGH RESOLUTION 8K 3D studio mockup.

CRITICAL DIGITAL TWIN RULES (ZERO TOLERANCE):
1. 100% ACCURATE REPLICA. Do not change a single pixel of the logo, text, or design details.
2. EXACT PROPORTIONS. No distortion. No stretching.
3. RESOLUTION: 8K. Upscale details to 6K minimum. Maximum sharpness.
4. NO HALLUCINATIONS. Do not add extra buttons, seams, or text that isn't in the reference.
5. NO CROP. Show entire object centered in frame. Add 10% safety padding around the object.

CATEGORY RULES:
1. CLOTHING: Use INVISIBLE GHOST MANNEQUIN. Hollow form. NO VISIBLE MANNEQUIN.
2. HARD GOODS: Floating 3D object. PRESERVE EXACT DIAL DETAILS AND BRANDING.

UNIVERSAL RULES:
- Lighting: Soft diffused studio light.
- Background: Clean studio white.
- Negative Prompt: cropping, cut off, bad anatomy, distorted logo, blurry, extra limbs.`;
    return transformImage(base64Images, mimeType, prompt);
  },

  generateFlexibleStudioPhoto: async (base64Images: string[], mimeType: string, mode: EngineMode) => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 3: FLEXIBLE STUDIO PHOTO
Generate Premium 8K Photo.

FIDELITY RULES:
- 100% IDENTICAL TO REFERENCE. Exact Logo. Exact Colors.
- IF HUMAN MODEL: Skin must be ultra hyper-realistic. Visible pores, vellus hair, natural imperfections. NO PLASTIC SKIN.

SCENE:
- Creative lighting allowed.
- BACKGROUND AND LIGHTING CHANGES ONLY. NO EXTRA PROPS.`;
    return transformImage(base64Images, mimeType, prompt);
  },

  editImage: async (base64: string, mimeType: string, userPrompt: string) => {
    const prompt = `Edit this image: "${userPrompt}". Maintain high quality. Use markup as guide then remove it. Preserve product details.`;
    return transformImage(base64, mimeType, prompt);
  },

  generateFlexibleVideo: async (base64Image: string, mimeType: string, mode: EngineMode): Promise<Operation<GenerateVideosResponse>> => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 3: 3D ANIMATED VIDEO
Generate a high-fidelity 360-degree turntable loop video.

CRITICAL INSTRUCTIONS:
1. 100% PRODUCT ACCURACY. Digital Twin. Do not change logos.
2. RESOLUTION: 6K Upscale details.
3. MOTION: Smooth 360-degree spin. Center pivot.
4. WHOLE OBJECT VISIBLE. No cropping.

Rules: CLOTHING=GHOST MANNEQUIN. ACCESSORY=Floating Object. SILENT.`;
    const ai = getClient();
    return ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        image: { imageBytes: base64Image, mimeType },
        prompt,
        config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '9:16' }
    });
  },

  generateVideoFromImage: async (base64Image: string, mimeType: string, prompt: string, aspectRatio: '16:9' | '9:16'): Promise<Operation<GenerateVideosResponse>> => {
    const ai = getClient();
    const safePrompt = `${prompt} 
    CRITICAL: 
    1. EXACT COPY OF PRODUCT. DIGITAL TWIN.
    2. 360 DEGREE TURNTABLE. SLOW SPIN.
    3. HYPER-REALISM: Natural skin texture if model present.
    4. 6K VISUAL FIDELITY.`;
    return ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        image: { imageBytes: base64Image, mimeType },
        prompt: safePrompt,
        config: { numberOfVideos: 1, resolution: '1080p', aspectRatio }
    });
  },

  checkVideoOperationStatus: async (operation: Operation<GenerateVideosResponse>) => {
      const ai = getClient();
      return ai.operations.getVideosOperation({ operation });
  }
};


// ------------------------------------------------------------------
// FIT CHECK SERVICES
// ------------------------------------------------------------------

export const generateModelImage = async (userImage: File): Promise<string> => {
    const ai = getClient();
    const userImagePart = await fileToPart(userImage);
    const prompt = `You are an expert fashion photographer AI. Transform the person in this image into a full-body fashion model photo suitable for an e-commerce website. 
    background: clean, neutral studio backdrop (dark grey, #18181b). 
    
    CRITICAL REALISM RULES:
    1. Ultra hyper-realistic skin texture. Visible pores, natural imperfections.
    2. NO PLASTIC SKIN. NO SMOOTHING.
    3. Professional model expression.
    4. Preserve the person's identity and body type exactly.
    
    Return ONLY the final image.`;
    
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
    const prompt = `You are an expert virtual try-on AI. 
    Task: Create a photorealistic image where the person from the 'model image' is wearing the clothing from the 'garment image'.
    
    CRITICAL RULES: 
    1. 100% PRODUCT ACCURACY. Do not change the logo, color, or design of the garment.
    2. Realistic Fit: Natural folds, shadows, and draping.
    3. Hyper-realistic Skin: Ensure the model's skin remains detailed and natural.
    
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
    const prompt = `You are an expert fashion photographer AI. Regenerate this image from a different perspective: "${poseInstruction}".
    
    CRITICAL RULES:
    1. The person, clothing, and background must remain identical.
    2. 100% PRODUCT ACCURACY. Do not change logos.
    3. Hyper-realistic skin texture.
    
    Return ONLY the final image.`;
    
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

const generateVideo = async (ai: GoogleGenAI, config: MockupConfig): Promise<string | undefined> => {
  // Always generate video for 3d-scanner mode
  if (config.mode !== '3d-scanner') return undefined;

  const images = config.images || [];
  const refImage = images.length > 0 ? images[0] : undefined;

  let prompt = config.prompt;
  
  if (config.scannerView === 'multi-angle') {
    prompt = "A cinematic streetwear 'outfit check' video featuring a male model. Waist-Level / Mid-Shot. Handheld organic movement. 6K quality.";
  } else {
    // Strict 360 spin for Mockup Lab
    prompt = "A high-fidelity 360-degree turntable loop video of the product floating in a white studio. 100% accurate replica. Uncropped. Shows entire object rotating smoothly. 6K resolution. Keep object centered. No distortion.";
  }

  const model = 'veo-3.1-generate-preview';
  
  try {
    const videoConfig: any = {
      numberOfVideos: 1,
      resolution: '1080p', // API Max
      aspectRatio: config.ratio === '9:16' || config.ratio === '16:9' ? config.ratio : '16:9'
    };

    const request: any = { model, prompt, config: videoConfig };

    if (refImage) {
      try {
         if (refImage.includes(';base64,')) {
             const parts = refImage.split(';base64,');
             if (parts.length === 2) {
                 request.image = { imageBytes: parts[1], mimeType: 'image/png' };
             }
         }
      } catch(e) { console.error("Invalid base64 for video", e); }
    }

    let operation = await ai.models.generateVideos(request);

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      if ((operation as any).error) throw new Error((operation as any).error.message);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) return `${videoUri}&key=${process.env.API_KEY}`;
  } catch (e) {
    console.error("Video Generation Failed:", e);
    return undefined;
  }
  return undefined;
};

export const animateImage = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    const ai = getClient();
    const finalPrompt = `Animate this image: ${prompt}. Cinematic movement, high quality, silent. Upscale to 6K.`;
    const model = 'veo-3.1-fast-generate-preview';
    
    let operation = await ai.models.generateVideos({
        model,
        prompt: finalPrompt,
        image: { imageBytes: base64Data, mimeType },
        config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '16:9' }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) return `${videoUri}&key=${process.env.API_KEY}`;
    throw new Error("Video generation failed");
};

export const generate360Spin = async (base64Data: string, mimeType: string, ratio: '16:9' | '9:16' = '9:16'): Promise<string> => {
    const ai = getClient();
    const prompt = "A high-fidelity 360-degree turntable loop video of the product floating in a white studio. 100% accurate replica. Uncropped. Shows entire object rotating smoothly. 6K resolution. Keep object centered. No distortion. Center pivot.";
    
    const model = 'veo-3.1-generate-preview';
    
    let operation = await ai.models.generateVideos({
        model,
        prompt,
        image: { imageBytes: base64Data, mimeType },
        config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: ratio }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
        if ((operation as any).error) throw new Error((operation as any).error.message);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) return `${videoUri}&key=${process.env.API_KEY}`;
    throw new Error("Video generation failed");
};

const generateSingleImage = async (ai: GoogleGenAI, config: MockupConfig, index: number): Promise<string> => {
  const stylePrompts: Record<string, string> = {
    'Modern Minimal': 'Clean lines, ample whitespace, matte finishes, neutral color palette, apple-style aesthetics, soft lighting.',
    'Cyberpunk': 'Neon lighting, dark background, chromatic aberration, futuristic interface, glowing elements, high contrast, wet pavement reflections.',
    'Organic/Eco': 'Natural textures, wood and stone elements, soft sunlight, green foliage accents, earthy tones, sustainable vibe.',
    'High Luxury': 'Gold accents, black marble, dramatic studio lighting, silk textures, premium finish, luxury location background. No text overlays.',
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
  
  if (config.images && config.images.length > 0) {
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
        const isMockupLab = config.scannerView === '3d-mockup';
        finalPrompt += `CRITICAL INSTRUCTION: SHOW WHOLE OBJECT. DO NOT CROP. WIDE ANGLE LENS. Negative prompt: cropping, cut off, text overlay, extra objects.`;

        if (index <= 1) {
            finalPrompt += `
            TASK: Create a 100% accurate 3D Digital Twin/Replica of the uploaded product(s).
            BACKGROUND: Pure white #FFFFFF studio background.
            RULES: DO NOT ALTER THE PRODUCT. Preserve all logos, proportions, stitching, and colors exactly as shown in the reference images. Zero hallucinations. High fidelity studio lighting.
            VIEW: ${index === 0 ? "Front 3/4 Perspective. Uncropped." : "Back/Side Detail View. Uncropped."}.
            `;
        } else {
            finalPrompt += `
            TASK: Composite the uploaded product(s) into a high-end ${isMockupLab ? 'Cinematic 3D Render' : 'Lifestyle Photoshoot'}.
            CONTEXT: ${config.prompt || 'Urban environment'}.
            STYLE: ${stylePrompts[config.style]}.
            RULES: The product must remain 100% identical to the reference images. Do not change the design or logos. Integrate realistic lighting and shadows from the scene onto the product.
            `;
        }
        
    } else {
        finalPrompt += `
        TASK: Create a professional product photography composition using ALL the uploaded product images.
        SCENE: ${config.prompt}.
        STYLE: ${stylePrompts[config.style]}.
        RULES: Arrange the products naturally within the scene. DO NOT ALTER the appearance, logos, or colors of the products themselves. They must look exactly like the reference photos.
        `;
    }
    finalPrompt += ` QUALITY: Photorealistic, 8k resolution, highly detailed, octane render, raw photo, masterpiece, upscale to 6K resolution.`;

  } else {
    // Standard Text Logic
    const basePrompt = `High fidelity professional UI design mockup or product shot of: ${config.prompt}. Style: ${stylePrompts[config.style]}`;
    const realismSuffix = " Photorealistic, 8k resolution, highly detailed, octane render, unreal engine 5, raw photo, masterpiece, sharp focus.";
    finalPrompt = basePrompt + realismSuffix;
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
