import React from 'react';
import { Download, RefreshCw, Maximize2 } from 'lucide-react';
import { GeneratedImage } from '../types';

interface ResultViewProps {
  image: GeneratedImage;
  onReset: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ image, onReset }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `flowstate-mockup-${image.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-4xl animate-slide-up mt-8">
      <div className="glass-panel rounded-3xl p-1.5 overflow-hidden relative group">
        
        {/* Actions Bar */}
        <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <button 
             onClick={handleDownload}
             className="bg-black/50 backdrop-blur-md text-white p-2 rounded-lg hover:bg-black/70 transition-colors"
             title="Download"
           >
             <Download size={18} />
           </button>
           <button 
             onClick={onReset}
             className="bg-primary/80 backdrop-blur-md text-white p-2 rounded-lg hover:bg-primary transition-colors"
             title="Generate New"
           >
             <RefreshCw size={18} />
           </button>
        </div>

        {/* Image Container */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-surface">
          <img 
            src={image.url} 
            alt={image.prompt} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          <div className="absolute bottom-4 left-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="text-white font-medium text-sm drop-shadow-md truncate max-w-md">
              {image.prompt}
            </p>
            <p className="text-gray-400 text-xs font-mono mt-0.5">
              Generated via Gemini 2.5
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};