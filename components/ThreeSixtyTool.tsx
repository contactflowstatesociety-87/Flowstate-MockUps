
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
    }
  };

  return (
    <div className="h-full bg-[#050505] text-white p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl flex flex-col items-center">
         <h1 className="text-4xl font-bold mb-2">360° Mockup <span className="text-[#FFC20E]">Lab</span></h1>
         <div className="flex flex-col lg:flex-row gap-8 w-full mt-8">
            <div className="flex-1 bg-[#121214] border border-[#27272a] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[400px]">
                {previewUrl ? (
                    <img src={previewUrl} className="max-h-[300px] object-contain rounded-lg" />
                ) : (
                    <label className="cursor-pointer text-gray-500 hover:text-white transition-colors">
                        <Upload size={48} className="mx-auto mb-2"/>
                        <span className="font-bold">Upload Source</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                )}
            </div>
            <div className="flex-1 bg-[#121214] border border-[#27272a] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[400px]">
                {isLoading ? (
                    <div className="text-[#FFC20E] animate-pulse font-bold">Forging Video...</div>
                ) : resultVideoUrl ? (
                    <div className="flex flex-col items-center gap-4 w-full">
                        <video src={resultVideoUrl} className="w-full rounded-lg bg-black" controls autoPlay loop muted playsInline />
                        <button onClick={handleDownload} className="bg-[#FFC20E] text-black px-6 py-2 rounded-lg font-bold hover:bg-[#e6af0b]">Download MP4</button>
                    </div>
                ) : (
                    <button onClick={handleGenerate} disabled={!file} className="bg-[#FFC20E] text-black px-8 py-3 rounded-lg font-bold disabled:opacity-50">GENERATE 360° SPIN</button>
                )}
                {error && <div className="mt-4 text-red-500 text-sm bg-red-500/10 p-2 rounded">{error}</div>}
            </div>
         </div>
      </div>
    </div>
  );
}
