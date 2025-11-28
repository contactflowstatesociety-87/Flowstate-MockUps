
import React, { useState, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { PreviewPanel } from './components/PreviewPanel';
import FitCheckTool from './components/FitCheckTool';
import FlowstateUnified from './components/FlowstateUnified';
import ThreeSixtyTool from './components/ThreeSixtyTool';
import { generateMockupBatch } from './services/geminiService';
import { saveBatch, getHistory } from './services/storage';
import { AppStatus, GeneratedImageBatch, MockupConfig, AIStudio, NavigationPage } from './types';
import { Box, Key, CheckCircle, Shirt, Cpu, Rotate3D } from 'lucide-react';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
const LOGO_URL = "https://casqcroasbqlxwdheybm.supabase.co/storage/v1/object/sign/Flowstate%20Mock%20Ups%20Images/Flowstate%20society%20Large%20white%20writing.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mNDFmZTBlMC0xN2FhLTRkYTctODU0Yy04NGI5ZjI4YmUzOTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJGbG93c3RhdGUgTW9jayBVcHMgSW1hZ2VzL0Zsb3dzdGF0ZSBzb2NpZXR5IExhcmdlIHdoaXRlIHdyaXRpbmcucG5nIiwiaWF0IjoxNzY0MTEyNjU2LCJleHAiOjE5MjE3OTI2NTZ9.NQdQk7u56rCvnyd497_rqivNnIo6fnFEOFcV8OSInGk"; 
// ------------------------------------------------------------------

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<NavigationPage>('mockup');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [currentBatch, setCurrentBatch] = useState<GeneratedImageBatch | null>(null);
  const [history, setHistory] = useState<GeneratedImageBatch[]>([]);
  const [apiKeyConnected, setApiKeyConnected] = useState(false);

  // Load history from IndexedDB on mount
  useEffect(() => {
    const loadHistoryData = async () => {
      try {
        const savedHistory = await getHistory();
        setHistory(savedHistory);
      } catch (e) {
        console.error("Failed to load history", e);
      }
    };
    loadHistoryData();
  }, []);

  useEffect(() => {
    const checkApiKey = async () => {
      const studio = (window as any).aistudio as AIStudio;
      if (studio) {
        try {
          const hasKey = await studio.hasSelectedApiKey();
          setApiKeyConnected(hasKey);
        } catch (error) {
          console.error("Error checking API key:", error);
        }
      }
    };
    checkApiKey();
  }, []);

  const handleConnectApi = async () => {
    const studio = (window as any).aistudio as AIStudio;
    if (studio) {
      try {
        await studio.openSelectKey();
        setApiKeyConnected(true);
      } catch (error) {
        console.error("Error selecting API key:", error);
      }
    }
  };

  const handleGenerate = async (config: MockupConfig) => {
    try {
      setStatus(AppStatus.GENERATING);
      
      const { images, video } = await generateMockupBatch(config);
      
      const newBatch: GeneratedImageBatch = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        prompt: config.prompt,
        config: config,
        videoUrl: video,
        images: images.map((url, index) => ({
          id: `${Date.now()}-${index}`,
          url: url,
          prompt: config.prompt
        }))
      };
      
      setCurrentBatch(newBatch);
      
      // Update history state
      const newHistory = [newBatch, ...history];
      setHistory(newHistory);
      
      // Save to IndexedDB (asynchronous)
      await saveBatch(newBatch);
      
      setStatus(AppStatus.SUCCESS);
    } catch (error: any) {
      console.error(error);
      setStatus(AppStatus.ERROR);
      
      if (error.toString().includes("Requested entity was not found")) {
        setApiKeyConnected(false);
        const studio = (window as any).aistudio as AIStudio;
        if (studio) {
          await studio.openSelectKey();
          setApiKeyConnected(true);
        }
      }
    }
  };

  const handleSelectHistory = (batch: GeneratedImageBatch) => {
    setCurrentBatch(batch);
  };

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-[#FFC20E] selection:text-black flex flex-col">
      
      {/* Navbar */}
      <header className="h-16 border-b border-border flex items-center justify-between px-6 lg:px-10 bg-background/80 backdrop-blur-sm sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-3">
          {LOGO_URL ? (
            <img 
              src={LOGO_URL} 
              alt="Flowstate Logo" 
              className="h-8 w-auto object-contain"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <Box size={18} className="text-white fill-white/20" strokeWidth={2.5} />
            </div>
          )}
          <div className="flex items-baseline gap-1">
             <span className="font-bold text-lg tracking-tight">Flowstate</span>
             <span className="font-mono text-gray-500 text-sm">.foundry</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="hidden md:flex bg-surface p-1 rounded-lg border border-border overflow-x-auto">
          <button 
            onClick={() => setActivePage('mockup')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activePage === 'mockup' ? 'bg-[#FFC20E] text-black shadow font-bold' : 'text-gray-400 hover:text-white'}`}
          >
            Mockup Generator
          </button>
          <button 
            onClick={() => setActivePage('fitcheck')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activePage === 'fitcheck' ? 'bg-[#FFC20E] text-black shadow font-bold' : 'text-gray-400 hover:text-white'}`}
          >
            <Shirt size={14} /> Fit Check
          </button>
          <button 
            onClick={() => setActivePage('engine')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activePage === 'engine' ? 'bg-[#FFC20E] text-black shadow font-bold' : 'text-gray-400 hover:text-white'}`}
          >
            <Cpu size={14} /> Flowstate Engine
          </button>
          <button 
            onClick={() => setActivePage('threesixty')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activePage === 'threesixty' ? 'bg-[#FFC20E] text-black shadow font-bold' : 'text-gray-400 hover:text-white'}`}
          >
            <Rotate3D size={14} /> 360 Mockups
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFC20E] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFC20E]"></span>
            </span>
            <span className="text-xs font-mono font-bold text-gray-400">Pro Engine Active</span>
          </div>
          
          <button 
            onClick={handleConnectApi}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
              apiKeyConnected 
                ? 'bg-[#FFC20E]/10 text-[#FFC20E] border-[#FFC20E]/20 hover:bg-[#FFC20E]/20' 
                : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'
            }`}
          >
             {apiKeyConnected ? <CheckCircle size={14} /> : <Key size={14} />}
             <span>{apiKeyConnected ? 'API Connected' : 'Connect API'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        {activePage === 'mockup' && (
            <main className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full flex flex-col lg:flex-row gap-8 overflow-y-auto">
            <ControlPanel 
                isLoading={status === AppStatus.GENERATING} 
                onSubmit={handleGenerate} 
            />
            <PreviewPanel 
                batch={currentBatch} 
                isLoading={status === AppStatus.GENERATING}
                history={history}
                onSelectHistory={handleSelectHistory}
            />
            </main>
        )}
        
        {activePage === 'fitcheck' && (
            <FitCheckTool />
        )}

        {activePage === 'engine' && (
            <FlowstateUnified />
        )}

        {activePage === 'threesixty' && (
            <ThreeSixtyTool />
        )}
      </div>

    </div>
  );
};

export default App;
