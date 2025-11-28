
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import type { Operation, GenerateVideosResponse, GenerateContentResponse } from "@google/genai";
import { ChevronDown } from 'lucide-react';
import { engineService } from '../services/geminiService'; // Use shared service
import { Asset, EditorState, AnimationConfig, AnimationPreset, WorkflowStep, EngineMode } from '../types';

// ==========================================
// 1. TYPES
// ==========================================
// Types imported from ../types.ts to ensure consistency

// ==========================================
// 3. UI COMPONENTS
// ==========================================

const Loader = ({ message }: { message: string }) => (
  <div className="fixed inset-0 bg-gray-900/80 flex flex-col items-center justify-center z-[100] text-white">
    <div className="w-16 h-16 border-4 border-t-transparent border-[#FFC20E] rounded-full animate-spin"></div>
    <p className="mt-6 text-lg font-semibold">{message}</p>
  </div>
);

const ApiKeyModal = ({ onSelectKey }: { onSelectKey: () => void }) => (
  <div className="fixed inset-0 bg-gray-900/75 flex items-center justify-center z-[60] p-4">
    <div className="bg-[#18181b] rounded-xl p-8 max-w-md w-full border border-[#27272a] text-white shadow-2xl">
      <h2 className="text-2xl font-bold mb-4">API Key Required</h2>
      <p className="text-gray-400 mb-6">Select a paid API key for video generation.</p>
      <button onClick={onSelectKey} className="w-full bg-[#FFC20E] text-black py-3 rounded-lg hover:bg-[#e6af0b] font-bold">Select API Key</button>
    </div>
  </div>
);

