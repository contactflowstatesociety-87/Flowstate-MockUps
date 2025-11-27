import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import type { Operation, GenerateVideosResponse, GenerateContentResponse } from "@google/genai";

// ==========================================
// 1. TYPES
// ==========================================

export type WorkflowStep = 'upload' | 'flatlay' | 'animate' | 'scene';
export type AnimationPreset = '360 Spin' | 'Walking' | 'Windy' | 'Jumping Jacks' | 'Arm Flex' | 'Sleeve in Pocket';
export type AspectRatio = '16:9' | '9:16';
export type GenerationMode = 'default' | 'strict' | 'flexible' | 'ecommerce' | 'luxury' | 'complex';

export interface AnimationConfig {
  preset: AnimationPreset | null;
  aspectRatio: AspectRatio;
  customPrompt: string | null;
  generateStatic: boolean;
  generateVideo: boolean;
}

export interface Asset {
  id: string;
  type: 'image' | 'video';
  label?: string;
  originalFile: { name: string; type: string; };
  originalB64: string;
  processedB64?: string;
  processedUrl?: string;
  prompt?: string;
}

export interface EditorState {
  currentStep: WorkflowStep;
  generationMode: GenerationMode;
  uploadedAssets: Asset[];
  generatedFlatLays: Asset[];
  selectedFlatLays: Asset[];
  staticMockup: Asset | null;
  animatedMockup: Asset | null;
  animationConfig: AnimationConfig;
}

interface GenerationResult {
    base64: string;
    mimeType: string;
}

// ==========================================
// 2. AI SERVICE (Gemini & Veo) - FULL PROMPTS
// ==========================================

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const withRetry = async <T,>(apiCall: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> => {
  let attempts = 0;
  let delay = initialDelay;
  while (attempts < maxRetries) {
    try {
      return await apiCall();
    } catch (error: any) {
      attempts++;
      const msg = (error.message || '').toLowerCase();
      if ((msg.includes('503') || msg.includes('overloaded')) && attempts < maxRetries) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      } else throw error;
    }
  }
  throw new Error('Exhausted retries');
};

const modeHeaderMap: Record<string, string> = {
  default: "Mode Default5X. Use the full Flowstate Society 5X Generation Engine. You must generate one of each style (Strict, Flexible, Ecommerce, Luxury, Complex) to provide a full range of options.",
  strict: "Mode Strict. Activate Strict Only Mode. Generate only strict outputs with locked lighting, locked camera, and zero creative variation.",
  flexible: "Mode Flexible. Activate Flexible Only Mode. Generate only flexible premium creative outputs while keeping product details accurate.",
  ecommerce: "Mode Ecommerce. Activate Ecommerce Optimized Mode for clean white or light gray backgrounds and marketplace ready outputs.",
  luxury: "Mode Luxury. Activate Luxury Brand Advertising Mode with cinematic lighting and premium commercial style while preserving product accuracy.",
  complex: "Mode ComplexMaterial. Activate Complex Material Mode for highly accurate soft shell, down, fleece, nylon, leather, and other technical fabrics."
};

const getModeHeader = (mode: GenerationMode) => modeHeaderMap[mode] || modeHeaderMap['default'];

const transformImage = async (base64Images: string | string[], mimeType: string, prompt: string): Promise<GenerationResult> => {
    const ai = getAiClient();
    const images = Array.isArray(base64Images) ? base64Images : [base64Images];
    // Explicitly cast to any to satisfy the SDK's internal typing if strictly checked, though standard structure is correct.
    const parts: any[] = images.filter(Boolean).map(b64 => ({ inlineData: { data: b64, mimeType } }));
    parts.push({ text: prompt });

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE] },
    }));

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData?.data) {
        return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' };
    }
    throw new Error("No image generated.");
};

