import React, { useState, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { generateMockupImage } from './services/geminiService';
import { AppStatus, GeneratedImage, MockupConfig } from './types';
import { Box, Key, CheckCircle } from 'lucide-react';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
// Paste your Supabase Storage URL inside the quotes below to change the logo.
const LOGO_URL = "https://casqcroasbqlxwdheybm.supabase.co/storage/v1/object/sign/Flowstate%20Mock%20Ups%20Images/Flowstate%20society%20Large%20white%20writing.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mNDFmZTBlMC0xN2FhLTRkYTctODU0Yy04NGI5ZjI4YmUzOTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJGbG93c3RhdGUgTW9jayBVcHMgSW1hZ2VzL0Zsb3dzdGF0ZSBzb2NpZXR5IExhcmdlIHdoaXRlIHdyaXRpbmcucG5nIiwiaWF0IjoxNzY0MTEyNjU2LCJleHAiOjE5MjE3OTI2NTZ9.NQdQk7u56rCvnyd497_rqivNnIo6fnFEOFcV8OSInGk"; 
// ------------------------------------------------------------------

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [apiKeyConnected, setApiKeyConnected] = useState(false);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        try {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setApiKeyConnected(hasKey);
        } catch (error) {
          console.error("Error checking API key:", error);
        }
      }
    };
    checkApiKey();
  }, []);

  const handleConnectApi = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setApiKeyConnected(true);
      } catch (error) {
        console.error("Error selecting API key:", error);
      }
    }
  };

  const handleGenerate = async (config: MockupConfig) => {
    try {
      setStatus(AppStatus.GENERATING);
      
      const base64Image = await generateMockupImage(config);
      
      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        url: base64Image,
        prompt: config.prompt,
        timestamp: Date.now(),
      };
      
      setCurrentImage(newImage);
      setStatus(AppStatus.SUCCESS);
    } catch (error: any) {
      console.error(error);
      setStatus(AppStatus.ERROR);
      
      if (error.toString().includes("Requested entity was not found")) {
        setApiKeyConnected(false);
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
          setApiKeyConnected(true);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-[#FFC20E] selection:text-black">
      
      {/* Navbar */}
      <header className="h-16 border-b border-border flex items-center justify-between px-6 lg:px-10 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
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
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFC20E] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFC20E]"></span>
            </span>
            <span className="text-xs font-mono font-bold text-gray-400">4K Engine Active</span>
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

      {/* Main Content */}
      <main className="p-4 lg:p-8 max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-8">
        <ControlPanel 
          isLoading={status === AppStatus.GENERATING} 
          onSubmit={handleGenerate} 
        />
        <PreviewPanel 
          image={currentImage} 
          isLoading={status === AppStatus.GENERATING} 
        />
      </main>

    </div>
  );
};

export default App;