// --- Mode Selector ---
const ModeSelector = ({ selectedMode, onChangeMode }: { selectedMode: EngineMode; onChangeMode: (m: EngineMode) => void }) => {
  const modes: { key: EngineMode; label: string; desc: string }[] = [
    { key: 'default', label: 'Default 5X', desc: 'Generates 6 assets: All styles + Video.' },
    { key: 'strict', label: 'Strict Only', desc: '2 Flat Lays, 2 Static 3D Mockups.' },
    { key: 'flexible', label: 'Flexible Only', desc: '2 Creative Photos, 2 Videos.' },
    { key: 'ecommerce', label: 'Ecommerce', desc: 'Clean. 1 Flat, 1 Mockup, 1 Photo, 1 Video.' },
    { key: 'luxury', label: 'Luxury', desc: 'Cinematic. 1 Flat, 1 Mockup, 1 Photo, 1 Video.' },
    { key: 'complex', label: 'Complex Mat.', desc: 'Texture Focus. 1 Flat, 1 Mockup, 1 Photo, 1 Video.' },
    { key: '3d-mockup', label: '3D Lab', desc: 'Pure 3D Mockup. Strict 6K Resolution.' }
  ];

  return (
    <div className="w-full mb-6 relative z-20">
      <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Generation Mode</label>
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
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${selectedMode === mode.key ? 'bg-[#FFC20E] text-black border-[#FFC20E]' : 'text-gray-400 border-[#27272a] hover:text-white hover:border-gray-500'}`}
                >
                  {mode.label}
                </button>
                <div className={`absolute bottom-full mb-2 w-48 p-3 bg-[#18181b] text-white text-xs rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-[#27272a] z-50 ${positionClasses}`}>
                  {mode.desc}
                  <div className={`absolute top-full border-4 border-transparent border-t-[#18181b] ${arrowClasses}`}></div>
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
    <div className="flex-1 bg-[#121214] border border-[#27272a] rounded-2xl p-4 overflow-hidden flex items-center justify-center relative shadow-inner">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #3f3f46 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
      {assets.length === 0 ? (
        <div className="text-gray-500 text-center flex flex-col items-center">
            <p>Upload an image to start the Engine</p>
        </div>
      ) : (
      <div className={`${isGrid ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto w-full h-full p-4' : 'w-full h-full flex items-center justify-center'}`}>
        {assets.map((asset: Asset) => (
          <div key={asset.id} 
               onClick={() => onSelect && onSelect(asset)}
               className={`relative group rounded-xl overflow-hidden bg-[#18181b] border transition-all cursor-pointer ${isGrid ? 'aspect-[4/5] w-full' : 'h-full w-full max-w-2xl aspect-[4/5]'} ${selectedIds?.includes(asset.id) ? 'border-[#FFC20E] ring-1 ring-[#FFC20E]' : 'border-gray-800 hover:border-gray-600'}`}>
            {asset.type === 'video' ? <video src={asset.processedUrl} className="w-full h-full object-cover" controls muted loop /> 
            : <img src={`data:${asset.originalFile.type};base64,${asset.originalB64}`} className="w-full h-full object-cover" alt="" />}
            
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
              <button onClick={(e) => {e.stopPropagation(); onPreview(asset)}} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white backdrop-blur">
                🔍 View
              </button>
              <button onClick={(e) => {e.stopPropagation(); onDownload(asset)}} className="bg-[#FFC20E] hover:bg-[#e6af0b] p-2 rounded-lg text-black font-bold">
                ⬇️ Save
              </button>
            </div>
            {asset.label && <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider p-2 text-center">{asset.label}</div>}
          </div>
        ))}
      </div>
      )}
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

  // Animation Presets
  const ANIMATION_PRESETS: AnimationPreset[] = [
    '360 Spin', 'Walking', 'Windy', 'Jumping Jacks', 'Arm Flex', 'Sleeve in Pocket'
  ];

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
          while(!op.done) { await new Promise(r => setTimeout(r, 5000)); op = await engineService.checkVideoOperationStatus(op); }
          
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
    const addAsset = (res: { base64: string, mimeType: string }, label: string) => {
        newAssets.push({ id: `gen-${Date.now()}-${Math.random()}`, type: 'image', label, originalFile: { name: 'gen.png', type: res.mimeType }, originalB64: res.base64 });
    };

    try {
        if (mode === 'default') {
            setLoadingMsg("Generating 5X Suite...");
            
            setLoadingMsg("1/8: Strict Flat Lay...");
            addAsset(await engineService.generateStrictFlatLay(baseAsset.originalB64, baseAsset.originalFile.type, 'strict'), "Strict Flat Lay");
            
            setLoadingMsg("2/8: Strict 3D Mockup...");
            addAsset(await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'strict'), "Strict 3D Mockup");
            
            setLoadingMsg("3/8: Flexible Studio Photo...");
            addAsset(await engineService.generateFlexibleStudioPhoto([baseAsset.originalB64], baseAsset.originalFile.type, 'flexible'), "Flexible Photo");
            
            setLoadingMsg("4/8: Ecommerce Mockup...");
            addAsset(await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'ecommerce'), "Ecommerce Mockup");
            
            setLoadingMsg("5/8: Luxury Photo...");
            addAsset(await engineService.generateFlexibleStudioPhoto([baseAsset.originalB64], baseAsset.originalFile.type, 'luxury'), "Luxury Photo");
            
            setLoadingMsg("6/8: Complex Mockup...");
            addAsset(await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'complex'), "Complex Mockup");

            setLoadingMsg("7/8: 3D Lab Mockup...");
            addAsset(await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, '3d-mockup'), "3D Lab Mockup");

            setLoadingMsg("8/8: Animated Video...");
            try {
                const vid = await handleVeoOperation(() => engineService.generateFlexibleVideo(baseAsset.originalB64, baseAsset.originalFile.type, 'default'));
                vid.label = "Default 5X Video"; newAssets.push(vid);
            } catch(e) { console.warn("Video failed", e); }

        } else if (mode === 'strict') {
            setLoadingMsg("Generating Strict Set...");
            addAsset(await engineService.generateStrictFlatLay(baseAsset.originalB64, baseAsset.originalFile.type, 'strict'), "Strict Flat Lay 1");
            addAsset(await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'strict'), "Strict Mockup 1");
            addAsset(await engineService.generateStrictFlatLay(baseAsset.originalB64, baseAsset.originalFile.type, 'strict'), "Strict Flat Lay 2");
            addAsset(await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'strict'), "Strict Mockup 2");
        } else if (mode === '3d-mockup') {
             setLoadingMsg("Generating 3D Lab Assets...");
             addAsset(await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, '3d-mockup'), "3D Mockup 1");
             addAsset(await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, '3d-mockup'), "3D Mockup 2");
             try { newAssets.push(await handleVeoOperation(() => engineService.generateFlexibleVideo(baseAsset.originalB64, baseAsset.originalFile.type, '3d-mockup'))); } catch(e){}
             try { newAssets.push(await handleVeoOperation(() => engineService.generateFlexibleVideo(baseAsset.originalB64, baseAsset.originalFile.type, '3d-mockup'))); } catch(e){}
        } else {
             // Specific Modes
             setLoadingMsg(`Generating ${mode} assets...`);
             addAsset(await engineService.generateStrictFlatLay(baseAsset.originalB64, baseAsset.originalFile.type, mode), `${mode} Flat`);
             addAsset(await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, mode), `${mode} Mockup`);
             addAsset(await engineService.generateFlexibleStudioPhoto([baseAsset.originalB64], baseAsset.originalFile.type, mode), `${mode} Photo`);
             try { newAssets.push(await handleVeoOperation(() => engineService.generateFlexibleVideo(baseAsset.originalB64, baseAsset.originalFile.type, mode))); } catch(e){}
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
             const res = await engineService.generateStrict3DMockup(editorState.selectedFlatLays.map(x=>x.originalB64), primary.originalFile.type, editorState.generationMode);
             setEditorState(p => ({...p, staticMockup: { id: `stat-${Date.now()}`, type: 'image', label: 'Static Mockup', originalFile: {name:'static.png', type: res.mimeType}, originalB64: res.base64 }}));
         }
         if(generateVideo) {
             setLoadingMsg("Generating Video...");
             let prompt = "Hyper realistic 3D mockup video. ";
             if(customPrompt) prompt += `Action: ${customPrompt}. `;
             else if(preset) prompt += `Action: ${preset}. `;
             prompt += "Rules: CLOTHING=GHOST MANNEQUIN. ACCESSORY=FLOATING. ";
             
             const vid = await handleVeoOperation(() => engineService.generateVideoFromImage(primary.originalB64, primary.originalFile.type, prompt, aspectRatio));
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
    <div className="flex h-screen bg-[#050505] text-gray-100 font-sans overflow-hidden">
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
      <div className={`${sidebarOpen?'translate-x-0':'-translate-x-full'} md:translate-x-0 transition-transform fixed md:static inset-y-0 left-0 w-80 bg-[#121214] border-r border-[#27272a] z-30 flex flex-col`}>
          <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-1">Creative Workflow</h2>
              <p className="text-xs text-gray-400">Follow the steps to bring your design to life.</p>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto">
             <ModeSelector selectedMode={editorState.generationMode} onChangeMode={(m)=>setEditorState(p=>({...p, generationMode: m}))} />
             <div className="space-y-6 mt-6">
                 {/* Step 1 */}
                 <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${editorState.currentStep==='upload' ? 'bg-[#FFC20E] text-black' : 'bg-gray-700 text-gray-400'}`}>1</div>
                        <div className="w-0.5 flex-grow bg-gray-700 my-1"></div>
                    </div>
                    <div className="flex-1 pb-4">
                        <h3 className="font-bold text-sm mb-2">Upload Images</h3>
                        <p className="text-xs text-gray-400 mb-3">Upload your product design for best results.</p>
                        {editorState.currentStep==='upload' ? (
                            <label className="block w-full bg-[#FFC20E] hover:bg-[#e6af0b] text-black text-sm font-bold py-2 rounded text-center cursor-pointer transition-colors">
                                Upload Image
                                <input type="file" onChange={(e)=>e.target.files && handleUpload(Array.from(e.target.files))} className="hidden" />
                            </label>
                        ) : (
                            editorState.uploadedAssets.length > 0 && <div className="text-xs text-green-500 font-bold">✓ Uploaded</div>
                        )}
                    </div>
                 </div>
                 
                 {/* Step 2 */}
                 <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${editorState.currentStep==='flatlay' ? 'bg-[#FFC20E] text-black' : 'bg-gray-700 text-gray-400'}`}>2</div>
                        <div className="w-0.5 flex-grow bg-gray-700 my-1"></div>
                    </div>
                    <div className="flex-1 pb-4">
                        <h3 className="font-bold text-sm mb-2">Generate</h3>
                        {editorState.currentStep==='flatlay' ? (
                            <button onClick={handleGenerate} className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold py-2 rounded transition-colors">Generate Assets</button>
                        ) : (
                            editorState.generatedFlatLays.length > 0 && <div className="text-xs text-green-500 font-bold">✓ Generated</div>
                        )}
                        {editorState.generatedFlatLays.length > 0 && editorState.currentStep==='flatlay' && (
                             <button onClick={()=>setEditorState(p=>({...p, currentStep: 'animate'}))} disabled={!editorState.selectedFlatLays.length} className="w-full mt-2 bg-[#FFC20E] hover:bg-[#e6af0b] text-black text-sm font-bold py-2 rounded disabled:opacity-50">Next Step &rarr;</button>
                        )}
                    </div>
                 </div>

                 {/* Step 3 */}
                 <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${editorState.currentStep==='animate' ? 'bg-[#FFC20E] text-black' : 'bg-gray-700 text-gray-400'}`}>3</div>
                        <div className="w-0.5 flex-grow bg-gray-700 my-1"></div>
                    </div>
                    <div className="flex-1 pb-4">
                        <h3 className="font-bold text-sm mb-2">Create Animation</h3>
                        {editorState.currentStep==='animate' && (
                         <div className="space-y-3 bg-[#18181b] p-3 rounded-lg border border-[#27272a]">
                             <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-400">GENERATE VIDEO</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={editorState.animationConfig.generateVideo} onChange={e => setEditorState(p => ({...p, animationConfig: {...p.animationConfig, generateVideo: e.target.checked}}))} />
                                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FFC20E]"></div>
                                </label>
                             </div>
                             
                             <div>
                                <label className="text-[10px] font-bold text-gray-400 block mb-1">PRESET</label>
                                <div className="relative">
                                    <select 
                                        className="w-full bg-[#121214] text-white text-xs rounded p-2 appearance-none border border-[#27272a] focus:border-[#FFC20E] outline-none"
                                        value={editorState.animationConfig.preset || ''}
                                        onChange={(e) => setEditorState(p => ({...p, animationConfig: {...p.animationConfig, preset: e.target.value as AnimationPreset}}))}
                                    >
                                        <option value="">Select a preset...</option>
                                        {ANIMATION_PRESETS.map(preset => (
                                            <option key={preset} value={preset}>{preset}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" size={12} />
                                </div>
                             </div>

                             <div>
                                <label className="text-[10px] font-bold text-gray-400 block mb-1">CUSTOM PROMPT</label>
                                <textarea 
                                    placeholder="Describe motion..." 
                                    className="w-full bg-[#121214] text-white text-xs p-2 rounded border border-[#27272a] focus:border-[#FFC20E] outline-none resize-none" 
                                    rows={2} 
                                    onChange={e=>setEditorState(p=>({...p, animationConfig: {...p.animationConfig, customPrompt: e.target.value}}))}
                                ></textarea>
                             </div>

                             <button onClick={handleAnimate} className="w-full bg-[#FFC20E] hover:bg-[#e6af0b] text-black text-sm font-bold py-2 rounded transition-colors">Create</button>
                         </div>
                        )}
                    </div>
                 </div>
                 
                 {/* Step 4 */}
                 <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${editorState.currentStep==='scene' ? 'bg-[#FFC20E] text-black' : 'bg-gray-700 text-gray-400'}`}>4</div>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-sm text-gray-400">Place in Scene</h3>
                    </div>
                 </div>

             </div>
          </div>
      </div>

      <div className="flex-1 flex flex-col p-6 relative bg-[#050505]">
          <button className="md:hidden absolute top-4 left-4 z-40 bg-[#121214] p-2 rounded text-white" onClick={()=>setSidebarOpen(!sidebarOpen)}>☰</button>
          
          <div className="flex-1 flex items-center justify-center">
             <Canvas assets={getAssets()} selectedIds={editorState.selectedFlatLays.map(x=>x.id)} onSelect={(a: Asset)=>setEditorState(p=>{const e=p.selectedFlatLays.find(x=>x.id===a.id); return {...p, selectedFlatLays: e?p.selectedFlatLays.filter(x=>x.id!==a.id):[...p.selectedFlatLays, a]}})} onPreview={setPreviewAsset} onDownload={(a: Asset)=>{const l=document.createElement('a'); l.href=a.type==='video'?a.processedUrl!: `data:${a.originalFile.type};base64,${a.originalB64}`; l.download=a.originalFile.name; l.click()}} />
          </div>
      </div>
    </div>
  );
}