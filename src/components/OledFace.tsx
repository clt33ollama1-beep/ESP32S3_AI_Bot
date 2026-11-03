import React, { useState, useEffect } from 'react';

interface OledFaceProps {
  expression: 'happy' | 'listening' | 'thinking' | 'speaking' | 'sleep' | 'shocked' | 'neutral';
  caption?: string;
  isAudioPlaying?: boolean;
}

export const OledFace: React.FC<OledFaceProps> = ({
  expression,
  caption,
  isAudioPlaying,
}) => {
  const [blink, setBlink] = useState(false);
  const [speechTick, setSpeechTick] = useState(0);

  // Natural blinking timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (expression !== 'sleep') {
        setBlink(true);
        setTimeout(() => setBlink(false), 180);
      }
    }, 3800);
    return () => clearInterval(interval);
  }, [expression]);

  // Speaking mouth movement timer
  useEffect(() => {
    if (expression === 'speaking' || isAudioPlaying) {
      const interval = setInterval(() => {
        setSpeechTick((t) => (t + 1) % 4);
      }, 140);
      return () => clearInterval(interval);
    }
  }, [expression, isAudioPlaying]);

  return (
    <div className="relative w-full aspect-[2/1] max-w-[280px] mx-auto bg-black rounded-lg border-2 border-slate-700/80 shadow-[inset_0_0_12px_rgba(0,0,0,0.9)] p-3 flex flex-col justify-between items-center overflow-hidden font-mono select-none">
      {/* Subtle OLED scanline grid effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage:
            'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
          backgroundSize: '100% 3px, 4px 100%',
        }}
      />

      {/* Screen Header: Device indicator & Wi-Fi */}
      <div className="w-full flex items-center justify-between text-[10px] text-cyan-400/80 font-mono tracking-wider z-10 px-1">
        <span className="uppercase">XZ·S3</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-cyan-300">MCP</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        </div>
      </div>

      {/* OLED Animated Face Display */}
      <div className="my-auto flex flex-col items-center justify-center z-10 w-full">
        {expression === 'happy' && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-8">
              {/* Left happy eye */}
              <div className="w-6 h-4 border-t-4 border-cyan-300 rounded-t-full transition-transform" />
              {/* Right happy eye */}
              <div className="w-6 h-4 border-t-4 border-cyan-300 rounded-t-full transition-transform" />
            </div>
            {/* Cute mouth */}
            <div className="w-4 h-2 border-b-2 border-cyan-300 rounded-b-full mt-0.5" />
          </div>
        )}

        {expression === 'listening' && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-8">
              <div className="w-6 h-6 rounded-full border-2 border-cyan-300 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-cyan-300 rounded-full animate-ping" />
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-cyan-300 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-cyan-300 rounded-full animate-ping" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <span className="w-1 h-3.5 bg-cyan-400 rounded-full animate-pulse delay-75" />
              <span className="w-1 h-2 bg-cyan-400 rounded-full animate-pulse delay-150" />
            </div>
          </div>
        )}

        {expression === 'thinking' && (
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex items-center gap-8">
              <div className="w-6 h-5 bg-cyan-300 rounded-sm -rotate-6" />
              <div className="w-6 h-5 bg-cyan-300 rounded-sm rotate-6" />
            </div>
            <div className="flex items-center gap-1.5 text-cyan-300 text-xs">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-100" />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-200" />
            </div>
          </div>
        )}

        {expression === 'speaking' && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-8">
              <div className="w-5 h-6 bg-cyan-300 rounded-sm" />
              <div className="w-5 h-6 bg-cyan-300 rounded-sm" />
            </div>
            {/* Animated speech waveform mouth */}
            <div className="flex items-center gap-1 h-4">
              <div
                className="w-1.5 bg-cyan-300 rounded-full transition-all duration-100"
                style={{ height: `${speechTick === 0 ? 4 : speechTick === 1 ? 12 : 8}px` }}
              />
              <div
                className="w-1.5 bg-cyan-300 rounded-full transition-all duration-100"
                style={{ height: `${speechTick === 1 ? 16 : speechTick === 2 ? 8 : 12}px` }}
              />
              <div
                className="w-1.5 bg-cyan-300 rounded-full transition-all duration-100"
                style={{ height: `${speechTick === 2 ? 14 : speechTick === 3 ? 16 : 6}px` }}
              />
              <div
                className="w-1.5 bg-cyan-300 rounded-full transition-all duration-100"
                style={{ height: `${speechTick === 3 ? 12 : 6}px` }}
              />
            </div>
          </div>
        )}

        {expression === 'sleep' && (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-8">
              <div className="w-6 h-1 bg-cyan-300/80 rounded" />
              <div className="w-6 h-1 bg-cyan-300/80 rounded" />
            </div>
            <div className="text-[11px] text-cyan-300/90 font-mono tracking-widest mt-1 animate-pulse">
              z · Z · z
            </div>
          </div>
        )}

        {expression === 'shocked' && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-8">
              <div className="w-7 h-7 rounded-full border-2 border-cyan-300 flex items-center justify-center">
                <div className="w-2 h-2 bg-cyan-300 rounded-full" />
              </div>
              <div className="w-7 h-7 rounded-full border-2 border-cyan-300 flex items-center justify-center">
                <div className="w-2 h-2 bg-cyan-300 rounded-full" />
              </div>
            </div>
            <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-300 mt-0.5" />
          </div>
        )}

        {expression === 'neutral' && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-8">
              <div
                className={`w-6 bg-cyan-300 rounded-sm transition-all duration-150 ${
                  blink ? 'h-0.5 mt-2' : 'h-5'
                }`}
              />
              <div
                className={`w-6 bg-cyan-300 rounded-sm transition-all duration-150 ${
                  blink ? 'h-0.5 mt-2' : 'h-5'
                }`}
              />
            </div>
            <div className="w-4 h-0.5 bg-cyan-300 rounded mt-1" />
          </div>
        )}
      </div>

      {/* Screen Footer Caption */}
      <div className="w-full text-center text-[10px] text-cyan-300/80 truncate px-1 z-10">
        {caption || (expression === 'listening' ? 'Listening...' : expression === 'thinking' ? 'MCP Reasoning...' : 'Xiaozhi Ready')}
      </div>
    </div>
  );
};
