import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Play, ArrowRight, Activity, Trophy, RefreshCw, ChevronLeft, ChevronRight, Plus, Minus, Target, ChevronDown, X, Lock } from 'lucide-react';

export default function App() {
  const [level, setLevel] = useState(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(1);
  const [targetCoeffs, setTargetCoeffs] = useState({});
  const [playerCoeffs, setPlayerCoeffs] = useState({});
  const [showNext, setShowNext] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeTermIndex, setActiveTermIndex] = useState(0);
  const [isLevelSelectorOpen, setIsLevelSelectorOpen] = useState(false);

  // Constants for Graph
  const GRAPH_WIDTH = 1000;
  const GRAPH_HEIGHT = 500;
  const PADDING = 40;
  const POINTS = 250;

  // Generate a new level
  const initLevel = useCallback((lvl) => {
    const nMax = lvl;
    const newTarget = { a0: 0 };
    const newPlayer = { a0: 0 };

    const randCoeff = () => Math.round((Math.floor(Math.random() * 61) - 30)) / 10;

    newTarget.a0 = randCoeff();
    for (let i = 1; i <= nMax; i++) {
      newTarget[`a${i}`] = randCoeff();
      newTarget[`b${i}`] = randCoeff();
      newPlayer[`a${i}`] = 0;
      newPlayer[`b${i}`] = 0;
    }

    // Ensure the highest frequency term is present
    if (newTarget[`a${nMax}`] === 0 && newTarget[`b${nMax}`] === 0) {
      newTarget[`a${nMax}`] = Math.random() > 0.5 ? 1.0 : -1.0;
    }

    setTargetCoeffs(newTarget);
    setPlayerCoeffs(newPlayer);
    setShowNext(false);
    setActiveTermIndex(0); // Reset to first term
  }, []);

  // Start game initially
  useEffect(() => {
    initLevel(level);
  }, [level, initLevel]);

  // Calculate Error Norm using Parseval's Theorem
  const errorNorm = useMemo(() => {
    if (Object.keys(targetCoeffs).length === 0 || Object.keys(playerCoeffs).length === 0) return 0;
    
    let sumSq = 0;
    
    // DC Offset difference
    const diffA0 = (targetCoeffs.a0 || 0) - (playerCoeffs.a0 || 0);
    sumSq += diffA0 * diffA0;

    // Harmonics differences
    for (let i = 1; i <= level; i++) {
      const diffA = (targetCoeffs[`a${i}`] || 0) - (playerCoeffs[`a${i}`] || 0);
      const diffB = (targetCoeffs[`b${i}`] || 0) - (playerCoeffs[`b${i}`] || 0);
      sumSq += 0.5 * (diffA * diffA + diffB * diffB);
    }

    return Math.sqrt(sumSq);
  }, [targetCoeffs, playerCoeffs, level]);

  // Check Win Condition
  useEffect(() => {
    if (!hasStarted || Object.keys(targetCoeffs).length === 0) return;
    
    if (errorNorm < 0.01 && !showNext) {
      setShowNext(true);
    }
  }, [errorNorm, showNext, hasStarted, targetCoeffs]);

  // Term Keys List ['a0', 'a1', 'b1', 'a2', 'b2', ...]
  const termKeys = useMemo(() => {
    const keys = ['a0'];
    for (let i = 1; i <= level; i++) {
      keys.push(`a${i}`, `b${i}`);
    }
    return keys;
  }, [level]);

  // Handle Swipe & Navigation Logic
  const nextTerm = useCallback(() => {
    setActiveTermIndex((prev) => Math.min(prev + 1, termKeys.length - 1));
  }, [termKeys.length]);

  const prevTerm = useCallback(() => {
    setActiveTermIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!hasStarted || showNext || isLevelSelectorOpen) return;
      if (e.key === 'ArrowRight') nextTerm();
      if (e.key === 'ArrowLeft') prevTerm();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, showNext, isLevelSelectorOpen, nextTerm, prevTerm]);

  // Touch handlers for Swiping the Term
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const onTouchStart = (e) => {
    if (showNext || isLevelSelectorOpen) return;
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
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
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) nextTerm();
    if (isRightSwipe) prevTerm();
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Change Coefficient via Counters
  const stepValue = (direction) => {
    if (showNext) return;
    const activeKey = termKeys[activeTermIndex];
    setPlayerCoeffs(prev => {
      const current = prev[activeKey] || 0;
      let nextVal = Math.round((current + direction * 0.1) * 10) / 10;
      nextVal = Math.max(-3, Math.min(3, nextVal));
      return { ...prev, [activeKey]: nextVal };
    });
  };

  // Handle advancing to the next level
  const handleNextLevel = () => {
    const nextLvl = level + 1;
    setMaxUnlockedLevel(prev => Math.max(prev, nextLvl));
    setLevel(nextLvl);
  };

  // Dynamic graph scaling
  const maxY = useMemo(() => {
    if (Object.keys(targetCoeffs).length === 0) return 5;
    let maxAmp = Math.abs(targetCoeffs.a0 || 0);
    for (let i = 1; i <= level; i++) {
      maxAmp += Math.abs(targetCoeffs[`a${i}`] || 0) + Math.abs(targetCoeffs[`b${i}`] || 0);
    }
    return Math.max(4, Math.ceil(maxAmp * 1.1));
  }, [targetCoeffs, level]);

  // Generate SVG Path
  const generatePath = useCallback((coeffs) => {
    if (Object.keys(coeffs).length === 0) return "";
    let path = "";
    for (let i = 0; i <= POINTS; i++) {
      const t = (i / POINTS) * 2 * Math.PI;
      let y = coeffs.a0 || 0;
      for (let n = 1; n <= level; n++) {
        y += (coeffs[`a${n}`] || 0) * Math.cos(n * t);
        y += (coeffs[`b${n}`] || 0) * Math.sin(n * t);
      }
      const x = PADDING + (i / POINTS) * (GRAPH_WIDTH - 2 * PADDING);
      const mappedY = (GRAPH_HEIGHT / 2) - (y / maxY) * ((GRAPH_HEIGHT / 2) - PADDING);
      if (i === 0) path += `M ${x.toFixed(2)} ${mappedY.toFixed(2)} `;
      else path += `L ${x.toFixed(2)} ${mappedY.toFixed(2)} `;
    }
    return path;
  }, [level, maxY]);

  const targetPath = useMemo(() => generatePath(targetCoeffs), [targetCoeffs, generatePath]);
  const playerPath = useMemo(() => generatePath(playerCoeffs), [playerCoeffs, generatePath]);

  // UI Formatting
  const getTermLabel = (key) => {
    if (key === 'a0') return <span className="text-cyan-400">a₀ (DC Offset)</span>;
    const type = key[0];
    const n = key.substring(1);
    const isCos = type === 'a';
    return (
      <span className={isCos ? 'text-amber-400' : 'text-blue-400'}>
        {type}<sub>{n}</sub> {isCos ? 'cos' : 'sin'}({n === '1' ? 't' : n+'t'})
      </span>
    );
  };

  const renderEquation = (coeffs) => {
    if (Object.keys(coeffs).length === 0) return '0.0';
    let eq = [];
    if (coeffs.a0 !== 0 && coeffs.a0 !== undefined) eq.push(coeffs.a0.toFixed(1));
    for (let i = 1; i <= level; i++) {
      const a = coeffs[`a${i}`];
      const b = coeffs[`b${i}`];
      if (a !== 0 && a !== undefined) {
        const sign = a > 0 ? (eq.length ? '+ ' : '') : '- ';
        eq.push(`${sign}${Math.abs(a).toFixed(1)}cos(${i === 1 ? 't' : i + 't'})`);
      }
      if (b !== 0 && b !== undefined) {
        const sign = b > 0 ? (eq.length ? '+ ' : '') : '- ';
        eq.push(`${sign}${Math.abs(b).toFixed(1)}sin(${i === 1 ? 't' : i + 't'})`);
      }
    }
    return eq.length === 0 ? '0.0' : eq.join(' ');
  };

  const getErrorColor = (err) => {
    if (err < 0.05) return 'text-emerald-400';
    if (err < 1.0) return 'text-amber-400';
    return 'text-rose-400';
  };

  // Start Screen
  if (!hasStarted) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-xl text-center space-y-8 bg-slate-900 p-8 md:p-12 rounded-3xl border border-slate-800 shadow-2xl">
          <Activity className="w-20 h-20 text-cyan-400 mx-auto animate-pulse" />
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
            Fourier Rush
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Match the target signal by adjusting the amplitudes of its underlying frequencies. 
            Swipe left or right to switch between coefficients!
          </p>
          <button 
            onClick={() => setHasStarted(true)}
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(45,212,191,0.5)]"
          >
            <Play className="w-5 h-5 mr-2 fill-current" />
            Start Puzzle
          </button>
        </div>
      </div>
    );
  }

  const activeKey = termKeys[activeTermIndex];
  const activeValue = playerCoeffs[activeKey] || 0;
  
  let displayValue = activeValue.toFixed(1);
  if (displayValue === '-0.0') displayValue = '0.0';

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden">
      
      {/* Header */}
      <header className="flex-none flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800 safe-top z-10">
        <div className="flex items-center gap-2">
          <Activity className="text-cyan-400 w-5 h-5" />
          <h1 className="text-lg font-bold tracking-wider hidden sm:block">FOURIER</h1>
        </div>
        
        {/* Level Dropdown Button */}
        <button 
          onClick={() => setIsLevelSelectorOpen(true)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-1.5 rounded-full border border-slate-700 transition-colors shadow-inner active:scale-95"
        >
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="font-bold">Level {level}</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        <button 
          onClick={() => initLevel(level)} 
          className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white active:scale-95"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      {/* Dedicated Info Bar (Legend & Error Norm) */}
      <div className="flex-none w-full flex justify-between items-center px-4 py-3 bg-slate-950 border-b border-slate-900 shadow-sm z-10">
        
        {/* Signal Legend */}
        <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs shadow-inner">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-rose-500 border-t border-dashed border-rose-500"></div>
            <span className="text-slate-300 font-semibold tracking-wide">Target</span>
          </div>
          <div className="w-[1px] h-3 bg-slate-700"></div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-emerald-400"></div>
            <span className="text-slate-300 font-semibold tracking-wide">Yours</span>
          </div>
        </div>

        {/* Error Norm Display */}
        <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 shadow-inner">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Error</span>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Norm</span>
          </div>
          <Target className="w-4 h-4 text-slate-500 sm:hidden" />
          <div className={`text-xl font-mono font-black w-14 text-right ${getErrorColor(errorNorm)} transition-colors duration-300`}>
            {errorNorm.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Main Content Area (Graph) */}
      <main className="flex-1 relative flex flex-col min-h-0 bg-slate-950">
        {/* The Graph */}
        <div className="flex-1 w-full relative pointer-events-none mt-2">
          <svg viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <line x1={PADDING} y1={GRAPH_HEIGHT/2} x2={GRAPH_WIDTH-PADDING} y2={GRAPH_HEIGHT/2} stroke="#334155" strokeWidth="2" />
            <line x1={PADDING} y1={PADDING} x2={PADDING} y2={GRAPH_HEIGHT-PADDING} stroke="#334155" strokeWidth="2" />
            {[...Array(5)].map((_, i) => {
              const yPos = PADDING + (i / 4) * (GRAPH_HEIGHT - 2*PADDING);
              return <line key={i} x1={PADDING} y1={yPos} x2={GRAPH_WIDTH-PADDING} y2={yPos} stroke="#1e293b" strokeWidth="1" />;
            })}
            <path d={targetPath} fill="none" stroke="#f43f5e" strokeWidth="4" strokeDasharray="8 8" opacity={showNext ? 0.2 : 0.6} className="transition-opacity duration-1000" />
            <path d={playerPath} fill="none" stroke="#34d399" strokeWidth="4" style={{ filter: 'drop-shadow(0px 0px 6px rgba(52, 211, 153, 0.4))' }} />
          </svg>
        </div>

        {/* Equation Display */}
        <div className="bg-slate-900 border-t border-slate-800 p-2 md:p-3 text-center text-sm font-mono text-emerald-300 truncate px-4 shadow-[0_-4px_10px_rgba(0,0,0,0.3)] z-10 pointer-events-none">
          f(t) = {renderEquation(playerCoeffs)}
        </div>
      </main>

      {/* Swipeable Controls Bottom Deck OR Victory Banner */}
      <section 
        className="flex-none h-56 md:h-64 bg-slate-900 border-t border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col safe-bottom relative z-10"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {showNext ? (
          /* Victory UI replacing the controls */
          <div className="flex-1 flex flex-col items-center justify-center px-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-4 text-emerald-400">
              <Trophy className="w-8 h-8" />
              <h2 className="text-2xl font-black tracking-wide uppercase">Perfect Match!</h2>
            </div>
            <p className="text-slate-400 text-sm mb-6 text-center max-w-sm">
              Error norm reached 0.00. You've isolated all frequencies.
            </p>
            <button 
              onClick={handleNextLevel}
              className="w-full max-w-sm inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black rounded-2xl transition-all text-lg shadow-[0_0_20px_-5px_rgba(45,212,191,0.5)] active:scale-95 touch-manipulation"
            >
              Start Level {level + 1} <ArrowRight className="ml-3 w-6 h-6" />
            </button>
          </div>
        ) : (
          /* Normal Controls UI */
          <>
            {/* Pagination Dots */}
            <div className="flex justify-center gap-1.5 pt-4 pb-2 px-2 overflow-hidden">
              {termKeys.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-300 flex-shrink-0 ${idx === activeTermIndex ? 'w-6 bg-emerald-400' : 'w-2 bg-slate-700'}`}
                />
              ))}
            </div>

            {/* Controls Layout */}
            <div className="flex-1 flex flex-col justify-center px-4 md:px-12 max-w-lg mx-auto w-full pb-4">
              
              {/* Navigation Row */}
              <div className="flex justify-between items-center mb-6">
                <button 
                  onClick={prevTerm} 
                  disabled={activeTermIndex === 0}
                  className="p-3 bg-slate-800 rounded-full text-slate-300 disabled:opacity-30 active:scale-95 transition-all touch-manipulation"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="text-center flex-1">
                  <h3 className="text-xl md:text-2xl font-mono font-bold tracking-wider">
                    {getTermLabel(activeKey)}
                  </h3>
                </div>

                <button 
                  onClick={nextTerm} 
                  disabled={activeTermIndex === termKeys.length - 1}
                  className="p-3 bg-slate-800 rounded-full text-slate-300 disabled:opacity-30 active:scale-95 transition-all touch-manipulation"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Stepper Counters Row */}
              <div className="flex justify-between items-center gap-4 px-2">
                
                <button 
                  onClick={() => stepValue(-1)}
                  disabled={activeValue <= -3}
                  className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-2xl text-rose-400 disabled:opacity-30 active:scale-90 transition-all border border-slate-700 shadow-lg touch-manipulation"
                >
                  <Minus className="w-8 h-8 md:w-10 md:h-10" strokeWidth={3} />
                </button>
                
                <div className="flex-1 text-center font-mono">
                  <div className="text-4xl md:text-5xl font-black text-white tracking-tight">
                    {activeValue > 0 ? '+' : ''}{displayValue}
                  </div>
                </div>

                <button 
                  onClick={() => stepValue(1)}
                  disabled={activeValue >= 3}
                  className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-2xl text-emerald-400 disabled:opacity-30 active:scale-90 transition-all border border-slate-700 shadow-lg touch-manipulation"
                >
                  <Plus className="w-8 h-8 md:w-10 md:h-10" strokeWidth={3} />
                </button>

              </div>
            </div>
          </>
        )}
      </section>

      {/* Level Selector Modal Overlay */}
      {isLevelSelectorOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh] transform transition-all overflow-hidden animate-in zoom-in-95 duration-200 relative">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-emerald-400 inline-block mr-1" />
                Select Level
              </h2>
              <button 
                onClick={() => setIsLevelSelectorOpen(false)} 
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrolling Grid Area - added generous padding to prevent clipping of scaled elements */}
            <div className="overflow-y-auto custom-scrollbar p-6">
              <div className="grid grid-cols-4 gap-4">
                {/* Show exactly enough grid squares to fill out 20 boxes, or more if the player exceeds 20 */}
                {Array.from({ length: Math.max(20, Math.ceil(maxUnlockedLevel / 20) * 20) }, (_, i) => i + 1).map(l => {
                  const isUnlocked = l <= maxUnlockedLevel;
                  const isCurrent = l === level;
                  
                  return (
                    <button
                      key={l}
                      disabled={!isUnlocked}
                      onClick={() => {
                        setLevel(l);
                        setIsLevelSelectorOpen(false);
                      }}
                      className={`
                        aspect-square rounded-2xl font-black text-lg flex items-center justify-center transition-all duration-300 relative
                        ${isCurrent ? 'bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 shadow-[0_0_20px_-5px_rgba(45,212,191,0.6)] scale-110 z-10' : 
                          isUnlocked ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500 shadow-sm active:scale-95 z-0' : 
                          'bg-slate-900/40 text-slate-700 border border-slate-800/60 cursor-not-allowed z-0'
                        }
                      `}
                    >
                      {isUnlocked ? l : <Lock className="w-5 h-5 opacity-40" />}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Bottom fading edge for scroll indication */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
          </div>
        </div>
      )}

      {/* Safe Area CSS for notched devices & Scrollbars */}
      <style dangerouslySetInnerHTML={{__html: `
        .safe-top { padding-top: max(env(safe-area-inset-top), 16px); }
        .safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 16px); }
        .touch-manipulation { touch-action: manipulation; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  );
}


