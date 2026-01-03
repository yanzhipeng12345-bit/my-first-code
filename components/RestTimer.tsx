import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Clock, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestTimerProps {
  initialTime?: number;
  onComplete?: () => void;
  onClose: () => void;
}

export default function RestTimer({ initialTime = 90, onComplete, onClose }: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [totalRestTime, setTotalRestTime] = useState(initialTime);
  const [isPaused, setIsPaused] = useState(false);
  
  // Use refs for values needed in intervals/timeouts to avoid dependency loops
  const endTimeRef = useRef<number>(Date.now() + initialTime * 1000);
  const timeLeftRef = useRef<number>(initialTime);
  const totalRestTimeRef = useRef<number>(initialTime);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Request Wake Lock
    requestWakeLock();
    
    // Start timer
    startTimer();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      releaseWakeLock();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('Wake Lock active');
      }
    } catch (err) {
      console.error('Wake Lock failed:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.error('Wake Lock release failed:', err);
      }
    }
  };

  const playBeep = (type: 'warning' | 'finish' = 'finish') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      // Create context if not exists or closed
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
      }
      
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      
      if (type === 'warning') {
        // Short blip for 3, 2, 1
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else {
        // Finish sound: High-Low-High
        osc.type = 'square';
        
        // Note 1
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.1, now);
        
        // Note 2
        osc.frequency.setValueAtTime(440, now + 0.1);
        
        // Note 3
        osc.frequency.setValueAtTime(880, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  const sendNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('休息结束！', {
          body: '下一组训练开始，加油！',
          icon: '/favicon.ico', // Assuming favicon exists
          // vibrate property is not standard in NotificationOptions type but supported in some browsers
          // @ts-ignore
          vibrate: [500, 200, 500]
        });
      } catch (e) {
        console.error("Notification failed", e);
      }
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Reset end time based on current remaining time
    endTimeRef.current = Date.now() + timeLeftRef.current * 1000;
    
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const diff = endTimeRef.current - now;
      const secondsLeft = Math.ceil(diff / 1000);
      
      if (secondsLeft > 0) {
        // Normal countdown
        if (secondsLeft !== timeLeftRef.current) {
          timeLeftRef.current = secondsLeft;
          setTimeLeft(secondsLeft);
          
          // Warning beeps at 3, 2, 1
          if (secondsLeft <= 3) {
            playBeep('warning');
          }
        }
      } else {
        // Overtime counting
        if (timeLeftRef.current > 0) {
          // Just finished
          timeLeftRef.current = 0;
          setTimeLeft(0);
          playBeep('finish');
          if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
          sendNotification();
          onComplete?.();
        }
        
        // Calculate total rest time (initial time + overtime)
        const secondsOver = Math.abs(Math.floor(diff / 1000));
        const currentTotal = initialTime + secondsOver;
        
        if (currentTotal !== totalRestTimeRef.current) {
          totalRestTimeRef.current = currentTotal;
          setTotalRestTime(currentTotal);
        }
      }
    }, 200);
  };

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      startTimer();
    } else {
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const adjustTimer = (seconds: number) => {
    if (timeLeftRef.current === 0) return; // Don't adjust if already finished
    const newTime = Math.max(0, timeLeftRef.current + seconds);
    timeLeftRef.current = newTime;
    setTimeLeft(newTime);
    
    // If running, update end time target
    if (!isPaused) {
      endTimeRef.current = Date.now() + newTime * 1000;
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = Math.max(0, Math.min(100, (timeLeft / initialTime) * 100));
  const isOvertime = timeLeft === 0;
  const overtimeSeconds = totalRestTime - initialTime;

  return (
    <div className={cn(
      "fixed bottom-16 left-0 right-0 z-50 animate-in slide-in-from-bottom-full duration-300",
    )}>
      {/* Progress Bar Background */}
      <div className="h-1 w-full bg-secondary">
        <div 
          className="h-full bg-primary transition-all duration-200 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className={cn(
        "bg-card border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-4 transition-colors duration-500",
      )}>
        <div className="container max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", isPaused ? "bg-yellow-500" : isOvertime ? "bg-primary" : "bg-primary animate-pulse")} />
              <span className={cn("text-xs uppercase tracking-widest", isOvertime ? "text-primary font-bold" : "text-muted-foreground")}>
                {isOvertime ? '休息结束 // TIME UP' : isPaused ? '已暂停 // PAUSED' : '休息中 // RESTING'}
              </span>
            </div>
            <button onClick={onClose} className={cn("p-1", isOvertime ? "text-primary hover:text-primary/70" : "text-muted-foreground hover:text-foreground")}>
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => adjustTimer(-30)} 
              disabled={isOvertime}
              className={cn(
                "h-14 w-14 rounded-none border-border hover:border-primary hover:text-primary active:scale-95 transition-transform disabled:opacity-50",
                isOvertime && "border-primary/20 text-primary/50"
              )}
            >
              <span className="text-xs font-bold">-30s</span>
            </Button>
            
            <div 
              onClick={togglePause}
              className={cn(
                "flex-1 h-14 flex flex-col items-center justify-center bg-secondary/30 border border-border hover:border-primary/50 cursor-pointer transition-colors relative overflow-hidden",
                isOvertime && "bg-primary/10 border-primary/30"
              )}
            >
              <div className="flex items-baseline gap-1">
                <div className={cn("text-5xl font-mono font-bold tabular-nums tracking-tighter leading-none", isOvertime && "text-primary scale-110 transition-transform")}>
                  {isOvertime ? formatTime(totalRestTime) : formatTime(timeLeft)}
                </div>
                {isOvertime && (
                  <div className="text-xs font-mono text-primary/60 animate-in fade-in slide-in-from-bottom-2">
                    +{formatTime(overtimeSeconds)}
                  </div>
                )}
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => adjustTimer(30)} 
              disabled={isOvertime}
              className={cn(
                "h-14 w-14 rounded-none border-border hover:border-primary hover:text-primary active:scale-95 transition-transform disabled:opacity-50",
                isOvertime && "border-primary/20 text-primary/50"
              )}
            >
              <span className="text-xs font-bold">+30s</span>
            </Button>
          </div>
          
          {/* Status Text Area - Separated from timer display */}
          <div className="mt-2 flex justify-center h-6">
             <div className={cn(
               "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300",
               isOvertime ? "text-primary" : "text-muted-foreground"
             )}>
               {isOvertime ? (
                 <>
                   <Clock className="w-3 h-3" />
                   <span>总休息时长 (含超时)</span>
                 </>
               ) : (
                 <>
                   <Timer className="w-3 h-3" />
                   <span>目标休息时间</span>
                 </>
               )}
             </div>
          </div>
          
          <div className="mt-2">
            <Button 
              onClick={onClose}
              className={cn(
                "w-full bg-secondary hover:bg-primary hover:text-black text-secondary-foreground font-bold uppercase tracking-widest h-12",
                isOvertime && "bg-primary text-black hover:bg-primary/90"
              )}
            >
              {isOvertime ? '结束休息 // FINISH' : '结束休息 // FINISH'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
