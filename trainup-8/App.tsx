
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppScreen, SportType, DashboardTab, ChatMessage } from './types';
import { SPORTS_CONFIG } from './constants';
import { getCoachResponse, generateExerciseImage, generateProfileAvatar, getTrainingSummary } from './geminiService';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4';

const FadeIn: React.FC<{ children?: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
  <div style={{ animation: `fadeIn 0.6s ease-out ${delay}s forwards`, opacity: 0 }}>
    {children}
    <style>{`
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  </div>
);

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.INTRO);
  const [selectedSport, setSelectedSport] = useState<SportType | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.PANEL);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarPrompt, setAvatarPrompt] = useState('');

  // Estados para el resumen del entreno
  const [summaryInput, setSummaryInput] = useState('');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Datos biométricos
  const [userAge, setUserAge] = useState(() => localStorage.getItem('trainup_age') || '');
  const [userWeight, setUserWeight] = useState(() => localStorage.getItem('trainup_weight') || '');
  const [userHeight, setUserHeight] = useState(() => localStorage.getItem('trainup_height') || '');

  // Registro diario: { [sportId]: { value: number, date: string } }
  const [dailyLogs, setDailyLogs] = useState<Record<string, { value: number, date: string }>>(() => {
    const saved = localStorage.getItem('trainup_daily_logs_v2');
    return saved ? JSON.parse(saved) : {};
  });

  // Historial semanal para las gráficas
  const [weeklyStats, setWeeklyStats] = useState<Record<string, number[]>>(() => {
    const saved = localStorage.getItem('trainup_weekly_stats');
    if (saved) return JSON.parse(saved);
    return {
      futbol: [0, 0, 0, 0, 0, 0, 0],
      baloncesto: [0, 0, 0, 0, 0, 0, 0],
      running: [0, 0, 0, 0, 0, 0, 0],
      fitness: [0, 0, 0, 0, 0, 0, 0]
    };
  });

  const [tempCounter, setTempCounter] = useState(0);

  // Estados para el levantamiento de la pesa
  const [liftProgress, setLiftProgress] = useState(0); 
  const [isLifting, setIsLifting] = useState(false);
  const liftRef = useRef<{ startY: number, startProgress: number }>({ startY: 0, startProgress: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [username, setUsername] = useState(() => localStorage.getItem('trainup_username') || 'Atleta');
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('trainup_profile_image') || DEFAULT_AVATAR);
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem('trainup_streak') || '0', 10));
  const [lastTrained, setLastTrained] = useState(() => localStorage.getItem('trainup_last_trained') || null);

  const hasTrainedToday = lastTrained === todayStr;

  useEffect(() => {
    localStorage.setItem('trainup_streak', streak.toString());
    if (lastTrained) localStorage.setItem('trainup_last_trained', lastTrained);
    localStorage.setItem('trainup_username', username);
    localStorage.setItem('trainup_profile_image', profileImage);
    localStorage.setItem('trainup_daily_logs_v2', JSON.stringify(dailyLogs));
    localStorage.setItem('trainup_weekly_stats', JSON.stringify(weeklyStats));
    localStorage.setItem('trainup_age', userAge);
    localStorage.setItem('trainup_weight', userWeight);
    localStorage.setItem('trainup_height', userHeight);
  }, [streak, lastTrained, username, profileImage, dailyLogs, weeklyStats, userAge, userWeight, userHeight]);

  useEffect(() => {
    setChatMessages([]);
    setInputText('');
    setIsTyping(false);
    setIsGeneratingImage(false);
  }, [selectedSport]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getTodayValue = useCallback((sportId: string) => {
    const log = dailyLogs[sportId];
    if (log && log.date === todayStr) {
      return log.value;
    }
    return 0;
  }, [dailyLogs, todayStr]);

  useEffect(() => {
    if (activeTab === DashboardTab.COACH) {
      setTimeout(scrollToBottom, 100);
    }
    if (activeTab === DashboardTab.STATS && selectedSport) {
      setTempCounter(getTodayValue(selectedSport));
    }
  }, [chatMessages, isTyping, isGeneratingImage, activeTab, selectedSport, getTodayValue]);

  const sport = selectedSport ? SPORTS_CONFIG[selectedSport] : null;

  const glowColors = useMemo(() => {
    if (screen === AppScreen.INTRO || screen === AppScreen.ONBOARDING || screen === AppScreen.SELECTION) {
      return { c1: '#ef4444', c2: '#f97316', c3: '#f59e0b' };
    }
    if (screen === AppScreen.SUMMARY) {
      return { c1: '#ef4444', c2: '#ea580c', c3: '#f97316' };
    }
    if (sport) {
      return { c1: sport.color, c2: `${sport.color}cc`, c3: `${sport.color}99` };
    }
    return { c1: '#ef4444', c2: '#f97316', c3: '#f59e0b' };
  }, [screen, sport]);

  // Configuración de degradados específicos para cada deporte
  const sportGradient = useMemo(() => {
    if (!selectedSport) return { from: 'from-red-500', to: 'to-orange-600', shadow: 'rgba(239, 68, 68, 0.3)', text: 'text-white' };
    switch (selectedSport) {
      case 'futbol':
        return { from: 'from-green-500', to: 'to-emerald-600', shadow: 'rgba(34, 197, 94, 0.3)', text: 'text-white' };
      case 'running':
        return { from: 'from-blue-500', to: 'to-indigo-600', shadow: 'rgba(59, 130, 246, 0.3)', text: 'text-white' };
      case 'fitness':
        return { from: 'from-zinc-100', to: 'to-zinc-400', shadow: 'rgba(255, 255, 255, 0.15)', text: 'text-black' };
      case 'baloncesto':
      default:
        return { from: 'from-red-500', to: 'to-orange-600', shadow: 'rgba(239, 68, 68, 0.3)', text: 'text-white' };
    }
  }, [selectedSport]);

  const getCurrentDayIndex = () => {
    let day = new Date().getDay(); 
    return day === 0 ? 6 : day - 1;
  };

  const chartData = useMemo(() => {
    if (!selectedSport) return [];
    const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const currentDayIdx = getCurrentDayIndex();
    let stats = [...(weeklyStats[selectedSport] || [0, 0, 0, 0, 0, 0, 0])];
    stats[currentDayIdx] = getTodayValue(selectedSport);
    return days.map((day, idx) => ({
      name: day,
      v: stats[idx]
    }));
  }, [weeklyStats, selectedSport, getTodayValue]);

  const handleLiftStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsLifting(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    liftRef.current.startY = clientY;
    liftRef.current.startProgress = liftProgress;
  };

  const handleLiftMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isLifting) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const diff = liftRef.current.startY - clientY;
    const maxDrag = 400; 
    const calculatedProgress = liftRef.current.startProgress + (diff / maxDrag) * 100;
    const clampedProgress = Math.min(Math.max(calculatedProgress, 0), 100);
    setLiftProgress(clampedProgress);

    if (clampedProgress > 60 && navigator.vibrate) {
      const vInt = Math.floor((clampedProgress - 60) / 10) * 5;
      navigator.vibrate(vInt);
    }

    if (clampedProgress >= 100) {
      setIsLifting(false);
      setScreen(AppScreen.ONBOARDING);
      setLiftProgress(0);
      if (navigator.vibrate) navigator.vibrate([15, 40, 15]);
    }
  }, [isLifting]);

  const handleLiftEnd = useCallback(() => {
    if (!isLifting) return;
    setIsLifting(false);
    if (liftProgress < 100) {
      setLiftProgress(0);
    }
  }, [isLifting, liftProgress]);

  useEffect(() => {
    if (isLifting) {
      window.addEventListener('mousemove', handleLiftMove);
      window.addEventListener('mouseup', handleLiftEnd);
      window.addEventListener('touchmove', handleLiftMove);
      window.addEventListener('touchend', handleLiftEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleLiftMove);
      window.removeEventListener('mouseup', handleLiftEnd);
      window.removeEventListener('touchmove', handleLiftMove);
      window.removeEventListener('touchend', handleLiftEnd);
    };
  }, [isLifting, handleLiftMove, handleLiftEnd]);

  const handleSaveDailyLog = () => {
    if (!selectedSport) return;
    setDailyLogs(prev => ({
      ...prev,
      [selectedSport]: { value: tempCounter, date: todayStr }
    }));
    const dayIdx = getCurrentDayIndex();
    setWeeklyStats(prev => {
      const newStats = { ...prev };
      if (!newStats[selectedSport]) {
        newStats[selectedSport] = [0, 0, 0, 0, 0, 0, 0];
      }
      const updatedArray = [...newStats[selectedSport]];
      updatedArray[dayIdx] = tempCounter;
      newStats[selectedSport] = updatedArray;
      return newStats;
    });
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !sport) return;
    const userText = inputText;
    setChatMessages(prev => [...prev, {
      role: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setInputText('');
    const wantsImage = /\b(imagen|foto|dibuja|genera|muéstrame|ver|diseña)\b/i.test(userText);
    if (wantsImage) {
      setIsGeneratingImage(true);
      try {
        const imageUrl = await generateExerciseImage(userText, sport.name);
        if (imageUrl) {
          setChatMessages(prev => [...prev, {
            role: 'model',
            text: `He generado esta visualización técnica:`,
            imageUrl: imageUrl,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsGeneratingImage(false);
      }
    } else {
      setIsTyping(true);
      try {
        const history = chatMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
        const response = await getCoachResponse(sport.coachInstruction, history, userText);
        setChatMessages(prev => [...prev, {
          role: 'model',
          text: response || 'Lo siento, hay un problema en la red.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } catch (error) {
        console.error(error);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleCreateAvatar = async () => {
    if (!avatarPrompt.trim()) return;
    setIsGeneratingAvatar(true);
    try {
      const imageUrl = await generateProfileAvatar(avatarPrompt);
      if (imageUrl) {
        setProfileImage(imageUrl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleProcessSummary = async () => {
    if (!summaryInput.trim() || !sport) return;
    setIsGeneratingSummary(true);
    try {
      const result = await getTrainingSummary(
        { age: userAge, weight: userWeight, height: userHeight },
        summaryInput,
        sport.name
      );
      setSummaryData(result);
      handleConfirmTraining(); // Marcar como entrenado
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleConfirmTraining = () => {
    if (hasTrainedToday) return;
    setStreak(prev => prev + 1);
    setLastTrained(todayStr);
    if (navigator.vibrate) navigator.vibrate([15, 40, 15]);
  };

  const navigateTo = (newScreen: AppScreen) => { 
    setScreen(newScreen); 
  };
  
  const selectSport = (sportId: SportType) => { 
    setSelectedSport(sportId); 
    setScreen(AppScreen.DASHBOARD); 
    setActiveTab(DashboardTab.PANEL); 
  };
  
  const changeTab = (tab: DashboardTab) => { 
    setActiveTab(tab); 
  };

  const renderIntro = () => {
    const shakeIntensity = liftProgress > 65 ? (liftProgress - 65) / 35 : 0;
    const currentPercent = Math.max(1, Math.floor(liftProgress));
    
    return (
      <div 
        className={`relative flex flex-col h-screen w-full max-w-md mx-auto p-8 justify-between overflow-hidden z-20 transition-opacity duration-300 ${shakeIntensity > 0 ? 'animate-effort-shake' : ''}`}
        style={{ opacity: 1 - (liftProgress / 100), '--shake-strength': `${shakeIntensity * 10}px` } as React.CSSProperties}
      >
        <div className="mt-12 flex flex-col items-center text-center">
          <FadeIn delay={0.2}>
            <p className="text-zinc-500 font-medium mb-1 uppercase tracking-[0.2em] text-[10px]">Carga tu potencial</p>
            <h1 className="text-6xl font-black tracking-tighter text-glow mb-2 drop-shadow-2xl">TrainUp</h1>
            
            <div className="relative flex items-center justify-center my-6 h-28">
               <div className="text-8xl font-black italic tracking-tighter tabular-nums text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                 {currentPercent}<span className="text-4xl ml-1 not-italic opacity-40">%</span>
               </div>
            </div>

            <div className="text-sm opacity-60 space-y-1 font-medium">
              <p>Arrastra la pesa para cargar energía.</p>
            </div>
          </FadeIn>
        </div>

        <div className="flex flex-col items-center gap-6 mb-24 relative">
          <div className="relative w-full flex justify-center py-20" style={{ height: '400px' }}>
            
            {/* Cargador Estilizado (Barra de Energía) */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-24 w-6 bg-white/5 rounded-2xl border border-white/10 p-1 flex flex-col-reverse gap-1">
               {[...Array(20)].map((_, i) => (
                 <div 
                   key={i} 
                   className={`flex-1 w-full rounded-sm transition-all duration-300 ${liftProgress > (i * 5) ? 'bg-white shadow-[0_0_8px_white]' : 'bg-white/5'}`}
                 ></div>
               ))}
            </div>

            <div 
              onMouseDown={handleLiftStart} 
              onTouchStart={handleLiftStart} 
              className={`absolute bottom-24 cursor-grab active:cursor-grabbing transition-transform duration-75 ${isLifting ? 'scale-110' : 'hover:scale-105'}`} 
              style={{ transform: `translateY(-${liftProgress * 3.0}px) ${isLifting ? `rotate(${Math.sin(liftProgress * 20) * (1 + liftProgress / 10)}deg)` : ''}` }}
            >
              <div className="relative flex items-center justify-center filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
                <div className="w-20 h-32 bg-[#1a1a1c] rounded-xl neu-convex border-l border-white/10 flex items-center justify-center">
                   <div className="w-1 h-20 bg-black/40 rounded-full"></div>
                </div>
                <div className="w-28 h-8 bg-zinc-800 neu-convex flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                  {liftProgress > 30 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <div className="w-full h-full bg-white/10 animate-pulse"></div>
                    </div>
                  )}
                </div>
                <div className="w-20 h-32 bg-[#1a1a1c] rounded-xl neu-convex border-r border-white/10 flex items-center justify-center">
                   <div className="w-1 h-20 bg-black/40 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          <p className={`text-[11px] font-black uppercase tracking-widest transition-colors ${liftProgress > 85 ? 'text-orange-500' : 'text-zinc-500'}`}>
            {liftProgress > 0 ? (liftProgress > 85 ? '¡CARGA COMPLETADA!' : 'CARGANDO...') : 'SUBE PARA CARGAR'}
          </p>
        </div>
      </div>
    );
  };
  
  const renderOnboarding = () => (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto p-8 overflow-hidden z-30 pointer-events-auto">
      <FadeIn>
        <div className="flex gap-2 mb-10"><div className="h-1 flex-1 bg-white rounded-full"></div><div className="h-1 flex-1 bg-white rounded-full"></div><div className="h-1 flex-1 bg-zinc-800 rounded-full"></div></div>
        <h1 className="text-4xl font-extrabold mb-4 leading-tight text-white">Cuéntanos<br/>sobre ti</h1>
        <p className="text-zinc-400 text-lg mb-10">Para personalizar tu experiencia.</p>
      </FadeIn>
      <div className="flex-1 space-y-8">
        <FadeIn delay={0.2}>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Edad</label>
            <div className="neu-concave rounded-2xl p-4 border border-white/5">
              <input type="number" placeholder="Años" value={userAge} onChange={(e) => setUserAge(e.target.value)} className="bg-transparent border-none focus:ring-0 text-white w-full text-lg font-bold placeholder:text-zinc-700" />
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Peso (kg)</label>
            <div className="neu-concave rounded-2xl p-4 border border-white/5">
              <input type="number" placeholder="65.0" value={userWeight} onChange={(e) => setUserWeight(e.target.value)} className="bg-transparent border-none focus:ring-0 text-white w-full text-lg font-bold placeholder:text-zinc-700" />
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={0.4}>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Altura (cm)</label>
            <div className="neu-concave rounded-2xl p-4 border border-white/5">
              <input type="number" placeholder="175" value={userHeight} onChange={(e) => setUserHeight(e.target.value)} className="bg-transparent border-none focus:ring-0 text-white w-full text-lg font-bold placeholder:text-zinc-700" />
            </div>
          </div>
        </FadeIn>
      </div>
      <FadeIn delay={0.5}>
        <button 
          onClick={() => setScreen(AppScreen.SELECTION)}
          disabled={!userAge || !userWeight || !userHeight}
          className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 ${(!userAge || !userWeight || !userHeight) ? 'opacity-30 neu-pressed cursor-not-allowed' : 'bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:bg-zinc-200'}`}
        >
          Siguiente
          <span className="material-symbols-outlined font-black">arrow_forward</span>
        </button>
      </FadeIn>
    </div>
  );

  const renderSelection = () => (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto p-8 overflow-hidden z-30 pointer-events-auto">
      <FadeIn>
        <div className="flex gap-2 mb-10"><div className="h-1 flex-1 bg-white rounded-full"></div><div className="h-1 flex-1 bg-white rounded-full"></div><div className="h-1 flex-1 bg-white rounded-full"></div></div>
        <h1 className="text-4xl font-extrabold mb-4 leading-tight">Elige tu<br/>Disciplina</h1>
        <p className="text-zinc-400 text-lg mb-12">Coach IA especializado.</p>
      </FadeIn>
      <div className="grid grid-cols-2 gap-6 mb-12 overflow-y-auto custom-scrollbar p-2">
        {Object.values(SPORTS_CONFIG).map((s, idx) => (
          <FadeIn key={s.id} delay={0.2 + idx * 0.1}>
            <button 
              onClick={() => selectSport(s.id as SportType)} 
              className={`w-full aspect-square rounded-3xl flex flex-col items-center justify-center gap-4 transition-all active:scale-95 hover:scale-105 neu-convex border border-white/5`}
            >
              <span className={`material-symbols-outlined text-4xl`} style={{ color: s.color }}>{s.icon}</span>
              <span className="font-bold text-xs uppercase tracking-widest">{s.name}</span>
            </button>
          </FadeIn>
        ))}
      </div>
    </div>
  );

  const renderSummary = () => {
    const mainGradient = `${sportGradient.from} ${sportGradient.to}`;
    const accentColor = selectedSport === 'fitness' ? '#A1A1AA' : sport?.color || '#ea580c';

    return (
      <div className="flex flex-col h-screen w-full max-w-md mx-auto p-6 overflow-hidden z-40 pointer-events-auto">
        <FadeIn>
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setScreen(AppScreen.DASHBOARD)} className="size-10 rounded-xl neu-convex flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Métricas de Rendimiento</span>
            <div className="size-10"></div>
          </div>
          <h1 className="text-3xl font-black mb-2 text-white italic">Resultados IA</h1>
          <p className="text-zinc-500 text-sm mb-6">Basado en tu biometría y descripción de entreno.</p>
        </FadeIn>

        <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar">
          {!summaryData ? (
            <FadeIn delay={0.2}>
              <div className="neu-concave rounded-3xl p-6 border border-white/5">
                <textarea 
                  value={summaryInput}
                  onChange={(e) => setSummaryInput(e.target.value)}
                  placeholder="Ej: He jugado 1 hora de fútbol intenso, corrí mucho y marqué 2 goles..."
                  className="bg-transparent border-none focus:ring-0 text-white w-full h-40 text-sm font-medium placeholder:text-zinc-700 resize-none"
                />
              </div>
              <button 
                onClick={handleProcessSummary}
                disabled={isGeneratingSummary || !summaryInput.trim()}
                className={`w-full mt-6 py-5 rounded-2xl bg-gradient-to-r ${mainGradient} ${sportGradient.text} font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 flex items-center justify-center gap-3 transition-all`}
                style={{ boxShadow: `0 20px 40px ${sportGradient.shadow}` }}
              >
                {isGeneratingSummary ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    Procesando Bio-Data...
                  </>
                ) : (
                  <>
                    Calcular Gráficas
                    <span className="material-symbols-outlined font-black">analytics</span>
                  </>
                )}
              </button>
            </FadeIn>
          ) : (
            <div className="space-y-6 pb-12">
              <FadeIn delay={0.1}>
                <div className="neu-convex rounded-3xl p-6 border border-white/5 shadow-lg relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Gasto Calórico</span>
                    <span className="text-2xl font-black text-white italic">{summaryData.calories} <span className="text-xs uppercase opacity-40">kcal</span></span>
                  </div>
                  <div className="w-full h-4 bg-zinc-900 rounded-full overflow-hidden neu-concave">
                    <div 
                      className={`h-full bg-gradient-to-r ${mainGradient}`}
                      style={{ width: `${Math.min((summaryData.calories / 1000) * 100, 100)}%`, transition: 'width 1.5s ease-out', boxShadow: `0 0 15px ${sportGradient.shadow}` }}
                    ></div>
                  </div>
                </div>
              </FadeIn>

              <div className="grid grid-cols-2 gap-4">
                <FadeIn delay={0.2}>
                  <div className="neu-convex rounded-3xl p-5 border border-white/5 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Pérdida Peso</span>
                    <span className="text-3xl font-black text-white italic">-{summaryData.weightLoss}</span>
                    <span className="text-[10px] font-bold mt-1" style={{ color: accentColor }}>Líquidos (kg)</span>
                  </div>
                </FadeIn>
                <FadeIn delay={0.3}>
                  <div className="neu-convex rounded-3xl p-5 border border-white/5 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Esfuerzo</span>
                    <span className="text-3xl font-black text-white italic">{summaryData.intensity}/10</span>
                    <div className="flex gap-1 mt-2">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className={`size-1 rounded-full ${i < summaryData.intensity ? '' : 'bg-zinc-800'}`} style={{ backgroundColor: i < summaryData.intensity ? accentColor : undefined }}></div>
                      ))}
                    </div>
                  </div>
                </FadeIn>
              </div>

              <FadeIn delay={0.4}>
                <div className="neu-convex rounded-3xl p-6 border border-white/5 flex flex-col items-center">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 self-start">Índice de Fatiga Acumulada</h3>
                  <div className="size-48 relative">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: summaryData.fatigueIndex },
                              { value: 100 - summaryData.fatigueIndex }
                            ]}
                            cx="50%" cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            startAngle={180}
                            endAngle={0}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill={accentColor} />
                            <Cell fill="#1a1a1c" />
                          </Pie>
                        </PieChart>
                     </ResponsiveContainer>
                     <div className="absolute inset-0 flex flex-col items-center justify-center pt-10">
                        <span className="text-4xl font-black italic">{summaryData.fatigueIndex}%</span>
                        <span className="text-[9px] font-bold uppercase tracking-tight text-zinc-600">Nivel de Estrés</span>
                     </div>
                  </div>
                </div>
              </FadeIn>

              <FadeIn delay={0.5}>
                <div className="neu-convex rounded-3xl p-6 border relative overflow-hidden" style={{ borderColor: `${accentColor}33`, backgroundColor: `${accentColor}0D` }}>
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <span className="material-symbols-outlined text-4xl">medical_services</span>
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: accentColor }}>
                    <span className="material-symbols-outlined text-sm">health_and_safety</span>
                    Recomendación Pro
                  </h4>
                  <p className="text-sm text-zinc-300 leading-relaxed font-medium">{summaryData.recoveryTip}</p>
                </div>
              </FadeIn>

              <button 
                onClick={() => {
                  setSummaryData(null);
                  setSummaryInput('');
                  setScreen(AppScreen.DASHBOARD);
                }}
                className="w-full py-5 rounded-2xl neu-convex text-white font-black text-xs uppercase tracking-[0.3em] active:scale-95 border border-white/5 shadow-2xl transition-all hover:bg-white/5"
              >
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    if (!sport || !selectedSport) return null;
    const todayValue = getTodayValue(selectedSport);
    return (
      <div className="flex flex-col h-screen w-full max-w-md mx-auto relative overflow-hidden z-10">
        <header className="px-6 pt-12 pb-4 flex justify-between items-center z-20">
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">TrainUp {sport.name}</p>
            <h2 className="text-xl font-bold tracking-tight">Atleta: {username}</h2>
          </div>
          <button onClick={() => changeTab(DashboardTab.PROFILE)} className="size-12 rounded-xl neu-convex flex items-center justify-center p-0.5 overflow-hidden active:scale-95 hover:scale-105 transition-transform border border-white/10">
             <img src={profileImage} className="w-full h-full object-cover rounded-lg" alt="Profile" />
          </button>
        </header>
        <main className={`flex-1 overflow-y-auto px-6 py-4 custom-scrollbar ${activeTab === DashboardTab.COACH ? 'pb-44' : 'pb-32'}`}>
          {activeTab === DashboardTab.PANEL && (
            <FadeIn>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="neu-convex p-5 rounded-2xl flex flex-col items-start gap-1 transition-transform hover:scale-105"><span className="material-symbols-outlined opacity-30 text-xl">bolt</span><span className="text-3xl font-black italic">{streak}</span><span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Racha</span></div>
                <div className="neu-convex p-5 rounded-2xl flex flex-col justify-between transition-transform hover:scale-105">
                  <div className="flex justify-between items-end mb-2"><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Objetivo</span><span className="text-xs font-bold">{hasTrainedToday ? 'OK' : '--'}</span></div>
                  <div className="w-full h-2 rounded-full neu-concave overflow-hidden"><div className="bg-white h-full transition-all duration-700 shadow-[0_0_8px_white]" style={{ width: hasTrainedToday ? '100%' : '5%', opacity: hasTrainedToday ? 1 : 0.2 }}></div></div>
                </div>
              </div>

              <div className="mb-8">
                <button 
                  onClick={() => setScreen(AppScreen.SUMMARY)}
                  className={`w-full py-6 rounded-3xl bg-gradient-to-br ${sportGradient.from} ${sportGradient.to} ${sportGradient.text} active:scale-95 transition-all flex flex-col items-center justify-center gap-1 group`}
                  style={{ boxShadow: `0 20px 40px ${sportGradient.shadow}` }}
                >
                  <span className="material-symbols-outlined text-3xl font-black mb-1 group-hover:scale-110 transition-transform">sports_score</span>
                  <span className="font-black text-sm uppercase tracking-widest">Finalizar Entreno</span>
                  <span className="text-[9px] opacity-70 font-bold uppercase">Calcular métricas con IA</span>
                </button>
              </div>

              <div className="neu-convex p-6 rounded-2xl mb-8 border border-white/5 transition-transform hover:scale-[1.02]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Actividad de hoy</h3>
                  <span className="material-symbols-outlined text-sm" style={{ color: sport.color }}>{sport.icon}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black italic">{todayValue}</span>
                  <span className="text-xs font-bold text-zinc-400 uppercase">{sport.logLabel.split(' ')[0]}</span>
                </div>
                <p className="text-[10px] text-zinc-600 mt-2">{todayValue > 0 ? '¡Buen trabajo! Sigue sumando.' : 'Aún no has anotado nada hoy.'}</p>
              </div>
              
              <div className="flex flex-col items-center justify-center py-6">
                <button onClick={() => changeTab(DashboardTab.COACH)} className="size-56 rounded-full neu-convex flex flex-col items-center justify-center p-8 text-center active:neu-pressed hover:scale-105 transition-all duration-300 relative border border-white/5 shadow-2xl">
                  <div className="size-20 neu-concave rounded-full flex items-center justify-center mb-4"><span className="material-symbols-outlined text-4xl" style={{ color: sport.color }}>{sport.icon}</span></div>
                  <h3 className="text-lg font-bold uppercase tracking-tighter">Coach IA</h3>
                  <p className="text-zinc-500 text-[10px] mt-1">Consultar Táctica</p>
                </button>
              </div>
            </FadeIn>
          )}
          {activeTab === DashboardTab.COACH && (
            <div className="flex flex-col">
              <div className="space-y-6">
                {chatMessages.map((m, i) => (
                  <FadeIn key={`${selectedSport}-${i}`} delay={0}>
                    <div className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-4 rounded-2xl ${m.role === 'user' ? 'neu-concave text-white rounded-tr-none' : 'neu-convex text-zinc-300 rounded-tl-none border border-white/5 shadow-lg'}`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                        {m.imageUrl && (
                          <div className="mt-3 rounded-xl overflow-hidden neu-convex border border-white/10 aspect-square w-full">
                             <img src={m.imageUrl} alt="Ejercicio" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  </FadeIn>
                ))}
                {(isTyping || isGeneratingImage) && (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1 p-4 rounded-2xl neu-convex w-16 items-center justify-center">
                      <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce"></span>
                      <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-2" />
              </div>
              <div className="fixed bottom-24 left-6 right-6 z-40">
                <div className="flex gap-3 neu-convex p-2 rounded-full border border-white/10 items-center backdrop-blur-xl bg-[#141416]/80">
                  <input value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={`Escribe a ${sport.coachName}...`} className="flex-1 bg-transparent border-none focus:ring-0 text-sm pl-4" />
                  <button onClick={handleSendMessage} className="size-12 rounded-full bg-white flex items-center justify-center text-black active:scale-90 hover:scale-110 transition-all shadow-xl"><span className="material-symbols-outlined font-bold">arrow_upward</span></button>
                </div>
              </div>
            </div>
          )}
          {activeTab === DashboardTab.STATS && (
            <FadeIn>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {sport.statsItems.map((item, idx) => (
                  <div key={idx} className="neu-convex rounded-2xl p-3 flex flex-col justify-between aspect-square border border-white/5 hover:scale-105 active:scale-95 transition-transform cursor-pointer">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase leading-tight">{item.label}</span>
                    <div>
                      <span className="text-xl font-black block leading-none">{item.label.includes('Hoy') || item.label.includes('Totales') ? todayValue : item.value}</span>
                      <span className="text-[10px] text-zinc-600 font-bold">{item.subValue}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="neu-convex rounded-3xl p-6 mb-8 border border-white/5 shadow-lg">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6">Registro diario</h3>
                <div className="flex flex-col items-center gap-6">
                  <p className="text-sm font-bold text-zinc-300">{sport.logLabel}</p>
                  <div className="flex items-center gap-8">
                    <button onClick={() => setTempCounter(prev => Math.max(0, prev - 1))} className="size-14 rounded-2xl neu-convex flex items-center justify-center active:neu-pressed transition-all"><span className="material-symbols-outlined font-black text-xl">remove</span></button>
                    <span className="text-5xl font-black italic w-16 text-center">{tempCounter}</span>
                    <button onClick={() => setTempCounter(prev => prev + 1)} className="size-14 rounded-2xl neu-convex flex items-center justify-center active:neu-pressed transition-all"><span className="material-symbols-outlined font-black text-xl">add</span></button>
                  </div>
                  <button onClick={handleSaveDailyLog} className="w-full mt-2 py-4 rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-zinc-200">Guardar y Anotar en Gráfica</button>
                </div>
              </div>
              <div className="neu-convex rounded-3xl p-6 mb-4 h-64 border border-white/5 shadow-inner">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Progreso Semanal ({sport.logLabel.split(' ')[0]})</h3>
                <ResponsiveContainer width="100%" height="80%">
                  <AreaChart data={chartData}>
                    <defs><linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={sport.color} stopOpacity={0.4}/><stop offset="95%" stopColor={sport.color} stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#444', fontSize: 10, fontWeight: 800}} />
                    <Tooltip contentStyle={{backgroundColor: '#141416', border: 'none', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'}} itemStyle={{color: sport.color}} />
                    <Area type="monotone" dataKey="v" stroke={sport.color} fillOpacity={1} fill="url(#colorV)" strokeWidth={4} animationDuration={1500} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </FadeIn>
          )}
          {activeTab === DashboardTab.PROFILE && (
            <FadeIn>
              <div className="flex flex-col items-center gap-8 py-4">
                <div className="size-32 rounded-[32px] neu-convex p-1 relative border border-white/10 overflow-hidden shadow-2xl cursor-pointer hover:scale-105 transition-transform">
                  {isGeneratingAvatar ? (
                    <div className="w-full h-full rounded-[28px] bg-white/5 flex items-center justify-center animate-pulse"><span className="material-symbols-outlined text-4xl animate-spin opacity-40">sync</span></div>
                  ) : (
                    <img src={profileImage} className="w-full h-full object-cover rounded-[28px]" alt="Profile" />
                  )}
                </div>
                <div className="w-full space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-4">Nombre</label>
                    <div className="neu-concave rounded-2xl p-4 border border-white/5"><input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-transparent border-none focus:ring-0 text-white w-full text-sm font-bold" /></div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-4">Biometría</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="neu-concave rounded-xl p-3 flex flex-col items-center"><span className="text-[8px] uppercase text-zinc-600 font-black mb-1">Edad</span><span className="font-bold text-xs">{userAge}</span></div>
                      <div className="neu-concave rounded-xl p-3 flex flex-col items-center"><span className="text-[8px] uppercase text-zinc-600 font-black mb-1">Peso</span><span className="font-bold text-xs">{userWeight}kg</span></div>
                      <div className="neu-concave rounded-xl p-3 flex flex-col items-center"><span className="text-[8px] uppercase text-zinc-600 font-black mb-1">Altura</span><span className="font-bold text-xs">{userHeight}cm</span></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-4">Avatar IA</label>
                    <div className="neu-concave rounded-2xl p-4 border border-white/5 space-y-4">
                      <div className="flex gap-2">
                        <input value={avatarPrompt} onChange={(e) => setAvatarPrompt(e.target.value)} placeholder="Ej: Atleta futurista..." className="flex-1 bg-white/5 rounded-xl border-none text-xs py-3 px-4" />
                        <button onClick={handleCreateAvatar} disabled={isGeneratingAvatar || !avatarPrompt.trim()} className={`px-4 rounded-xl font-bold text-xs active:scale-95 transition-all ${isGeneratingAvatar ? 'bg-zinc-800' : 'bg-white text-black shadow-lg shadow-white/10'}`}>Generar</button>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => changeTab(DashboardTab.PANEL)} className="w-full bg-white text-black font-black py-4 rounded-2xl active:scale-95 shadow-xl transition-all">GUARDAR PERFIL</button>
                </div>
              </div>
            </FadeIn>
          )}
        </main>
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] h-20 neu-convex rounded-full flex items-center justify-around px-4 z-50 border border-white/5 backdrop-blur-xl bg-[#0B0B0C]/80 shadow-2xl">
          <button onClick={() => changeTab(DashboardTab.PANEL)} className={`flex flex-col items-center gap-0.5 transition-all active:scale-90 ${activeTab === DashboardTab.PANEL ? 'text-white' : 'text-zinc-600'}`}><span className="material-symbols-outlined">dashboard</span><span className="text-[8px] font-bold uppercase tracking-tighter">Panel</span></button>
          <button onClick={() => changeTab(DashboardTab.COACH)} className={`flex flex-col items-center gap-0.5 transition-all active:scale-90 ${activeTab === DashboardTab.COACH ? 'text-white' : 'text-zinc-600'}`}><span className="material-symbols-outlined">smart_toy</span><span className="text-[8px] font-bold uppercase tracking-tighter">Coach</span></button>
          <div className="relative -mt-10"><button onClick={() => navigateTo(AppScreen.SELECTION)} className="size-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl active:scale-90 hover:scale-110 transition-transform"><span className="material-symbols-outlined text-black text-3xl font-bold">{sport?.icon || 'sports'}</span></button></div>
          <button onClick={() => changeTab(DashboardTab.STATS)} className={`flex flex-col items-center gap-0.5 transition-all active:scale-90 ${activeTab === DashboardTab.STATS ? 'text-white' : 'text-zinc-600'}`}><span className="material-symbols-outlined">analytics</span><span className="text-[8px] font-bold uppercase tracking-tighter">Stats</span></button>
          <button onClick={() => changeTab(DashboardTab.PROFILE)} className={`flex flex-col items-center gap-0.5 transition-all active:scale-90 ${activeTab === DashboardTab.PROFILE ? 'text-white' : 'text-zinc-600'}`}><div className={`size-6 rounded-md overflow-hidden border ${activeTab === DashboardTab.PROFILE ? 'border-white' : 'border-zinc-700'}`}><img src={profileImage} className="w-full h-full object-cover" alt="Profile" /></div><span className="text-[8px] font-bold uppercase tracking-tighter">Perfil</span></button>
        </nav>
      </div>
    );
  };

  return (
    <div className="bg-[#0B0B0C] min-h-screen text-white select-none relative overflow-hidden">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] opacity-40">
           <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full blur-[100px] animate-glow-1 transition-colors duration-1000" style={{ backgroundColor: glowColors.c1 }}></div>
           <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px] animate-glow-2 transition-colors duration-1000" style={{ backgroundColor: glowColors.c2 }}></div>
           <div className="absolute top-1/2 left-1/2 w-72 h-72 rounded-full blur-[110px] animate-glow-3 transition-colors duration-1000" style={{ backgroundColor: glowColors.c3 }}></div>
        </div>
      </div>
      <style>{`
        @keyframes glow-1 { 0% { transform: translate(0, 0) scale(1); } 33% { transform: translate(50px, -70px) scale(1.1); } 66% { transform: translate(-40px, 30px) scale(0.9); } 100% { transform: translate(0, 0) scale(1); } }
        @keyframes glow-2 { 0% { transform: translate(0, 0) scale(1); } 33% { transform: translate(-60px, 60px) scale(1.2); } 66% { transform: translate(60px, -30px) scale(0.8); } 100% { transform: translate(0, 0) scale(1); } }
        @keyframes glow-3 { 0% { transform: translate(0, 0) scale(1); } 33% { transform: translate(70px, 70px) scale(0.9); } 66% { transform: translate(-70px, -70px) scale(1.1); } 100% { transform: translate(0, 0) scale(1); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes effort-shake {
          0% { transform: translate(0, 0); }
          25% { transform: translate(calc(var(--shake-strength) * -1), var(--shake-strength)); }
          50% { transform: translate(var(--shake-strength), calc(var(--shake-strength) * -1)); }
          75% { transform: translate(calc(var(--shake-strength) * -1), calc(var(--shake-strength) * -1)); }
          100% { transform: translate(var(--shake-strength), var(--shake-strength)); }
        }
        .animate-shimmer { animation: shimmer 2s infinite; }
        .animate-glow-1 { animation: glow-1 15s infinite alternate ease-in-out; }
        .animate-glow-2 { animation: glow-2 18s infinite alternate ease-in-out; }
        .animate-glow-3 { animation: glow-3 20s infinite alternate ease-in-out; }
        .animate-effort-shake { animation: effort-shake 0.1s infinite; }
        button { transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .custom-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="relative z-10 h-full w-full">
        {screen === AppScreen.INTRO && renderIntro()}
        {screen === AppScreen.ONBOARDING && renderOnboarding()}
        {screen === AppScreen.SELECTION && renderSelection()}
        {screen === AppScreen.DASHBOARD && renderDashboard()}
        {screen === AppScreen.SUMMARY && renderSummary()}
      </div>
    </div>
  );
};

export default App;
