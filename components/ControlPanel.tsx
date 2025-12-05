
import React, { useState, useRef } from 'react';
import { LayoutTemplate, Zap, Leaf, Diamond, Radio, Upload, Type, ChevronDown, Sparkles, Plus, Image as ImageIcon, Camera, Sun, Box, Trash2, Link as LinkIcon, Shirt, Cuboid } from 'lucide-react';
import { AestheticStyle, AspectRatio, MockupConfig, Resolution, STYLES, GenerationMode } from '../types';

interface ControlPanelProps {
  isLoading: boolean;
  onSubmit: (config: MockupConfig) => void;
}

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
  <div className="group/tooltip relative flex justify-center">
    {children}
    <div className="absolute bottom-full mb-2 hidden group-hover/tooltip:block bg-black text-white text-[10px] px-2 py-1 rounded border border-gray-800 whitespace-normal min-w-[120px] max-w-[200px] z-50 text-center pointer-events-none shadow-xl">
      {text}
    </div>
  </div>
);

const SCANNER_VIEWS = [
  { id: '3d-mockup', label: '3D Mockup Lab', text: '100% Accurate 3D Mockup Replica. High fidelity, 6K resolution, 360 degree view.' },
  { id: 'multi-angle', label: 'Multi Angle Photoshoot', text: 'Cinematic streetwear outfit check, waist level, handheld organic movement' },
  { id: 'exploded', label: 'Exploded View', text: 'Technical exploded view showing components floating apart' },
  { id: 'front', label: 'Front Ortho', text: 'Perfectly flat front orthographic view' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({ isLoading, onSubmit }) => {
  const [activeTab, setActiveTab] = useState<GenerationMode>('text');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<AestheticStyle>('Modern Minimal');
  const [ratio, setRatio] = useState<AspectRatio>('1:1');
  const [resolution, setResolution] = useState<Resolution>('4K');
  
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [scannerImages, setScannerImages] = useState<string[]>([]);
  const [scannerView, setScannerView] = useState('3d-mockup');
  const [productUrl, setProductUrl] = useState('');
  
  const [showPrompts, setShowPrompts] = useState(false);
  
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string[]>>, current: string[]) => {
    const files = e.target.files;
    if (files) {
      const remaining = 4 - current.length;
      Array.from(files).slice(0, remaining).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => setter(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalPrompt = prompt;
    if (activeTab === '3d-scanner') {
      const viewText = SCANNER_VIEWS.find(v => v.id === scannerView)?.text || '3D Render';
      finalPrompt = `3D Mockup Reconstruction. ${viewText}. ${prompt}`;
    }
    onSubmit({
      mode: activeTab,
      prompt: finalPrompt,
      style,
      ratio,
      resolution,
      images: activeTab === '3d-scanner' ? scannerImages : (activeTab === 'upload' ? uploadedImages : undefined),
      productUrl: activeTab === '3d-scanner' ? productUrl : undefined,
      scannerView: activeTab === '3d-scanner' ? scannerView : undefined
    });
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'layout-template': return <LayoutTemplate size={16} />;
      case 'zap': return <Zap size={16} />;
      case 'leaf': return <Leaf size={16} />;
      case 'diamond': return <Diamond size={16} />;
      case 'radio': return <Radio size={16} />;
      case 'shirt': return <Shirt size={16} />;
      default: return <LayoutTemplate size={16} />;
    }
  };

  return (
    <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold leading-tight">
          Design <span className="text-gradient">Anything</span> <br />in Seconds.
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Forge photorealistic product mockups in up to 4K resolution. Upload your own assets or generate from scratch using Gemini 3.0 Pro.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 bg-[#121214] border border-[#27272a] rounded-xl p-5 shadow-2xl relative">
        <div className="flex bg-black/40 p-1 rounded-lg border border-[#27272a]">
          {['text', 'upload', '3d-scanner'].map((m) => (
             <button key={m} type="button" onClick={() => setActiveTab(m as GenerationMode)} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${activeTab === m ? 'bg-[#FFC20E] text-black font-bold' : 'text-gray-500 hover:text-white'}`}>
                {m === 'text' && <Type size={14} />}
                {m === 'upload' && <Upload size={14} />}
                {m === '3d-scanner' && <Cuboid size={14} />}
                {m === '3d-scanner' ? '3D Mockup' : m.charAt(0).toUpperCase() + m.slice(1)}
             </button>
          ))}
        </div>

        {activeTab === '3d-scanner' && (
           <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                 {scannerImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-[#27272a]">
                       <img src={img} className="w-full h-full object-cover" />
                       <button type="button" onClick={() => setScannerImages(p => p.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white"><Trash2 size={12} /></button>
                    </div>
                 ))}
                 {scannerImages.length < 4 && (
                    <div onClick={() => scannerInputRef.current?.click()} className="aspect-square border-2 border-dashed border-[#27272a] hover:border-[#FFC20E] rounded-lg flex flex-col items-center justify-center cursor-pointer text-gray-500 hover:text-[#FFC20E]">
                       <Plus size={24} /> <span className="text-[10px] font-bold mt-2">ADD PHOTO</span>
                    </div>
                 )}
              </div>
              <input ref={scannerInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFilesChange(e, setScannerImages, scannerImages)} />
              <input type="url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="Product URL..." className="w-full bg-black/30 border border-[#27272a] rounded-lg p-3 text-xs text-white" />
              <div className="grid grid-cols-2 gap-2">
                 {SCANNER_VIEWS.map(v => (
                    <button key={v.id} type="button" onClick={() => setScannerView(v.id)} className={`px-2 py-2 rounded text-[10px] border ${scannerView === v.id ? 'bg-[#FFC20E] text-black border-[#FFC20E] font-bold' : 'border-[#27272a] text-gray-400'}`}>{v.label}</button>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'upload' && (
           <div className="grid grid-cols-2 gap-2">
                 {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-[#27272a]">
                       <img src={img} className="w-full h-full object-cover" />
                       <button type="button" onClick={() => setUploadedImages(p => p.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white"><Trash2 size={12} /></button>
                    </div>
                 ))}
                 {uploadedImages.length < 4 && (
                    <div onClick={() => uploadInputRef.current?.click()} className="aspect-square border-2 border-dashed border-[#27272a] hover:border-[#FFC20E] rounded-lg flex flex-col items-center justify-center cursor-pointer text-gray-500 hover:text-[#FFC20E]">
                       <Plus size={24} /> <span className="text-[10px] font-bold mt-2">ADD IMAGE</span>
                    </div>
                 )}
                 <input ref={uploadInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFilesChange(e, setUploadedImages, uploadedImages)} />
           </div>
        )}

        <div className="relative">
           <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your product..." className="w-full bg-black/30 border border-[#27272a] rounded-lg p-3 pb-10 text-sm text-white min-h-[100px] resize-none focus:border-[#FFC20E]" />
           <button type="button" onClick={() => setShowPrompts(!showPrompts)} className="absolute right-2 bottom-2 bg-[#FFC20E]/10 text-[#FFC20E] text-xs px-2 py-1 rounded border border-[#FFC20E]/20">Prompt Builder</button>
        </div>

        <div className="grid grid-cols-2 gap-2">
            {STYLES.map((s) => (
              <button key={s.id} type="button" onClick={() => setStyle(s.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs text-left ${style === s.id ? 'bg-[#FFC20E] text-black border-[#FFC20E] font-bold' : 'border-[#27272a] text-gray-400'}`}>
                {getIcon(s.icon)} {s.id}
              </button>
            ))}
        </div>

        <div className="flex gap-2">
           <select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)} className="flex-1 bg-black/30 border border-[#27272a] rounded-lg text-xs text-white p-2"><option value="1:1">1:1</option><option value="9:16">9:16</option></select>
           <select value={resolution} onChange={(e) => setResolution(e.target.value as Resolution)} className="flex-1 bg-black/30 border border-[#27272a] rounded-lg text-xs text-white p-2"><option value="4K">4K</option></select>
        </div>

        <button type="submit" disabled={isLoading} className="w-full bg-[#FFC20E] text-black h-12 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#e6af0b]">
          {isLoading ? 'Generating...' : 'GENERATE MOCKUPS'}
        </button>
      </form>
    </div>
  );
};