const aiService = {
  generateStrictFlatLay: async (base64Image: string, mimeType: string, mode: GenerationMode) => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 1 & 2: STRICT MODE FLAT LAY
Generate an ULTRA-HIGH RESOLUTION 8K studio flat lay of this product.
Rules:
- Extract Product Truth File from image.
- Preserve exact silhouette, logo placement, stitching, and fabric texture.
- CRITICAL: EXACT COPY REQUIRED. DO NOT CHANGE LOGO, TEXT, OR COLORS.
- Use clean light gray to white gradient studio background.
- Soft, balanced, diffused lighting.
- No creative angles. Straight down.
- Pixel perfect accuracy to the original.
- Remove all original background imperfections.`;
    return transformImage(base64Image, mimeType, prompt);
  },

  generateStrict3DMockup: async (base64Images: string[], mimeType: string, mode: GenerationMode) => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 2: STRICT MODE 3D MOCKUP
Generate an ULTRA-HIGH RESOLUTION 8K 3D studio mockup photo.

CATEGORY ANALYSIS & RULES:
1. IF CLOTHING (Jacket, Hoodie, Shirt, Pants):
   - Use INVISIBLE GHOST MANNEQUIN.
   - The clothing must look like it is floating in mid-air.
   - Hollow clothing form. NO VISIBLE MANNEQUIN. NO CLEAR OR GLASS MANNEQUIN. NO BODY PARTS VISIBLE.
   - Show the inside of the collar/neck area if applicable.
   - Clothing must hang naturally with realistic physics.

2. IF ACCESSORY / HARD GOODS (Watch, Bag, Shoe, Hat, Bottle):
   - Display as a floating 3D product object.
   - CRITICAL: PRESERVE EXACT DIAL DETAILS, MARKERS, HANDS, AND BRANDING.
   - DO NOT REBRAND. DO NOT ALTER COLORS.
   - DO NOT use a mannequin. DO NOT morph into clothing.
   - Maintain rigid or semi-rigid structure appropriate for the material.
   - Center in frame, floating in mid-air.

UNIVERSAL RULES:
- Preserve all original product details (logos, colors, seams). DO NOT COMPROMISE LOGOS.
- Lighting: Soft diffused studio light, no harsh contrast.
- Background: Clean studio gray/white.
- Camera: Centered, 50-85mm lens equivalent.`;
    return transformImage(base64Images, mimeType, prompt);
  },

  generateFlexibleStudioPhoto: async (base64Images: string[], mimeType: string, mode: GenerationMode) => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 3: FLEXIBLE MODE STUDIO PHOTO
Generate a Premium Enhanced 8K Studio Photo.

CATEGORY ANALYSIS:
- IF CLOTHING: Use INVISIBLE GHOST MANNEQUIN. Floating in mid-air. Hollow form. NO CLEAR OR GLASS MANNEQUIN.
- IF ACCESSORY/WATCH/BAG: Display as floating 3D product. DO NOT morph into clothing.
  - CRITICAL: EXACT REPLICA OF DIAL, LOGO, AND TEXTURE REQUIRED.

