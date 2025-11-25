import React from 'react';
import { Download, Box, Maximize2 } from 'lucide-react';
import { GeneratedImage } from '../types';

interface PreviewPanelProps {
  image: GeneratedImage | null;
  isLoading: boolean;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ image, isLoading }) => {
  
  const handleDownload = () => {
    if (image) {
      const link = document.createElement('a');
      link.href = image.url;
      link.download = `flowstate-${image.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex-1 min-h-[400px] lg:h-[calc(100vh-140px)] bg-surface border border-border rounded-2xl relative overflow-hidden flex flex-col items-center justify-center group">
      
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #3f3f46 1px, transparent 0)`,
            backgroundSize: '24px 24px'
        }}
      />

      {image ? (
        <>
          <img 
            src={image.url} 
            alt="Generated Mockup" 
            className="w-full h-full object-contain p-4 lg:p-8 animate-fade-in"
          />
          
          <div className="absolute top-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <button onClick={handleDownload} className="bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-xl backdrop-blur-md transition-all border border-white/10">
                <Download size={20} />
             </button>
             <button className="bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-xl backdrop-blur-md transition-all border border-white/10">
                <Maximize2 size={20} />
             </button>
          </div>
          
          <div className="absolute bottom-6 left-6 right-6 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <p className="text-white text-sm font-medium truncate">{image.prompt}</p>
             <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold bg-white/5 px-2 py-0.5 rounded">Gemini 2.5</span>
               <span className="text-[10px] uppercase tracking-wider text-black font-bold bg-[#FFC20E] px-2 py-0.5 rounded">High Res</span>
             </div>
          </div>
        </>
      ) : (
        <div className="text-center p-8 relative z-10">
          <div className={`w-20 h-20 rounded-2xl bg-panel border border-border flex items-center justify-center mx-auto mb-6 shadow-2xl ${isLoading ? 'animate-pulse' : ''}`}>
             <Box size={32} className={`text-gray-500 ${isLoading ? 'animate-bounce' : ''}`} />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">
            {isLoading ? 'Forging Assets...' : 'Ready to Forge'}
          </h3>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">
            {isLoading 
              ? 'Gemini is processing your request. This may take a few moments for high resolution output.' 
              : 'Your generated assets will appear here in high resolution.'}
          </p>
        </div>
      )}
    </div>
  );
};