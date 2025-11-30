import React, { useState, useEffect, useRef, useCallback } from 'react';
import ParticleScene from './components/ParticleScene';
import { AppStage, HandState } from './types';
import { GeminiService } from './services/geminiService';

const STAGE_ORDER = [
  AppStage.TREE,
  AppStage.COUNTDOWN_5,
  AppStage.COUNTDOWN_4,
  AppStage.COUNTDOWN_3,
  AppStage.COUNTDOWN_2,
  AppStage.COUNTDOWN_1,
  AppStage.HAPPY_NEW_YEAR
];

const App: React.FC = () => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [handState, setHandState] = useState<HandState>(HandState.UNKNOWN);
  const [prevHandState, setPrevHandState] = useState<HandState>(HandState.UNKNOWN);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Visual indicator for frame sending
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geminiServiceRef = useRef<GeminiService | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  // Initialize Gemini Service
  const initGemini = useCallback(async () => {
    try {
      // Use type assertion to avoid conflicts with global types
      const aistudio = (window as any).aistudio;
      if (aistudio) {
          const hasKey = await aistudio.hasSelectedApiKey();
          if (!hasKey) {
             await aistudio.openSelectKey();
          }
      }
      
      const apiKey = process.env.API_KEY || '';
      
      if (!apiKey) {
        setError("API Key not found. Please ensure it is set in the environment.");
        return;
      }

      setError(null);
      const service = new GeminiService(apiKey, {
        onHandStateChange: (state) => {
            setHandState(state);
        },
        onStatusChange: (connected) => setIsConnected(connected),
        onError: (err) => setError(err)
      });
      
      geminiServiceRef.current = service;
      await service.connect();
      startVideo();
    } catch (e) {
      console.error(e);
      setError("Failed to initialize AI. Check console.");
    }
  }, []);

  // Setup Webcam
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          frameRate: { ideal: 30 } 
        } 
      });
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setError("Camera access denied or unavailable.");
    }
  };

  // Frame processing loop
  useEffect(() => {
    if (isConnected && videoRef.current && canvasRef.current && geminiServiceRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      const video = videoRef.current;

      frameIntervalRef.current = window.setInterval(async () => {
        if (video.readyState === 4 && ctx) {
          setIsProcessing(true); // Blink indicator
          
          canvasRef.current!.width = video.videoWidth;
          canvasRef.current!.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          
          // Send frame. Using 0.6 quality for speed
          const base64 = canvasRef.current!.toDataURL('image/jpeg', 0.6).split(',')[1];
          await geminiServiceRef.current!.sendFrame(base64);
          
          setTimeout(() => setIsProcessing(false), 50);
        }
      }, 150); // 150ms interval ~ 6-7 FPS, optimal for this model latency balance
    }

    return () => {
      if (frameIntervalRef.current !== null) clearInterval(frameIntervalRef.current);
    };
  }, [isConnected]);

  // Logic to switch stages based on gesture
  useEffect(() => {
    // Trigger on OPEN -> CLOSED transition
    // Simplified: If currently CLOSED and previously was OPEN (or just a change to CLOSED if reliable)
    // We stick to the request: Open -> Closed transition
    if (prevHandState === HandState.OPEN && handState === HandState.CLOSED) {
      handleNextStage();
    }
    setPrevHandState(handState);
  }, [handState]);

  const handleNextStage = () => {
    setCurrentStageIndex((prev) => Math.min(prev + 1, STAGE_ORDER.length - 1));
  };

  const handleReset = () => {
    setCurrentStageIndex(0);
    setHandState(HandState.UNKNOWN);
    setPrevHandState(HandState.UNKNOWN);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white selection:bg-cyan-500/30">
      
      {/* 3D Scene */}
      <ParticleScene stage={STAGE_ORDER[currentStageIndex]} />

      {/* Hidden Video & Canvas for processing */}
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      {/* UI Overlay */}
      <div className="absolute top-0 right-0 h-full w-80 p-6 bg-black/60 backdrop-blur-md border-l border-white/10 shadow-2xl z-10 flex flex-col gap-6">
        
        {/* Header */}
        <div className="mb-2 border-b border-white/10 pb-4">
          <h1 className="text-3xl font-bold font-['Rajdhani'] uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-white">
            Cosmos<br/>Control
          </h1>
          <p className="text-[10px] text-cyan-400/80 mt-2 font-mono tracking-[0.2em] flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
            SYSTEM ONLINE
          </p>
           <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] text-gray-500 hover:text-white mt-2 block font-mono underline decoration-gray-700">
             Billing Configuration
          </a>
        </div>

        {/* Sensor Status */}
        <div className="bg-black/40 rounded border border-cyan-900/50 p-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest">Vision Link</span>
            <div className={`flex items-center gap-2 text-[10px] font-bold font-mono ${isConnected ? 'text-cyan-300' : 'text-red-500'}`}>
              <div className={`w-1.5 h-1.5 ${isConnected ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 'bg-red-500'}`} />
              {isConnected ? 'ESTABLISHED' : 'DISCONNECTED'}
            </div>
          </div>
          
          <div className="space-y-3 relative z-10">
             <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
               <span>DATA_STREAM</span>
               <span className={`transition-colors duration-100 ${isProcessing ? 'text-white' : 'text-gray-700'}`}>
                  {isProcessing ? 'TX >>>' : 'IDLE'}
               </span>
             </div>
             
             {/* Hand State Display */}
             <div className="mt-2 p-3 bg-gradient-to-r from-gray-900 to-black border border-white/5 text-center rounded relative overflow-hidden">
                <div className={`absolute inset-0 opacity-20 transition-colors duration-300 ${
                     handState === HandState.OPEN ? 'bg-blue-500' : 
                     handState === HandState.CLOSED ? 'bg-red-500' : 'bg-transparent'
                }`}></div>
                <span className="text-[9px] text-gray-500 block mb-1 uppercase tracking-widest relative z-10">Gesture Detected</span>
                <span className={`text-2xl font-bold tracking-widest relative z-10 font-['Rajdhani'] ${
                  handState === HandState.OPEN ? 'text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]' :
                  handState === HandState.CLOSED ? 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.8)]' :
                  'text-gray-600'
                }`}>
                  {handState === HandState.UNKNOWN ? '---' : handState}
                </span>
             </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white/5 border-l-2 border-cyan-500 p-4 text-xs font-mono space-y-2">
          <div className="text-[10px] text-cyan-500 uppercase tracking-widest mb-2">Protocol</div>
          <div className="flex items-center gap-3 text-gray-300">
             <span className="text-lg">✋</span>
             <span>Open Hand = ARM</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300">
             <span className="text-lg">✊</span>
             <span>Fist = TRIGGER</span>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-auto flex flex-col gap-3">
            {!isConnected && (
                <button 
                onClick={initGemini}
                className="w-full py-4 bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-500/50 text-cyan-400 hover:text-white font-mono font-bold uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] text-xs"
                >
                Initialize Uplink
                </button>
            )}
            
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={handleNextStage}
                    className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-mono text-[10px] uppercase tracking-widest transition-all"
                >
                    Next Stage
                </button>
                <button 
                    onClick={handleReset}
                    className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-mono text-[10px] uppercase tracking-widest transition-all"
                >
                    Reset
                </button>
            </div>
        </div>

        {error && (
            <div className="p-3 border border-red-900/50 bg-red-900/10 text-[10px] text-red-400 font-mono mt-2 break-words">
                ERR: {error}
            </div>
        )}
      </div>
      
      {/* Current Stage Indicator (Bottom Left) */}
      <div className="absolute bottom-8 left-8 z-0">
         <div className="text-white/5 text-[120px] font-black select-none pointer-events-none font-['Rajdhani'] leading-none">
            {STAGE_ORDER[currentStageIndex] === 'TREE' ? 'XMAS' : 
             STAGE_ORDER[currentStageIndex] === 'HAPPY_NEW_YEAR' ? '2025' :
             STAGE_ORDER[currentStageIndex]}
         </div>
      </div>
    </div>
  );
};

export default App;