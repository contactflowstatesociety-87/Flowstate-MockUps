
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Shirt, RotateCcw, Plus, Upload, Camera, History, Clock, X, Trash2, Download, Files } from 'lucide-react';
import { generateModelImage, generateVirtualTryOnImage, generatePoseVariation } from '../services/geminiService';
import { saveFitCheck, getFitCheckHistory } from '../services/storage';
import { FitCheckHistoryItem } from '../types';

/* -------------------------------------------------------------------------- */
/*                                    UTILS                                   */
/* -------------------------------------------------------------------------- */

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getFriendlyErrorMessage(error: unknown, context: string): string {
    let rawMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
        rawMessage = error.message;
    } else if (typeof error === 'string') {
        rawMessage = error;
    }
    return `${context}. ${rawMessage}`;
}

interface WardrobeItem {
  id: string;
  name: string;
  url: string;
}

interface OutfitLayer {
  garment: WardrobeItem | null; 
  poseImages: Record<string, string>;
}

const POSE_INSTRUCTIONS = [
  "Full frontal view, hands on hips",
  "Slightly turned, 3/4 view",
  "Side profile view",
  "Jumping in the air, mid-action shot",
  "Walking towards camera",
  "Leaning against a wall",
];

const defaultWardrobe: WardrobeItem[] = [
  { id: 'gemini-sweat', name: 'Gemini Sweat', url: 'https://raw.githubusercontent.com/ammaarreshi/app-images/refs/heads/main/gemini-sweat-2.png' },
  { id: 'gemini-tee', name: 'Gemini Tee', url: 'https://raw.githubusercontent.com/ammaarreshi/app-images/refs/heads/main/Gemini-tee.png' }
];

/* -------------------------------------------------------------------------- */
/*                                SUB-COMPONENTS                              */
/* -------------------------------------------------------------------------- */

