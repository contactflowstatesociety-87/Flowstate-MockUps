import React, { useState, useRef } from 'react';
import { LayoutTemplate, Zap, Leaf, Diamond, Radio, Upload, Type, ChevronDown, Sparkles, Plus, Image as ImageIcon, Camera, Sun } from 'lucide-react';
import { AestheticStyle, AspectRatio, MockupConfig, Resolution, STYLES } from '../types';

interface ControlPanelProps {
  isLoading: boolean;
  onSubmit: (config: MockupConfig) => void;
}

// Prompt Builder Data
const SCENES = [
  { id: 'studio', label: 'Clean Studio', text: 'centered on a pristine white cylindrical pedestal, minimal backdrop', icon: LayoutTemplate },
  { id: 'beach', label: 'Luxury Beach', text: 'laying on a sun bathing chair on a private luxury beach, turquoise ocean in background', icon: Sun },
  { id: 'desk', label: 'Modern Desk', text: 'placed on a sleek walnut desk next to a macbook and coffee', icon: LayoutTemplate },
  { id: 'urban', label: 'Cyberpunk City', text: 'floating in a rainy neon-lit alleyway, wet pavement reflections', icon: Zap },
];

const MOODS = [
  { id: 'soft', label: 'Soft Daylight', text: 'soft diffused natural lighting, gentle shadows' },
  { id: 'golden', label: 'Golden Hour', text: 'warm sunset lighting, dramatic long shadows, lens flare' },
  { id: 'neon', label: 'Neon Noir', text: 'pink and cyan rim lighting, high contrast, moody atmosphere' },
  { id: 'studio_light', label: 'Pro Studio', text: 'three-point lighting setup, sharp details, high key' },
];

