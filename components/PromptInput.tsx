import React, { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  onFocus: () => void;
  onBlur: () => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, isLoading, onFocus, onBlur }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-accent to-secondary rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
      <div className="relative glass-panel rounded-2xl p-2 flex items-start sm:items-center gap-3">
        <div className="p-3 text-gray-400 hidden sm:block">
          <Sparkles size={20} className={isLoading ? "animate-pulse text-secondary" : ""} />
        </div>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Describe your UI idea (e.g., 'Fitness app dashboard with dark mode')..."
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 font-sans text-lg h-12 px-2"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!prompt.trim() || isLoading}
          className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group-focus-within:bg-primary group-focus-within:hover:bg-primary/90"
        >
          <ArrowRight size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>
      
      {/* Suggestions */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
         {['Crypto Wallet', 'Music Player', 'Recipe App', 'Travel Booking'].map((suggestion) => (
           <button
             key={suggestion}
             type="button"
             onClick={() => setPrompt(suggestion)}
             className="text-xs font-mono text-gray-500 hover:text-secondary border border-gray-800 hover:border-secondary/50 rounded-full px-3 py-1 transition-colors"
           >
             {suggestion}
           </button>
         ))}
      </div>
    </form>
  );
};