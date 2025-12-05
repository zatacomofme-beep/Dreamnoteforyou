import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowLeft, Trash2, Share2, Mic, Square, Sparkles, Moon, Play, Pause, Loader2 } from 'lucide-react';
import { Dream, ViewState } from './types';
import InfiniteMenu from './components/InfiniteMenu';
import PixelCard from './components/PixelCard';
import { processAudioDream, generateDreamImage } from './services/geminiService';

// Mock Data
const INITIAL_DREAMS: Dream[] = [];

export default function App() {
  const [dreams, setDreams] = useState<Dream[]>(() => {
    const saved = localStorage.getItem('oneiric_dreams_v2');
    return saved ? JSON.parse(saved) : INITIAL_DREAMS;
  });
  
  const [view, setView] = useState<ViewState>('LIST');
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Processing State
  const [processingStage, setProcessingStage] = useState<'idle' | 'analyzing' | 'painting'>('idle');

  // Audio Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem('oneiric_dreams_v2', JSON.stringify(dreams));
  }, [dreams]);

  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = handleRecordingStop;

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("需要麦克风权限才能记录梦境。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks to release mic
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleRecordingStop = async () => {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    
    setProcessingStage('analyzing');
    try {
      // 1. Analyze Audio
      const analysis = await processAudioDream(blob);
      
      setProcessingStage('painting');
      // 2. Generate Image
      const imageUrl = await generateDreamImage(analysis.imagePrompt);

      // 3. Create Dream Object
      const audioUrl = URL.createObjectURL(blob);
      
      const newDream: Dream = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        audioUrl,
        imageUrl,
        title: analysis.title,
        keyPoints: analysis.keyPoints,
        interpretation: analysis.interpretation,
        mood: analysis.mood,
        color: analysis.color,
      };

      setDreams(prev => [newDream, ...prev]);
      setProcessingStage('idle');
      setView('LIST');

    } catch (error) {
      console.error("Processing failed", error);
      alert("梦境处理失败，请重试。");
      setProcessingStage('idle');
    }
  };

  const handleSelectDream = (dream: Dream) => {
    setSelectedDream(dream);
    setView('DETAIL');
  };

  const handleBack = () => {
    setView('LIST');
    setSelectedDream(null);
    if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
    }
  };

  const togglePlayback = (url: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (audioRef.current.src !== url) {
        audioRef.current.src = url;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要永久遗忘这个梦境吗？')) {
      setDreams(prev => prev.filter(d => d.id !== id));
      handleBack();
    }
  };

  const handleShare = async (dream: Dream) => {
    if (!navigator.share) {
      alert("您的设备不支持直接分享。");
      return;
    }

    const shareData: ShareData = {
      title: dream.title,
      text: `【${dream.title}】\n\n${dream.interpretation}\n\n关键点：${dream.keyPoints.join(' · ')}\n\n#Oneiric梦境日志`,
    };

    try {
      // Try to convert Base64 image to File for sharing
      if (dream.imageUrl) {
        try {
          const res = await fetch(dream.imageUrl);
          const blob = await res.blob();
          const file = new File([blob], 'dream_card.png', { type: blob.type });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
             shareData.files = [file];
          }
        } catch (e) {
          console.warn("Failed to attach image to share:", e);
        }
      }
      await navigator.share(shareData);
    } catch (err) {
      // Ignore abort errors
      if ((err as Error).name !== 'AbortError') {
        console.error("Share failed:", err);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden">
        
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a1a1a_1px,transparent_1px)] bg-[length:24px_24px] opacity-20 pointer-events-none"></div>

      {/* Header */}
      <header className="z-50 px-6 py-4 flex justify-between items-center border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('LIST')}>
          <Moon className="w-8 h-8 text-purple-500 fill-purple-500/20" />
        </div>
        {view === 'LIST' && (
          <button 
            onClick={() => setView('ADD')}
            className="p-2 bg-white text-black rounded-full hover:bg-purple-400 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)]"
          >
            <Plus size={24} />
          </button>
        )}
        {view !== 'LIST' && (
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        
        {/* LIST VIEW */}
        {view === 'LIST' && (
          <InfiniteMenu items={dreams} onSelect={handleSelectDream} />
        )}

        {/* DETAIL VIEW */}
        {view === 'DETAIL' && selectedDream && (
          <div className="h-full flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-500">
              
              <div 
                onClick={() => togglePlayback(selectedDream.audioUrl)}
                className="cursor-pointer group relative"
              >
                  <PixelCard 
                    color={selectedDream.color} 
                    className="aspect-[4/5] rounded-xl overflow-hidden relative"
                    onShare={() => handleShare(selectedDream)}
                  >
                    {/* Main Image */}
                    {selectedDream.imageUrl ? (
                        <img 
                            src={selectedDream.imageUrl} 
                            alt={selectedDream.title} 
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-void flex items-center justify-center">
                            <Sparkles className="w-12 h-12 text-white/20" />
                        </div>
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 backdrop-blur-sm">
                         <div className="p-4 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                            {isPlaying ? <Pause size={32} className="fill-white" /> : <Play size={32} className="fill-white ml-1" />}
                         </div>
                    </div>

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 w-full p-6 space-y-4">
                        <div>
                            <h2 className="text-3xl font-bold leading-tight drop-shadow-md">{selectedDream.title}</h2>
                            <p className="text-white/60 text-sm mt-1">{selectedDream.interpretation}</p>
                        </div>
                        
                        <div className="space-y-2">
                             <div className="flex flex-wrap gap-2">
                                {selectedDream.keyPoints.map((point, idx) => (
                                    <span key={idx} className="text-xs bg-white/10 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-white/90">
                                        • {point}
                                    </span>
                                ))}
                             </div>
                        </div>
                    </div>
                  </PixelCard>
              </div>

              {/* Footer Actions */}
              <div className="mt-6 flex justify-between items-center px-4 opacity-50 hover:opacity-100 transition-opacity">
                 <span className="text-xs font-mono uppercase tracking-widest">{new Date(selectedDream.date).toLocaleDateString('zh-CN')}</span>
                 <div className="flex gap-4">
                    <button onClick={() => handleDelete(selectedDream.id)}><Trash2 size={20} /></button>
                 </div>
              </div>

            </div>
          </div>
        )}

        {/* ADD / RECORD VIEW */}
        {view === 'ADD' && (
          <div className="h-full flex flex-col items-center justify-center p-6 relative">
            
            {/* Ambient Pulse */}
            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl transition-all duration-1000 ${isRecording ? 'scale-150 opacity-100' : 'scale-100 opacity-20'}`} />

            {/* Status Text */}
            <div className="h-24 flex flex-col items-center justify-center z-10 mb-8 space-y-2">
                 {processingStage !== 'idle' ? (
                     <>
                        <Loader2 className="animate-spin w-8 h-8 text-purple-400" />
                        <p className="text-xl font-light tracking-widest uppercase animate-pulse">
                            {processingStage === 'analyzing' ? '正在连接潜意识...' : '正在显化梦境...'}
                        </p>
                     </>
                 ) : isRecording ? (
                     <p className="text-2xl font-mono text-red-400 animate-pulse">{formatTime(recordingTime)}</p>
                 ) : (
                     <p className="text-white/50 text-lg">点击记录梦境</p>
                 )}
            </div>

            {/* Main Record Button */}
            <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={processingStage !== 'idle'}
                className={`relative z-20 group transition-all duration-300 ${processingStage !== 'idle' ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}
            >
                {/* Button Outer Ring */}
                <div className={`w-32 h-32 rounded-full border border-white/20 flex items-center justify-center transition-all duration-300 ${isRecording ? 'border-red-500/50 scale-110' : 'hover:border-purple-400/50 hover:scale-105'}`}>
                    {/* Button Inner */}
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]'}`}>
                        {isRecording ? <Square size={32} className="fill-current text-black" /> : <Mic size={32} />}
                    </div>
                </div>
            </button>

            {/* Cancel Button */}
            {isRecording && (
                <button 
                    onClick={() => {
                        stopRecording();
                        setIsRecording(false);
                        setView('LIST');
                    }}
                    className="mt-12 text-white/30 hover:text-white transition-colors uppercase text-xs tracking-widest"
                >
                    取消
                </button>
            )}
          </div>
        )}

      </main>
    </div>
  );
}