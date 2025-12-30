// src/components/LoadingSpinner.jsx - Simplified with smooth transitions
import { useState, useEffect } from 'react';
import OtArenaIcon from '../icons/OtArenaIcon';

export default function LoadingSpinner({ 
  size = 'md', 
  fullPage = false, 
  text = 'Loading',
  className = '',
  showRing = true
}) {
  const [rotation, setRotation] = useState(0);
  const [colorPhase, setColorPhase] = useState(0);
  
  // Smooth color phases for the logo (blue ↔ purple)
  const colorPhases = [
    // Blue phase
    { from: '#3b82f6', via: '#6366f1', to: '#8b5cf6' },
    // Purple phase  
    { from: '#8b5cf6', via: '#a855f7', to: '#d946ef' },
    // Deep purple phase
    { from: '#7c3aed', via: '#6d28d9', to: '#5b21b6' },
    // Violet phase
    { from: '#6366f1', via: '#8b5cf6', to: '#a855f7' },
  ];
  
  // Size configuration
  const sizeConfig = {
    sm: { 
      container: 'w-12 h-12',
      ringOffset: '-6px',
      text: 'text-sm'
    },
    md: { 
      container: 'w-20 h-20', 
      ringOffset: '-10px',
      text: 'text-base'
    },
    lg: { 
      container: 'w-32 h-32',
      ringOffset: '-16px',
      text: 'text-lg'
    },
    xl: { 
      container: 'w-48 h-48',
      ringOffset: '-24px',
      text: 'text-xl'
    }
  };

  // Ring rotation
  useEffect(() => {
    let animationId;
    
    const animate = () => {
      setRotation(prev => (prev + 1.5) % 360);
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Color phase cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setColorPhase(prev => (prev + 1) % colorPhases.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const currentColors = colorPhases[colorPhase];
  
  return (
    <>
      {/* Inject styles dynamically */}
      <style>
        {`
          @keyframes spin-ring {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes color-cycle {
            0%, 100% { 
              --gradient-from: ${colorPhases[0].from};
              --gradient-via: ${colorPhases[0].via};
              --gradient-to: ${colorPhases[0].to};
            }
            33% { 
              --gradient-from: ${colorPhases[1].from};
              --gradient-via: ${colorPhases[1].via};
              --gradient-to: ${colorPhases[1].to};
            }
            66% { 
              --gradient-from: ${colorPhases[2].from};
              --gradient-via: ${colorPhases[2].via};
              --gradient-to: ${colorPhases[2].to};
            }
          }
        `}
      </style>

      {fullPage ? (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-[9999]">
          <div className="relative">
            {/* Spinner */}
            <div className={`relative ${sizeConfig[size].container} ${className}`}>
              {/* Rotating ring */}
              {showRing && (
                <div
                  className="absolute inset-0 rounded-full border-3 border-transparent"
                  style={{
                    borderImage: `linear-gradient(45deg, ${currentColors.from}, ${currentColors.via}, ${currentColors.to}) 1`,
                    animation: 'spin-ring 2s linear infinite',
                    transform: `rotate(${rotation}deg)`,
                    transition: 'border-image 1s ease, transform 0.1s linear',
                  }}
                />
              )}
              
              {/* Static logo with color transition */}
              <div className="absolute inset-0 flex items-center justify-center">
                <OtArenaIcon 
                  className={`w-3/4 h-3/4 transition-all duration-1000 ease-in-out`}
                  style={{
                    color: currentColors.via,
                    filter: `drop-shadow(0 0 8px ${currentColors.from}40)`,
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Text */}
          {text && (
            <div className="mt-8 flex flex-col items-center gap-4">
              <p 
                className={`${sizeConfig[size].text} font-medium tracking-wide transition-colors duration-1000`}
                style={{ color: currentColors.via }}
              >
                {text}
                <span className="inline-flex">
                  <span className="animate-pulse">.</span>
                  <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
                  <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
                </span>
              </p>
              
              {/* Progress indicator */}
              <div className="w-32 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: '40%',
                    background: `linear-gradient(90deg, ${currentColors.from}, ${currentColors.to})`,
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`relative ${sizeConfig[size].container} ${className}`}>
          {/* Rotating ring */}
          {showRing && (
            <div
              className="absolute inset-0 rounded-full border-3 border-transparent"
              style={{
                borderImage: `linear-gradient(45deg, ${currentColors.from}, ${currentColors.via}, ${currentColors.to}) 1`,
                animation: 'spin-ring 2s linear infinite',
                transform: `rotate(${rotation}deg)`,
                transition: 'border-image 1s ease, transform 0.1s linear',
              }}
            />
          )}
          
          {/* Static logo with color transition */}
          <div className="absolute inset-0 flex items-center justify-center">
            <OtArenaIcon 
              className={`w-3/4 h-3/4 transition-all duration-1000 ease-in-out`}
              style={{
                color: currentColors.via,
                filter: `drop-shadow(0 0 8px ${currentColors.from}40)`,
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}