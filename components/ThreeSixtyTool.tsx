
import React, { useState } from 'react';
import { Upload, Video, RotateCcw, Box, Download } from 'lucide-react';
import { generate360Spin } from '../services/geminiService';

export default function ThreeSixtyTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResultVideoUrl(null);
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    const reader = new FileReader();
    
    reader.onload = async () => {
        try {
            const base64Data = (reader.result as string).split(',')[1];
            const mimeType = file.type;
            const videoUrl = await generate360Spin(base64Data, mimeType, '9:16');
            setResultVideoUrl(videoUrl);
        } catch (e: any) {
            setError(e.message || "Failed to generate video");
        } finally {
            setIsLoading(false);
        }
    };
    
    reader.onerror = () => {
        setError("Failed to read file");
        setIsLoading(false);
    };
    
    reader.readAsDataURL(file);
  };

  const handleDownload = async () => {
    if (!resultVideoUrl) return;
    try {
      const response = await fetch(resultVideoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flowstate-360-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed:", e);
      const a = document.createElement('a');
      a.href = resultVideoUrl;
      a.download = '360-video.mp4';
      a.click();
    }
  };

  return (
    <div className="h-full bg-[#050505] text-white p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl flex flex-col items-center">
         <h1 className="text-4xl font-bold mb-2">360° Mockup <span className="text-[#FFC20E]">Lab</span></h1>
         <p className="text-gray-400 mb-8 text-center max-w-lg">
           Turn any flat image or 3D render into a high-fidelity 360-degree rotating product video.
         </p>

         <div className="flex flex-col lg:flex-row gap-8 w-full">
            <div className="flex-1 bg-[#121214] border border-[#27272a] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[400px]">
                {previewUrl ? (
                    <div className="relative w-full h-full flex flex-col items-center">
                        <img src={previewUrl} className="max-h-[300px] object-contain mb-4 rounded-lg shadow-lg" alt="Preview" />
                        <button onClick={() => {setFile(null); setPreviewUrl(null); setResultVideoUrl(null);}} className="text-gray-500 hover:text-white flex items-center gap-2">
                            <RotateCcw size={14} /> Replace Image
                        </button>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-[#27272a] rounded-xl cursor-pointer hover:border-[#FFC20E] hover:bg-[#FFC20E]/5 transition-all">
                        <Upload size={48} className="text-gray-600 mb-4" />
                        <span className="font-bold text-gray-400">Upload Source Image</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                )}
            </div>

            <div className="flex-1 bg-[#121214] border border-[#27272a] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
                        <div className="w-12 h-12 border-4 border-[#FFC20E] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="font-mono text-[#FFC20E] animate-pulse">Forging 360° Video...</p>
                    </div>
                )}
                
                {resultVideoUrl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <video src={resultVideoUrl} className="w-full h-full object-contain rounded-lg shadow-2xl mb-4" controls autoPlay loop />
                        <button onClick={handleDownload} className="flex items-center gap-2 bg-[#FFC20E] text-black px-6 py-2 rounded-lg font-bold hover:bg-[#e6af0b] transition-colors">
                            <Download size={18} /> Download Video
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                         <Box size={48} className="text-gray-700 mx-auto mb-4" />
                         <p className="text-gray-500 mb-6">Ready to generate</p>
                         <button 
                           onClick={handleGenerate} 
                           disabled={!file || isLoading}
                           className="bg-[#FFC20E] text-black px-8 py-3 rounded-lg font-bold hover:bg-[#e6af0b] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 mx-auto"
                         >
                            <Video size={18} /> GENERATE 360° VIDEO
                         </button>
                         {error && <p className="text-red-500 mt-4 text-sm max-w-xs">{error}</p>}
                    </div>
                )}
            </div>
         </div>
      </div>
    </div>
  );
}