const ANGLES = [
  { id: 'eye', label: 'Eye Level', text: 'straight-on eye level view' },
  { id: 'top', label: 'Top Down', text: 'flat lay top-down perspective' },
  { id: 'iso', label: 'Isometric', text: 'orthographic isometric 3D view' },
  { id: 'low', label: 'Low Hero', text: 'low angle hero shot looking up' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({ isLoading, onSubmit }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'upload'>('text');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<AestheticStyle>('Modern Minimal');
  const [ratio, setRatio] = useState<AspectRatio>('1:1');
  const [resolution, setResolution] = useState<Resolution>('4K');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  // Prompt Builder State
  const [showPrompts, setShowPrompts] = useState(false);
  const [selectedScene, setSelectedScene] = useState<string>('');
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [selectedAngle, setSelectedAngle] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyBuilder = () => {
    const scene = SCENES.find(s => s.id === selectedScene)?.text || '';
    const mood = MOODS.find(m => m.id === selectedMood)?.text || '';
    const angle = ANGLES.find(a => a.id === selectedAngle)?.text || '';

    // If there is existing text, try to preserve the subject
    let currentSubject = prompt.trim();
    if (!currentSubject) currentSubject = "[Product]";

    // Construct new prompt
    // Format: "Subject, Scene, Mood, Angle."
    const parts = [currentSubject];
    if (scene) parts.push(scene);
    if (mood) parts.push(mood);
    if (angle) parts.push(angle);

    setPrompt(parts.join(', '));
    setShowPrompts(false);
    
    // Auto-select style based on scene if applicable
    if (selectedScene === 'urban') setStyle('Cyberpunk');
    if (selectedScene === 'studio') setStyle('Modern Minimal');
    if (selectedScene === 'beach') setStyle('High Luxury');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    onSubmit({
      prompt,
      style,
      ratio,
      resolution,
      image: activeTab === 'upload' && uploadedImage ? uploadedImage : undefined
    });
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'layout-template': return <LayoutTemplate size={16} />;
      case 'zap': return <Zap size={16} />;
      case 'leaf': return <Leaf size={16} />;
      case 'diamond': return <Diamond size={16} />;
      case 'radio': return <Radio size={16} />;
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
          Forge photorealistic product mockups in up to 4K resolution. Upload your own assets or generate from scratch using Gemini 2.5.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 bg-surface border border-border rounded-xl p-5 shadow-2xl relative">
        
        {/* Tabs */}
        <div className="flex bg-black/40 p-1 rounded-lg border border-border/50">
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'text' 
                ? 'bg-panel shadow-sm text-[#FFC20E]' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Type size={14} /> Text Description
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'upload' 
                ? 'bg-panel shadow-sm text-[#FFC20E]' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Upload size={14} /> Upload Product
          </button>
        </div>

        {/* Input Area */}
        <div className="space-y-3 relative z-10">
          <label className="text-xs font-bold text-gray-500 tracking-wider uppercase flex items-center gap-2">
            <Sparkles size={12} className="text-[#FFC20E]" />
            {activeTab === 'text' ? 'Product Description' : 'Context Description'}
          </label>
          
          {activeTab === 'upload' && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                uploadedImage 
                  ? 'border-[#FFC20E]/50 bg-[#FFC20E]/5' 
                  : 'border-border hover:border-gray-600 bg-black/20'
              }`}
            >
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {uploadedImage ? (
                <div className="relative h-24 w-full">
                  <img src={uploadedImage} alt="Upload" className="h-full w-full object-contain" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-xs text-white font-bold">Change Image</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-gray-500 text-sm">
                  <Upload className="mx-auto mb-2 opacity-50" />
                  Click to upload image asset
                </div>
              )}
            </div>
          )}

          <div className="relative group">
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={activeTab === 'text' ? "e.g. A matte black aluminum water bottle..." : "e.g. Placing this product on a wooden table..."}
              className="w-full bg-black/30 border border-border rounded-lg p-3 pb-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FFC20E]/50 focus:ring-1 focus:ring-[#FFC20E]/50 transition-all min-h-[120px] resize-none font-sans"
            />
            
            {/* Auto-Prompt Toggle */}
            <button 
              type="button"
              onClick={() => setShowPrompts(!showPrompts)}
              className="absolute right-3 bottom-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#FFC20E]/10 hover:bg-[#FFC20E]/20 border border-[#FFC20E]/20 text-xs text-[#FFC20E] transition-all font-bold"
            >
              <Sparkles size={12} />
              <span>Prompt Builder</span>
              <ChevronDown size={10} className={`transform transition-transform ${showPrompts ? 'rotate-180' : ''}`} />
            </button>

            {/* Prompts Dropdown / Builder */}
            {showPrompts && (
              <div 
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-slide-up ring-1 ring-[#FFC20E]/20"
              >
                <div className="p-3 border-b border-border bg-black/40">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Build your scene</h3>
                  
                  <div className="space-y-3">
                    {/* Scene Selection */}
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block mb-1">SCENE</span>
                      <div className="grid grid-cols-2 gap-1">
                        {SCENES.map(scene => (
                          <button
                            key={scene.id}
                            type="button"
                            onClick={() => setSelectedScene(scene.id)}
                            className={`text-left px-2 py-1.5 rounded text-[11px] transition-colors border ${
                              selectedScene === scene.id 
                                ? 'bg-[#FFC20E] text-black border-[#FFC20E] font-bold' 
                                : 'bg-black/20 text-gray-400 border-white/5 hover:border-white/10 hover:text-gray-200'
                            }`}
                          >
                            {scene.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mood Selection */}
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block mb-1">MOOD</span>
                      <div className="grid grid-cols-2 gap-1">
                        {MOODS.map(mood => (
                          <button
                            key={mood.id}
                            type="button"
                            onClick={() => setSelectedMood(mood.id)}
                            className={`text-left px-2 py-1.5 rounded text-[11px] transition-colors border ${
                              selectedMood === mood.id 
                                ? 'bg-[#FFC20E] text-black border-[#FFC20E] font-bold' 
                                : 'bg-black/20 text-gray-400 border-white/5 hover:border-white/10 hover:text-gray-200'
                            }`}
                          >
                            {mood.label}
                          </button>
                        ))}
                      </div>
                    </div>

                     {/* Angle Selection */}
                     <div>
                      <span className="text-[10px] text-gray-500 font-bold block mb-1">CAMERA ANGLE</span>
                      <div className="grid grid-cols-2 gap-1">
                        {ANGLES.map(angle => (
                          <button
                            key={angle.id}
                            type="button"
                            onClick={() => setSelectedAngle(angle.id)}
                            className={`text-left px-2 py-1.5 rounded text-[11px] transition-colors border ${
                              selectedAngle === angle.id 
                                ? 'bg-[#FFC20E] text-black border-[#FFC20E] font-bold' 
                                : 'bg-black/20 text-gray-400 border-white/5 hover:border-white/10 hover:text-gray-200'
                            }`}
                          >
                            {angle.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyBuilder}
                    className="w-full mt-3 py-2 bg-[#FFC20E] text-black font-bold text-xs rounded-lg hover:bg-[#e6af0b] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={12} />
                    Apply to Prompt
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Aesthetic Style */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-500 tracking-wider uppercase">Aesthetic Style</label>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all text-left ${
                  style === s.id 
                    ? 'selected-ring border-transparent text-black font-bold' 
                    : 'border-border bg-black/20 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                }`}
                style={style === s.id ? { backgroundColor: '#FFC20E' } : {}}
              >
                {getIcon(s.icon)}
                {s.id}
              </button>
            ))}
          </div>
        </div>

        {/* Ratio & Resolution */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 tracking-wider uppercase">Ratio</label>
            <div className="relative">
              <select 
                value={ratio}
                onChange={(e) => setRatio(e.target.value as AspectRatio)}
                className="w-full appearance-none bg-black/30 border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFC20E] transition-colors"
              >
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
                <button
                  key={res}
                  type="button"
                  onClick={() => setResolution(res)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${
                    resolution === res 
                      ? 'bg-[#FFC20E] text-black shadow-sm' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {res === '4K' ? '4K Max' : res}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !prompt}
          className="mt-2 w-full btn-primary h-12 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-black"
        >
          {isLoading ? (
            <span className="animate-spin w-5 h-5 border-2 border-black/30 border-t-black rounded-full" />
          ) : (
            <>
              <Zap size={18} className="fill-current" />
              GENERATE MOCKUP
            </>
          )}
        </button>
      </form>
    </div>
  );
};