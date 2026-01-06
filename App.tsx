
import React, { useState, useEffect, useRef } from 'react';
import Wheel from './components/Wheel';
import { Participant, QuestionData, Category, Language, Difficulty, CATEGORY_OPTIONS, DIFFICULTY_OPTIONS } from './types';
import { fetchQuestion } from './services/geminiService';

const COLORS = ['#d4af37', '#f59e0b', '#92400e', '#7c3aed', '#6366f1', '#10b981', '#ef4444', '#3b82f6'];

const TRANSLATIONS = {
  ar: {
    title: 'دوران الحكمة',
    specialEdition: 'النسخة الحصرية 🌟 PRO',
    startBtn: 'دخول التحدي ✨',
    namePlaceholder: 'أدخل الاسم...',
    start: 'إطلاق الدوران 🌀',
    spinning: 'استخراج الحكمة...',
    correct: 'صحيحة +1',
    incorrect: 'خطأ ✕',
    loading: 'جاري استحضار السؤال...',
    scores: 'لوحة الصدارة 🏆',
    share: 'مشاركة 📲',
    offline: 'وضع الأوفلاين نشط',
    liveMode: 'الوضع المباشر',
    deletePlaceholder: 'اختر للحذف...',
    deleteBtn: 'حذف 🗑️',
    copied: 'تم نسخ الرابط بنجاح! ✅',
    shareText: 'انضم إليّ في تحدي دوران الحكمة! 🎡✨ لنرى من الأذكى!'
  },
  en: {
    title: 'Wisdom Spin',
    specialEdition: 'EXCLUSIVE EDITION 🌟 PRO',
    startBtn: 'Enter Quest ✨',
    namePlaceholder: 'Enter name...',
    start: 'Spin Now 🌀',
    spinning: 'Spinning...',
    correct: 'Correct +1',
    incorrect: 'Wrong ✕',
    loading: 'Generating question...',
    scores: 'Scoreboard 🏆',
    share: 'Share 📲',
    offline: 'Offline Mode Active',
    liveMode: 'Live Mode',
    deletePlaceholder: 'Select to delete...',
    deleteBtn: 'Delete 🗑️',
    copied: 'Link copied to clipboard! ✅',
    shareText: 'Join me in the Wisdom Spin challenge! 🎡✨ Let\'s see who is smarter!'
  }
};

const SOUNDS = {
  spin: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
};