const Spinner = () => (
  <svg className="animate-spin h-8 w-8 text-[#FFC20E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const FitCheckTool: React.FC = () => {
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const [history, setHistory] = useState<FitCheckHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load History
  useEffect(() => {
    getFitCheckHistory().then(setHistory);
  }, []);

  const activeOutfitLayers = useMemo(() => outfitHistory.slice(0, currentOutfitIndex + 1), [outfitHistory, currentOutfitIndex]);
  const displayImageUrl = useMemo(() => {
    if (outfitHistory.length === 0) return modelImageUrl;
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (!currentLayer) return modelImageUrl;
    const poseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
    return currentLayer.poseImages[poseInstruction] ?? Object.values(currentLayer.poseImages)[0];
  }, [outfitHistory, currentOutfitIndex, currentPoseIndex, modelImageUrl]);

  const handleModelFinalized = (url: string) => {
    setModelImageUrl(url);
    setOutfitHistory([{ garment: null, poseImages: { [POSE_INSTRUCTIONS[0]]: url } }]);
    setCurrentOutfitIndex(0);
  };

  const handleStartOver = () => {
    setModelImageUrl(null);
    setOutfitHistory([]);
    setCurrentOutfitIndex(0);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setCurrentPoseIndex(0);
    setWardrobe(defaultWardrobe);
  };

  const saveToHistory = async (finalImage: string, garmentName: string) => {
    if (!modelImageUrl) return;
    const newItem: FitCheckHistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      modelImage: modelImageUrl,
      outfitImage: finalImage,
      garmentName: garmentName
    };
    await saveFitCheck(newItem);
    setHistory(prev => [newItem, ...prev]);
  };

  const restoreFromHistory = (item: FitCheckHistoryItem) => {
    setModelImageUrl(item.modelImage);
    setOutfitHistory([{ garment: { id: 'history', name: item.garmentName, url: '' }, poseImages: { [POSE_INSTRUCTIONS[0]]: item.outfitImage } }]);
    setCurrentOutfitIndex(0);
    setShowHistory(false);
  };

  const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem) => {
    if (!displayImageUrl || isLoading) return;
    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Fitting ${garmentInfo.name}...`);
    try {
      const newImageUrl = await generateVirtualTryOnImage(displayImageUrl, garmentFile);
      const currentPoseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
      const newLayer: OutfitLayer = { garment: garmentInfo, poseImages: { [currentPoseInstruction]: newImageUrl } };
      
      setOutfitHistory(prev => [...prev.slice(0, currentOutfitIndex + 1), newLayer]);
      setCurrentOutfitIndex(prev => prev + 1);
      setWardrobe(prev => prev.find(item => item.id === garmentInfo.id) ? prev : [...prev, garmentInfo]);
      
      // Save to history automatically on successful fit
      saveToHistory(newImageUrl, garmentInfo.name);

    } catch (err: any) {
      setError(getFriendlyErrorMessage(err, 'Failed to apply garment'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isLoading, currentPoseIndex, outfitHistory, currentOutfitIndex]);

  const handlePoseSelect = useCallback(async (newIndex: number) => {
    if (isLoading || outfitHistory.length === 0 || newIndex === currentPoseIndex) return;
    const poseInstruction = POSE_INSTRUCTIONS[newIndex];
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (currentLayer.poseImages[poseInstruction]) {
      setCurrentPoseIndex(newIndex);
      return;
    }
    const baseImage = Object.values(currentLayer.poseImages)[0];
    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing pose...`);
    try {
      const newImageUrl = await generatePoseVariation(baseImage, poseInstruction);
      setOutfitHistory(prev => {
        const newHistory = [...prev];
        newHistory[currentOutfitIndex].poseImages[poseInstruction] = newImageUrl;
        return newHistory;
      });
      setCurrentPoseIndex(newIndex);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err, 'Failed to change pose'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [currentPoseIndex, outfitHistory, isLoading, currentOutfitIndex]);

  const handleDownloadCurrent = () => {
    if (displayImageUrl) {
      const link = document.createElement('a');
      link.href = displayImageUrl;
      link.download = `flowstate-fitcheck-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadAll = () => {
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (currentLayer && currentLayer.poseImages) {
        Object.entries(currentLayer.poseImages).forEach(([pose, url], idx) => {
             // Stagger downloads slightly to prevent browser blocking
             setTimeout(() => {
                const link = document.createElement('a');
                link.href = url;
                link.download = `flowstate-fitcheck-pose-${idx}-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
             }, idx * 250);
        });
    }
  };

  // Uploader Sub-Component
  const Uploader = () => {
      const [localError, setLocalError] = useState<string | null>(null);
      const [isProcessing, setIsProcessing] = useState(false);

      const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.files?.[0]) {
              setIsProcessing(true);
              try {
                  const url = await generateModelImage(e.target.files[0]);
                  handleModelFinalized(url);
              } catch (err: any) {
                  setLocalError(getFriendlyErrorMessage(err, "Failed to create model"));
              } finally {
                  setIsProcessing(false);
              }
          }
      };

      return (
        <motion.div className="w-full h-full flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center text-center">
                <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">Create Your <span className="text-[#FFC20E]">Model.</span></h1>
                <p className="text-xl text-gray-400 mb-8">Upload a photo to create your personal digital mannequin.</p>
                {isProcessing ? (
                    <div className="flex flex-col items-center gap-4">
                        <Spinner />
                        <span className="text-[#FFC20E] font-mono animate-pulse">Forging Digital Model...</span>
                    </div>
                ) : (
                    <label className="group relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-[#27272a] rounded-2xl cursor-pointer bg-[#18181b]/50 hover:bg-[#18181b] hover:border-[#FFC20E]/50 transition-all">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-400 group-hover:text-[#FFC20E] transition-colors">
                            <Upload className="w-12 h-12 mb-4 opacity-50 group-hover:opacity-100" />
                            <p className="mb-2 text-sm font-bold">Click to upload photo</p>
                            <p className="text-xs opacity-60">PNG, JPG up to 10MB</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                    </label>
                )}
                {localError && <p className="text-red-500 mt-4">{localError}</p>}
            </div>
        </motion.div>
      );
  };

  return (
    <div className="font-sans w-full h-full bg-[#050505] text-white flex flex-col relative overflow-hidden">
      
      {/* History Button (Absolute) */}
      {modelImageUrl && (
          <div className="absolute top-4 right-4 z-20">
             <button onClick={() => setShowHistory(!showHistory)} className={`p-2.5 rounded-xl border backdrop-blur-md transition-all ${showHistory ? 'bg-[#FFC20E] text-black border-[#FFC20E]' : 'bg-black/60 text-white border-white/10 hover:bg-black/80'}`}>
                 <History size={20} />
             </button>
          </div>
      )}

      {/* History Sidebar */}
      <div className={`absolute top-0 right-0 bottom-0 w-80 bg-[#121214] border-l border-[#27272a] z-30 transform transition-transform duration-300 ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
         <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-400">OUTFIT HISTORY</h3>
                <button onClick={() => setShowHistory(false)}><X size={18} className="text-gray-500 hover:text-white" /></button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-3">
                {history.map(item => (
                    <button key={item.id} onClick={() => restoreFromHistory(item)} className="w-full text-left bg-black/40 border border-[#27272a] rounded-xl overflow-hidden hover:border-[#FFC20E]/50 group transition-all">
                        <div className="aspect-[3/4] relative">
                            <img src={item.outfitImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="p-3">
                            <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10}/> {new Date(item.timestamp).toLocaleTimeString()}</p>
                            <p className="text-sm font-bold text-white mt-1">{item.garmentName}</p>
                        </div>
                    </button>
                ))}
                {history.length === 0 && <p className="text-center text-gray-600 text-sm mt-10">No outfits saved yet.</p>}
            </div>
         </div>
      </div>

      <AnimatePresence mode="wait">
        {!modelImageUrl ? (
          <Uploader key="uploader" />
        ) : (
          <motion.div key="main-app" className="w-full h-full max-w-[1600px] mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            
            {/* Main Canvas Area */}
            <div className="flex-grow bg-[#121214] border border-[#27272a] rounded-2xl p-4 lg:p-8 flex items-center justify-center relative shadow-2xl overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #3f3f46 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
                
                {/* Canvas Controls */}
                <div className="absolute top-4 left-4 z-30">
                     <button onClick={handleStartOver} className="bg-black/40 text-gray-400 hover:text-white p-2 rounded-lg border border-[#27272a] backdrop-blur-md transition-colors" title="Start Over">
                        <RotateCcw size={18} />
                    </button>
                </div>

                <div className="absolute top-4 right-4 z-30 flex gap-2">
                    {displayImageUrl && (
                        <>
                            <button onClick={handleDownloadCurrent} className="bg-black/40 text-gray-400 hover:text-white p-2 rounded-lg border border-[#27272a] backdrop-blur-md transition-colors" title="Download Current Image">
                                <Download size={18} />
                            </button>
                            {outfitHistory[currentOutfitIndex] && Object.keys(outfitHistory[currentOutfitIndex].poseImages).length > 1 && (
                                <button onClick={handleDownloadAll} className="bg-black/40 text-gray-400 hover:text-white p-2 rounded-lg border border-[#27272a] backdrop-blur-md transition-colors" title="Download All Generated Poses">
                                    <Files size={18} />
                                </button>
                            )}
                        </>
                    )}
                </div>

                <div className="relative w-full h-full flex items-center justify-center max-w-2xl z-10">
                    {displayImageUrl ? <img src={displayImageUrl} className="max-w-full max-h-full object-contain drop-shadow-2xl" /> : <Spinner />}
                    
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-xl">
                            <Spinner />
                            <p className="mt-4 font-mono text-[#FFC20E] text-sm animate-pulse">{loadingMessage}</p>
                        </div>
                    )}
                    
                    {/* Pose Controls */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#18181b]/90 backdrop-blur-md rounded-full px-4 py-2 border border-[#27272a] shadow-xl flex items-center gap-4">
                        <span className="text-[10px] font-bold text-gray-500 tracking-wider">POSE</span>
                        <div className="flex gap-2">
                            {POSE_INSTRUCTIONS.map((p, i) => (
                                <button key={i} onClick={() => handlePoseSelect(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentPoseIndex ? 'bg-[#FFC20E] scale-125' : 'bg-[#27272a] hover:bg-gray-500'}`} title={p} />
                            ))}
                        </div>
                    </div>
                 </div>
            </div>
            
            {/* Sidebar Controls */}
            <aside className="w-full lg:w-[400px] bg-[#121214] border border-[#27272a] rounded-2xl p-6 flex flex-col gap-8 shadow-xl">
                 <div className="flex items-center gap-2 border-b border-[#27272a] pb-4">
                     <Shirt className="text-[#FFC20E]" size={20} />
                     <h2 className="font-bold text-lg">Wardrobe</h2>
                 </div>

                 <div className="flex-grow overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                        {wardrobe.map(item => (
                            <button key={item.id} onClick={async () => {
                                    try {
                                        const res = await fetch(item.url);
                                        const blob = await res.blob();
                                        handleGarmentSelect(new File([blob], item.name, {type: blob.type}), item);
                                    } catch (e) {}
                                }} 
                                disabled={isLoading} 
                                className="group relative aspect-square rounded-xl bg-[#18181b] border border-[#27272a] overflow-hidden hover:border-[#FFC20E]/50 transition-all"
                            >
                                <img src={item.url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] font-bold text-white">{item.name}</span>
                                </div>
                            </button>
                        ))}
                        <label className="aspect-square rounded-xl border-2 border-dashed border-[#27272a] bg-[#18181b]/50 flex flex-col items-center justify-center cursor-pointer hover:bg-[#18181b] hover:border-[#FFC20E]/50 hover:text-[#FFC20E] transition-all text-gray-500 group">
                            <Plus size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold">ADD ITEM</span>
                            <input type="file" className="hidden" onChange={(e) => {
                                if (e.target.files?.[0]) {
                                    const file = e.target.files[0];
                                    handleGarmentSelect(file, {id: `custom-${Date.now()}`, name: file.name, url: URL.createObjectURL(file)});
                                }
                            }} />
                        </label>
                    </div>
                 </div>
                 {error && <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-2 text-xs text-red-500"><span className="font-bold">Error:</span> {error}</div>}
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FitCheckTool;