Rules:
- Maintain product accuracy (colors, logos, details). DO NOT COMPROMISE LOGOS.
- Allow creative lighting (rim lights, gradients, dramatic shadows).
- Allow creative background (dark, textured, or soft commercial backdrop).
- Camera angle can be slightly more dynamic.
- Enhance fabric/material microtexture and realism.
- Look like a high-end commercial campaign.`;
    return transformImage(base64Images, mimeType, prompt);
  },

  editImage: async (base64: string, mimeType: string, userPrompt: string) => {
    const prompt = `Edit this image based on the following instruction: "${userPrompt}". 
    Maintain the highest quality and resolution. 
    If there are specific markup lines or colors drawn on the image, use them as a guide for the edit, then remove the markup lines in the final output. 
    Preserve all other details of the product exactly as they are.`;
    return transformImage(base64, mimeType, prompt);
  },

  generateFlexibleVideo: async (base64Image: string, mimeType: string, mode: GenerationMode): Promise<Operation<GenerateVideosResponse>> => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 3: FLEXIBLE MODE 3D ANIMATED VIDEO
Generate a 4K 3D animated mockup video.

CATEGORY ANALYSIS & RULES (CRITICAL):
1. IF CLOTHING (Jacket, Shirt, Hoodie):
   - Use INVISIBLE GHOST MANNEQUIN.
   - Hollow clothing form. NO VISIBLE MANNEQUIN. NO BODY PARTS.
   - Show inside of collar.
   - Fabric moves with gentle breeze or breathing motion.

2. IF ACCESSORY (Watch, Bag, Shoe):
   - Display as a 3D object floating in mid-air.
   - CRITICAL: EXACT COPY OF ORIGINAL PRODUCT. DO NOT CHANGE LOGO.
   - PRESERVE WATCH FACES, DIALS, AND TEXT EXACTLY.
   - DO NOT morph into clothing.
   - DO NOT use a mannequin.
   - Rigid/Semi-rigid motion (slow float, rotation).

UNIVERSAL RULES:
- SILENT VIDEO. NO AUDIO TRACK.
- Maintain 100% product design accuracy. DO NOT COMPROMISE LOGOS.
- Clean professional studio lighting.
- Smooth camera motion (slow orbit or gentle push in).
- Output must be professional, hyper realistic, ecommerce grade.`;

    const ai = getAiClient();
    return ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        image: { imageBytes: base64Image, mimeType },
        prompt,
        config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '9:16' }
    });
  },

  generateVideoFromImage: async (base64Image: string, mimeType: string, prompt: string, aspectRatio: '16:9' | '9:16'): Promise<Operation<GenerateVideosResponse>> => {
    const ai = getAiClient();
    const safePrompt = `${prompt} 
    CRITICAL: 
    1. EXACT COPY OF PRODUCT. DO NOT CHANGE LOGOS, COLORS, OR TEXT. 
    2. IF WATCH/ACCESSORY: PRESERVE DIAL AND HANDS EXACTLY. DO NOT MORPH INTO CLOTHING.
    3. SILENT VIDEO. NO AUDIO TRACK.`;

    return ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        image: { imageBytes: base64Image, mimeType },
        prompt: safePrompt,
        config: { numberOfVideos: 1, resolution: '1080p', aspectRatio }
    });
  },

  checkVideoOperationStatus: async (operation: Operation<GenerateVideosResponse>) => {
      const ai = getAiClient();
      return ai.operations.getVideosOperation({ operation });
  }
};

// ==========================================
// 3. UI COMPONENTS
// ==========================================

const Loader = ({ message }: { message: string }) => (
  <div className="fixed inset-0 bg-gray-900/80 flex flex-col items-center justify-center z-[100] text-white">
    <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
    <p className="mt-6 text-lg font-semibold">{message}</p>
  </div>
);

const ApiKeyModal = ({ onSelectKey }: { onSelectKey: () => void }) => (
  <div className="fixed inset-0 bg-gray-900/75 flex items-center justify-center z-[60] p-4">
    <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full border border-gray-700 text-white">
      <h2 className="text-2xl font-bold mb-4">API Key Required</h2>
      <p className="text-gray-400 mb-6">Select a paid API key for video generation.</p>
      <button onClick={onSelectKey} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">Select API Key</button>
    </div>
  </div>
);