const App: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [language, setLanguage] = useState<Language>('ar');
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newName, setNewName] = useState('');
  const [participantToDeleteId, setParticipantToDeleteId] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [currentWinner, setCurrentWinner] = useState<Participant | null>(null);
  const [result, setResult] = useState<{ winner: Participant; question: QuestionData } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>('عشوائي 🎲');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('متوسط');
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('wisdom_muted') === 'true');
  const [showCopiedBadge, setShowCopiedBadge] = useState(false);

  const soundsRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (window as any).xctestAPI = {
      forceStart: () => setGameStarted(true),
      addTestPlayer: (name: string) => {
        const p: Participant = { id: Math.random().toString(), name, color: COLORS[participants.length % COLORS.length], score: 0 };
        setParticipants(prev => [...prev, p]);
        return "Player Added";
      },
      triggerSpin: () => spin(),
      getAppState: () => ({
        gameStarted,
        isSpinning,
        playerCount: participants.length,
        hasWinner: !!currentWinner
      })
    };
  }, [gameStarted, isSpinning, participants, currentWinner]);

  useEffect(() => {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      if (key === 'spin') audio.loop = true;
      soundsRef.current[key] = audio;
    });
  }, []);

  const playSound = (key: keyof typeof SOUNDS) => {
    if (isMuted) return;
    const s = soundsRef.current[key];
    if (s) { s.currentTime = 0; s.play().catch(() => {}); }
  };

  const stopSound = (key: keyof typeof SOUNDS) => {
    const s = soundsRef.current[key];
    if (s) s.pause();
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('wisdom_muted', String(nextMuted));
    if (nextMuted) {
      stopSound('spin');
    } else if (isSpinning) {
      playSound('spin');
    }
  };

  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  useEffect(() => {
    let interval: number | undefined;
    if (timerActive && timeLeft > 0) {
      interval = window.setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      setShowAnswer(true);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newParticipant: Participant = {
      id: Math.random().toString(36).substring(2, 9),
      name: newName.trim(),
      color: COLORS[participants.length % COLORS.length],
      score: 0
    };
    setParticipants(prev => [...prev, newParticipant]);
    setNewName('');
    playSound('click');
  };

  const handleDeleteParticipant = () => {
    if (!participantToDeleteId) return;
    setParticipants(prev => prev.filter(p => p.id !== participantToDeleteId));
    setParticipantToDeleteId('');
    playSound('click');
  };

  const handleShare = async () => {
    playSound('click');
    const shareData = {
      title: t.title,
      text: t.shareText,
      url: window.location.origin + window.location.pathname,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setShowCopiedBadge(true);
        setTimeout(() => setShowCopiedBadge(false), 3000);
      }
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const spin = () => {
    if (participants.length < 2 || isSpinning) return;
    setIsSpinning(true);
    setCurrentWinner(null);
    setResult(null);
    setShowAnswer(false);
    playSound('spin');
    
    const newRot = rotation + (14 * 360) + (Math.random() * 360);
    setRotation(newRot);

    setTimeout(() => {
      stopSound('spin');
      playSound('win');
      const winnerAngle = (270 - (newRot % 360) + 360) % 360;
      const winnerIndex = Math.floor(winnerAngle / (360 / participants.length)) % participants.length;
      const winner = participants[winnerIndex];
      setCurrentWinner(winner);
      setIsSpinning(false);
      
      setTimeout(() => {
        handleAutoFetchQuestion(winner);
      }, 2500);
    }, 5000);
  };

  const handleAutoFetchQuestion = async (winner: Participant) => {
    setLoadingQuestion(true);
    try {
      const q = await fetchQuestion([selectedCategory], selectedDifficulty, history, language);
      setResult({ winner, question: q });
      setHistory(prev => [...prev, q.question]);
      setTimeLeft(25);
      setTimerActive(true);
    } catch {
      setLoadingQuestion(false);
    } finally {
      setLoadingQuestion(false);
    }
  };

  const updateScore = (participantId: string, amount: number) => {
    setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, score: Math.max(0, p.score + amount) } : p));
    setResult(null);
    setCurrentWinner(null);
    setShowAnswer(false);
    setTimerActive(false);
    playSound('click');
  };

  if (!gameStarted) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-950">
        <div className="glass p-10 rounded-[3rem] text-center w-full max-w-[320px] animate-fade-in shadow-3xl">
          <button 
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} 
            className="absolute top-6 right-6 text-[9px] text-amber-500 font-black glass px-3 py-1.5 rounded-full uppercase active:scale-90"
          >
            {language === 'ar' ? 'EN' : 'AR'}
          </button>
          
          <button 
            onClick={toggleMute}
            className="absolute top-6 left-6 text-[16px] text-amber-500 glass w-9 h-9 flex items-center justify-center rounded-full active:scale-90"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          <div className="w-14 h-14 mx-auto mb-6 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-glow">
            <span className="text-2xl">🎡</span>
          </div>
          <h1 className="text-xl font-black text-amber-500 font-amiri mb-1 tracking-tight">{t.title}</h1>
          <p className="text-white/40 text-[8px] mb-8 font-black uppercase tracking-[0.3em]">{t.specialEdition}</p>
          <button 
            onClick={() => setGameStarted(true)} 
            className="w-full py-4 btn-cosmic font-black rounded-[1.5rem] text-base active:scale-95 transition-all shadow-glow"
          >
            {t.startBtn}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full w-full bg-slate-950 select-none overflow-hidden ${isRtl ? 'font-tajawal text-right' : 'font-sans text-left'}`}>
      
      {/* Copied Badge Alert */}
      {showCopiedBadge && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] bg-amber-500 text-slate-950 px-6 py-3 rounded-2xl font-black text-xs shadow-glow animate-fade-in">
          {t.copied}
        </div>
      )}

      <nav className={`flex justify-between items-center px-6 pt-8 pb-1 z-20 ${isLiveMode || result || loadingQuestion ? 'hidden' : 'flex'}`}>
        <div className="flex gap-2">
          <button onClick={() => setGameStarted(false)} className="glass w-10 h-10 rounded-xl text-amber-500 flex items-center justify-center text-sm">✕</button>
          <button onClick={toggleMute} className="glass w-10 h-10 rounded-xl text-amber-500 flex items-center justify-center text-lg">
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={handleShare} className="glass w-10 h-10 rounded-xl text-amber-500 flex items-center justify-center text-base">📲</button>
          <button onClick={() => setShowScores(true)} className="glass w-10 h-10 rounded-xl text-amber-500 flex items-center justify-center text-sm">🏆</button>
          <button onClick={() => setIsLiveMode(true)} className="bg-amber-500 text-slate-950 h-10 px-4 rounded-xl font-black text-[8px] uppercase tracking-widest shadow-glow active:scale-95">🎬 {t.liveMode}</button>
        </div>
      </nav>

      <main className="flex-grow flex flex-col justify-between overflow-hidden relative">
        {!isLiveMode && !result && !loadingQuestion && (
          <section className="px-5 mt-1 animate-slide-up">
            <div className="glass p-4 rounded-[1.5rem] space-y-3 shadow-lg">
              <form onSubmit={handleAddParticipant} className="flex gap-2">
                <input 
                  ref={inputRef} type="text" value={newName} onChange={e => setNewName(e.target.value)} 
                  placeholder={t.namePlaceholder}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 h-10 text-white font-bold text-xs outline-none"
                />
                <button type="submit" className="w-10 h-10 bg-amber-500 text-slate-950 rounded-lg font-black text-xl flex items-center justify-center active:scale-90">+</button>
              </form>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex gap-1.5 overflow-hidden">
                  <select 
                    value={participantToDeleteId} 
                    onChange={e => setParticipantToDeleteId(e.target.value)} 
                    className="flex-1 bg-white/5 border border-red-500/20 rounded-lg px-2 h-9 text-red-400 text-[10px] font-bold outline-none appearance-none"
                  >
                    <option value="" className="bg-slate-900 text-white/40">{t.deletePlaceholder}</option>
                    {participants.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleDeleteParticipant}
                    disabled={!participantToDeleteId}
                    className={`px-3 h-9 rounded-lg font-black text-[9px] uppercase transition-all ${participantToDeleteId ? 'bg-red-500 text-white active:scale-95 shadow-lg' : 'bg-white/5 text-white/20'}`}
                  >
                    {t.deleteBtn}
                  </button>
                </div>
                
                <select 
                  value={selectedCategory} 
                  onChange={e => setSelectedCategory(e.target.value as Category)} 
                  className="bg-white/5 border border-white/10 rounded-lg px-2 h-9 text-white text-[10px] font-bold outline-none appearance-none"
                >
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                </select>
              </div>

              <div className="flex gap-1.5 h-8">
                {DIFFICULTY_OPTIONS.map(d => (
                  <button key={d} onClick={() => setSelectedDifficulty(d)} className={`flex-1 rounded-lg text-[9px] font-black border transition-all ${selectedDifficulty === d ? 'bg-amber-500 border-amber-500 text-slate-900 shadow-glow' : 'bg-white/5 border-white/10 text-white/20'}`}>{d}</button>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className={`relative flex flex-col items-center justify-center flex-grow py-1 overflow-hidden ${(result || loadingQuestion) ? 'hidden' : 'flex'}`}>
          <div className="relative w-full max-h-[30vh] flex justify-center items-center">
            <Wheel participants={participants} rotation={rotation} isSpinning={isSpinning} theme="dark" />
          </div>
          
          <div className="w-full max-w-[240px] mt-2 px-5 h-20 flex items-center justify-center">
            {!isSpinning && participants.length >= 2 && !currentWinner && (
              <button 
                onClick={spin} 
                className="w-full py-4 btn-cosmic font-black rounded-[1.2rem] text-lg shadow-xl active:scale-95 will-change-transform"
              >
                {t.start}
              </button>
            )}
            {isSpinning && (
              <div className="flex flex-col items-center gap-2 w-full">
                 <p className="text-amber-500 font-black tracking-[0.3em] animate-pulse text-center text-[10px] uppercase">{t.spinning}</p>
                 <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 animate-loading-bar" />
                 </div>
              </div>
            )}
            {currentWinner && !isSpinning && (
               <div className="text-center animate-bounce flex flex-col items-center">
                  <span className="text-amber-500 font-black text-4xl font-amiri tracking-wider text-glow-amber">{currentWinner.name}</span>
               </div>
            )}
          </div>
        </section>
      </main>

      {(result || loadingQuestion) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/99 backdrop-blur-[40px] animate-fade-in">
          <div className="w-full h-full flex flex-col items-center justify-center p-8 relative">
            {result && (
              <div className="w-full max-w-lg space-y-8 animate-slide-up z-10 text-center">
                <div className={`text-[8rem] font-black font-amiri leading-none ${timeLeft < 7 ? 'text-red-500 animate-pulse' : 'text-white text-glow'}`}>
                  {timeLeft}
                </div>
                <div className="inline-block bg-amber-500 text-slate-950 px-10 py-2 rounded-full text-base font-black shadow-glow tracking-[0.1em] uppercase transform rotate-2">
                  {result.winner.name}
                </div>
                
                <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 min-h-[250px] flex items-center justify-center shadow-xl relative overflow-hidden">
                  {!showAnswer ? (
                    <p className="text-3xl font-black text-white leading-relaxed font-amiri px-2">
                      {result.question.question}
                    </p>
                  ) : (
                    <div className="w-full space-y-6 animate-answer-reveal">
                       <p className="text-5xl font-black text-amber-500 font-amiri leading-tight text-glow-amber">{result.question.answer}</p>
                       <p className="text-lg text-white/30 font-tajawal max-w-[85%] mx-auto leading-relaxed">{result.question.explanation}</p>
                    </div>
                  )}
                </div>
                
                {showAnswer && (
                  <div className="grid grid-cols-2 gap-6 pt-2">
                    <button onClick={() => updateScore(result.winner.id, 1)} className="py-6 bg-green-600/90 text-white rounded-[1.5rem] font-black text-xl active:scale-95">{t.correct}</button>
                    <button onClick={() => { setResult(null); setCurrentWinner(null); }} className="py-6 bg-white/10 text-white/40 rounded-[1.5rem] font-black text-xl active:scale-95 border border-white/10">{t.incorrect}</button>
                  </div>
                )}
              </div>
            )}
            {loadingQuestion && (
              <div className="text-center space-y-12 z-10">
                <div className="relative w-28 h-28 mx-auto">
                  <div className="absolute inset-0 border-[10px] border-amber-500/10 rounded-full" />
                  <div className="absolute inset-0 border-[10px] border-t-amber-500 rounded-full animate-spin shadow-glow" />
                </div>
                <p className="text-amber-500 font-black tracking-[0.8em] uppercase text-base animate-pulse">{t.loading}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showScores && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/98 backdrop-blur-2xl animate-fade-in">
          <div className="w-full max-w-md glass p-10 rounded-[3rem] shadow-3xl animate-slide-up">
            <h2 className="text-4xl font-black text-amber-500 font-amiri mb-10 text-center uppercase">{t.scores}</h2>
            <div className="space-y-4 max-h-[40vh] overflow-y-auto mb-10 pr-3 custom-scrollbar">
              {participants.sort((a,b) => b.score - a.score).map((p, idx) => (
                <div key={p.id} className="flex justify-between items-center bg-white/5 p-6 rounded-[1.8rem] border border-white/5">
                  <div className="flex items-center gap-6">
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black ${idx === 0 ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-white/40'}`}>{idx + 1}</span>
                    <span className="font-bold text-white font-amiri text-2xl">{p.name}</span>
                  </div>
                  <span className="text-3xl font-black text-amber-500 text-glow-amber">{p.score}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowScores(false)} className="w-full py-5 btn-cosmic font-black rounded-[1.5rem] text-xl active:scale-95">إغلاق</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes loading-bar { 0% { width: 0; } 100% { width: 100%; } }
        .animate-loading-bar { animation: loading-bar 5s linear forwards; }
        
        .shadow-glow { box-shadow: 0 0 40px rgba(251, 191, 36, 0.5); }
        .shadow-3xl { box-shadow: 0 60px 120px -30px rgba(0, 0, 0, 1); }
        .text-glow-amber { text-shadow: 0 0 30px rgba(251, 191, 36, 1); }

        .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { transform: translateY(150px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.15); border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default App;
