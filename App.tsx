import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowLeft, Trash2, Mic, Square, Sparkles, User as UserIcon, Loader2, Crown, BookOpen, X, Share2, Menu, Grid, Star, Info, Heart, Lock, Radio, Fingerprint, Activity, Eye, PawPrint, Mountain, Brain, Clapperboard } from 'lucide-react';
import { Dream, ViewState, User } from './types';
import InfiniteMenu from './components/InfiniteMenu';
import PixelCard from './components/PixelCard';
import { processAudioDream, generateDreamVideo, generateDreamImage, analyzeDreamDepth, analyzeElementSymbolism } from './services/geminiService';
import Particles from './components/Particles';
import FuzzyText from './components/FuzzyText';

// --- Configuration ---
const CODEX_CATEGORIES = {
  LIVING: { id: 'living', label: '生灵万物', icon: PawPrint, description: '潜意识的化身', items: ['猫', '狗', '蛇', '鸟', '鱼', '狼', '鹿', '老虎', '树', '花'] },
  NATURE: { id: 'nature', label: '自然元素', icon: Mountain, description: '环境与基调', items: ['火', '水', '雨', '雪', '太阳', '月亮', '星星', '风', '海', '山'] },
  EMOTION: { id: 'emotion', label: '核心情绪', icon: Brain, description: '内在的波澜', items: ['恐惧', '喜悦', '悲伤', '焦虑', '平静', '愤怒', '困惑', '孤独'] },
  SCENE: { id: 'scene', label: '经典场景', icon: Clapperboard, description: '循环的剧本', items: ['飞翔', '坠落', '追逐', '考试', '迟到', '掉牙', '裸体', '迷路', '开车', '电梯'] }
};

// Mock Data
const INITIAL_DREAMS: Dream[] = [];
const DEFAULT_USER: User = {
  id: 'user_01',
  name: '造梦者',
  isPro: false
};

const MOCK_GALAXY_DREAMS = [
  { id: 'g1', keywords: ['#考试迟到', '#焦虑', '#找不到教室'], color: '#ef4444', x: 20, y: 30, distance: 1, location: '数千公里外的北方' },
  { id: 'g2', keywords: ['#高空坠落', '#失重', '#惊醒'], color: '#3b82f6', x: 70, y: 60, distance: 0.8, location: '来自潮湿的南方' },
  { id: 'g3', keywords: ['#牙齿掉落', '#无力感', '#镜子'], color: '#a855f7', x: 40, y: 80, distance: 2, location: '或许就在隔壁城市' },
  { id: 'g4', keywords: ['#被追逐', '#跑不动', '#黑影'], color: '#10b981', x: 80, y: 20, distance: 3, location: '未知的海岸线' },
  { id: 'g5', keywords: ['#会飞', '#俯瞰', '#自由'], color: '#f59e0b', x: 15, y: 70, distance: 1.5, location: '高原之上' },
  { id: 'g6', keywords: ['#迷路', '#楼梯', '#循环'], color: '#6366f1', x: 50, y: 50, distance: 0.5, location: '喧嚣的都市角落' },
  { id: 'g7', keywords: ['#已故亲人', '#温暖', '#无言'], color: '#ec4899', x: 60, y: 15, distance: 2.5, location: '安静的山谷' },
  { id: 'g8', keywords: ['#回到学校', '#做题', '#同桌'], color: '#14b8a6', x: 85, y: 85, distance: 1.2, location: '久远的记忆里' },
  { id: 'g9', keywords: ['#赤身裸体', '#羞耻', '#人群'], color: '#f43f5e', x: 30, y: 40, distance: 2.8, location: '异国他乡' },
];

