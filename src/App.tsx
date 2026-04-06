/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, 
  Trophy, 
  User, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Volume2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { auth, db } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { LETTERS } from './constants';
import { UserProfile, LetterData } from './types';
import { cn, getDistance } from './lib/utils';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    code: error.code || 'unknown',
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(errInfo.error);
}

// --- Components ---

const DecorativeBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Sumikko-style Blobs with Faces */}
      <motion.div 
        animate={{ 
          x: [0, 20, 0], 
          y: [0, -20, 0],
          rotate: [0, 5, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-10 -left-10 w-72 h-72 bg-kawaii-pink/40 blob blur-xl flex items-center justify-center" 
      >
        <div className="sumikko-face w-12 h-12 opacity-30" />
      </motion.div>
      
      <motion.div 
        animate={{ 
          x: [0, -30, 0], 
          y: [0, 30, 0],
          rotate: [0, -8, 0]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-20 -right-20 w-80 h-80 bg-kawaii-blue/40 blob blur-xl flex items-center justify-center" 
      >
        <div className="sumikko-face w-12 h-12 opacity-30" />
      </motion.div>

      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-10 w-40 h-40 bg-kawaii-yellow/40 blob blur-lg flex items-center justify-center" 
      >
        <div className="sumikko-face w-8 h-8 opacity-20" />
      </motion.div>

      <motion.div 
        animate={{ 
          x: [0, 15, 0],
          y: [0, 15, 0]
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 left-20 w-32 h-32 bg-kawaii-green/40 blob blur-lg flex items-center justify-center" 
      >
        <div className="sumikko-face w-6 h-6 opacity-20" />
      </motion.div>

      {/* Corner Specific Decorations */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-8 border-t-8 border-kawaii-pink/20 rounded-tl-3xl m-4" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-8 border-b-8 border-kawaii-blue/20 rounded-br-3xl m-4" />

      {/* Cute Floating Icons */}
      <div className="absolute top-20 right-[20%] opacity-20 animate-float">
        <Sparkles className="w-12 h-12 text-kawaii-pink" />
      </div>
      <div className="absolute bottom-40 left-[15%] opacity-20 animate-float" style={{ animationDelay: '1s' }}>
        <Star className="w-10 h-10 text-kawaii-yellow fill-current" />
      </div>
      <div className="absolute top-[40%] left-[5%] opacity-10 animate-float" style={{ animationDelay: '2s' }}>
        <div className="w-16 h-16 bg-kawaii-purple rounded-full blob flex items-center justify-center">
           <div className="sumikko-face w-4 h-4 opacity-40" />
        </div>
      </div>
      
      {/* Polka Dots Overlay */}
      <div className="absolute inset-0 bg-japanese-dots opacity-[0.03]" />
    </div>
  );
};

const Login = ({ onLogin }: { onLogin: (profile: UserProfile) => void }) => {
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !className || !seatNumber) {
      setError('請填寫所有欄位喔！');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInAnonymously(auth);
      const uid = userCredential.user.uid;
      
      const profile: UserProfile = {
        uid,
        name,
        className,
        seatNumber,
        stars: 0,
        completedLetters: [],
        createdAt: new Date().toISOString(),
      };

      const path = `users/${uid}`;
      try {
        await setDoc(doc(db, 'users', uid), profile);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.WRITE, path);
      }
      
      onLogin(profile);
    } catch (err: any) {
      console.error('Login error details:', err);
      const msg = err.message || String(err);
      setError(`發生錯誤：${msg.substring(0, 50)}...`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-kawaii-grid">
      <DecorativeBackground />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-white/90 backdrop-blur-sm p-10 rounded-[3rem] shadow-2xl border-8 border-white relative overflow-hidden ring-8 ring-kawaii-pink/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-kawaii-pink/20 -mr-16 -mt-16 rounded-full" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-kawaii-blue/20 -ml-12 -mb-12 rounded-full" />
          
          {/* Washi Tape Decor */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-8 washi-tape -rotate-2 opacity-80 z-20 flex items-center justify-center text-[10px] font-bold text-kawaii-pink uppercase tracking-widest">
            Welcome ✨
          </div>

          <div className="relative z-10">
            <div className="flex justify-center mb-8">
              <div className="bg-kawaii-pink p-6 rounded-[2.5rem] shadow-xl -rotate-6 border-4 border-white relative">
                <BookOpen className="w-12 h-12 text-white" />
                <div className="absolute -bottom-2 -right-2 bg-kawaii-yellow p-2 rounded-full border-2 border-white shadow-md">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                </div>
              </div>
            </div>
            
            <h2 className="text-3xl font-black text-center mb-8 text-slate-700 tracking-tight">
              小朋友，<span className="text-kawaii-pink">請報到！</span>
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-orange-50 text-orange-600 p-4 rounded-2xl text-sm font-bold border-2 border-orange-100"
                >
                  {error}
                </motion.div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-2">班級 (例如: 101)</label>
                <input 
                  type="text" 
                  placeholder="輸入班級"
                  className="w-full px-6 py-4 bg-slate-50 border-4 border-transparent focus:border-blue-400 focus:bg-white rounded-2xl outline-none transition-all text-lg font-bold"
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-2">座號</label>
                <input 
                  type="text" 
                  placeholder="輸入座號"
                  className="w-full px-6 py-4 bg-slate-50 border-4 border-transparent focus:border-blue-400 focus:bg-white rounded-2xl outline-none transition-all text-lg font-bold"
                  value={seatNumber}
                  onChange={e => setSeatNumber(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-2">姓名</label>
                <input 
                  type="text" 
                  placeholder="輸入姓名"
                  className="w-full px-6 py-4 bg-slate-50 border-4 border-transparent focus:border-blue-400 focus:bg-white rounded-2xl outline-none transition-all text-lg font-bold"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white font-black text-xl rounded-3xl shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {loading ? "登入中..." : "開始學習之旅！"}
                {!loading && <ChevronRight className="w-6 h-6" />}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};


const StrokePractice = ({ letter, onComplete }: { letter: LetterData, onComplete: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStroke, setCurrentStroke] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<{ x: number; y: number }[]>([]);
  const [completedStrokes, setCompletedStrokes] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.startsWith('en-US') && (v.name.includes('Google') || v.name.includes('Enhanced') || v.name.includes('Premium'))
    ) || voices.find(v => v.lang.startsWith('en-US'));

    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.pitch = 1.1;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    drawGuide();
  }, [letter, currentStroke, completedStrokes]);

  const drawGuide = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Draw Grid (Japanese school notebook style)
    const midY = height / 2;
    const midX = width / 2;
    
    // Horizontal lines
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    
    // Top/Bottom boundaries (Blue)
    ctx.strokeStyle = '#94a3b8'; // Slate 400
    ctx.beginPath();
    ctx.moveTo(0, 10); ctx.lineTo(width, 10);
    ctx.moveTo(0, height - 10); ctx.lineTo(width, height - 10);
    ctx.stroke();

    // Middle horizontal (Red/Pink dashed)
    ctx.strokeStyle = '#fda4af'; // Rose 300
    ctx.beginPath();
    ctx.moveTo(0, midY); ctx.lineTo(width, midY);
    ctx.stroke();

    // Vertical middle (Blue dashed)
    ctx.strokeStyle = '#93c5fd'; // Blue 300
    ctx.beginPath();
    ctx.moveTo(midX, 0); ctx.lineTo(midX, height);
    ctx.stroke();
    
    ctx.setLineDash([]);

    // Draw all strokes (faint)
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    letter.strokes.forEach((stroke, idx) => {
      ctx.strokeStyle = completedStrokes.includes(idx) ? '#4ade80' : '#f1f5f9';
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x * width, p.y * height);
        else ctx.lineTo(p.x * width, p.y * height);
      });
      ctx.stroke();
    });

    // Draw current stroke guide
    if (currentStroke < letter.strokes.length) {
      const stroke = letter.strokes[currentStroke];
      ctx.strokeStyle = '#3b82f633';
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x * width, p.y * height);
        else ctx.lineTo(p.x * width, p.y * height);
      });
      ctx.stroke();

      // Start point indicator (Cute circle)
      const start = stroke.points[0];
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(start.x * width, start.y * height, 12, 0, Math.PI * 2);
      ctx.fill();
      
      // Number indicator
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((currentStroke + 1).toString(), start.x * width, start.y * height);
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getPos(e);
    setDrawnPoints([pos]);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    setDrawnPoints(prev => [...prev, pos]);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const last = drawnPoints[drawnPoints.length - 1];
    ctx.moveTo(last.x * canvas.width, last.y * canvas.height);
    ctx.lineTo(pos.x * canvas.width, pos.y * canvas.height);
    ctx.stroke();
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    validateStroke();
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    };
  };

  const validateStroke = () => {
    if (currentStroke >= letter.strokes.length) return;
    const targetStroke = letter.strokes[currentStroke];
    
    const startDist = getDistance(drawnPoints[0], targetStroke.points[0]);
    const endDist = getDistance(drawnPoints[drawnPoints.length - 1], targetStroke.points[targetStroke.points.length - 1]);

    if (startDist < 0.15 && endDist < 0.15) {
      setCompletedStrokes(prev => [...prev, currentStroke]);
      if (currentStroke + 1 === letter.strokes.length) {
        speak(letter.char); // Pronounce letter name
        setTimeout(() => speak(letter.sound), 1000); // Followed by natural pronunciation
        onComplete();
      } else {
        setCurrentStroke(prev => prev + 1);
      }
      setFeedback('好棒！');
    } else {
      setFeedback('再試一次！');
      drawGuide();
    }
    setTimeout(() => setFeedback(null), 1000);
    setDrawnPoints([]);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative bg-white p-6 rounded-[2rem] shadow-xl border-8 border-yellow-200">
        <canvas 
          ref={canvasRef}
          width={400}
          height={400}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="touch-none cursor-crosshair rounded-xl"
        />
        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1.2, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className={cn(
                "absolute inset-0 flex items-center justify-center text-6xl font-black pointer-events-none drop-shadow-lg",
                feedback === '好棒！' ? "text-green-500" : "text-orange-500"
              )}
            >
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-8 flex gap-6">
        <button 
          onClick={() => {
            setCompletedStrokes([]);
            setCurrentStroke(0);
            drawGuide();
          }}
          className="flex items-center gap-2 px-6 py-3 bg-white border-4 border-slate-100 hover:border-slate-200 text-slate-600 font-bold rounded-2xl transition-all active:scale-95"
        >
          <RefreshCw className="w-5 h-5" /> 重寫
        </button>
        <button 
          onClick={() => {
            speak(letter.char);
            setTimeout(() => speak(letter.sound), 1000);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <Volume2 className="w-5 h-5" /> 聽聽看
        </button>
      </div>
    </div>
  );
};

const WordPuzzle = ({ letter, onComplete }: { letter: LetterData, onComplete: () => void }) => {
  const [isSolved, setIsSolved] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.startsWith('en-US') && (v.name.includes('Google') || v.name.includes('Enhanced') || v.name.includes('Premium'))
    ) || voices.find(v => v.lang.startsWith('en-US'));

    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.pitch = 1.1;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleDrop = () => {
    if (draggedItem === letter.char) {
      setIsSolved(true);
      speak(letter.word);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FF69B4', '#00BFFF', '#7CFC00']
      });
      onComplete();
    }
    setDraggedItem(null);
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm p-12 rounded-[4rem] shadow-2xl border-8 border-white min-h-[600px] flex flex-col items-center justify-center relative overflow-hidden ring-8 ring-kawaii-yellow/5">
      <div className="absolute top-0 left-0 w-full h-4 bg-kawaii-blue/20" />
      
      {/* Corner Character */}
      <div className="absolute bottom-4 left-4 w-16 h-16 bg-kawaii-pink/30 blob flex items-center justify-center opacity-60 rotate-12">
        <div className="sumikko-face w-5 h-5" />
      </div>

      <div className="absolute top-10 right-10 opacity-20">
        <Sparkles className="w-12 h-12 text-kawaii-pink" />
      </div>
      
      <div className="space-y-12 text-center relative z-10">
        <h3 className="text-3xl font-black text-slate-700">拼拼看單字！ 🧩</h3>
        
        <div className="relative group">
          <div className="absolute -inset-4 bg-kawaii-yellow/30 rounded-[3rem] blur-xl group-hover:bg-kawaii-yellow/50 transition-all" />
          <img 
            src={letter.image} 
            alt={letter.word} 
            className="w-64 h-64 mx-auto relative z-10 drop-shadow-2xl animate-float"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="flex gap-3 mb-16">
          {letter.word.split('').map((char, i) => {
            const isTarget = char === letter.char;
            return (
              <div 
                key={i}
                onDragOver={(e) => isTarget && !isSolved ? e.preventDefault() : null}
                onDrop={() => isTarget && !isSolved ? handleDrop() : null}
                className={cn(
                  "w-20 h-20 border-4 rounded-3xl flex items-center justify-center text-4xl font-black transition-all duration-500",
                  isTarget 
                    ? (isSolved ? "bg-green-100 border-green-400 text-green-600 scale-110" : "bg-blue-50 border-dashed border-blue-300 text-transparent")
                    : "bg-white border-slate-100 text-slate-300"
                )}
              >
                {isTarget ? (isSolved ? char : '') : char}
              </div>
            );
          })}
        </div>

        {!isSolved && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-blue-500 font-bold text-lg animate-bounce">把字母拉過來！</p>
            <motion.div
              draggable
              onDragStart={() => setDraggedItem(letter.char)}
              whileHover={{ scale: 1.15, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              className="w-24 h-24 bg-white border-8 border-blue-400 rounded-[2rem] flex items-center justify-center text-5xl font-black text-blue-600 shadow-xl cursor-grab active:cursor-grabbing"
            >
              {letter.char}
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const RewardSystem = ({ stars, completedLetters }: { stars: number, completedLetters: string[] }) => {
  return (
    <div className="relative w-full h-64 bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border-8 border-slate-800 ring-8 ring-kawaii-purple/10">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,#3b82f6,transparent)]" />
      <div className="absolute inset-0 bg-japanese-dots opacity-10" />
      
      {/* Corner Sumikko in the sky */}
      <div className="absolute bottom-4 right-4 w-16 h-16 bg-kawaii-blue/20 blob flex items-center justify-center opacity-40 rotate-12">
        <div className="sumikko-face w-5 h-5" />
      </div>

      {/* Stars in the sky */}
      {Array.from({ length: 26 }).map((_, i) => {
        const isLit = i < completedLetters.length;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: isLit ? 1 : 0.1,
              scale: isLit ? [1, 1.2, 1] : 1
            }}
            transition={{ 
              repeat: isLit ? Infinity : 0, 
              duration: 2 + Math.random() * 2,
              delay: Math.random() * 2
            }}
            style={{
              position: 'absolute',
              left: `${(i % 7) * 14 + 5 + Math.random() * 3}%`,
              top: `${Math.floor(i / 7) * 22 + 10 + Math.random() * 3}%`,
            }}
          >
            <Star className={cn("w-6 h-6", isLit ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,1)]" : "text-gray-700")} />
          </motion.div>
        );
      })}

      <div className="absolute bottom-6 left-8 right-8 flex justify-between items-end">
        <div className="text-white">
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-60 font-black text-kawaii-pink">Your Galaxy ✨</p>
          <h3 className="text-2xl font-black flex items-center gap-2 drop-shadow-md">
            已點亮 {completedLetters.length} / 26 顆星
          </h3>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border-4 border-white/20 flex items-center gap-3 shadow-lg">
          <Trophy className="w-6 h-6 text-kawaii-yellow" />
          <span className="text-white font-black text-xl">{stars} 積分</span>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<LetterData | null>(null);
  const [gameState, setGameState] = useState<'grid' | 'stroke' | 'word'>('grid');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLetterComplete = async () => {
    if (!profile || !selectedLetter) return;
    
    const isNew = !profile.completedLetters.includes(selectedLetter.char);
    if (isNew) {
      const newProfile = {
        ...profile,
        stars: profile.stars + 10,
        completedLetters: [...profile.completedLetters, selectedLetter.char]
      };
      setProfile(newProfile);
      await updateDoc(doc(db, 'users', profile.uid), {
        stars: increment(10),
        completedLetters: arrayUnion(selectedLetter.char)
      });
    }
    
    setTimeout(() => {
      setGameState('grid');
      setSelectedLetter(null);
    }, 2000);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
      />
    </div>
  );

  if (!profile) return <Login onLogin={setProfile} />;

  return (
    <div className="min-h-screen bg-[#fdfcf0] font-sans text-slate-800 overflow-hidden relative">
      {/* Background Decorations */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-pink-200/30 rounded-full blur-2xl" />

      <header className="bg-[#fef9c3] backdrop-blur-md border-b-8 border-kawaii-pink/20 p-6 sticky top-0 z-50 shadow-sm">
        {/* Header Washi Tape */}
        <div className="absolute top-0 left-1/4 w-24 h-6 washi-tape rotate-1 opacity-60 z-10 bg-[#f9f8de]" />
        <div className="absolute top-0 right-1/3 w-20 h-5 washi-tape -rotate-2 opacity-40 z-10" />
        
        <div className="max-w-5xl mx-auto flex justify-between items-center relative z-20">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ rotate: 15 }}
              className="bg-[#fccbfd] p-3 rounded-[1.5rem] shadow-lg border-4 border-white"
            >
              <Star className="w-8 h-8 text-orange-400 fill-orange-400" />
            </motion.div>
            <h1 className="font-mono text-[55px] leading-[80px] font-black text-slate-700 tracking-tight">
              字母大冒險 <span className="text-[#bb56df] border-[#f76efe]">ABC</span>
            </h1>
          </div>
          {profile && (
            <div className="flex items-center gap-6">
              <div className="bg-kawaii-blue/30 px-6 py-2 rounded-2xl border-4 border-white flex items-center gap-3 shadow-sm">
                <div className="w-8 h-8 bg-kawaii-blue rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-sm">
                  {profile.className[0]}
                </div>
                <span className="font-bold text-slate-700">{profile.name}</span>
              </div>
              <div className="flex items-center gap-2 bg-kawaii-yellow/30 px-4 py-2 rounded-2xl border-4 border-white shadow-sm">
                <Star className="w-6 h-6 text-orange-400 fill-orange-400" />
                <span className="text-2xl font-black text-slate-700">{profile.stars}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-8 relative bg-[#c0d4fc]">
        <AnimatePresence mode="wait">
          {gameState === 'grid' && (
            <motion.div 
              key="grid"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4">
                <h2 className="font-[Arial] text-[40px] font-black text-[#031d5d]">點選一個字母開始吧！</h2>
                <p className="text-[#25607a] font-bold text-[30px]">收集星星，點亮你的專屬星空 ✨</p>
              </div>

              <RewardSystem stars={profile.stars} completedLetters={profile.completedLetters} />

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-6">
                {LETTERS.map((l) => {
                  const isCompleted = profile.completedLetters.includes(l.char);
                  return (
                    <motion.button
                      key={l.char}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setSelectedLetter(l);
                        setGameState('stroke');
                      }}
                      className={cn(
                        "aspect-square rounded-3xl flex flex-col items-center justify-center border-4 transition-all relative overflow-hidden shadow-xl",
                        isCompleted 
                          ? "bg-green-500 border-green-400 text-white" 
                          : "bg-white border-slate-100 text-slate-700 hover:border-blue-300"
                      )}
                    >
                      <span className="text-4xl font-black">{l.char}</span>
                      {isCompleted && (
                        <div className="absolute top-1 right-1 bg-yellow-400 p-1 rounded-full border-2 border-white shadow-md">
                          <Star className="w-3 h-3 text-white fill-white" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {gameState === 'stroke' && selectedLetter && (
            <motion.div 
              key="stroke"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setGameState('grid')}
                  className="flex items-center gap-2 px-6 py-3 bg-white border-4 border-slate-100 hover:border-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                >
                  <ChevronLeft className="w-5 h-5" /> 返回選單
                </button>
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500 text-white px-8 py-3 rounded-2xl text-3xl font-black shadow-lg">
                    {selectedLetter.char}
                  </div>
                  <div className="h-2 w-48 bg-slate-100 rounded-full overflow-hidden border-2 border-white">
                    <motion.div 
                      className="h-full bg-green-400"
                      initial={{ width: 0 }}
                      animate={{ width: '50%' }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm p-12 rounded-[4rem] shadow-2xl border-8 border-white min-h-[600px] flex flex-col items-center justify-center relative overflow-hidden ring-8 ring-kawaii-blue/5">
                <div className="absolute top-0 left-0 w-full h-4 bg-kawaii-pink/20" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-kawaii-blue/10 -mr-16 -mb-16 rounded-full" />
                
                {/* Corner Character */}
                <div className="absolute bottom-4 right-4 w-12 h-12 bg-kawaii-yellow/40 blob flex items-center justify-center opacity-60">
                  <div className="sumikko-face w-4 h-4" />
                </div>

                <div className="space-y-8 text-center relative z-10">
                  <h3 className="text-2xl font-black text-slate-600">跟著筆順寫寫看！ ✨</h3>
                  <StrokePractice 
                    letter={selectedLetter} 
                    onComplete={() => setTimeout(() => setGameState('word'), 3000)} 
                  />
                </div>
              </div>
            </motion.div>
          )}

          {gameState === 'word' && selectedLetter && (
            <motion.div 
              key="word"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setGameState('stroke')}
                  className="flex items-center gap-2 px-6 py-3 bg-white border-4 border-slate-100 hover:border-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                >
                  <ChevronLeft className="w-5 h-5" /> 上一步
                </button>
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500 text-white px-8 py-3 rounded-2xl text-3xl font-black shadow-lg">
                    {selectedLetter.char}
                  </div>
                  <div className="h-2 w-48 bg-slate-100 rounded-full overflow-hidden border-2 border-white">
                    <motion.div 
                      className="h-full bg-green-400"
                      initial={{ width: '50%' }}
                      animate={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm p-12 rounded-[4rem] shadow-2xl border-8 border-white min-h-[600px] flex flex-col items-center justify-center relative overflow-hidden ring-8 ring-kawaii-yellow/5">
                <div className="absolute top-0 left-0 w-full h-4 bg-kawaii-blue/20" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-kawaii-pink/10 -ml-16 -mb-16 rounded-full" />
                
                {/* Corner Character */}
                <div className="absolute bottom-4 left-4 w-16 h-16 bg-kawaii-pink/30 blob flex items-center justify-center opacity-60 rotate-12">
                  <div className="sumikko-face w-5 h-5" />
                </div>

                <div className="space-y-8 text-center relative z-10">
                  <h3 className="text-2xl font-black text-slate-600">拼出正確的單字！ 🧩</h3>
                  <WordPuzzle 
                    letter={selectedLetter} 
                    onComplete={handleLetterComplete} 
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
