
import React, { useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { PreviewPanel } from './components/PreviewPanel';
import FitCheckTool from './components/FitCheckTool';
import FlowstateUnified from './components/FlowstateUnified';
import ThreeSixtyTool from './components/ThreeSixtyTool';
import { ToastProvider } from './components/Toast';
import { Box, Shirt, Cpu, Rotate3D, Menu } from 'lucide-react';
import { NavigationPage } from './types';

const AppContent = () => {
  const [activePage, setActivePage] = useState<NavigationPage>('mockup');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'mockup', label: 'Mockup Generator', icon: Box },
    { id: 'fitcheck', label: 'Fit Check', icon: Shirt },
    { id: 'engine', label: 'Flowstate Engine', icon: Cpu },
    { id: 'threesixty', label: '360 Mockups', icon: Rotate3D },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col">
      <header className="h-16 border-b border-[#27272a] flex items-center justify-between px-4 lg:px-10 bg-[#050505]/80 backdrop-blur sticky top-0 z-50">
         <div className="flex items-center gap-3 font-bold text-xl tracking-tight">Flowstate<span className="text-[#FFC20E]">.foundry</span></div>
         
         <div className="hidden md:flex flex-1 justify-center gap-2">
            {navItems.map(item => (
               <button key={item.id} onClick={() => setActivePage(item.id as any)} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activePage === item.id ? 'bg-[#FFC20E] text-black' : 'text-gray-400 hover:text-white'}`}>
                  {item.label}
               </button>
            ))}
         </div>

         <div className="md:hidden relative">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}><Menu /></button>
            {isMobileMenuOpen && (
               <div className="absolute top-full right-0 mt-2 w-48 bg-[#121214] border border-[#27272a] rounded-xl overflow-hidden z-50">
                  {navItems.map(item => (
                     <button key={item.id} onClick={() => { setActivePage(item.id as any); setIsMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-sm hover:bg-white/5 border-b border-[#27272a] last:border-0">
                        {item.label}
                     </button>
                  ))}
               </div>
            )}
         </div>
      </header>

      <div className="flex-grow flex flex-col">
         {activePage === 'mockup' && (
            <main className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full flex flex-col lg:flex-row gap-8 items-start">
               <ControlPanel isLoading={false} onSubmit={() => {}} />
               <div className="flex-1 w-full flex flex-col">
                  {/* Spacer for Level Alignment */}
                  <div className="hidden lg:flex h-[160px] items-center justify-center mb-4">
                     {/* Placeholder for Big Logo */}
                  </div>
                  <PreviewPanel batch={null} isLoading={false} history={[]} onSelectHistory={() => {}} />
               </div>
            </main>
         )}
         {activePage === 'fitcheck' && <FitCheckTool />}
         {activePage === 'engine' && <FlowstateUnified />}
         {activePage === 'threesixty' && <ThreeSixtyTool />}
      </div>
    </div>
  );
};

export default function App() { return <ToastProvider><AppContent /></ToastProvider>; }
