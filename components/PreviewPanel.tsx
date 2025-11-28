
import React, { useState, useEffect } from 'react';
import { Download, Box, Maximize2, ZoomIn, ZoomOut, X, History, Clock, Video, Image as ImageIcon, PlayCircle, AlertCircle } from 'lucide-react';
import { GeneratedImage, GeneratedImageBatch } from '../types';

interface PreviewPanelProps {
  batch: GeneratedImageBatch | null;
  isLoading: boolean;
  history: GeneratedImageBatch[];
  onSelectHistory: (batch: GeneratedImageBatch) => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ batch, isLoading, history, onSelectHistory }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  
  // Toggle between viewing generated Images or Video (if available)
  const [viewMode, setViewMode] = useState<'image' | 'video'>('image');

  // Reset states when batch changes
  useEffect(() => {
    setSelectedImageIndex(0);
    setViewMode('image');
  }, [batch?.id]);

  const activeImage = batch?.images[selectedImageIndex];
  const hasVideo = !!batch?.videoUrl;

  const handleDownload = () => {
    if (viewMode === 'image' && activeImage) {
      const link = document.createElement('a');
      link.href = activeImage.url;
      link.download = `flowstate-${activeImage.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (viewMode === 'video' && batch?.videoUrl) {
      const link = document.createElement('a');
      link.href = batch.videoUrl;
      link.download = `flowstate-video-${batch.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isExpanded) {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) {
        setZoomLevel(prev => Math.min(prev + 0.1, 3));
      } else {
        setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
      }
    }
  };

  return (
    <div className="flex-1 min-h-[400px] lg:h-[calc(100vh-140px)] bg-surface border border-border rounded-2xl relative overflow-hidden flex flex-col group">
      
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #3f3f46 1px, transparent 0)`,
            backgroundSize: '24px 24px'
        }}
      />

      {/* Header Actions */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button 
           onClick={() => setShowHistory(!showHistory)}
           className={`p-2.5 rounded-xl backdrop-blur-md transition-all border ${showHistory ? 'bg-[#FFC20E] text-black border-[#FFC20E]' : 'bg-black/60 text-white hover:bg-black/80 border-white/10'}`}
           title="History"
        >
           <History size={20} />
        </button>
      </div>

      {/* History Sidebar */}
      <div className={`absolute top-0 right-0 bottom-0 w-64 bg-panel border-l border-border z-30 transform transition-transform duration-300 overflow-y-auto ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-gray-400">HISTORY</h3>
            <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white"><X size={16}/></button>
          </div>
          <div className="space-y-3">
             {history.map(item => (
               <button 
                 key={item.id}
                 onClick={() => { onSelectHistory(item); setShowHistory(false); }}
                 className="w-full text-left bg-black/40 border border-border rounded-lg overflow-hidden hover:border-[#FFC20E]/50 transition-all group/history"
               >
                 <div className="aspect-video relative">
                   <img src={item.images[0].url} className="w-full h-full object-cover opacity-70 group-hover/history:opacity-100 transition-opacity" />
                   {item.videoUrl && (
                     <div className="absolute top-1 right-1 bg-black/60 rounded p-0.5">
                       <Video size={10} className="text-[#FFC20E]" />
                     </div>
                   )}
                 </div>
                 <div className="p-2">
                   <p className="text-[10px] text-gray-500 flex items-center gap-1">
                     <Clock size={10} />
                     {new Date(item.timestamp).toLocaleTimeString()}
                   </p>
                   <p className="text-xs font-medium text-gray-300 truncate mt-1">{item.prompt}</p>
                 </div>
               </button>
             ))}
             {history.length === 0 && <p className="text-xs text-gray-600 text-center py-4">No history yet.</p>}
          </div>
        </div>
      </div>

      {batch ? (
        <div className="flex flex-col h-full w-full p-4 lg:p-6 gap-4">
          
          {/* Main View Area */}
          <div className="flex-1 relative rounded-xl overflow-hidden bg-black/20 border border-border/50 flex items-center justify-center">
             
             {/* Mode Toggle (if video exists or expected) */}
             <div className="absolute top-4 left-4 z-20 flex bg-black/60 rounded-lg p-1 border border-white/10 backdrop-blur-md">
                <button 
                  onClick={() => setViewMode('image')}
                  className={`p-2 rounded flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'image' ? 'bg-[#FFC20E] text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  <ImageIcon size={14} /> Images
                </button>
                {hasVideo ? (
                  <button 
                    onClick={() => setViewMode('video')}
                    className={`p-2 rounded flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'video' ? 'bg-[#FFC20E] text-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Video size={14} /> Video
                  </button>
                ) : (
                   batch.config.mode === '3d-scanner' && (
                       <div className="p-2 rounded flex items-center gap-2 text-xs text-gray-500 cursor-not-allowed" title="Video generation failed">
                          <Video size={14} /> <AlertCircle size={12} className="text-red-500"/>
                       </div>
                   )
                )}
             </div>

             {viewMode === 'image' && activeImage && (
               <img 
                 src={activeImage.url} 
                 alt="Generated Mockup" 
                 className="max-w-full max-h-full object-contain cursor-pointer transition-transform hover:scale-[1.01]"
                 onClick={() => { setIsExpanded(true); setZoomLevel(1); }}
               />
             )}

             {viewMode === 'video' && batch.videoUrl && (
                <div className="w-full h-full flex items-center justify-center bg-black">
                   <video 
                     src={batch.videoUrl} 
                     controls 
                     className="max-w-full max-h-full"
                     autoPlay
                     loop
                   />
                </div>
             )}
             
             {/* Quick Actions Overlay */}
             <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               {viewMode === 'image' && (
                 <button onClick={() => { setIsExpanded(true); setZoomLevel(1); }} className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg backdrop-blur-md border border-white/10" title="Expand">
                    <Maximize2 size={18} />
                 </button>
               )}
               <button onClick={handleDownload} className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg backdrop-blur-md border border-white/10" title="Download">
                  <Download size={18} />
               </button>
             </div>
          </div>

          {/* Thumbnails Grid (Only show in image mode) */}
          {viewMode === 'image' && (
            <div className="h-24 flex gap-3 overflow-x-auto pb-2">
                {batch.images.map((img, idx) => (
                <button
                    key={img.id}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative aspect-square h-full rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImageIndex === idx 
                        ? 'border-[#FFC20E] ring-2 ring-[#FFC20E]/20 scale-105' 
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                >
                    <img src={img.url} className="w-full h-full object-cover" alt={`Variant ${idx+1}`} />
                </button>
                ))}
            </div>
          )}

          {/* Info Footer */}
          <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex items-center justify-between">
             <div className="overflow-hidden">
                <p className="text-white text-sm font-medium truncate w-full">{batch.prompt}</p>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[10px] text-gray-400 font-mono">Gemini 3.0 Pro</span>
                   <span className="text-[10px] text-black font-bold bg-[#FFC20E] px-1.5 rounded">8K</span>
                   {batch.videoUrl && <span className="text-[10px] text-black font-bold bg-purple-500 px-1.5 rounded flex items-center gap-1"><Video size={8} /> VEO 3.1</span>}
                </div>
             </div>
          </div>

        </div>
      ) : (
        <div className="text-center p-8 relative z-10 flex flex-col items-center justify-center h-full">
          <div className={`w-20 h-20 rounded-2xl bg-panel border border-border flex items-center justify-center mb-6 shadow-2xl ${isLoading ? 'animate-pulse' : ''}`}>
             <Box size={32} className={`text-gray-500 ${isLoading ? 'animate-bounce' : ''}`} />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">
            {isLoading ? 'Forging Variants...' : 'Ready to Forge'}
          </h3>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">
            {isLoading 
              ? 'Generating high-fidelity 8K mockups. This may take a moment...' 
              : 'Configure your settings and click generate to create 4 unique variations.'}
          </p>
        </div>
      )}

      {/* Expanded Zoom Modal */}
      {isExpanded && activeImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center overflow-hidden"
          onWheel={handleWheel}
        >
          <div className="absolute top-4 right-4 flex gap-4 z-50">
             <div className="flex bg-black/50 rounded-lg p-1 border border-white/10">
                <button onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.5))} className="p-2 hover:bg-white/10 rounded text-white"><ZoomOut size={20} /></button>
                <span className="px-2 flex items-center text-xs font-mono w-12 justify-center">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={() => setZoomLevel(z => Math.min(z + 0.25, 3))} className="p-2 hover:bg-white/10 rounded text-white"><ZoomIn size={20} /></button>
             </div>
             <button onClick={() => setIsExpanded(false)} className="bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-colors">
               <X size={24} />
             </button>
          </div>

          <div 
             className="cursor-move transition-transform duration-75 ease-linear"
             style={{ transform: `scale(${zoomLevel})` }}
             onMouseDown={(e) => {
               e.preventDefault();
             }}
          >
             <img src={activeImage.url} className="max-w-[90vw] max-h-[90vh] object-contain select-none" draggable={false} />
          </div>
          
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-xs text-gray-400 pointer-events-none">
             Scroll to Zoom • Drag to Pan
          </div>
        </div>
      )}
    </div>
  );
};
