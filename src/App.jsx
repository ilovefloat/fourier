import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Play, ArrowRight, Activity, Trophy, RefreshCw, ChevronLeft, ChevronRight, Plus, Minus, Target, ChevronDown, X, Lock } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState('complex'); // 'complex' or 'real'
  
  // Independent level tracking for both modes
  const [levels, setLevels] = useState({ real: 1, complex: 1 });
  const [maxUnlockedLevels, setMaxUnlockedLevels] = useState({ real: 1, complex: 1 });
  
  // States hold data for BOTH modes simultaneously
  const [targetCoeffs, setTargetCoeffs] = useState({ real: {}, complex: {} });
  const [playerCoeffs, setPlayerCoeffs] = useState({ real: {}, complex: {} });
  
  const [showNext, setShowNext] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeTermIndex, setActiveTermIndex] = useState(0);
  const [isLevelSelectorOpen, setIsLevelSelectorOpen] = useState(false);

  // FIX: Reset index whenever mode changes to prevent out-of-bounds crashes
  useEffect(() => {
    setActiveTermIndex(0);
  }, [mode]);

  // Constants for Graphing
  const GRAPH_SIZE = 1000;
  const CENTER = GRAPH_SIZE / 2;
  const PADDING = 60;

  // High-Performance Animation Refs
  const vectorArmsRef = useRef(null);
  const vectorTipRef = useRef(null);
  const targetTipRef = useRef(null);
  const requestRef = useRef();

  // Active level for the currently selected mode
  const activeLevel = levels[mode];
  const maxUnlocked = maxUnlockedLevels[mode];
  
  // Sequence of keys based on current Mode and its Level
  const activeKeys = useMemo(() => {
    if (mode === 'complex') {
      const ns = [0];
      for (let i = 1; i <= Math.ceil(activeLevel / 2); i++) {
        if (ns.length < activeLevel + 1) ns.push(i);
        if (ns.length < activeLevel + 1) ns.push(-i);
      }
      return ns;
    } else {
      const keys = ['a0'];
      for (let i = 1; i <= activeLevel; i++) {
        keys.push(`a${i}`, `b${i}`);
      }
      return keys;
    }
  }, [activeLevel, mode]);

  // Generate a new level for a SPECIFIC mode
  const initMode = useCallback((m, lvl) => {
    const randCoeff = () => Math.round((Math.floor(Math.random() * 41) - 20)) / 10; 
    let tMode = {}; 
    let pMode = {};

    if (m === 'complex') {
      const ns = [0];
      for (let i = 1; i <= Math.ceil(lvl / 2); i++) {
        if (ns.length < lvl + 1) ns.push(i);
        if (ns.length < lvl + 1) ns.push(-i);
      }
      ns.forEach((n, idx) => {
        tMode[n] = { r: randCoeff(), i: randCoeff() };
        pMode[n] = { r: 0, i: 0 };
        // Ensure highest frequency is non-zero
        if (idx === ns.length - 1 && tMode[n].r === 0 && tMode[n].i === 0) {
          tMode[n].r = Math.random() > 0.5 ? 1.0 : -1.0;
        }
      });
    } else {
      tMode.a0 = randCoeff();
      pMode.a0 = 0;
      for (let i = 1; i <= lvl; i++) {
        tMode[`a${i}`] = randCoeff();
        tMode[`b${i}`] = randCoeff();
        pMode[`a${i}`] = 0;
        pMode[`b${i}`] = 0;
      }
      // Ensure highest frequency is non-zero
      if (tMode[`a${lvl}`] === 0 && tMode[`b${lvl}`] === 0) {
        tMode[`a${lvl}`] = Math.random() > 0.5 ? 1.0 : -1.0;
      }
    }

    // FIX: Reset index on initialization
    setActiveTermIndex(0);

    setTargetCoeffs(prev => ({ ...prev, [m]: tMode }));
    setPlayerCoeffs(prev => ({ ...prev, [m]: pMode }));
    
    // Only reset UI state if we are initializing the currently active mode
    if (m === mode) {
      setShowNext(false);
    }
  }, [mode]);

  // Formatting utilities
  const getTermLabel = (key) => {
    if (mode === 'complex') {
      if (key === 0) return <span className="text-cyan-400 font-mono tracking-wider text-base md:text-lg">c₀ (DC)</span>;
      return (
        <span className="text-amber-400 font-mono tracking-wider text-lg md:text-xl">
          c<sub className="text-xs">{key}</sub> e<sup className="text-xs">{key === 1 ? '' : key === -1 ? '-' : key}it</sup>
        </span>
      );
    } else {
      if (key === 'a0') return <span className="text-cyan-400 font-mono tracking-wider text-base md:text-lg">a₀ (DC)</span>;
      const isCos = key[0] === 'a';
      const n = key.substring(1);
      return (
        <span className={`${isCos ? 'text-amber-400' : 'text-blue-400'} font-mono tracking-wider text-lg md:text-xl`}>
          {key[0]}<sub className="text-xs">{n}</sub> {isCos ? 'cos' : 'sin'}({n === '1' ? 't' : n+'t'})
        </span>
      );
    }
  };

  const renderEquation = () => {
    if (mode === 'complex') {
      const N = Math.ceil(activeLevel / 2);
      return (
        <div className="flex items-center gap-1 text-emerald-300">
          <span className="font-serif italic">f(t) = </span>
          <span className="text-2xl relative top-0.5">Σ</span>
          <div className="flex flex-col text-[8px] leading-[0.8] items-start">
            <span>n={N}</span>
            <span>n=-{N}</span>
          </div>
          <span className="ml-1">c<sub>n</sub> e<sup>nit</sup></span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-emerald-300">
          <span className="font-serif italic">f(t) = a<sub>0</sub> + </span>
          <span className="text-2xl relative top-0.5">Σ</span>
          <div className="flex flex-col text-[8px] leading-[0.8] items-start">
            <span>n={activeLevel}</span>
            <span>n=1</span>
          </div>
          <span className="ml-1">(a<sub>n</sub> cos(nt) + b<sub>n</sub> sin(nt))</span>
        </div>
      );
    }
  };

  // --- INITIALIZATION AND PERSISTENCE ENGINE ---
  useEffect(() => {
    const savedLevels = localStorage.getItem('fourier_levels');
    const savedMax = localStorage.getItem('fourier_max_unlocked');

    if (savedLevels && savedMax) {
      const parsedLevels = JSON.parse(savedLevels);
      const parsedMax = JSON.parse(savedMax);
      
      setLevels(parsedLevels);
      setMaxUnlockedLevels(parsedMax);
      
      initMode('real', parsedLevels.real);
      initMode('complex', parsedLevels.complex);
    } else {
      initMode('real', 1);
      initMode('complex', 1);
    }
  }, []); 

  useEffect(() => {
    localStorage.setItem('fourier_levels', JSON.stringify(levels));
    localStorage.setItem('fourier_max_unlocked', JSON.stringify(maxUnlockedLevels));
  }, [levels, maxUnlockedLevels]);

  const errorNorm = useMemo(() => {
    const tCoeffs = targetCoeffs[mode];
    const pCoeffs = playerCoeffs[mode];
    if (!tCoeffs || !pCoeffs || Object.keys(tCoeffs).length === 0) return 0;
    
    let sumSq = 0;
    if (mode === 'complex') {
      for (const n of activeKeys) {
        const target = tCoeffs[n] || { r: 0, i: 0 };
        const player = pCoeffs[n] || { r: 0, i: 0 };
        sumSq += Math.pow(target.r - player.r, 2) + Math.pow(target.i - player.i, 2);
      }
    } else {
      const diffA0 = (tCoeffs.a0 || 0) - (pCoeffs.a0 || 0);
      sumSq += diffA0 * diffA0;
      for (let i = 1; i <= activeLevel; i++) {
        const diffA = (tCoeffs[`a${i}`] || 0) - (pCoeffs[`a${i}`] || 0);
        const diffB = (tCoeffs[`b${i}`] || 0) - (pCoeffs[`b${i}`] || 0);
        sumSq += 0.5 * (diffA * diffA + diffB * diffB);
      }
    }
    return Math.sqrt(sumSq);
  }, [targetCoeffs, playerCoeffs, activeKeys, mode, activeLevel]);

  useEffect(() => {
    if (!hasStarted || !targetCoeffs[mode] || Object.keys(targetCoeffs[mode]).length === 0) return;
    
    if (errorNorm < 0.01 && !showNext) {
      setShowNext(true);
    } else if (errorNorm >= 0.01 && showNext) {
      setShowNext(false); 
    }
  }, [errorNorm, showNext, hasStarted, targetCoeffs, mode]);

  const nextTerm = useCallback(() => setActiveTermIndex((prev) => Math.min(prev + 1, activeKeys.length - 1)), [activeKeys.length]);
  const prevTerm = useCallback(() => setActiveTermIndex((prev) => Math.max(prev - 1, 0)), []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!hasStarted || showNext || isLevelSelectorOpen) return;
      if (e.key === 'ArrowRight') nextTerm();
      if (e.key === 'ArrowLeft') prevTerm();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, showNext, isLevelSelectorOpen, nextTerm, prevTerm]);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const onTouchStart = (e) => {
    if (showNext || isLevelSelectorOpen) return;
    if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'INPUT') return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e) => {
    if (!touchStart || showNext || isLevelSelectorOpen) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || showNext || isLevelSelectorOpen) return;
    const distance = touchStart - touchEnd;
    if (distance > 40) nextTerm();
    if (distance < -40) prevTerm();
    setTouchStart(null);
    setTouchEnd(null);
  };

  const stepValue = (axisOrVal, direction) => {
    if (showNext) return;
    const key = activeKeys[activeTermIndex];
    setPlayerCoeffs(prev => {
      const updatedMode = { ...prev[mode] };
      
      if (mode === 'complex') {
        const current = updatedMode[key]?.[axisOrVal] || 0;
        let nextVal = Math.round((current + direction * 0.1) * 10) / 10;
        nextVal = Math.max(-3, Math.min(3, nextVal));
        updatedMode[key] = { ...updatedMode[key], [axisOrVal]: nextVal };
      } else {
        const current = updatedMode[key] || 0;
        let nextVal = Math.round((current + direction * 0.1) * 10) / 10;
        nextVal = Math.max(-3, Math.min(3, nextVal));
        updatedMode[key] = nextVal;
      }
      
      return { ...prev, [mode]: updatedMode };
    });
  };

  const handleNextLevel = () => {
    const nextLvl = activeLevel + 1;
    setMaxUnlockedLevels(prev => ({ ...prev, [mode]: Math.max(prev[mode], nextLvl) }));
    setLevels(prev => ({ ...prev, [mode]: nextLvl }));
    initMode(mode, nextLvl);
  };

  const maxY = useMemo(() => {
    const tCoeffs = targetCoeffs[mode] || {};
    if (Object.keys(tCoeffs).length === 0) return 5;
    
    if (mode === 'complex') {
      let max = 0;
      for (const n of activeKeys) {
        const c = tCoeffs[n] || { r: 0, i: 0 };
        max += Math.sqrt(c.r*c.r + c.i*c.i);
      }
      return Math.max(3, Math.ceil(max * 1.2)); 
    } else {
      let maxAmp = Math.abs(tCoeffs.a0 || 0);
      for (let i = 1; i <= activeLevel; i++) {
        maxAmp += Math.abs(tCoeffs[`a${i}`] || 0) + Math.abs(tCoeffs[`b${i}`] || 0);
      }
      return Math.max(4, Math.ceil(maxAmp * 1.1));
    }
  }, [targetCoeffs, activeKeys, mode, activeLevel]);

  const scaleFactor = mode === 'complex' ? ((GRAPH_SIZE / 2) - PADDING) / maxY : 1;

  const generateTrace = useCallback((coeffs) => {
    if (!coeffs || Object.keys(coeffs).length === 0) return "";
    let path = "";
    const POINTS = 250;
    
    if (mode === 'complex') {
      for (let p = 0; p <= POINTS; p++) {
        const t = (p / POINTS) * 2 * Math.PI;
        let x = 0, y = 0;
        for (const n of activeKeys) {
          const c = coeffs[n] || { r: 0, i: 0 };
          x += c.r * Math.cos(n * t) - c.i * Math.sin(n * t);
          y += c.r * Math.sin(n * t) + c.i * Math.cos(n * t);
        }
        const sx = CENTER + x * scaleFactor;
        const sy = CENTER - y * scaleFactor; 
        if (p === 0) path += `M ${sx.toFixed(2)} ${sy.toFixed(2)} `;
        else path += `L ${sx.toFixed(2)} ${sy.toFixed(2)} `;
      }
    } else {
      for (let p = 0; p <= POINTS; p++) {
        const t = (p / POINTS) * 2 * Math.PI;
        let y = coeffs.a0 || 0;
        for (let n = 1; n <= activeLevel; n++) {
          y += (coeffs[`a${n}`] || 0) * Math.cos(n * t);
          y += (coeffs[`b${n}`] || 0) * Math.sin(n * t);
        }
        const x = PADDING + (p / POINTS) * (GRAPH_SIZE - 2 * PADDING);
        const mappedY = CENTER - (y / maxY) * (CENTER - PADDING);
        if (p === 0) path += `M ${x.toFixed(2)} ${mappedY.toFixed(2)} `;
        else path += `L ${x.toFixed(2)} ${mappedY.toFixed(2)} `;
      }
    }
    return path;
  }, [activeKeys, scaleFactor, mode, maxY, activeLevel]);

  const targetPath = useMemo(() => generateTrace(targetCoeffs[mode]), [targetCoeffs, mode, generateTrace]);
  const playerPath = useMemo(() => generateTrace(playerCoeffs[mode]), [playerCoeffs, mode, generateTrace]);

  const playerCoeffsRef = useRef(playerCoeffs);
  const targetCoeffsRef = useRef(targetCoeffs);
  const activeKeysRef = useRef(activeKeys);
  const scaleRef = useRef(scaleFactor);
  const modeRef = useRef(mode);
  const maxYRef = useRef(maxY);
  const levelsRef = useRef(levels);
  
  useEffect(() => { playerCoeffsRef.current = playerCoeffs; }, [playerCoeffs]);
  useEffect(() => { targetCoeffsRef.current = targetCoeffs; }, [targetCoeffs]);
  useEffect(() => { activeKeysRef.current = activeKeys; }, [activeKeys]);
  useEffect(() => { scaleRef.current = scaleFactor; }, [scaleFactor]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { maxYRef.current = maxY; }, [maxY]);
  useEffect(() => { levelsRef.current = levels; }, [levels]);

  useEffect(() => {
    if (!hasStarted) return;
    
    const animate = (time) => {
      const currentMode = modeRef.current;
      const t = (time * 0.0015) % (2 * Math.PI); 
      const pCoeffs = playerCoeffsRef.current[currentMode] || {};
      const tCoeffs = targetCoeffsRef.current[currentMode] || {};
      const keys = activeKeysRef.current;
      
      if (currentMode === 'complex') {
        const scale = scaleRef.current;
        
        let px = 0, py = 0;
        let armsPath = `M ${CENTER} ${CENTER} `;
        for (const n of keys) {
          const c = pCoeffs[n] || { r: 0, i: 0 };
          px += c.r * Math.cos(n * t) - c.i * Math.sin(n * t);
          py += c.r * Math.sin(n * t) + c.i * Math.cos(n * t);
          const sx = CENTER + px * scale;
          const sy = CENTER - py * scale;
          armsPath += `L ${sx.toFixed(2)} ${sy.toFixed(2)} `;
        }
        if (vectorArmsRef.current) vectorArmsRef.current.setAttribute('d', armsPath);
        
        if (vectorTipRef.current) {
          vectorTipRef.current.setAttribute('cx', (CENTER + px * scale).toFixed(2));
          vectorTipRef.current.setAttribute('cy', (CENTER - py * scale).toFixed(2));
        }

        let tx = 0, ty = 0;
        for (const n of keys) {
          const c = tCoeffs[n] || { r: 0, i: 0 };
          tx += c.r * Math.cos(n * t) - c.i * Math.sin(n * t);
          ty += c.r * Math.sin(n * t) + c.i * Math.cos(n * t);
        }
        if (targetTipRef.current) {
          targetTipRef.current.setAttribute('cx', (CENTER + tx * scale).toFixed(2));
          targetTipRef.current.setAttribute('cy', (CENTER - ty * scale).toFixed(2));
        }
        
      } else {
        const maxV = maxYRef.current;
        const currentLevel = levelsRef.current['real'];
        const xPos = PADDING + (t / (2 * Math.PI)) * (GRAPH_SIZE - 2 * PADDING);
        
        let py = pCoeffs.a0 || 0;
        let ty = tCoeffs.a0 || 0;
        for (let i = 1; i <= currentLevel; i++) {
          py += (pCoeffs[`a${i}`] || 0) * Math.cos(i * t) + (pCoeffs[`b${i}`] || 0) * Math.sin(i * t);
          ty += (tCoeffs[`a${i}`] || 0) * Math.cos(i * t) + (tCoeffs[`b${i}`] || 0) * Math.sin(i * t);
        }

        const mapY = (val) => CENTER - (val / maxV) * (CENTER - PADDING);
        
        if (vectorTipRef.current) {
          vectorTipRef.current.setAttribute('cx', xPos.toFixed(2));
          vectorTipRef.current.setAttribute('cy', mapY(py).toFixed(2));
        }
        if (targetTipRef.current) {
          targetTipRef.current.setAttribute('cx', xPos.toFixed(2));
          targetTipRef.current.setAttribute('cy', mapY(ty).toFixed(2));
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [hasStarted]);

  const getErrorColor = (err) => {
    if (err < 0.05) return 'text-emerald-400';
    if (err < 1.0) return 'text-amber-400';
    return 'text-rose-400';
  };

  if (!hasStarted) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-xl text-center space-y-8 bg-slate-900 p-8 md:p-12 rounded-3xl border border-slate-800 shadow-2xl">
          <Activity className="w-16 h-16 text-cyan-400 mx-auto animate-pulse" />
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
            Fourier Rush
          </h1>
          <p className="text-slate-400 text-base md:text-lg leading-relaxed">
            Match the target signal by adjusting its underlying frequencies. 
            Progress is tracked independently for each mode!
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 py-2">
             <button onClick={() => setMode('real')} className={`px-6 py-2 rounded-full font-bold transition-all border ${mode === 'real' ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}>
               Sin/Cos Mode
             </button>
             <button onClick={() => setMode('complex')} className={`px-6 py-2 rounded-full font-bold transition-all border ${mode === 'complex' ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}>
               Complex Mode
             </button>
          </div>

          <button 
            onClick={() => setHasStarted(true)}
            className="group relative inline-flex items-center justify-center px-10 py-4 font-bold text-slate-950 bg-slate-200 rounded-full hover:scale-105 transition-all shadow-xl mt-4"
          >
            <Play className="w-5 h-5 mr-2 fill-current" />
            Start Puzzle
          </button>
        </div>
      </div>
    );
  }

  // FIX: Safe fallback for activeKey
  const activeKey = activeKeys[activeTermIndex] || activeKeys[0];
  const activeCoeff = (playerCoeffs[mode] || {})[activeKey] || (mode === 'complex' ? { r: 0, i: 0 } : 0);

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden">
      
      <header className="flex-none flex justify-between items-center px-3 py-2 bg-slate-900 border-b border-slate-800 safe-top z-10">
        <div className="flex bg-slate-950 p-1 rounded-full border border-slate-800 shadow-inner">
          <button onClick={() => setMode('real')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${mode === 'real' ? 'bg-cyan-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}>Sin/Cos</button>
          <button onClick={() => setMode('complex')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${mode === 'complex' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}>Complex</button>
        </div>
        
        <div className="flex gap-2 items-center">
          <button onClick={() => setIsLevelSelectorOpen(true)} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1 md:py-1.5 rounded-full border border-slate-700 transition-colors shadow-inner active:scale-95 text-sm">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span className="font-bold">Lvl {activeLevel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button onClick={() => initMode(mode, activeLevel)} className="p-1.5 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white active:scale-95"><RefreshCw className="w-4 h-4 md:w-5 md:h-5" /></button>
        </div>
      </header>

      <div className="flex-none w-full flex justify-between items-center px-3 py-1.5 bg-slate-950 border-b border-slate-900 shadow-sm z-10">
        <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-[10px] md:text-xs shadow-inner">
          <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-rose-500 border-t border-dashed border-rose-500"></div><span className="text-slate-300 font-semibold tracking-wide">Target</span></div>
          <div className="w-[1px] h-3 bg-slate-700"></div>
          <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-emerald-400"></div><span className="text-slate-300 font-semibold tracking-wide">Trace</span></div>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 shadow-inner">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Error:</span>
          <div className={`text-sm md:text-base font-mono font-black w-10 text-right ${getErrorColor(errorNorm)}`}>{errorNorm.toFixed(2)}</div>
        </div>
      </div>

      <main className="flex-1 relative flex flex-col min-h-0 bg-slate-950 p-2 md:p-4">
        <div className="flex-1 w-full relative pointer-events-none min-h-0 flex items-center justify-center">
          <svg viewBox={`0 0 ${GRAPH_SIZE} ${GRAPH_SIZE}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
            {mode === 'complex' ? (
              <>
                <line x1={0} y1={CENTER} x2={GRAPH_SIZE} y2={CENTER} stroke="#334155" strokeWidth="2" />
                <line x1={CENTER} y1={0} x2={CENTER} y2={GRAPH_SIZE} stroke="#334155" strokeWidth="2" />
              </>
            ) : (
              <>
                <line x1={PADDING} y1={CENTER} x2={GRAPH_SIZE-PADDING} y2={CENTER} stroke="#334155" strokeWidth="2" />
                <line x1={PADDING} y1={PADDING} x2={PADDING} y2={GRAPH_SIZE-PADDING} stroke="#334155" strokeWidth="2" />
              </>
            )}
            <path d={targetPath} fill="none" stroke="#f43f5e" strokeWidth="4" strokeDasharray="12 12" opacity={showNext ? 0.3 : 0.6} />
            <path d={playerPath} fill="none" stroke="#34d399" strokeWidth="4" opacity={0.6} />
            <g>
              <circle ref={targetTipRef} r="8" fill="#f43f5e" />
              {mode === 'complex' && <path ref={vectorArmsRef} fill="none" stroke="#22d3ee" strokeWidth="3" opacity="0.8" />}
              <circle ref={vectorTipRef} r="6" fill="#fff" />
            </g>
          </svg>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg mt-2 p-2 text-center text-xs md:text-sm font-mono text-emerald-300 shadow-md z-10 flex items-center justify-center">{renderEquation()}</div>
      </main>

      <section className="flex-none bg-slate-900 border-t border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col pt-2 pb-4" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {showNext ? (
          <div className="flex flex-col items-center justify-center px-4 py-6 animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-black text-emerald-400 mb-2">Perfect Match!</h2>
            <button onClick={handleNextLevel} className="px-6 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl">Start Level {activeLevel + 1} <ArrowRight className="inline ml-2 w-5 h-5" /></button>
          </div>
        ) : (
          <div className="flex flex-col px-3 md:px-8 max-w-lg mx-auto w-full">
            <div className="flex justify-between items-center mb-3">
              <button onClick={prevTerm} disabled={activeTermIndex === 0} className="p-2 bg-slate-800 rounded-full text-slate-300 disabled:opacity-30 active:scale-95"><ChevronLeft className="w-5 h-5" /></button>
              <div className="text-center flex-1">{getTermLabel(activeKey)}</div>
              <button onClick={nextTerm} disabled={activeTermIndex === activeKeys.length - 1} className="p-2 bg-slate-800 rounded-full text-slate-300 disabled:opacity-30 active:scale-95"><ChevronRight className="w-5 h-5" /></button>
            </div>
            {mode === 'complex' ? (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center bg-slate-800 p-2 rounded-xl border border-slate-700">
                  <button onClick={() => stepValue('r', -1)}><Minus className="text-rose-400" /></button>
                  <span className="font-mono text-xl">{activeCoeff.r.toFixed(1)}</span>
                  <button onClick={() => stepValue('r', 1)}><Plus className="text-emerald-400" /></button>
                </div>
                <div className="flex justify-between items-center bg-slate-800 p-2 rounded-xl border border-slate-700">
                  <button onClick={() => stepValue('i', -1)}><Minus className="text-rose-400" /></button>
                  <span className="font-mono text-xl">{activeCoeff.i.toFixed(1)}i</span>
                  <button onClick={() => stepValue('i', 1)}><Plus className="text-emerald-400" /></button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
                <button onClick={() => stepValue('val', -1)}><Minus className="text-rose-400" /></button>
                <span className="font-mono text-3xl">{activeCoeff.toFixed(1)}</span>
                <button onClick={() => stepValue('val', 1)}><Plus className="text-emerald-400" /></button>
              </div>
            )}
          </div>
        )}
      </section>

      {isLevelSelectorOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl p-5">
            <div className="flex justify-between mb-4"><h2 className="font-bold text-lg">Select Level</h2><button onClick={() => setIsLevelSelectorOpen(false)}><X /></button></div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 20 }, (_, i) => i + 1).map(l => (
                <button key={l} disabled={l > maxUnlocked} onClick={() => { setLevels(prev => ({ ...prev, [mode]: l })); initMode(mode, l); setIsLevelSelectorOpen(false); }} className={`p-3 rounded-lg ${l === activeLevel ? 'bg-emerald-500 text-black' : l <= maxUnlocked ? 'bg-slate-800' : 'bg-slate-900 opacity-50'}`}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
