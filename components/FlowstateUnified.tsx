
import React, { useState } from 'react';
import type { Operation, GenerateVideosResponse } from "@google/genai";
import { ChevronDown, Star } from 'lucide-react';
import { engineService } from '../services/geminiService';
import { Asset, EditorState, AnimationPreset, EngineMode } from '../types';

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
      <button onClick={onSelectKey} className="w-full bg-[#FFC20E] text-black py-3 rounded-lg hover:bg-[#e6af0b] font-bold">Select API Key</button>
    </div>
  </div>
);

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

  const ANIMATION_PRESETS: AnimationPreset[] = [
    '360 Spin', 'Walking', 'Windy', 'Jumping Jacks', 'Arm Flex', 'Sleeve in Pocket'
  ];

  const handleVeoOperation = async (videoGenerator: () => Promise<Operation<GenerateVideosResponse>>): Promise<Asset> => {
      let attempts = 0; const maxAttempts = 3;
      while(attempts < maxAttempts) {
          attempts++;
          let op = await videoGenerator();
          while(!op.done) { await new Promise(r => setTimeout(r, 5000)); op = await engineService.checkVideoOperationStatus(op); }
          const uri = op.response?.generatedVideos?.[0]?.video?.uri;
          if(uri) {
              const res = await fetch(`${uri}&key=${process.env.API_KEY}`);
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              return { id: `vid-${Date.now()}`, type: 'video', originalFile: { name: 'video.mp4', type: 'video/mp4' }, originalB64: '', processedUrl: url };
          }
      }
      throw new Error("Video generation failed.");
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
        setLoadingMsg("Generating Assets...");
        if (mode === 'default') {
            addAsset(await engineService.generateStrictFlatLay(baseAsset.originalB64, baseAsset.originalFile.type, 'strict'), "Strict Flat Lay");
            addAsset(await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'strict'), "Strict 3D Mockup");
            addAsset(await engineService.generateFlexibleStudioPhoto([baseAsset.originalB64], baseAsset.originalFile.type, 'flexible'), "Flexible Photo");
            addAsset(await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, '3d-mockup'), "3D Lab Mockup");
            try { newAssets.push(await handleVeoOperation(() => engineService.generateFlexibleVideo(baseAsset.originalB64, baseAsset.originalFile.type, 'default'))); } catch(e){}
        } else {
             addAsset(await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, mode), `${mode} Mockup`);
        }
        setEditorState(p => ({ ...p, generatedFlatLays: newAssets, selectedFlatLays: [] }));
    } catch(e: any) { setError(e.message); if(e.message.includes('Key')) setShowKeyModal(true); }
    setIsLoading(false);
  };

  const handleAnimate = async () => {
     if(!editorState.selectedFlatLays.length) return;
     setIsLoading(true); setError(null);
     const primary = editorState.selectedFlatLays[0];
     const { preset, customPrompt, aspectRatio } = editorState.animationConfig;

     try {
         setLoadingMsg("Generating Video...");
         let prompt = "Hyper realistic 3D mockup video. ";
         if(customPrompt) prompt += `Action: ${customPrompt}. `;
         else if(preset) prompt += `Action: ${preset}. `;
         prompt += "Rules: CLOTHING=GHOST MANNEQUIN. ACCESSORY=FLOATING. ";
         
         const vid = await handleVeoOperation(() => engineService.generateVideoFromImage(primary.originalB64, primary.originalFile.type, prompt, aspectRatio));
         vid.label = "Animated Video";
         setEditorState(p => ({...p, animatedMockup: vid, currentStep: 'scene'}));
     } catch(e: any) { setError(e.message); }
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
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto">
             <div className="space-y-6 mt-6">
                 {/* Step 1 */}
                 <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${editorState.currentStep==='upload' ? 'bg-[#FFC20E] text-black' : 'bg-gray-700 text-gray-400'}`}>1</div>
                        <div className="w-0.5 flex-grow bg-gray-700 my-1"></div>
                    </div>
                    <div className="flex-1 pb-4">
                        <h3 className="font-bold text-sm mb-2">Upload Images</h3>
                        {editorState.currentStep==='upload' && (
                            <label className="block w-full bg-[#FFC20E] hover:bg-[#e6af0b] text-black text-sm font-bold py-2 rounded text-center cursor-pointer transition-colors">
                                Upload Image
                                <input type="file" onChange={(e)=>e.target.files && handleUpload(Array.from(e.target.files))} className="hidden" />
                            </label>
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
                        {editorState.currentStep==='flatlay' && (
                            <button onClick={handleGenerate} className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold py-2 rounded transition-colors">Generate Assets</button>
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
                                            <option key={preset} value={preset}>{preset} {preset === '360 Spin' ? '✨' : ''}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" size={12} />
                                </div>
                             </div>
                             <button onClick={handleAnimate} className="w-full bg-[#FFC20E] hover:bg-[#e6af0b] text-black text-sm font-bold py-2 rounded transition-colors">Create</button>
                         </div>
                        )}
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
