
import React, { useState } from 'react';
import { engineService } from '../services/geminiService';
import { Asset, EditorState, AnimationPreset, EngineMode, WorkflowStep } from '../types';
import { Upload, Video, Image as ImageIcon, Download, Play, Plus, Trash2, Box, Layers, Film, ArrowRight } from 'lucide-react';

const Loader = ({ message }: { message: string }) => (
  <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[100] text-white backdrop-blur-sm">
    <div className="w-16 h-16 border-4 border-t-transparent border-[#FFC20E] rounded-full animate-spin"></div>
    <p className="mt-6 text-lg font-bold tracking-wider">{message}</p>
  </div>
);

export default function FlowstateUnified() {
  const [editorState, setEditorState] = useState<EditorState>({
    currentStep: 'upload', 
    generationMode: 'default', 
    uploadedAssets: [], 
    generatedFlatLays: [], 
    selectedFlatLays: [], 
    staticMockup: null, 
    animatedMockup: null,
    animationConfig: { preset: '360 Spin', aspectRatio: '9:16', customPrompt: null, generateStatic: true, generateVideo: true }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState<string|null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset|null>(null);

  const ANIMATION_PRESETS: AnimationPreset[] = ['360 Spin', 'Walking', 'Windy', 'Jumping Jacks', 'Arm Flex', 'Sleeve in Pocket'];

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

  const handleUpload = async (files: File[]) => {
    setIsLoading(true); setLoadingMsg("Processing High-Res Uploads...");
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
            setLoadingMsg("Running Default 5X Engine...");
            const r1 = await engineService.generateStrictFlatLay(baseAsset.originalB64, baseAsset.originalFile.type, 'strict'); addAsset(r1, "Strict Flat Lay");
            const r2 = await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'strict'); addAsset(r2, "Strict 3D Mockup");
            const r3 = await engineService.generateFlexibleStudioPhoto([baseAsset.originalB64], baseAsset.originalFile.type, 'flexible'); addAsset(r3, "Flexible Photo");
            const r4 = await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'ecommerce'); addAsset(r4, "Ecommerce Mockup");
            const r5 = await engineService.generateFlexibleStudioPhoto([baseAsset.originalB64], baseAsset.originalFile.type, 'luxury'); addAsset(r5, "Luxury Photo");
            
            setLoadingMsg("Generating 360 Spin Video (Veo)...");
            try {
                const op = await engineService.generateFlexibleVideo(baseAsset.originalB64, baseAsset.originalFile.type, 'default');
                const vidAsset = await waitForVideo(op);
                if(vidAsset) { vidAsset.label = "360 Spin Preview"; newAssets.push(vidAsset); }
            } catch (e) { console.error("Video failed", e); }

        } else if (mode === '3d-mockup') {
             setLoadingMsg("Generating 3D Mockup Lab Assets...");
             const r1 = await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'strict'); addAsset(r1, "Studio 3D Twin");
             const r2 = await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, 'strict'); addAsset(r2, "Studio 3D Twin (Alt)");
             
             setLoadingMsg("Generating 360 Turntable...");
             try {
                const op = await engineService.generateFlexibleVideo(baseAsset.originalB64, baseAsset.originalFile.type, '3d-mockup');
                const vidAsset = await waitForVideo(op);
                if(vidAsset) { vidAsset.label = "360 Turntable"; newAssets.push(vidAsset); }
             } catch (e) { console.error("Video failed", e); }
        } else {
            setLoadingMsg(`Generating ${mode} assets...`);
            const r1 = await engineService.generateStrictFlatLay(baseAsset.originalB64, baseAsset.originalFile.type, mode); addAsset(r1, `${mode} Flat`);
            const r2 = await engineService.generateStrict3DMockup([baseAsset.originalB64], baseAsset.originalFile.type, mode); addAsset(r2, `${mode} Mockup`);
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

  const waitForVideo = async (op: any): Promise<Asset | null> => {
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

  const handleAnimate = async () => {
     if(!editorState.selectedFlatLays.length) return;
     setIsLoading(true); setError(null);
     const primary = editorState.selectedFlatLays[0];
     const { preset, customPrompt, aspectRatio } = editorState.animationConfig;

     try {
         setLoadingMsg(`Generating ${preset} Video...`);
         
         // STRICT PROMPT CONSTRUCTION
         let prompt = "High fidelity product animation. ";
         if(customPrompt) prompt += `Action: ${customPrompt}. `;
         else if(preset) prompt += `Action: ${preset}. `;
         
         prompt += " RULES: 100% Product Fidelity. Do not change logo. Do not alter geometry. 6K Resolution. Smooth Motion.";
         
         const op = await engineService.generateVideoFromImage(primary.originalB64, primary.originalFile.type, prompt, aspectRatio);
         const vid = await waitForVideo(op);
         if (vid) {
             vid.label = `${preset} Video`;
             setEditorState(p => ({...p, animatedMockup: vid, currentStep: 'scene'}));
         }
     } catch(e: any) { setError(e.message); }
     setIsLoading(false);
  };

  const getAssets = () => {
      const all = [];
      if(editorState.currentStep === 'upload') return editorState.uploadedAssets;
      all.push(...editorState.generatedFlatLays);
      if(editorState.animatedMockup) all.push(editorState.animatedMockup);
      return all.length ? all : editorState.uploadedAssets;
  };

  const handleDownload = async (asset: Asset) => {
      const link = document.createElement('a');
      link.href = asset.type === 'video' && asset.processedUrl ? asset.processedUrl : `data:${asset.originalFile.type};base64,${asset.originalB64}`;
      link.download = `flowstate-${asset.label || 'asset'}.${asset.type === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="flex h-full bg-[#050505] text-gray-100 font-sans overflow-hidden">
       {isLoading && <Loader message={loadingMsg} />}
       {error && <div className="fixed top-20 right-4 bg-red-600 p-4 rounded z-50">{error} <button onClick={()=>setError(null)}>x</button></div>}

       {/* Sidebar */}
       <div className="w-80 bg-[#121214] border-r border-[#27272a] flex flex-col h-full shrink-0">
          <div className="p-6 border-b border-[#27272a]">
             <h2 className="text-xl font-bold tracking-tight">Creative Engine</h2>
             <p className="text-xs text-gray-500 mt-1">v5.0 Pro Active</p>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1 space-y-6">
             {/* Step 1 */}
             <div className={`p-4 rounded-xl border transition-all ${editorState.currentStep === 'upload' ? 'bg-[#FFC20E]/5 border-[#FFC20E]' : 'bg-[#18181b] border-[#27272a]'}`}>
                <div className="flex items-center gap-3 mb-3">
                   <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${editorState.currentStep === 'upload' ? 'bg-[#FFC20E] text-black' : 'bg-gray-700'}`}>1</span>
                   <h3 className="font-bold text-sm">Upload Source</h3>
                </div>
                {editorState.currentStep === 'upload' && (
                   <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#27272a] hover:border-[#FFC20E] rounded-lg cursor-pointer transition-colors group">
                      <Upload className="text-gray-500 group-hover:text-[#FFC20E]" />
                      <span className="text-xs font-bold text-gray-500 mt-2">Click to Upload</span>
                      <input type="file" multiple onChange={e => e.target.files && handleUpload(Array.from(e.target.files))} className="hidden" />
                   </label>
                )}
             </div>

             {/* Step 2 */}
             <div className={`p-4 rounded-xl border transition-all ${editorState.currentStep === 'flatlay' ? 'bg-[#FFC20E]/5 border-[#FFC20E]' : 'bg-[#18181b] border-[#27272a]'}`}>
                <div className="flex items-center gap-3 mb-3">
                   <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${editorState.currentStep === 'flatlay' ? 'bg-[#FFC20E] text-black' : 'bg-gray-700'}`}>2</span>
                   <h3 className="font-bold text-sm">Generate Assets</h3>
                </div>
                {editorState.currentStep === 'flatlay' && (
                   <div className="space-y-3">
                      <select 
                        value={editorState.generationMode}
                        onChange={e => setEditorState(p => ({...p, generationMode: e.target.value as EngineMode}))}
                        className="w-full bg-black border border-[#27272a] rounded px-2 py-2 text-xs"
                      >
                         <option value="default">Default 5X Suite</option>
                         <option value="3d-mockup">3D Mockup Lab (Strict)</option>
                         <option value="strict">Strict Mode Only</option>
                         <option value="flexible">Flexible Mode Only</option>
                      </select>
                      <button onClick={handleGenerate} className="w-full py-2 bg-[#FFC20E] text-black font-bold text-xs rounded hover:bg-[#e6af0b]">
                         RUN GENERATION
                      </button>
                      {editorState.generatedFlatLays.length > 0 && (
                         <button onClick={() => setEditorState(p => ({...p, currentStep: 'animate'}))} className="w-full py-2 bg-[#18181b] border border-[#FFC20E] text-[#FFC20E] font-bold text-xs rounded hover:bg-[#FFC20E]/10">
                            Proceed to Animation
                         </button>
                      )}
                   </div>
                )}
             </div>

             {/* Step 3 */}
             <div className={`p-4 rounded-xl border transition-all ${editorState.currentStep === 'animate' ? 'bg-[#FFC20E]/5 border-[#FFC20E]' : 'bg-[#18181b] border-[#27272a]'}`}>
                <div className="flex items-center gap-3 mb-3">
                   <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${editorState.currentStep === 'animate' ? 'bg-[#FFC20E] text-black' : 'bg-gray-700'}`}>3</span>
                   <h3 className="font-bold text-sm">Animate</h3>
                </div>
                {editorState.currentStep === 'animate' && (
                   <div className="space-y-3">
                      <p className="text-[10px] text-gray-400">Select an asset from the canvas first.</p>
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold text-gray-500 uppercase">Preset</label>
                         <select 
                            className="w-full bg-black border border-[#27272a] rounded px-2 py-2 text-xs"
                            value={editorState.animationConfig.preset || ''}
                            onChange={e => setEditorState(p => ({...p, animationConfig: {...p.animationConfig, preset: e.target.value as AnimationPreset}}))}
                         >
                            {ANIMATION_PRESETS.map(p => <option key={p} value={p}>{p === '360 Spin' ? '✨ 360 Spin' : p}</option>)}
                         </select>
                      </div>
                      <button onClick={handleAnimate} disabled={!editorState.selectedFlatLays.length} className="w-full py-2 bg-[#FFC20E] text-black font-bold text-xs rounded hover:bg-[#e6af0b] disabled:opacity-50">
                         GENERATE VIDEO
                      </button>
                   </div>
                )}
             </div>
          </div>
       </div>

       {/* Canvas */}
       <div className="flex-1 bg-[#050505] p-8 flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #3f3f46 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
          
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto h-full pb-20">
             {getAssets().length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center h-full text-gray-500">
                   <Box size={48} className="opacity-20 mb-4" />
                   <p>Upload a source image to begin.</p>
                </div>
             ) : (
                getAssets().map(asset => (
                   <div 
                      key={asset.id} 
                      onClick={() => setEditorState(p => {
                          const isSelected = p.selectedFlatLays.find(s => s.id === asset.id);
                          return {...p, selectedFlatLays: isSelected ? [] : [asset]}; // Single select logic for simplicity
                      })}
                      className={`relative aspect-[3/4] bg-[#121214] border rounded-xl overflow-hidden cursor-pointer group transition-all ${editorState.selectedFlatLays.find(s => s.id === asset.id) ? 'border-[#FFC20E] ring-1 ring-[#FFC20E]' : 'border-[#27272a] hover:border-gray-500'}`}
                   >
                      {asset.type === 'video' ? (
                         <video src={asset.processedUrl} className="w-full h-full object-cover" controls muted loop />
                      ) : (
                         <img src={`data:${asset.originalFile.type};base64,${asset.originalB64}`} className="w-full h-full object-cover" />
                      )}
                      
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                         <button onClick={(e) => { e.stopPropagation(); setPreviewAsset(asset); }} className="p-1.5 bg-black/60 text-white rounded hover:bg-black">
                            <ImageIcon size={14} />
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); handleDownload(asset); }} className="p-1.5 bg-[#FFC20E] text-black rounded hover:bg-[#e6af0b]">
                            <Download size={14} />
                         </button>
                      </div>
                      
                      {asset.label && (
                         <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur p-2 text-center">
                            <p className="text-[10px] font-bold text-white uppercase tracking-wider">{asset.label}</p>
                         </div>
                      )}
                   </div>
                ))
             )}
          </div>
       </div>

       {previewAsset && (
        <div className="fixed inset-0 bg-black/95 z-[80] flex items-center justify-center p-4">
            <button className="absolute top-4 right-4 text-white text-2xl hover:text-[#FFC20E]" onClick={()=>setPreviewAsset(null)}>✕</button>
            {previewAsset.type==='video' ? <video src={previewAsset.processedUrl} controls className="max-h-[90vh]" /> : <img src={`data:${previewAsset.originalFile.type};base64,${previewAsset.originalB64}`} className="max-h-[90vh] object-contain" />}
        </div>
      )}
    </div>
  );
}