// --- Mode Selector ---
const ModeSelector = ({ selectedMode, onChangeMode }: { selectedMode: GenerationMode; onChangeMode: (m: GenerationMode) => void }) => {
  const modes: { key: GenerationMode; label: string; desc: string }[] = [
    { key: 'default', label: 'Default 5X', desc: 'Generates 6 assets: All styles + Video.' },
    { key: 'strict', label: 'Strict Only', desc: '2 Flat Lays, 2 Static 3D Mockups.' },
    { key: 'flexible', label: 'Flexible Only', desc: '2 Creative Photos, 2 Videos.' },
    { key: 'ecommerce', label: 'Ecommerce', desc: 'Clean. 1 Flat, 1 Mockup, 1 Photo, 1 Video.' },
    { key: 'luxury', label: 'Luxury', desc: 'Cinematic. 1 Flat, 1 Mockup, 1 Photo, 1 Video.' },
    { key: 'complex', label: 'Complex Mat.', desc: 'Texture Focus. 1 Flat, 1 Mockup, 1 Photo, 1 Video.' },
  ];

  return (
    <div className="w-full mb-6 relative z-20">
      <label className="block text-sm font-bold text-gray-200 mb-2">Generation Mode</label>
      <div className="flex flex-wrap gap-2">
        {modes.map((mode, index) => {
            let positionClasses = "left-1/2 transform -translate-x-1/2 text-center";
            let arrowClasses = "left-1/2 transform -translate-x-1/2";
            if (index === 0) { positionClasses = "left-0 text-left"; arrowClasses = "left-4"; }
            else if (index === modes.length - 1) { positionClasses = "right-0 text-right"; arrowClasses = "right-4"; }

            return (
              <div key={mode.key} className="group relative">
                <button
                  onClick={() => onChangeMode(mode.key)}
                  className={`px-3 py-1 text-sm rounded-full border transition-all ${selectedMode === mode.key ? 'bg-gray-900 text-white border-gray-900 font-bold' : 'text-gray-400 border-gray-700 hover:text-blue-500 hover:border-blue-500'}`}
                >
                  {mode.label}
                </button>
                <div className={`absolute bottom-full mb-2 w-48 p-3 bg-gray-700 text-white text-xs rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-gray-600 z-50 ${positionClasses}`}>
                  {mode.desc}
                  <div className={`absolute top-full border-4 border-transparent border-t-gray-700 ${arrowClasses}`}></div>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};

// --- Canvas & Assets ---
const normalizeImage = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 3072;
      let { width, height } = img;
      if (width > MAX || height > MAX) { const r = Math.min(MAX/width, MAX/height); width*=r; height*=r; }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if(ctx) {
          ctx.drawImage(img, 0,0,width,height);
          const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          resolve({ base64: canvas.toDataURL(mime, mime==='image/jpeg'?0.95:undefined).split(',')[1], mimeType: mime });
      } else reject(new Error("Canvas error"));
    };
    img.src = url;
  });
};

const Canvas = ({ assets, selectedIds, onSelect, onPreview, onDownload }: any) => {
  const isGrid = assets.length > 1;
  return (
    <div className="flex-1 bg-gray-900 rounded-lg p-4 overflow-hidden flex items-center justify-center relative">
      {assets.length === 0 ? <div className="text-gray-500 text-center">Upload an image to start</div> : 
      <div className={`${isGrid ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto w-full h-full' : 'w-full h-full flex items-center justify-center'}`}>
        {assets.map((asset: Asset) => (
          <div key={asset.id} 
               onClick={() => onSelect && onSelect(asset)}
               className={`relative group rounded-lg overflow-hidden bg-gray-800 ${isGrid ? 'h-64 w-full' : 'h-full w-full max-w-2xl'} ${selectedIds?.includes(asset.id) ? 'ring-4 ring-blue-500' : 'ring-1 ring-gray-700'}`}>
            {asset.type === 'video' ? <video src={asset.processedUrl} className="w-full h-full object-contain" controls muted loop /> 
            : <img src={`data:${asset.originalFile.type};base64,${asset.originalB64}`} className="w-full h-full object-contain" alt="" />}
            
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
              <button onClick={(e) => {e.stopPropagation(); onPreview(asset)}} className="bg-white/20 p-2 rounded-full text-white hover:bg-white/40">🔍</button>
              <button onClick={(e) => {e.stopPropagation(); onDownload(asset)}} className="bg-white/20 p-2 rounded-full text-white hover:bg-white/40">⬇️</button>
            </div>
            {asset.label && <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs p-1 text-center truncate">{asset.label}</div>}
          </div>
        ))}
      </div>}
    </div>
  );
};

// ==========================================
// 4. MAIN COMPONENT (FlowstateUnified)
// ==========================================

export default function FlowstateUnified() {
  const [editorState, setEditorState] = useState<EditorState>({
    currentStep: 'upload', generationMode: 'default', uploadedAssets: [], generatedFlatLays: [], selectedFlatLays: [], staticMockup: null, animatedMockup: null,
    animationConfig: { preset: '360 Spin', aspectRatio: '9:16', customPrompt: null, generateStatic: true, generateVideo: true }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState<string|null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset|null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const checkVideoResolution = (videoUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => resolve(video.videoWidth >= 1080 || video.videoHeight >= 1080);
        video.onerror = () => resolve(false);
        video.src = videoUrl;
    });
  };

  const handleVeoOperation = async (videoGenerator: () => Promise<Operation<GenerateVideosResponse>>): Promise<Asset> => {
      let attempts = 0; const maxAttempts = 3;
      while(attempts < maxAttempts) {
          attempts++;
          if(attempts > 1) setLoadingMsg(`Retrying video (Attempt ${attempts}/${maxAttempts}) for 1080p...`);
          
          let op = await videoGenerator();
          while(!op.done) { await new Promise(r => setTimeout(r, 5000)); op = await aiService.checkVideoOperationStatus(op); }
          
          const uri = op.response?.generatedVideos?.[0]?.video?.uri;
          if(uri) {
              const res = await fetch(`${uri}&key=${process.env.API_KEY}`);
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              if(await checkVideoResolution(url)) return { id: `vid-${Date.now()}`, type: 'video', originalFile: { name: 'video.mp4', type: 'video/mp4' }, originalB64: '', processedUrl: url };
          }
      }
      throw new Error("Failed to generate 1080p video after retries.");
  };

  const handleUpload = async (files: File[]) => {
    setIsLoading(true); setLoadingMsg("Normalizing...");
    try {
        const newAssets = await Promise.all(files.map(async f => {
            const { base64, mimeType } = await normalizeImage(f);
            return { id: `up-${Date.now()}-${Math.random()}`, type: 'image', originalFile: { name: f.name, type: mimeType }, originalB64: base64 } as Asset;
        }));
        setEditorState(p => ({ ...p, uploadedAssets: newAssets, currentStep: 'flatlay' }));
    } catch(e: any) { setError(e.message); }
    setIsLoading(false);
  };

  const handleGenerate = async () => {
    if(!editorState.uploadedAssets.length) return;
    setIsLoading(true); setError(null);
    const baseAsset = editorState.uploadedAssets[0];
    const newAssets: Asset[] = [];
    const mode = editorState.generationMode;
    const addAsset = (res: GenerationResult, label: string) => {
        newAssets.push({ id: `gen-${Date.now()}-${Math.random()}`, type: 'image', label, originalFile: { name: 'gen.png', type: res.mimeType }, originalB64: res.base64 });
    };

    try {
        if (mode === 'default') {
            setLoadingMsg("Generating 5X Suite...");
            
            setLoadingMsg("1/7: Strict Flat Lay...");
            addAsset(await aiService.generateStrictFlatLay(baseAsset.originalB64, baseAsset.originalFile.type, 'strict'), "Strict Flat Lay");
            
            setLoadingMsg("2/7: Strict 3D Mockup...");
            addAsset(await aiService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'strict'), "Strict 3D Mockup");
            
            setLoadingMsg("3/7: Flexible Studio Photo...");
            addAsset(await aiService.generateFlexibleStudioPhoto([baseAsset.originalB64], baseAsset.originalFile.type, 'flexible'), "Flexible Photo");
            
            setLoadingMsg("4/7: Ecommerce Mockup...");
            addAsset(await aiService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'ecommerce'), "Ecommerce Mockup");
            
            setLoadingMsg("5/7: Luxury Photo...");
            addAsset(await aiService.generateFlexibleStudioPhoto([baseAsset.originalB64], baseAsset.originalFile.type, 'luxury'), "Luxury Photo");
            
            setLoadingMsg("6/7: Complex Mockup...");
            addAsset(await aiService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'complex'), "Complex Mockup");

            setLoadingMsg("7/7: Animated Video...");
            try {
                const vid = await handleVeoOperation(() => aiService.generateFlexibleVideo(baseAsset.originalB64, baseAsset.originalFile.type, 'default'));
                vid.label = "Default 5X Video"; newAssets.push(vid);
            } catch(e) { console.warn("Video failed", e); }

        } else if (mode === 'strict') {
            setLoadingMsg("Generating Strict Set...");
            addAsset(await aiService.generateStrictFlatLay(baseAsset.originalB64, baseAsset.originalFile.type, 'strict'), "Strict Flat Lay 1");
            addAsset(await aiService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'strict'), "Strict Mockup 1");
            addAsset(await aiService.generateStrictFlatLay(baseAsset.originalB64, baseAsset.originalFile.type, 'strict'), "Strict Flat Lay 2");
            addAsset(await aiService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'strict'), "Strict Mockup 2");
        } else if (mode === 'flexible') {
             setLoadingMsg("Generating Flexible Set...");
             addAsset(await aiService.generateFlexibleStudioPhoto([baseAsset.originalB64], baseAsset.originalFile.type, 'flexible'), "Flex Photo 1");
             addAsset(await aiService.generateFlexibleStudioPhoto([baseAsset.originalB64], baseAsset.originalFile.type, 'flexible'), "Flex Photo 2");
             try { newAssets.push(await handleVeoOperation(() => aiService.generateFlexibleVideo(baseAsset.originalB64, baseAsset.originalFile.type, 'flexible'))); } catch(e){}
             try { newAssets.push(await handleVeoOperation(() => aiService.generateFlexibleVideo(baseAsset.originalB64, baseAsset.originalFile.type, 'flexible'))); } catch(e){}
        } else {
             // Specific Modes
             setLoadingMsg(`Generating ${mode} assets...`);
             addAsset(await aiService.generateStrictFlatLay(baseAsset.originalB64, baseAsset.originalFile.type, mode), `${mode} Flat`);
             addAsset(await aiService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, mode), `${mode} Mockup`);
             addAsset(await aiService.generateFlexibleStudioPhoto([baseAsset.originalB64], baseAsset.originalFile.type, mode), `${mode} Photo`);
             try { newAssets.push(await handleVeoOperation(() => aiService.generateFlexibleVideo(baseAsset.originalB64, baseAsset.originalFile.type, mode))); } catch(e){}
        }

        setEditorState(p => ({ ...p, generatedFlatLays: newAssets, selectedFlatLays: [] }));
    } catch(e: any) { setError(e.message); if(e.message.includes('Key')) setShowKeyModal(true); }
    setIsLoading(false);
  };

  const handleAnimate = async () => {
     if(!editorState.selectedFlatLays.length) return;
     setIsLoading(true); setError(null);
     const primary = editorState.selectedFlatLays[0];
     const { preset, customPrompt, aspectRatio, generateStatic, generateVideo } = editorState.animationConfig;

     try {
         if(generateStatic) {
             setLoadingMsg("Generating Static Mockup...");
             const res = await aiService.generateStrict3DMockup(editorState.selectedFlatLays.map(x=>x.originalB64), primary.originalFile.type, editorState.generationMode);
             setEditorState(p => ({...p, staticMockup: { id: `stat-${Date.now()}`, type: 'image', label: 'Static Mockup', originalFile: {name:'static.png', type: res.mimeType}, originalB64: res.base64 }}));
         }
         if(generateVideo) {
             setLoadingMsg("Generating Video...");
             let prompt = "Hyper realistic 3D mockup video. ";
             if(customPrompt) prompt += `Action: ${customPrompt}. `;
             else if(preset) prompt += `Action: ${preset}. `;
             prompt += "Rules: CLOTHING=GHOST MANNEQUIN. ACCESSORY=FLOATING. ";
             
             const vid = await handleVeoOperation(() => aiService.generateVideoFromImage(primary.originalB64, primary.originalFile.type, prompt, aspectRatio));
             vid.label = "Animated Video";
             setEditorState(p => ({...p, animatedMockup: vid, currentStep: 'scene'}));
         }
     } catch(e: any) { setError(e.message); if(e.message.includes('Key')) setShowKeyModal(true); }
     setIsLoading(false);
  };

  // Render
  const getAssets = () => {
      if(editorState.currentStep === 'upload') return editorState.uploadedAssets;
      if(editorState.currentStep === 'flatlay') return editorState.generatedFlatLays.length ? editorState.generatedFlatLays : editorState.uploadedAssets;
      const res = []; if(editorState.staticMockup) res.push(editorState.staticMockup); if(editorState.animatedMockup) res.push(editorState.animatedMockup);
      return res.length ? res : editorState.selectedFlatLays;
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
      {isLoading && <Loader message={loadingMsg} />}
      {error && <div className="fixed top-4 right-4 bg-red-600 text-white p-3 rounded z-50">{error} <button onClick={()=>setError(null)} className="ml-2 font-bold">x</button></div>}
      {showKeyModal && <ApiKeyModal onSelectKey={async()=>{await (window as any).aistudio?.openSelectKey(); setShowKeyModal(false)}} />}
      {previewAsset && (
        <div className="fixed inset-0 bg-black/95 z-[70] flex items-center justify-center p-4">
            <button className="absolute top-4 right-4 text-white text-2xl" onClick={()=>setPreviewAsset(null)}>✕</button>
            {previewAsset.type==='video' ? <video src={previewAsset.processedUrl} controls className="max-h-full" /> : <img src={`data:${previewAsset.originalFile.type};base64,${previewAsset.originalB64}`} className="max-h-full" />}
        </div>
      )}

      {/* Sidebar */}
      <div className={`${sidebarOpen?'translate-x-0':'-translate-x-full'} md:translate-x-0 transition-transform fixed md:static inset-y-0 left-0 w-80 bg-gray-800 border-r border-gray-700 z-30 flex flex-col`}>
          <div className="p-4 border-b border-gray-700 font-bold text-xl text-blue-500">Flowstate Engine</div>
          
          <div className="p-4 flex-1 overflow-y-auto">
             <ModeSelector selectedMode={editorState.generationMode} onChangeMode={(m)=>setEditorState(p=>({...p, generationMode: m}))} />
             <div className="space-y-6 mt-6">
                 <div className={`pl-4 border-l-2 ${editorState.currentStep==='upload'?'border-blue-500':'border-gray-700'}`}>
                     <h3 className="font-bold text-sm mb-2">1. Upload Image</h3>
                     {editorState.currentStep==='upload' && <input type="file" onChange={(e)=>e.target.files && handleUpload(Array.from(e.target.files))} className="text-xs w-full text-gray-400 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-800 file:text-blue-500 hover:file:bg-gray-700"/>}
                 </div>
                 
                 <div className={`pl-4 border-l-2 ${editorState.currentStep==='flatlay'?'border-blue-500':'border-gray-700'}`}>
                     <h3 className="font-bold text-sm mb-2">2. Generate Assets</h3>
                     {editorState.currentStep==='flatlay' && <button onClick={handleGenerate} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded transition-colors">Generate Suite</button>}
                     {editorState.generatedFlatLays.length > 0 && <button onClick={()=>setEditorState(p=>({...p, currentStep: 'animate'}))} disabled={!editorState.selectedFlatLays.length} className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 rounded disabled:opacity-50">Next Step &rarr;</button>}
                 </div>

                 <div className={`pl-4 border-l-2 ${editorState.currentStep==='animate'?'border-blue-500':'border-gray-700'}`}>
                     <h3 className="font-bold text-sm mb-2">3. Animate</h3>
                     {editorState.currentStep==='animate' && (
                         <div className="space-y-3">
                             <div className="flex gap-2 text-xs">
                                 <label className="flex items-center gap-1"><input type="checkbox" checked={editorState.animationConfig.generateStatic} onChange={e=>setEditorState(p=>({...p, animationConfig: {...p.animationConfig, generateStatic: e.target.checked}}))} /> Static</label>
                                 <label className="flex items-center gap-1"><input type="checkbox" checked={editorState.animationConfig.generateVideo} onChange={e=>setEditorState(p=>({...p, animationConfig: {...p.animationConfig, generateVideo: e.target.checked}}))} /> Video</label>
                             </div>
                             <textarea placeholder="Describe motion (e.g. 360 spin)" className="w-full bg-gray-800 text-white text-xs p-2 rounded border border-gray-700" rows={2} onChange={e=>setEditorState(p=>({...p, animationConfig: {...p.animationConfig, customPrompt: e.target.value}}))}></textarea>
                             <button onClick={handleAnimate} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded">Create</button>
                         </div>
                     )}
                 </div>
             </div>
          </div>
      </div>

      <div className="flex-1 flex flex-col p-6 relative bg-gray-950">
          <button className="md:hidden absolute top-4 left-4 z-40 bg-gray-800 p-2 rounded text-white" onClick={()=>setSidebarOpen(!sidebarOpen)}>☰</button>
          <Canvas assets={getAssets()} selectedIds={editorState.selectedFlatLays.map(x=>x.id)} onSelect={(a: Asset)=>setEditorState(p=>{const e=p.selectedFlatLays.find(x=>x.id===a.id); return {...p, selectedFlatLays: e?p.selectedFlatLays.filter(x=>x.id!==a.id):[...p.selectedFlatLays, a]}})} onPreview={setPreviewAsset} onDownload={(a: Asset)=>{const l=document.createElement('a'); l.href=a.type==='video'?a.processedUrl!: `data:${a.originalFile.type};base64,${a.originalB64}`; l.download=a.originalFile.name; l.click()}} />
      </div>
    </div>
  );
}