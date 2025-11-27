
import React, { useState } from 'react';
import type { Operation, GenerateVideosResponse } from "@google/genai";
import { Asset, EditorState, EngineMode } from '../types';
import { engineService } from '../services/geminiService';
import { Box } from 'lucide-react';

const Loader = ({ message }: { message: string }) => (
  <div className="fixed inset-0 bg-gray-900/80 flex flex-col items-center justify-center z-[100] text-white">
    <div className="w-16 h-16 border-4 border-t-transparent border-[#FFC20E] rounded-full animate-spin"></div>
    <p className="mt-6 text-lg font-semibold">{message}</p>
  </div>
);

const Toast = ({ message }: { message: string | null }) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 bg-green-600 text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-bounce">
      {message}
    </div>
  );
};

const ModeSelector = ({ selectedMode, onChangeMode }: { selectedMode: EngineMode; onChangeMode: (m: EngineMode) => void }) => {
  const modes: { key: EngineMode; label: string; desc: string }[] = [
    { key: 'default', label: 'Default 5X', desc: 'Generates 6 assets: All styles + Video.' },
    { key: 'strict', label: 'Strict Only', desc: '2 Flat Lays, 2 Static 3D Mockups.' },
    { key: 'flexible', label: 'Flexible Only', desc: '2 Creative Photos, 2 Videos.' },
    { key: 'ecommerce', label: 'Ecommerce', desc: 'Clean. 1 Flat, 1 Mockup, 1 Photo, 1 Video.' },
    { key: 'luxury', label: 'Luxury', desc: 'Cinematic. 1 Flat, 1 Mockup, 1 Photo, 1 Video.' },
    { key: 'complex', label: 'Complex Mat.', desc: 'Texture Focus. 1 Flat, 1 Mockup, 1 Photo, 1 Video.' },
  ];

  return (
    <div className="w-full mb-6 relative z-20">
      <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Generation Mode</label>
      <div className="flex flex-wrap gap-2">
        {modes.map((mode) => (
          <div key={mode.key} className="group relative">
            <button
              onClick={() => onChangeMode(mode.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${selectedMode === mode.key ? 'bg-[#FFC20E] text-black border-[#FFC20E]' : 'text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'}`}
            >
              {mode.label}
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 border border-gray-800 text-gray-300 text-xs rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-center z-30">
              {mode.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

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
            <Box className="w-12 h-12 mb-4 opacity-50" />
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

export default function FlowstateTool() {
  const [editorState, setEditorState] = useState<EditorState>({
    currentStep: 'upload', generationMode: 'default', uploadedAssets: [], generatedFlatLays: [], selectedFlatLays: [], staticMockup: null, animatedMockup: null,
    animationConfig: { preset: '360 Spin', aspectRatio: '9:16', customPrompt: null, generateStatic: true, generateVideo: true }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState<string|null>(null);
  const [toast, setToast] = useState<string|null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset|null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleUpload = async (files: File[]) => {
    setIsLoading(true); setLoadingMsg("Processing uploads...");
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
            const r1 = await engineService.generateStrictFlatLay(baseAsset.originalB64, baseAsset.originalFile.type, 'strict'); addAsset(r1, "Strict Flat Lay");
            const r2 = await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'strict'); addAsset(r2, "Strict 3D Mockup");
            const r3 = await engineService.generateFlexibleStudioPhoto([baseAsset.originalB64], baseAsset.originalFile.type, 'flexible'); addAsset(r3, "Flexible Photo");
            const r4 = await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'ecommerce'); addAsset(r4, "Ecommerce Mockup");
            const r5 = await engineService.generateFlexibleStudioPhoto([baseAsset.originalB64], baseAsset.originalFile.type, 'luxury'); addAsset(r5, "Luxury Photo");
            
            setLoadingMsg("Generating Video (Veo 3.1)...");
            const op = await engineService.generateFlexibleVideo(baseAsset.originalB64, baseAsset.originalFile.type, 'default');
            const vidAsset = await waitForVideo(op);
            if(vidAsset) { vidAsset.label = "Video"; newAssets.push(vidAsset); }
        } else {
            setLoadingMsg(`Generating ${mode} assets...`);
            const r1 = await engineService.generateStrictFlatLay(baseAsset.originalB64, baseAsset.originalFile.type, mode); addAsset(r1, `${mode} Flat Lay`);
            const r2 = await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, mode); addAsset(r2, `${mode} Mockup`);
            // Add variation for specific modes
            const r3 = await engineService.generateFlexibleStudioPhoto([baseAsset.originalB64], baseAsset.originalFile.type, mode); addAsset(r3, `${mode} Photo`);
        }
        setEditorState(p => ({ ...p, generatedFlatLays: newAssets, selectedFlatLays: [] }));
    } catch(e: any) { 
        setError(e.message); 
        if(e.message.includes('Key')) {
             await (window as any).aistudio?.openSelectKey();
        }
    }
    setIsLoading(false);
  };

  const waitForVideo = async (op: Operation<GenerateVideosResponse>): Promise<Asset | null> => {
      let operation = op;
      while(!operation.done) { await new Promise(r => setTimeout(r, 5000)); operation = await engineService.checkVideoOperationStatus(operation); }
      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if(uri) {
          const res = await fetch(`${uri}&key=${process.env.API_KEY}`);
          const blob = await res.blob();
          return { id: `vid-${Date.now()}`, type: 'video', originalFile: { name: 'video.mp4', type: 'video/mp4' }, originalB64: '', processedUrl: URL.createObjectURL(blob) };
      }
      return null;
  };
  
  const handleSelect = (a: Asset) => {
      setEditorState(p => {
          const exists = p.selectedFlatLays.find(x => x.id === a.id);
          return { ...p, selectedFlatLays: exists ? p.selectedFlatLays.filter(x => x.id !== a.id) : [...p.selectedFlatLays, a] };
      });
  };

  const getAssets = () => {
      if(editorState.currentStep === 'upload') return editorState.uploadedAssets;
      // Show generated results if available
      return editorState.generatedFlatLays.length ? editorState.generatedFlatLays : editorState.uploadedAssets;
  };

  return (
    <div className="flex h-full bg-[#050505] text-white font-sans overflow-hidden relative">
      {isLoading && <Loader message={loadingMsg} />}
      {error && <div className="fixed top-4 right-4 bg-red-500 text-white p-3 rounded-lg z-[80] shadow-xl border border-red-400">{error} <button onClick={()=>setError(null)} className="ml-2 font-bold">✕</button></div>}
      {toast && <Toast message={toast} />}
      
      {/* Sidebar */}
      <div className={`${sidebarOpen?'translate-x-0':'-translate-x-full'} lg:translate-x-0 transition-transform absolute lg:relative inset-y-0 left-0 w-80 bg-[#121214] border-r border-[#27272a] z-30 flex flex-col`}>
          <div className="p-6 border-b border-[#27272a]">
              <h2 className="font-bold text-xl tracking-tight text-white">Flowstate<span className="text-[#FFC20E]">.engine</span></h2>
          </div>
          <div className="p-6 flex-grow overflow-y-auto">
              <ModeSelector selectedMode={editorState.generationMode} onChangeMode={(m) => setEditorState(p => ({...p, generationMode: m}))} />
              
              <div className="space-y-6 mt-4">
                  <div className={`p-4 rounded-xl border ${editorState.currentStep==='upload'?'border-[#FFC20E] bg-[#FFC20E]/5': 'border-[#27272a] bg-[#18181b]'}`}>
                      <h3 className="font-bold text-sm text-gray-200 mb-2">1. UPLOAD SOURCE</h3>
                      {editorState.currentStep==='upload' && (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#27272a] rounded-lg cursor-pointer hover:border-[#FFC20E] transition-colors">
                             <div className="text-xs text-gray-500 font-bold">Click to Upload</div>
                             <input type="file" onChange={(e)=>e.target.files && handleUpload(Array.from(e.target.files))} className="hidden" />
                        </label>
                      )}
                  </div>
                  <div className={`p-4 rounded-xl border ${editorState.currentStep==='flatlay'?'border-[#FFC20E] bg-[#FFC20E]/5': 'border-[#27272a] bg-[#18181b]'}`}>
                      <h3 className="font-bold text-sm text-gray-200 mb-2">2. GENERATE ASSETS</h3>
                      {editorState.currentStep==='flatlay' && <button onClick={handleGenerate} className="mt-2 w-full bg-[#FFC20E] text-black py-3 rounded-lg font-bold hover:bg-[#e6af0b] transition-colors shadow-lg">Run Engine</button>}
                  </div>
              </div>
          </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col p-4 lg:p-8 relative">
          <button className="lg:hidden absolute top-4 left-4 z-40 bg-[#121214] p-2 rounded-lg border border-[#27272a]" onClick={()=>setSidebarOpen(!sidebarOpen)}>☰</button>
          <Canvas assets={getAssets()} selectedIds={editorState.selectedFlatLays.map(x=>x.id)} onSelect={handleSelect} onPreview={setPreviewAsset} onDownload={(a: Asset) => { const l = document.createElement('a'); l.href = a.type==='video'?a.processedUrl!: `data:${a.originalFile.type};base64,${a.originalB64}`; l.download = a.originalFile.name; l.click(); }} />
      </div>

      {previewAsset && (
        <div className="fixed inset-0 bg-black/95 z-[70] flex items-center justify-center p-4">
            <button className="absolute top-4 right-4 text-white text-2xl hover:text-[#FFC20E]" onClick={()=>setPreviewAsset(null)}>✕</button>
            {previewAsset.type==='video' ? <video src={previewAsset.processedUrl} controls className="max-h-[90vh]" /> : <img src={`data:${previewAsset.originalFile.type};base64,${previewAsset.originalB64}`} className="max-h-[90vh] object-contain" />}
        </div>
      )}
    </div>
  );
}
