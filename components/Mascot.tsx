import React, { useEffect, useState } from 'react';
import { Rabbit } from 'lucide-react';
import { MascotState } from '../types';

interface MascotProps {
  state: MascotState;
}

export const Mascot: React.FC<MascotProps> = ({ state }) => {
  const [animationClass, setAnimationClass] = useState('animate-hop-in');

  useEffect(() => {
    switch (state) {
      case 'idle':
        // If coming from sprint, we might want to re-trigger hop-in or just stay
        setAnimationClass('animate-hop-in');
        break;
      case 'thinking':
        setAnimationClass('animate-shake');
        break;
      case 'sprinting':
        setAnimationClass('animate-sprint');
        break;
      case 'returning':
        // Reset to hop-in to simulate returning with the result
        setAnimationClass('animate-hop-in');
        break;
    }
  }, [state]);

  const handleAnimationEnd = () => {
    // When entrance or return "hop-in" finishes, switch to a gentle float
    if (animationClass === 'animate-hop-in' && (state === 'idle' || state === 'returning')) {
      setAnimationClass('animate-float');
    }
  };

  return (
    <div 
      className={`relative z-10 w-24 h-24 flex items-center justify-center ${animationClass}`}
      onAnimationEnd={handleAnimationEnd}
    >
       {/* Glow effect behind mascot */}
      <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full scale-75 animate-pulse" />
      
      <div className="relative">
        <Rabbit 
          size={64} 
          className="text-white drop-shadow-[0_0_15px_rgba(99,102,241,0.6)]" 
          strokeWidth={1.5}
        />
        
        {state === 'thinking' && (
          <div className="absolute -top-2 -right-2 flex space-x-1">
             <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce [animation-delay:0ms]"/>
             <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce [animation-delay:150ms]"/>
             <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce [animation-delay:300ms]"/>
          </div>
        )}
      </div>
    </div>
  );
};