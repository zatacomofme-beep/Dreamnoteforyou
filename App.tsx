import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowLeft, Trash2, Mic, Square, Sparkles, User as UserIcon, Play, Pause, Loader2, Crown, Zap, Check } from 'lucide-react';
import { Dream, ViewState, User } from './types';
import InfiniteMenu from './components/InfiniteMenu';
import PixelCard from './components/PixelCard';
import { processAudioDream, generateDreamVideo, generateDreamImage } from './services/geminiService';

// Mock Data
const INITIAL_DREAMS: Dream[] = [];
const DEFAULT_USER: User = {
  id: 'user_01',
  name: 'Dreamer',
  isPro: false
};

export default function App() {
  // --- State ---
  const [dreams, setDreams] = useState<Dream[]>(() => {
    const saved = localStorage.getItem('oneiric_dreams_v2');
    return saved ? JSON.parse(saved) : INITIAL_DREAMS;
  });

  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem('oneiric_user');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });
  
  const [view, setView] = useState<ViewState>('LIST');
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Processing State (Initial Audio -> Image)
  const [processingStage, setProcessingStage] = useState<'idle' | 'analyzing' | 'painting'>('idle');

  // Audio Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('oneiric_dreams_v2', JSON.stringify(dreams));
  }, [dreams]);

  useEffect(() => {
    localStorage.setItem('oneiric_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Sync selectedDream with dreams state (updates for video status)
  useEffect(() => {
    if (selectedDream) {
      const updated = dreams.find(d => d.id === selectedDream.id);
      if (updated && updated !== selectedDream) {
        setSelectedDream(updated);
      }
    }
  }, [dreams, selectedDream]);

  // --- Handlers ---

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
      // 2. Generate Image only
      const imageUrl = await generateDreamImage(analysis.imagePrompt);

      // 3. Create Dream Object
      const audioUrl = URL.createObjectURL(blob);
      const newId = crypto.randomUUID();
      
      const newDream: Dream = {
        id: newId,
        date: new Date().toISOString(),
        audioUrl,
        imageUrl,
        videoUrl: undefined,
        videoStatus: 'pending', // Waiting for user trigger
        videoPrompt: analysis.videoPrompt, // Save for later
        title: analysis.title,
        keyPoints: analysis.keyPoints,
        interpretation: analysis.interpretation,
        mood: analysis.mood,
        color: analysis.color,
      };

      setDreams(prev => [newDream, ...prev]);
      setProcessingStage('idle');
      setSelectedDream(newDream);
      setView('DETAIL');
      // Note: We DO NOT automatically trigger video generation anymore

    } catch (error) {
      console.error("Processing failed", error);
      alert("梦境处理失败，请重试。");
      setProcessingStage('idle');
    }
  };

  const handleTriggerVideo = async (dream: Dream) => {
      // Optimistic update
      setDreams(prev => prev.map(d => 
        d.id === dream.id ? { ...d, videoStatus: 'processing' } : d
      ));

      try {
          const videoUrl = await generateDreamVideo(dream.videoPrompt);
          
          setDreams(prev => prev.map(d => {
              if (d.id === dream.id) {
                  return {
                      ...d,
                      videoUrl: videoUrl,
                      videoStatus: 'completed'
                  };
              }
              return d;
          }));
      } catch (e) {
          console.error("Video generation failed", e);
          setDreams(prev => prev.map(d => {
              if (d.id === dream.id) {
                  return { ...d, videoStatus: 'failed' };
              }
              return d;
          }));
      }
  };

  const handleSelectDream = (dream: Dream) => {
    setSelectedDream(dream);
    setView('DETAIL');
  };

  const handleBack = () => {
    if (view === 'PROFILE') {
        setView('LIST');
        return;
    }
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
    if (audioRef.current.src !== url) audioRef.current.src = url;

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
        alert("您的设备不支持分享");
        return;
    }
    // Share logic remains same...
    const shareData: ShareData = {
      title: dream.title,
      text: `【${dream.title}】\n\n${dream.interpretation}\n\n#Oneiric梦境日志`,
    };
    try {
      if (dream.videoUrl) {
          try {
             const res = await fetch(dream.videoUrl);
             const blob = await res.blob();
             const file = new File([blob], 'dream_loop.mp4', { type: 'video/mp4' });
             if (navigator.canShare && navigator.canShare({ files: [file] })) shareData.files = [file];
          } catch(e) {}
      } else if (dream.imageUrl) {
        try {
          const res = await fetch(dream.imageUrl);
          const blob = await res.blob();
          const file = new File([blob], 'dream_card.png', { type: blob.type });
          if (navigator.canShare && navigator.canShare({ files: [file] })) shareData.files = [file];
        } catch (e) {}
      }
      await navigator.share(shareData);
    } catch (err) {}
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Render Helpers ---

  const renderProfile = () => (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in duration-300">
          <div className="relative">
             <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                 <UserIcon size={48} className="text-white/80" />
             </div>
             {user.isPro && (
                 <div className="absolute -top-2 -right-2 bg-yellow-500 text-black p-1.5 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                     <Crown size={16} fill="currentColor" />
                 </div>
             )}
          </div>
          
          <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className={`text-sm tracking-widest uppercase ${user.isPro ? 'text-yellow-500 font-bold' : 'text-white/50'}`}>
                  {user.isPro ? 'Oneiric Pro' : 'Free Plan'}
              </p>
          </div>

          <div className="w-full max-w-xs space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                  <h3 className="font-bold text-lg mb-2">Pro 权益</h3>
                  <ul className="space-y-3 text-sm text-white/70">
                      <li className="flex items-center gap-2">
                          <Check size={16} className="text-green-400" />
                          <span>无限云端梦境存储</span>
                      </li>
                      <li className="flex items-center gap-2">
                          <Check size={16} className="text-green-400" />
                          <span>AI 深度心理分析报告</span>
                      </li>
                      <li className="flex items-center gap-2">
                          <div className={`p-1 rounded bg-yellow-500/20 ${user.isPro ? 'animate-pulse' : ''}`}>
                             <Zap size={14} className="text-yellow-500" />
                          </div>
                          <span className={user.isPro ? "text-white font-medium" : ""}>Veo 3 梦境视频显化</span>
                      </li>
                  </ul>
              </div>

              <button 
                onClick={() => setUser(prev => ({...prev, isPro: !prev.isPro}))}
                className={`w-full py-4 rounded-full font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                    user.isPro 
                    ? 'bg-white/10 text-white hover:bg-white/20' 
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-105 shadow-lg shadow-purple-900/50'
                }`}
              >
                  {user.isPro ? '管理订阅' : '升级到 Pro'}
              </button>
          </div>
      </div>
  );

  return (
    <div className="w-full h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden">
        
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a1a1a_1px,transparent_1px)] bg-[length:24px_24px] opacity-20 pointer-events-none"></div>

      {/* Header */}
      <header className="z-50 px-6 py-4 flex justify-between items-center border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={() => setView(view === 'PROFILE' ? 'LIST' : 'PROFILE')}
        >
          <div className={`p-1.5 rounded-full transition-colors ${user.isPro ? 'bg-yellow-500/10 border border-yellow-500/50' : 'bg-white/10 border border-white/10 group-hover:bg-white/20'}`}>
              <UserIcon className={`w-5 h-5 ${user.isPro ? 'text-yellow-500' : 'text-white'}`} />
          </div>
        </div>
        
        {view === 'LIST' && (
          <button 
            onClick={() => setView('ADD')}
            className="p-2 bg-white text-black rounded-full hover:bg-purple-400 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)]"
          >
            <Plus size={24} />
          </button>
        )}
        {(view !== 'LIST' && view !== 'PROFILE') && (
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        {view === 'PROFILE' && (
            <button onClick={handleBack} className="text-sm text-white/50 hover:text-white uppercase tracking-wider">Back</button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        
        {view === 'LIST' && <InfiniteMenu items={dreams} onSelect={handleSelectDream} />}

        {view === 'PROFILE' && renderProfile()}

        {/* DETAIL VIEW */}
        {view === 'DETAIL' && selectedDream && (
          <div className="h-full flex flex-col items-center justify-center p-6 relative">
            {/* 
              Constrain Card Size: 
              Height is fixed to 60vh (60% of screen height).
              Aspect ratio ensures proper width.
            */}
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 flex flex-col items-center w-full">
              
              <div 
                onClick={() => togglePlayback(selectedDream.audioUrl)}
                className="cursor-pointer group relative h-[60vh] aspect-[9/16] max-w-full shadow-2xl shadow-black/50"
              >
                  <PixelCard 
                    color={selectedDream.color} 
                    className="w-full h-full rounded-xl overflow-hidden relative"
                    onShare={() => handleShare(selectedDream)}
                  >
                    {/* Media Layer */}
                    {selectedDream.videoStatus === 'completed' && selectedDream.videoUrl ? (
                        <video 
                            src={selectedDream.videoUrl}
                            className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-1000"
                            autoPlay
                            loop
                            muted
                            playsInline
                        />
                    ) : (
                         // Image Fallback
                         <>
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
                         </>
                    )}
                    
                    {/* Processing Overlay */}
                    {selectedDream.videoStatus === 'processing' && (
                         <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-4">
                             <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                             <p className="text-sm font-mono tracking-widest uppercase text-white/80 animate-pulse">
                                Veo 正在显化...
                             </p>
                         </div>
                    )}

                    {/* Gradient & Text Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />

                    {/* Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 backdrop-blur-sm z-10">
                         <div className="p-4 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                            {isPlaying ? <Pause size={32} className="fill-white" /> : <Play size={32} className="fill-white ml-1" />}
                         </div>
                    </div>

                    {/* Text Content */}
                    <div className="absolute bottom-0 left-0 w-full p-5 space-y-3 z-20 pointer-events-none">
                        <div>
                            <h2 className="text-2xl font-bold leading-tight drop-shadow-md text-white">{selectedDream.title}</h2>
                            <p className="text-white/80 text-xs mt-1 drop-shadow-sm line-clamp-3">{selectedDream.interpretation}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selectedDream.keyPoints.map((point, idx) => (
                                <span key={idx} className="text-[10px] bg-black/40 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded text-white/90">
                                    • {point}
                                </span>
                            ))}
                        </div>
                    </div>
                  </PixelCard>
              </div>

              {/* Action Area Below Card - constrained to roughly card width */}
              <div className="w-full max-w-[34vh] mt-6 flex flex-col gap-3">
                  
                  {/* PRO VIDEO TRIGGER */}
                  {user.isPro && selectedDream.videoStatus === 'pending' && (
                      <button 
                        onClick={() => handleTriggerVideo(selectedDream)}
                        className="w-full py-3 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-white/20 rounded-lg flex items-center justify-center gap-2 hover:border-purple-400 transition-all group animate-in slide-in-from-bottom-2"
                      >
                          <Sparkles size={16} className="text-purple-400 group-hover:animate-spin" />
                          <span className="text-sm font-medium tracking-wide">生成超现实梦境视频</span>
                      </button>
                  )}
                  
                  {/* Footer Stats & Delete */}
                  <div className="flex justify-between items-center px-2 opacity-50 hover:opacity-100 transition-opacity text-white">
                     <span className="text-xs font-mono uppercase tracking-widest">{new Date(selectedDream.date).toLocaleDateString('zh-CN')}</span>
                     <button onClick={() => handleDelete(selectedDream.id)}><Trash2 size={18} /></button>
                  </div>
              </div>

            </div>
          </div>
        )}

        {/* ADD / RECORD VIEW */}
        {view === 'ADD' && (
          <div className="h-full flex flex-col items-center justify-center p-6 relative">
            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl transition-all duration-1000 ${isRecording ? 'scale-150 opacity-100' : 'scale-100 opacity-20'}`} />
            
            <div className="h-24 flex flex-col items-center justify-center z-10 mb-8 space-y-2">
                 {processingStage !== 'idle' ? (
                     <>
                        <Loader2 className="animate-spin w-8 h-8 text-purple-400" />
                        <p className="text-xl font-light tracking-widest uppercase animate-pulse">
                            {processingStage === 'analyzing' ? '正在连接潜意识...' : '正在绘制梦境蓝图...'}
                        </p>
                     </>
                 ) : isRecording ? (
                     <p className="text-2xl font-mono text-red-400 animate-pulse">{formatTime(recordingTime)}</p>
                 ) : (
                     <p className="text-white/50 text-lg">点击记录梦境</p>
                 )}
            </div>

            <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={processingStage !== 'idle'}
                className={`relative z-20 group transition-all duration-300 ${processingStage !== 'idle' ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}
            >
                <div className={`w-32 h-32 rounded-full border border-white/20 flex items-center justify-center transition-all duration-300 ${isRecording ? 'border-red-500/50 scale-110' : 'hover:border-purple-400/50 hover:scale-105'}`}>
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]'}`}>
                        {isRecording ? <Square size={32} className="fill-current text-black" /> : <Mic size={32} />}
                    </div>
                </div>
            </button>

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