export default function App() {
  // --- State ---
  const [dreams, setDreams] = useState<Dream[]>(() => {
    try {
      const saved = localStorage.getItem('oneiric_dreams_v2');
      const parsed = saved ? JSON.parse(saved) : INITIAL_DREAMS;
      return Array.isArray(parsed) ? parsed : INITIAL_DREAMS;
    } catch (e) {
      console.warn("Failed to parse dreams from local storage:", e);
      return INITIAL_DREAMS;
    }
  });

  const [user, setUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('oneiric_user');
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch (e) {
      return DEFAULT_USER;
    }
  });
  
  const [view, setView] = useState<ViewState>('LIST');
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Codex State
  const [codexCategory, setCodexCategory] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<{name: string, count: number, firstDate: string, imageUrl: string, analysis?: string} | null>(null);
  const [isAnalyzingElement, setIsAnalyzingElement] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [processingStage, setProcessingStage] = useState<'idle' | 'analyzing' | 'painting'>('idle');

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // Audio Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Galaxy State
  const [galaxyTarget, setGalaxyTarget] = useState<typeof MOCK_GALAXY_DREAMS[0] | null>(null);
  const [isResonating, setIsResonating] = useState(false);
  const [resonanceSent, setResonanceSent] = useState(false);
  const [showResonanceNotification, setShowResonanceNotification] = useState(false);

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

  useEffect(() => {
    if (selectedDream) {
      const updated = dreams.find(d => d.id === selectedDream.id);
      if (updated && updated !== selectedDream) {
        setSelectedDream(updated);
      }
    }
  }, [dreams, selectedDream]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [view]);

  // --- Handlers ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleRecordingStop = async () => {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    setProcessingStage('analyzing');
    try {
      const analysis = await processAudioDream(blob);
      setProcessingStage('painting');
      const imageUrl = await generateDreamImage(analysis.imagePrompt);
      const audioUrl = URL.createObjectURL(blob);
      const newId = crypto.randomUUID();
      
      const newDream: Dream = {
        id: newId,
        date: new Date().toISOString(),
        audioUrl,
        imageUrl,
        videoUrl: undefined,
        videoStatus: 'pending',
        videoPrompt: analysis.videoPrompt,
        title: analysis.title,
        keyPoints: analysis.keyPoints,
        interpretation: analysis.interpretation,
        mood: analysis.mood,
        color: analysis.color,
        elements: analysis.elements
      };

      setDreams(prev => [newDream, ...prev]);
      setProcessingStage('idle');
      setSelectedDream(newDream);
      setView('DETAIL');
    } catch (error) {
      console.error("Processing failed", error);
      alert("梦境处理失败，请重试。");
      setProcessingStage('idle');
    }
  };

  const handleTriggerVideo = async (dream: Dream) => {
      setDreams(prev => prev.map(d => 
        d.id === dream.id ? { ...d, videoStatus: 'processing' } : d
      ));
      try {
          const videoUrl = await generateDreamVideo(dream.videoPrompt);
          setDreams(prev => prev.map(d => d.id === dream.id ? { ...d, videoUrl: videoUrl, videoStatus: 'completed' } : d));
      } catch (e) {
          console.error("Video generation failed", e);
          setDreams(prev => prev.map(d => d.id === dream.id ? { ...d, videoStatus: 'failed' } : d));
      }
  };

  const handleDeepAnalysis = async () => {
    if (!selectedDream) return;
    if (selectedDream.detailedAnalysis) {
        setShowAnalysisModal(true);
        return;
    }
    setIsAnalyzing(true);
    try {
        const analysis = await analyzeDreamDepth(selectedDream);
        const updatedDream = { ...selectedDream, detailedAnalysis: analysis };
        setSelectedDream(updatedDream);
        setDreams(prev => prev.map(d => d.id === selectedDream.id ? updatedDream : d));
        setShowAnalysisModal(true);
    } catch (e) {
        alert("解读失败，请检查网络连接");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleSelectDream = (dream: Dream) => {
    setSelectedDream(dream);
    setView('DETAIL');
    setShowAnalysisModal(false);
  };

  const handleBack = () => {
    if (selectedElement) {
        setSelectedElement(null);
        return;
    }
    if (codexCategory) {
        setCodexCategory(null);
        return;
    }
    if (['PROFILE', 'CODEX', 'GALAXY', 'ABOUT'].includes(view)) {
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
    const shareData: ShareData = {
      title: dream.title,
      text: `【${dream.title}】\n\n${dream.interpretation}\n\n#Oneiric梦境日志`,
    };
    try {
       await navigator.share(shareData);
    } catch (err) {}
  };

  const handleShareText = async (text: string) => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: selectedDream?.title || '梦境解读',
                text: text + '\n\n#Oneiric梦境日志',
            });
        } catch(e) {}
    } else {
        try {
            await navigator.clipboard.writeText(text);
            alert("解读内容已复制到剪贴板");
        } catch (e) {
            alert("复制失败");
        }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGalaxyClick = (target: typeof MOCK_GALAXY_DREAMS[0]) => {
      setGalaxyTarget(target);
      setResonanceSent(false);
  };

  const handleResonance = () => {
      setIsResonating(true);
      setTimeout(() => {
          setIsResonating(false);
          setResonanceSent(true);
          setTimeout(() => {
              setGalaxyTarget(null);
          }, 1500);
      }, 1500);
  };

  // --- Codex Helpers ---
  const getCollectedElements = () => {
      const counts: Record<string, {count: number, lastDream: Dream, firstDate: string}> = {};
      dreams.forEach(d => {
          // Check regular elements
          d.elements?.forEach(e => {
              if (!counts[e]) counts[e] = { count: 0, lastDream: d, firstDate: d.date };
              counts[e].count++;
              if (new Date(d.date) > new Date(counts[e].lastDream.date)) counts[e].lastDream = d;
              if (new Date(d.date) < new Date(counts[e].firstDate)) counts[e].firstDate = d.date;
          });
          // Also check mood for Emotion category
          if (d.mood) {
              const m = d.mood;
              if (!counts[m]) counts[m] = { count: 0, lastDream: d, firstDate: d.date };
              counts[m].count++;
              if (new Date(d.date) > new Date(counts[m].lastDream.date)) counts[m].lastDream = d;
          }
      });
      return counts;
  };

  const handleElementClick = async (eleName: string, data: {count: number, lastDream: Dream, firstDate: string}) => {
      setSelectedElement({
          name: eleName,
          count: data.count,
          firstDate: data.firstDate,
          imageUrl: data.lastDream.imageUrl || '',
      });
      setIsAnalyzingElement(true);
      try {
          const analysis = await analyzeElementSymbolism(eleName, data.count);
          setSelectedElement(prev => prev ? { ...prev, analysis } : null);
      } catch (e) {
          console.error(e);
      } finally {
          setIsAnalyzingElement(false);
      }
  };

  // --- Render Sections ---

  const renderMenu = () => (
      <div className={`fixed inset-0 z-40 bg-black/95 backdrop-blur-xl transition-all duration-300 flex flex-col items-center justify-center space-y-12 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col gap-6 w-full max-w-xs px-6">
            <button 
                onClick={() => {setView('PROFILE'); setIsMenuOpen(false);}}
                className="group flex items-center justify-between p-4 border border-white/10 hover:border-white/30 hover:bg-white/5 rounded-none transition-all"
            >
                <span className="text-sm font-light tracking-[0.2em] group-hover:pl-2 transition-all">个人档案</span>
                <UserIcon size={16} className="text-white/50 group-hover:text-white" />
            </button>
            <button 
                onClick={() => {setView('CODEX'); setIsMenuOpen(false);}}
                className="group flex items-center justify-between p-4 border border-white/10 hover:border-white/30 hover:bg-white/5 rounded-none transition-all"
            >
                <span className="text-sm font-light tracking-[0.2em] group-hover:pl-2 transition-all">梦境图鉴</span>
                <Grid size={16} className="text-white/50 group-hover:text-white" />
            </button>
            <button 
                onClick={() => {setView('GALAXY'); setIsMenuOpen(false);}}
                className="group flex items-center justify-between p-4 border border-white/10 hover:border-white/30 hover:bg-white/5 rounded-none transition-all"
            >
                <span className="text-sm font-light tracking-[0.2em] group-hover:pl-2 transition-all">共鸣星海</span>
                <Star size={16} className="text-white/50 group-hover:text-white" />
            </button>
            <button 
                onClick={() => {setView('ABOUT'); setIsMenuOpen(false);}}
                className="group flex items-center justify-between p-4 border border-white/10 hover:border-white/30 hover:bg-white/5 rounded-none transition-all"
            >
                <span className="text-sm font-light tracking-[0.2em] group-hover:pl-2 transition-all">关于应用</span>
                <Info size={16} className="text-white/50 group-hover:text-white" />
            </button>
          </div>
      </div>
  );

  const renderCodex = () => {
      const collected = getCollectedElements();
      const totalCollected = Object.keys(collected).length;

      // 1. Element Detail View (Overlay)
      if (selectedElement) {
          return (
              <div className="flex-1 relative flex flex-col animate-zoom-in">
                  {/* Background Image */}
                  <div className="absolute inset-0 z-0">
                      {selectedElement.imageUrl ? (
                          <img src={selectedElement.imageUrl} alt="Dream Background" className="w-full h-full object-cover opacity-40 blur-sm" />
                      ) : (
                          <div className="w-full h-full bg-gray-900" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
                      <div className={`w-24 h-24 rounded-full border border-white/10 overflow-hidden relative group shadow-2xl`}>
                          {selectedElement.imageUrl && (
                              <img src={selectedElement.imageUrl} className="w-full h-full object-cover" alt={selectedElement.name} />
                          )}
                      </div>

                      <div className="space-y-4">
                          <h2 className="text-2xl font-light tracking-[0.5em] uppercase text-white">{selectedElement.name}</h2>
                          <div className="flex items-center justify-center gap-6 text-[10px] font-mono text-white/40 tracking-widest uppercase">
                              <span className="border-b border-white/10 pb-1">遇见: {selectedElement.count}</span>
                              <span className="border-b border-white/10 pb-1">初遇: {new Date(selectedElement.firstDate).toLocaleDateString()}</span>
                          </div>
                      </div>

                      <div className="max-w-xs w-full bg-black/40 backdrop-blur-md border-t border-b border-white/10 py-8 min-h-[100px] flex items-center justify-center">
                          {isAnalyzingElement ? (
                              <div className="flex flex-col items-center gap-3">
                                  <Loader2 className="animate-spin text-white/30" size={16} />
                                  <span className="text-[10px] tracking-widest text-white/30 uppercase">解析中...</span>
                              </div>
                          ) : (
                              <p className="text-xs text-white/70 italic leading-relaxed font-serif px-4">
                                  “{selectedElement.analysis || '这个符号保持沉默。'}”
                              </p>
                          )}
                      </div>
                  </div>
              </div>
          );
      }

      // 2. Category Grid View
      if (codexCategory) {
          const catKey = codexCategory as keyof typeof CODEX_CATEGORIES;
          const category = CODEX_CATEGORIES[catKey];
          const Icon = category.icon;
          
          return (
            <div className="flex-1 flex flex-col animate-slide-up bg-black">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-light tracking-[0.2em] uppercase text-white">{category.label}</h2>
                        <p className="text-white/30 text-[10px] mt-1 tracking-wider uppercase">已收集: {category.items.filter(i => collected[i]).length} / {category.items.length}</p>
                    </div>
                    <Icon size={24} className="text-white/20" strokeWidth={1} />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="grid grid-cols-4 gap-3">
                        {category.items.map((item, idx) => {
                            const data = collected[item];
                            const isLocked = !data;
                            const isMastered = data && data.count > 5;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => !isLocked && handleElementClick(item, data)}
                                    disabled={isLocked}
                                    className={`aspect-square relative overflow-hidden transition-all duration-300 group flex flex-col items-center justify-center
                                        ${isLocked 
                                            ? 'bg-white/5 opacity-30 border border-white/5' 
                                            : `bg-black border ${isMastered ? 'border-yellow-500/30' : 'border-white/20'} hover:border-white/50`
                                        }
                                    `}
                                >
                                    {isLocked ? (
                                        <Lock size={12} className="text-white/20" strokeWidth={1.5} />
                                    ) : (
                                        <>
                                            {/* Image Slice Background */}
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-500">
                                                {data.lastDream.imageUrl && (
                                                    <img src={data.lastDream.imageUrl} alt={item} className="w-full h-full object-cover grayscale" />
                                                )}
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="relative z-10 flex flex-col items-center gap-1">
                                                <span className={`text-[10px] tracking-widest ${isMastered ? 'text-yellow-500' : 'text-white/80'}`}>{item}</span>
                                                <div className="h-[1px] w-3 bg-white/20 group-hover:w-6 transition-all" />
                                            </div>
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
          );
      }

      // 3. Main Hall (Dashboard)
      return (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 animate-zoom-in relative flex flex-col">
               {/* Header Section using FuzzyText for title */}
              <div className="mb-12 relative z-10 text-center py-12 border-b border-white/5">
                   <h2 className="text-[10px] font-mono text-white/40 tracking-[0.4em] uppercase mb-4">潜意识博物馆</h2>
                   <div className="h-16 flex items-center justify-center mb-4">
                     <FuzzyText fontSize="clamp(1.5rem, 5vw, 2.5rem)" fontWeight={300} color="#fff" baseIntensity={0.1}>
                        潜意识博物馆
                     </FuzzyText>
                   </div>
                   <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 mt-2 bg-white/5">
                       <Fingerprint size={10} className="text-white/40" />
                       <span className="text-[10px] font-mono tracking-widest text-white/60">{totalCollected} / 365 梦境样本</span>
                   </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-20 max-w-md mx-auto w-full">
                  {Object.entries(CODEX_CATEGORIES).map(([key, cat]) => {
                      const Icon = cat.icon;
                      return (
                      <button
                          key={key}
                          onClick={() => setCodexCategory(key)}
                          className={`relative aspect-[4/5] overflow-hidden group border border-white/10 transition-all duration-500 hover:border-white/30 bg-black flex flex-col items-center justify-center gap-4`}
                      >
                          {/* Minimal Background */}
                          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-10 transition-opacity" />
                          
                          <Icon size={24} strokeWidth={1} className="text-white/70 group-hover:scale-110 transition-transform duration-500" />
                          
                          <div className="text-center space-y-1 z-10">
                              <h3 className="text-sm font-light tracking-[0.3em] uppercase">{cat.label}</h3>
                              <p className="text-[8px] text-white/30 tracking-widest uppercase">{cat.description}</p>
                          </div>
                          
                          <div className="absolute bottom-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                             <ArrowLeft size={12} className="rotate-180 text-white/50" />
                          </div>
                      </button>
                  )})}
              </div>
          </div>
      );
  };

  const renderGalaxy = () => {
    // Current user's most recent dream
    const myDream = dreams[0]; 
    
    return (
      <div className="flex-1 relative overflow-hidden animate-fade-in bg-black flex flex-col items-center justify-center perspective-1000">
          {/* Rotating Nebula Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
               <div className="w-[120vw] h-[120vw] bg-[radial-gradient(circle_at_center,rgba(50,50,100,0.4),rgba(0,0,0,0)_60%)] animate-pulse-slow mix-blend-screen" />
               <div className="absolute w-[100vw] h-[100vw] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(100,50,255,0.1)_180deg,transparent_360deg)] animate-[spin_60s_linear_infinite]" />
          </div>

          {/* Particles */}
          <Particles particleCount={200} speed={0.02} minSize={0.5} maxSize={1.5} className="opacity-60" />
          
          {/* Header Banner */}
          <div className="absolute top-8 w-full text-center z-10 pointer-events-none animate-slide-up">
              <p className="text-[10px] text-white/50 font-mono tracking-[0.3em] uppercase animate-pulse">
                昨夜，有 328 个孤独的灵魂与你同频
              </p>
          </div>

          {/* The Void Container */}
          <div className="relative w-full h-full max-w-2xl max-h-2xl flex items-center justify-center">
              
              {/* Me (Center Star) */}
              <div className="absolute z-30 group cursor-default">
                  <div className="w-6 h-6 bg-white rounded-full shadow-[0_0_50px_rgba(255,255,255,0.8)] animate-pulse-slow relative flex items-center justify-center">
                     <div className="absolute inset-0 bg-white blur-md rounded-full opacity-50" />
                  </div>
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 whitespace-nowrap">
                       <p className="text-[10px] tracking-widest uppercase text-white/80">{myDream ? myDream.title : "等待梦境..."}</p>
                  </div>
              </div>

              {/* Surrounding Stars (Others) */}
              {MOCK_GALAXY_DREAMS.map((star, idx) => {
                 // Calculate semi-random positions roughly orbital
                 // We rely on the hardcoded x/y % from mock but center them relative to container
                 return (
                  <button
                      key={star.id}
                      style={{ left: `${star.x}%`, top: `${star.y}%` }}
                      onClick={() => handleGalaxyClick(star)}
                      className="absolute p-6 group z-20 hover:z-40 transition-all duration-500"
                  >
                      <div className="relative flex flex-col items-center gap-4">
                        <div 
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-500 group-hover:scale-[3] group-hover:shadow-[0_0_20px_currentColor]`}
                            style={{ backgroundColor: star.color, boxShadow: `0 0 ${10 / star.distance}px ${star.color}` }}
                        />
                        {/* Distance Ring */}
                        <div className="absolute inset-0 rounded-full border border-white/5 scale-0 group-hover:scale-[6] transition-transform duration-700 delay-75" />
                      </div>
                  </button>
              )})}
          </div>

          {/* Modal: The Peek */}
          {galaxyTarget && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]" onClick={() => !isResonating && !resonanceSent && setGalaxyTarget(null)}>
                  <div 
                      className={`relative w-80 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center space-y-6 shadow-2xl transition-all duration-700 overflow-hidden ${resonanceSent ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
                      onClick={e => e.stopPropagation()}
                  >
                      {/* Privacy Blur Layer */}
                      <div className="w-24 h-24 rounded-full overflow-hidden relative mb-2 ring-1 ring-white/10">
                          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 to-blue-500 opacity-50 mix-blend-screen" />
                          <div className="absolute inset-0 backdrop-blur-xl" />
                          <div className="absolute inset-0 flex items-center justify-center">
                               <Fingerprint className="text-white/20" size={32} strokeWidth={1} />
                          </div>
                      </div>

                      <div className="space-y-3 w-full">
                          <div className="flex flex-wrap justify-center gap-2">
                             {galaxyTarget.keywords.map(k => (
                                 <span key={k} className="text-[9px] px-2 py-1 bg-white/5 border border-white/5 rounded-full text-white/60 tracking-wider">
                                     {k}
                                 </span>
                             ))}
                          </div>
                          <p className="text-[9px] text-white/30 tracking-widest uppercase border-t border-white/5 pt-3">
                              {galaxyTarget.location}
                          </p>
                      </div>

                      <button 
                          onClick={handleResonance}
                          disabled={isResonating}
                          className="w-full py-4 mt-2 group relative overflow-hidden"
                      >
                          <div className={`absolute inset-0 bg-gradient-to-r from-white/10 to-transparent transition-transform duration-500 ${isResonating ? 'translate-x-full' : '-translate-x-full group-hover:translate-x-0'}`} />
                          <div className={`flex items-center justify-center gap-2 transition-all duration-300 ${isResonating ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
                              <Radio size={16} className="text-white/80" />
                              <span className="text-[10px] tracking-[0.3em] uppercase text-white/80">发送共鸣信号</span>
                          </div>
                          
                          {/* Particle Explosion Effect */}
                          {isResonating && (
                               <div className="absolute inset-0 flex items-center justify-center">
                                   <div className="w-2 h-2 bg-white rounded-full animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite]" />
                                   <span className="text-[9px] tracking-widest text-white animate-pulse absolute mt-8">发送中...</span>
                               </div>
                          )}
                      </button>
                  </div>
                  
                  {resonanceSent && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-fade-in">
                           <div className="text-center space-y-4">
                               <div className="w-px h-32 bg-gradient-to-b from-transparent via-white to-transparent mx-auto animate-[ping_1s_ease-out_reverse]" />
                               <p className="text-xs text-white/80 font-light tracking-[0.2em] uppercase">信号已发送。愿你好梦。</p>
                           </div>
                      </div>
                  )}
              </div>
          )}
      </div>
    );
  };

  const renderAbout = () => (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-slide-up space-y-8">
          <div className="w-16 h-16 border border-white/10 flex items-center justify-center rotate-45 mb-4">
              <Eye size={24} className="text-white/80 -rotate-45" strokeWidth={1} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-light tracking-[0.3em] uppercase">Oneiric</h2>
            <p className="text-[10px] text-white/40 tracking-widest uppercase">梦境日志 v2.5.0</p>
          </div>
          <p className="text-white/60 text-xs max-w-xs leading-loose font-light">
              我们捕捉潜意识的碎片<br/>将其铸成数字永恒。
          </p>
      </div>
  );

  const renderProfile = () => (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-12 animate-zoom-in">
          <div className="relative">
             <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center border border-white/20">
                 <UserIcon size={32} className="text-white/50" strokeWidth={1} />
             </div>
             {user.isPro && (
                 <div className="absolute -top-1 -right-1 text-yellow-500">
                     <Crown size={12} fill="currentColor" />
                 </div>
             )}
          </div>
          <div className="text-center space-y-3">
              <h2 className="text-xl font-light tracking-widest">{user.name}</h2>
              <div className="inline-block px-3 py-1 border border-white/10">
                  <p className={`text-[10px] tracking-[0.2em] uppercase ${user.isPro ? 'text-white' : 'text-white/40'}`}>
                      {user.isPro ? '专业会员' : '免费账户'}
                  </p>
              </div>
          </div>
          <button 
                onClick={() => setUser(prev => ({...prev, isPro: !prev.isPro}))}
                className={`w-48 py-3 border transition-all duration-300 flex items-center justify-center gap-2 text-[10px] tracking-[0.2em] uppercase ${
                    user.isPro 
                    ? 'border-white/10 hover:bg-white/5' 
                    : 'border-white/40 hover:bg-white hover:text-black hover:border-white'
                }`}
          >
              {user.isPro ? '管理' : '升级'}
          </button>
      </div>
  );

  return (
    <div className="w-full h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden selection:bg-white/20">
        
      {/* Background Ambience - Grid instead of dots for wireframe feel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear_gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none"></div>

      {/* Header */}
      <header className="z-50 px-6 py-6 flex justify-between items-center bg-gradient-to-b from-black via-black/80 to-transparent">
        <div 
            className="cursor-pointer group z-50 hover:opacity-70 transition-opacity" 
            onClick={() => {
                if (selectedElement) {
                    handleBack();
                } else if (codexCategory) {
                    handleBack();
                } else {
                    setIsMenuOpen(!isMenuOpen);
                }
            }}
        >
             {(isMenuOpen || codexCategory || selectedElement) ? <ArrowLeft size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
        </div>

        {/* Home View Header Actions */}
        {view === 'LIST' && (
            <div className="flex items-center gap-4">
                 {/* Resonance Notification - Small Star Icon */}
                 <button 
                    onClick={() => setShowResonanceNotification(!showResonanceNotification)}
                    className="relative group w-10 h-10 flex items-center justify-center"
                 >
                     <Star size={16} strokeWidth={1} className="text-white/60 group-hover:text-white transition-colors" />
                     {/* Notification Dot */}
                     <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_10px_orange]" />
                     
                     {showResonanceNotification && (
                         <div className="absolute top-12 right-0 w-64 bg-black/90 border border-white/10 backdrop-blur-xl p-4 rounded-xl z-50 animate-slide-up shadow-2xl">
                             <p className="text-[10px] text-white/80 leading-relaxed font-light tracking-wide">
                                 过去24小时内，有 <span className="text-white font-mono">15</span> 位陌生人拥抱了你的梦境。
                             </p>
                             <div className="absolute top-[-4px] right-3 w-2 h-2 bg-white/10 rotate-45 border-l border-t border-white/10" />
                         </div>
                     )}
                 </button>

                 <button 
                    onClick={() => setView('ADD')}
                    className="w-10 h-10 border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300"
                >
                    <Plus size={18} strokeWidth={1.5} />
                </button>
            </div>
        )}

        {(view !== 'LIST' && !isMenuOpen && !codexCategory && !selectedElement) && (
          <button 
            onClick={handleBack}
            className="hover:opacity-70 transition-opacity"
          >
            <ArrowLeft size={18} strokeWidth={1.5} />
          </button>
        )}
      </header>

      {/* Menu Overlay */}
      {renderMenu()}

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {view === 'LIST' && <InfiniteMenu items={dreams} onSelect={handleSelectDream} />}
        {view === 'PROFILE' && renderProfile()}
        {view === 'CODEX' && renderCodex()}
        {view === 'GALAXY' && renderGalaxy()}
        {view === 'ABOUT' && renderAbout()}

        {/* DETAIL VIEW */}
        {view === 'DETAIL' && selectedDream && (
          <div className="h-full w-full flex flex-col items-center justify-center p-6 relative overflow-y-auto custom-scrollbar">
            <div className="animate-slide-up flex flex-col items-center w-[75%] max-w-sm h-full justify-center pb-20">
              <div 
                onClick={() => togglePlayback(selectedDream.audioUrl)}
                className="cursor-pointer group relative w-full aspect-[9/16] shadow-2xl border border-white/10 rounded-sm overflow-hidden"
              >
                  <PixelCard 
                    color={selectedDream.color} 
                    className="w-full h-full relative"
                    onShare={() => handleShare(selectedDream)}
                  >
                    {selectedDream.videoStatus === 'completed' && selectedDream.videoUrl ? (
                        <video 
                            src={selectedDream.videoUrl}
                            className="absolute inset-0 w-full h-full object-cover animate-fade-in"
                            autoPlay
                            loop
                            muted
                            playsInline
                        />
                    ) : (
                         <>
                            {selectedDream.imageUrl ? (
                                <img 
                                    src={selectedDream.imageUrl} 
                                    alt={selectedDream.title} 
                                    className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-black flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-white/10" />
                                </div>
                            )}
                         </>
                    )}
                    {selectedDream.videoStatus === 'processing' && (
                         <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-4">
                             <Loader2 className="w-8 h-8 text-white/50 animate-spin" strokeWidth={1} />
                             <p className="text-[10px] font-mono tracking-widest uppercase text-white/50 animate-pulse">影像显化中...</p>
                         </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
                    
                    {/* Minimal Card Text */}
                    <div className="absolute bottom-0 left-0 w-full p-6 space-y-4 z-20 pointer-events-none">
                         <div className="w-8 h-[1px] bg-white/50" />
                         <p className="text-white/90 text-xs font-light leading-relaxed line-clamp-3 font-serif italic">
                             {selectedDream.interpretation}
                         </p>
                    </div>
                  </PixelCard>
              </div>
              
              <div className="w-full mt-6 flex flex-col gap-3">
                  <button onClick={handleDeepAnalysis} disabled={isAnalyzing} className="w-full py-4 border border-white/10 flex items-center justify-center gap-3 hover:bg-white/5 transition-all group animate-slide-up">
                      {isAnalyzing ? <Loader2 size={14} className="text-white animate-spin" /> : <BookOpen size={14} className="text-white/70" strokeWidth={1.5} />}
                      <span className="text-[10px] font-light tracking-[0.2em] uppercase">{isAnalyzing ? '分析中...' : '深度解读'}</span>
                  </button>
                  {user.isPro && selectedDream.videoStatus === 'pending' && (
                      <button onClick={() => handleTriggerVideo(selectedDream)} className="w-full py-4 border border-white/20 bg-white/5 flex items-center justify-center gap-3 hover:border-white/40 transition-all group animate-slide-up">
                          <Activity size={14} className="text-white/70" strokeWidth={1.5} />
                          <span className="text-[10px] font-light tracking-[0.2em] uppercase">生成视频</span>
                      </button>
                  )}
                  <div className="flex justify-between items-center px-2 mt-2 opacity-40 hover:opacity-100 transition-opacity text-white">
                     <span className="text-[10px] font-mono tracking-widest uppercase">{new Date(selectedDream.date).toLocaleDateString('zh-CN')}</span>
                     <button onClick={() => handleDelete(selectedDream.id)}><Trash2 size={14} strokeWidth={1.5} /></button>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* ANALYSIS MODAL */}
        {showAnalysisModal && selectedDream?.detailedAnalysis && (
            <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-black border border-white/10 w-full max-w-lg max-h-[85vh] flex flex-col animate-zoom-in">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <BookOpen size={16} className="text-white/60" strokeWidth={1.5}/>
                            <h3 className="text-xs font-light tracking-[0.2em] uppercase text-white">梦境解读</h3>
                        </div>
                        <button onClick={() => setShowAnalysisModal(false)} className="opacity-50 hover:opacity-100 transition-opacity"><X size={18} strokeWidth={1.5}/></button>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                        <h4 className="text-lg font-light mb-6 text-white text-center tracking-widest">{selectedDream.title}</h4>
                        <div className="text-white/70 leading-loose text-justify font-serif text-sm whitespace-pre-wrap space-y-4">{selectedDream.detailedAnalysis}</div>
                    </div>
                    <div className="p-6 border-t border-white/10 flex justify-center">
                        <button onClick={() => handleShareText(selectedDream.detailedAnalysis!)} className="px-6 py-2 border border-white/10 hover:bg-white/5 text-white text-[10px] tracking-[0.2em] uppercase flex items-center gap-2 transition-all"><Share2 size={12} /><span>分享</span></button>
                    </div>
                </div>
            </div>
        )}

        {/* ADD / RECORD VIEW */}
        {view === 'ADD' && (
          <div className="h-full flex flex-col items-center justify-center p-6 relative">
             {/* Simple noise circle instead of blur blob */}
            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-white/5 rounded-full transition-all duration-1000 ${isRecording ? 'scale-125 border-white/20' : 'scale-100'}`} />
            
            <div className="h-24 flex flex-col items-center justify-center z-10 mb-8 space-y-3">
                 {processingStage !== 'idle' ? (
                     <>
                        <Loader2 className="animate-spin w-6 h-6 text-white/60" strokeWidth={1} />
                        <p className="text-[10px] font-light tracking-[0.3em] uppercase animate-pulse">{processingStage === 'analyzing' ? '连接中...' : '造梦中...'}</p>
                     </>
                 ) : isRecording ? (
                     <p className="text-xl font-mono text-white animate-pulse tracking-widest">{formatTime(recordingTime)}</p>
                 ) : (
                     <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase">按住记录</p>
                 )}
            </div>
            
            <button onClick={isRecording ? stopRecording : startRecording} disabled={processingStage !== 'idle'} className={`relative z-20 group transition-all duration-500 ${processingStage !== 'idle' ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
                <div className={`w-24 h-24 rounded-full border border-white/20 flex items-center justify-center transition-all duration-500 ${isRecording ? 'border-red-500/50 scale-110 bg-red-900/10' : 'hover:border-white/50 hover:bg-white/5'}`}>
                    {isRecording ? <Square size={20} className="fill-red-500 text-red-500" /> : <Mic size={24} strokeWidth={1} className="text-white/80" />}
                </div>
            </button>
            
            {isRecording && <button onClick={() => {stopRecording(); setIsRecording(false); setView('LIST');}} className="mt-12 text-white/20 hover:text-white transition-colors uppercase text-[10px] tracking-[0.2em]">取消</button>}
          </div>
        )}
      </main>
    </div>
  );
}