
import React, { useState, useRef } from 'react';
import { LayoutTemplate, Zap, Leaf, Diamond, Radio, Upload, Type, ChevronDown, Sparkles, Plus, Image as ImageIcon, Camera, Sun, Box, Trash2, Scan, Link as LinkIcon, Shirt } from 'lucide-react';
import { AestheticStyle, AspectRatio, MockupConfig, Resolution, STYLES, GenerationMode } from '../types';

interface ControlPanelProps {
  isLoading: boolean;
  onSubmit: (config: MockupConfig) => void;
}

// Simple Tooltip Component
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  return (
    <div className="group/tooltip relative flex justify-center">
      {children}
      <div className="absolute bottom-full mb-2 hidden group-hover/tooltip:block bg-black text-white text-[10px] px-2 py-1 rounded border border-gray-800 whitespace-normal min-w-[120px] max-w-[200px] z-50 text-center pointer-events-none shadow-xl">
        {text}
      </div>
    </div>
  );
};

// Prompt Builder Data
const SCENES = [
  { id: 'studio', label: 'Clean Studio', text: 'centered on a pristine white cylindrical pedestal, soft evenly diffused studio lighting, minimal backdrop', icon: LayoutTemplate, tooltip: 'Classic e-commerce look with white background and soft shadows.' },
  { id: 'beach', label: 'Luxury Beach', text: 'laying on a sun bathing chair on a private luxury beach, turquoise ocean in background, warm sunny vibe', icon: Sun, tooltip: 'High-end vacation setting with sun, sand, and ocean vibes.' },
  { id: 'editorial', label: 'Editorial', text: 'artistic high-fashion magazine photography style, sharp dramatic shadows, bold geometric composition, avant-garde props', icon: Camera, tooltip: 'Bold, artistic lighting and composition seen in fashion magazines.' },
  { id: 'urban', label: 'Cyberpunk City', text: 'floating in a rainy neon-lit alleyway, wet pavement reflections, glowing cyan and magenta lights', icon: Zap, tooltip: 'Futuristic night city with neon lights and wet reflections.' },
  { id: 'custom', label: 'Custom...', text: '', icon: Sparkles, tooltip: 'Describe your own unique setting.' },
];

const MOODS = [
  { id: 'soft', label: 'Soft Daylight', text: 'soft diffused natural lighting, gentle shadows', tooltip: 'Neutral, flattering natural light suitable for most products.' },
  { id: 'golden', label: 'Golden Hour', text: 'warm sunset lighting, dramatic long shadows, lens flare', tooltip: 'Warm, emotional lighting from sunset/sunrise.' },
  { id: 'neon', label: 'Neon Noir', text: 'pink and cyan rim lighting, high contrast, moody atmosphere', tooltip: 'Dark environment with colored accent lights.' },
  { id: 'studio_light', label: 'Pro Studio', text: 'three-point lighting setup, sharp details, high key', tooltip: 'Professional photography lighting setup for maximum clarity.' },
];

const ANGLES = [
  { id: 'eye', label: 'Eye Level', text: 'straight-on eye level view', tooltip: 'Standard view, like seeing the product on a shelf.' },
  { id: 'top', label: 'Top Down', text: 'flat lay top-down perspective', tooltip: 'Looking straight down. Great for layout and organizing.' },
  { id: 'iso', label: 'Isometric', text: 'orthographic isometric 3D view', tooltip: 'Technical 3D view, great for apps and software UI.' },
  { id: 'low', label: 'Low Hero', text: 'low angle hero shot looking up', tooltip: 'Looking up at the product, making it look grand and important.' },
];

const SCANNER_VIEWS = [
  { id: 'multi-angle', label: 'Multi Angle Photoshoot', text: 'Cinematic streetwear outfit check, waist level, handheld organic movement' },
  { id: 'exploded', label: 'Exploded View', text: 'Technical exploded view showing components floating apart' },
  { id: 'front', label: 'Front Ortho', text: 'Perfectly flat front orthographic view' },
  { id: 'hero', label: 'Hero Perspective', text: 'Dramatic 35mm lens hero shot with depth of field' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({ isLoading, onSubmit }) => {
  const [activeTab, setActiveTab] = useState<GenerationMode>('text');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<AestheticStyle>('Modern Minimal');
  const [ratio, setRatio] = useState<AspectRatio>('1:1');
  const [resolution, setResolution] = useState<Resolution>('4K');
  
  // Single/Multi Image State
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // 3D Scanner State
  const [scannerImages, setScannerImages] = useState<string[]>([]);
  const [scannerView, setScannerView] = useState('multi-angle');
  const [productUrl, setProductUrl] = useState('');
  
  // Prompt Builder State
  const [showPrompts, setShowPrompts] = useState(false);
  const [selectedScene, setSelectedScene] = useState<string>('');
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [selectedAngle, setSelectedAngle] = useState<string>('');
  const [customSceneText, setCustomSceneText] = useState('');

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper for multi-upload (Upload Mode)
  const handleUploadFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const remainingSlots = 4 - uploadedImages.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => setUploadedImages(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Helper for multi-upload (Scanner Mode)
  const handleScannerFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const remainingSlots = 4 - scannerImages.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => setScannerImages(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
    }
  };

  const removeScannerImage = (index: number) => {
    setScannerImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleApplyBuilder = () => {
    let sceneText = SCENES.find(s => s.id === selectedScene)?.text || '';
    if (selectedScene === 'custom') {
      sceneText = customSceneText;
    }

    const mood = MOODS.find(m => m.id === selectedMood)?.text || '';
    const angle = ANGLES.find(a => a.id === selectedAngle)?.text || '';

    let currentSubject = prompt.trim();
    if (!currentSubject) currentSubject = "[Product]";

    const parts = [currentSubject];
    if (sceneText) parts.push(sceneText);
    if (mood) parts.push(mood);
    if (angle) parts.push(angle);

    setPrompt(parts.join(', '));
    setShowPrompts(false);
    
    if (selectedScene === 'urban') setStyle('Cyberpunk');
    if (selectedScene === 'studio') setStyle('Modern Minimal');
    if (selectedScene === 'beach') setStyle('High Luxury');
    if (selectedScene === 'editorial') setStyle('High Luxury');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt && activeTab !== '3d-scanner') return;
    if (activeTab === '3d-scanner' && scannerImages.length === 0) return;
    if (activeTab === 'upload' && uploadedImages.length === 0) return;

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

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 bg-surface border border-border rounded-xl p-5 shadow-2xl relative">
        
        {/* Tabs */}
        <div className="flex bg-black/40 p-1 rounded-lg border border-border/50">
          <button type="button" onClick={() => setActiveTab('text')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${activeTab === 'text' ? 'bg-[#FFC20E] text-black font-bold shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
            <Type size={14} /> Text
          </button>
          <button type="button" onClick={() => setActiveTab('upload')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${activeTab === 'upload' ? 'bg-[#FFC20E] text-black font-bold shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
            <Upload size={14} /> Upload
          </button>
          <button type="button" onClick={() => setActiveTab('3d-scanner')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${activeTab === '3d-scanner' ? 'bg-[#FFC20E] text-black font-bold shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
            <Scan size={14} /> 3D Scan
          </button>
        </div>

        {/* 3D SCANNER UI */}
        {activeTab === '3d-scanner' ? (
           <div className="space-y-4">
              <label className="text-xs font-bold text-gray-500 tracking-wider uppercase flex items-center gap-2">
                <Box size={12} className="text-[#FFC20E]" /> Reference Photos (Max 4)
              </label>
              <div className="grid grid-cols-2 gap-2">
                 {scannerImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                       <img src={img} className="w-full h-full object-cover" />
                       <button type="button" onClick={() => removeScannerImage(idx)} className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 p-1 rounded-full text-white transition-colors">
                         <Trash2 size={12} />
                       </button>
                    </div>
                 ))}
                 {scannerImages.length < 4 && (
                    <div onClick={() => scannerInputRef.current?.click()} className="aspect-square border-2 border-dashed border-border hover:border-[#FFC20E] hover:bg-[#FFC20E]/5 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all text-gray-500 hover:text-[#FFC20E]">
                       <Plus size={24} /> <span className="text-[10px] font-bold mt-2">ADD PHOTO</span>
                    </div>
                 )}
              </div>
              <input ref={scannerInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleScannerFilesChange} />
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 tracking-wider uppercase flex items-center gap-2">
                    <LinkIcon size={12} className="text-[#FFC20E]" /> Product Website URL
                </label>
                <input type="url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://example.com/product" className="w-full bg-black/30 border border-border rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FFC20E]/50 focus:ring-1 focus:ring-[#FFC20E]/50 transition-all font-sans" />
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-500 tracking-wider uppercase">Output View</label>
                 <div className="grid grid-cols-2 gap-2">
                    {SCANNER_VIEWS.map(v => (
                       <button key={v.id} type="button" onClick={() => setScannerView(v.id)} className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${scannerView === v.id ? 'bg-[#FFC20E] text-black border-[#FFC20E] font-bold' : 'bg-black/20 text-gray-400 border-border hover:border-gray-500'}`}>
                         {v.label}
                       </button>
                    ))}
                 </div>
              </div>
           </div>
        ) : (
          <div className="space-y-3 relative z-10">
            <label className="text-xs font-bold text-gray-500 tracking-wider uppercase flex items-center gap-2">
              <Sparkles size={12} className="text-[#FFC20E]" />
              {activeTab === 'text' ? 'Product Description' : 'Scene Composition'}
            </label>
            
            {/* UPLOAD MODE - MULTI IMAGE GRID */}
            {activeTab === 'upload' && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                 {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                       <img src={img} className="w-full h-full object-cover" />
                       <button type="button" onClick={() => removeUploadedImage(idx)} className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 p-1 rounded-full text-white transition-colors">
                         <Trash2 size={12} />
                       </button>
                    </div>
                 ))}
                 {uploadedImages.length < 4 && (
                    <div onClick={() => uploadInputRef.current?.click()} className="aspect-square border-2 border-dashed border-border hover:border-[#FFC20E] hover:bg-[#FFC20E]/5 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all text-gray-500 hover:text-[#FFC20E]">
                       <Plus size={24} /> <span className="text-[10px] font-bold mt-2">ADD PRODUCT</span>
                    </div>
                 )}
                 <input ref={uploadInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUploadFilesChange} />
              </div>
            )}

            <div className="relative group">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={activeTab === 'text' ? "e.g. A matte black aluminum water bottle..." : "e.g. Combine these items on a wooden table..."}
                className="w-full bg-black/30 border border-border rounded-lg p-3 pb-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FFC20E]/50 focus:ring-1 focus:ring-[#FFC20E]/50 transition-all min-h-[120px] resize-none font-sans"
              />
              <button type="button" onClick={() => setShowPrompts(!showPrompts)} className="absolute right-3 bottom-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#FFC20E]/10 hover:bg-[#FFC20E]/20 border border-[#FFC20E]/20 text-xs text-[#FFC20E] transition-all font-bold">
                <Sparkles size={12} /> <span>Prompt Builder</span> <ChevronDown size={10} className={`transform transition-transform ${showPrompts ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Prompt Builder Dropdown */}
              {showPrompts && (
                <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-slide-up ring-1 ring-[#FFC20E]/20">
                  <div className="p-3 border-b border-border bg-black/40">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Build your scene</h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold block mb-1">SCENE</span>
                        <div className="grid grid-cols-2 gap-1">
                          {SCENES.map(scene => (
                            <Tooltip key={scene.id} text={scene.tooltip}>
                              <button type="button" onClick={() => setSelectedScene(scene.id)} className={`w-full text-left px-2 py-1.5 rounded text-[11px] transition-colors border flex items-center gap-1.5 ${selectedScene === scene.id ? 'bg-[#FFC20E] text-black border-[#FFC20E] font-bold' : 'bg-black/20 text-gray-400 border-white/5 hover:border-white/10 hover:text-gray-200'}`}>
                                <scene.icon size={10} /> {scene.label}
                              </button>
                            </Tooltip>
                          ))}
                        </div>
                        {selectedScene === 'custom' && (
                          <input type="text" value={customSceneText} onChange={(e) => setCustomSceneText(e.target.value)} placeholder="Describe custom scene..." className="mt-1 w-full bg-black/50 border border-border rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:border-[#FFC20E]" autoFocus />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold block mb-1">MOOD</span>
                        <div className="grid grid-cols-2 gap-1">
                          {MOODS.map(mood => (
                            <Tooltip key={mood.id} text={mood.tooltip}>
                                <button type="button" onClick={() => setSelectedMood(mood.id)} className={`w-full text-left px-2 py-1.5 rounded text-[11px] transition-colors border ${selectedMood === mood.id ? 'bg-[#FFC20E] text-black border-[#FFC20E] font-bold' : 'bg-black/20 text-gray-400 border-white/5 hover:border-white/10 hover:text-gray-200'}`}>
                                  {mood.label}
                                </button>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold block mb-1">CAMERA ANGLE</span>
                        <div className="grid grid-cols-2 gap-1">
                          {ANGLES.map(angle => (
                            <Tooltip key={angle.id} text={angle.tooltip}>
                              <button type="button" onClick={() => setSelectedAngle(angle.id)} className={`w-full text-left px-2 py-1.5 rounded text-[11px] transition-colors border ${selectedAngle === angle.id ? 'bg-[#FFC20E] text-black border-[#FFC20E] font-bold' : 'bg-black/20 text-gray-400 border-white/5 hover:border-white/10 hover:text-gray-200'}`}>
                                {angle.label}
                              </button>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button type="button" onClick={handleApplyBuilder} className="w-full mt-4 py-2 bg-[#FFC20E] text-black font-bold text-xs rounded-lg hover:bg-[#e6af0b] transition-colors flex items-center justify-center gap-1.5">
                      <Plus size={12} /> Apply to Prompt
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aesthetic Style */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-500 tracking-wider uppercase">Aesthetic Style</label>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map((s) => (
              <button key={s.id} type="button" onClick={() => setStyle(s.id)} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all text-left ${style === s.id ? 'selected-ring border-transparent text-black font-bold' : 'border-border bg-black/20 text-gray-400 hover:border-gray-600 hover:text-gray-200'}`} style={style === s.id ? { backgroundColor: '#FFC20E' } : {}}>
                {getIcon(s.icon)} {s.id}
              </button>
            ))}
          </div>
        </div>

        {/* Ratio & Resolution */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 tracking-wider uppercase">Ratio</label>
            <div className="relative">
              <select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)} className="w-full appearance-none bg-black/30 border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFC20E] transition-colors">
                <option value="1:1">Square (1:1)</option>
                <option value="16:9">Landscape (16:9)</option>
                <option value="9:16">Portrait (9:16)</option>
                <option value="4:3">Standard (4:3)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 tracking-wider uppercase">Resolution</label>
            <div className="flex bg-black/30 rounded-lg p-1 border border-border">
              {(['1K', '2K', '4K'] as Resolution[]).map((res) => (
                <button key={res} type="button" onClick={() => setResolution(res)} className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${resolution === res ? 'bg-[#FFC20E] text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                  {res === '4K' ? '4K Max' : res}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button type="submit" disabled={isLoading || (!prompt && activeTab !== '3d-scanner')} className="mt-2 w-full btn-primary h-12 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-black">
          {isLoading ? <span className="animate-spin w-5 h-5 border-2 border-black/30 border-t-black rounded-full" /> : <><Zap size={18} className="fill-current" /> {activeTab === '3d-scanner' ? 'GENERATE 3D RENDER' : 'GENERATE MOCKUPS'}</>}
        </button>
      </form>
    </div>
  );
};
