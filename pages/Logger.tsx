import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import Layout from '@/components/Layout';
import { db, Exercise, WorkoutSet, RPE } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Timer, History, TrendingUp, TrendingDown, Minus, Flame, Smile, Meh, Frown, Skull, Activity, Clock } from 'lucide-react';
import RestTimer from '@/components/RestTimer';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Logger() {
  const [, params] = useRoute('/logger/:exerciseId');
  const [, setLocation] = useLocation();
  const exerciseId = params?.exerciseId || '';
  
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [lastSet, setLastSet] = useState<WorkoutSet | undefined>(undefined);
  const [todaySets, setTodaySets] = useState<WorkoutSet[]>([]);
  
  // Form state
  const [weight, setWeight] = useState<string>('');
  const [reps, setReps] = useState<string>('');
  const [rpe, setRpe] = useState<RPE>('medium');
  
  // Cardio Form State
  const [duration, setDuration] = useState<string>('');
  const [cardioType, setCardioType] = useState<'low' | 'medium' | 'high'>('medium');
  
  const [showTimer, setShowTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState(90);

  useEffect(() => {
    if (exerciseId) {
      loadData();
    }
  }, [exerciseId]);

  const loadData = async () => {
    const exercises = await db.getAllExercises();
    const currentExercise = exercises.find(e => e.id === exerciseId);
    setExercise(currentExercise || null);

    // Load last set for history retrieval
    const last = await db.getLastSet(exerciseId);
    setLastSet(last);
    
    // Load today's sets
    const sets = await db.getTodaySets();
    setTodaySets(sets.filter(s => s.exerciseId === exerciseId).reverse()); // Show oldest first
    
    // Auto-fill weight from last set if available (only for strength)
    if (last && currentExercise?.bodyPart !== 'cardio') {
      setWeight(last.weight.toString());
    }
  };

  const getRestTimeByRPE = (rpeValue: RPE): number => {
    switch (rpeValue) {
      case 'warmup': return 45;
      case 'easy': return 60;
      case 'medium': return 90;
      case 'hard': return 120;
      case 'failure': return 180;
      default: return 90;
    }
  };

  const handleSave = async () => {
    if (!exercise) return;

    const isCardio = exercise.bodyPart === 'cardio';

    if (isCardio) {
      if (!duration) {
        toast.error("请输入持续时间");
        return;
      }
    } else {
      if (!weight || !reps) {
        toast.error("请输入重量和次数");
        return;
      }
    }

    const newSet: Omit<WorkoutSet, 'id'> = {
      exerciseId,
      date: new Date(),
      // For cardio, we store 0 for weight/reps to keep DB consistent, but rely on duration/cardioType
      weight: isCardio ? 0 : parseFloat(weight),
      reps: isCardio ? 0 : parseInt(reps),
      rpe: rpe,
      duration: isCardio ? parseFloat(duration) : undefined,
      cardioType: isCardio ? cardioType : undefined,
      timestamp: Date.now(),
    };

    await db.addSet(newSet);
    toast.success("记录已保存");
    
    // Refresh data
    loadData();
    
    if (!isCardio) {
      // Set timer duration based on RPE (Strength only)
      setTimerDuration(getRestTimeByRPE(rpe));
      setShowTimer(true);
      // Clear reps but keep weight
      setReps('');
    } else {
      // Clear duration for cardio
      setDuration('');
    }
  };

  const getProgressIndicator = () => {
    if (!lastSet) return null;
    if (exercise?.bodyPart === 'cardio') return null; // No simple progress for cardio yet

    const currentWeight = Number(weight);
    if (!currentWeight) return null;
    
    if (currentWeight > lastSet.weight) {
      return <div className="flex items-center text-primary text-xs font-bold uppercase tracking-wider"><TrendingUp className="w-3 h-3 mr-1" /> 进步 // UP</div>;
    } else if (currentWeight < lastSet.weight) {
      return <div className="flex items-center text-destructive text-xs font-bold uppercase tracking-wider"><TrendingDown className="w-3 h-3 mr-1" /> 退步 // DOWN</div>;
    } else {
      return <div className="flex items-center text-muted-foreground text-xs font-bold uppercase tracking-wider"><Minus className="w-3 h-3 mr-1" /> 持平 // SAME</div>;
    }
  };

  const RPE_OPTIONS: { value: RPE; label: string; icon: any; color: string; rest: string }[] = [
    { value: 'warmup', label: '热身', icon: Flame, color: 'text-yellow-500', rest: '45s' },
    { value: 'easy', label: '轻松', icon: Smile, color: 'text-green-500', rest: '60s' },
    { value: 'medium', label: '适中', icon: Meh, color: 'text-blue-500', rest: '90s' },
    { value: 'hard', label: '困难', icon: Frown, color: 'text-orange-500', rest: '120s' },
    { value: 'failure', label: '力竭', icon: Skull, color: 'text-red-600', rest: '180s' },
  ];

  const CARDIO_INTENSITY_OPTIONS: { value: 'low' | 'medium' | 'high'; label: string; color: string }[] = [
    { value: 'low', label: '低强度 (LISS)', color: 'text-green-500' },
    { value: 'medium', label: '中强度 (MISS)', color: 'text-blue-500' },
    { value: 'high', label: '高强度 (HIIT)', color: 'text-red-500' },
  ];

  if (!exercise) return <Layout>Loading...</Layout>;

  const isCardio = exercise.bodyPart === 'cardio';

  return (
    <Layout title={exercise.name}>
      <div className="space-y-6 pb-24">
        {/* Header with Back Button */}
        <div className="flex items-center gap-2 -mt-2 mb-4">
          <button 
            onClick={() => setLocation(`/exercises/${exercise.bodyPart}`)}
            className="p-2 -ml-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
            {exercise.bodyPart} WORKOUT
          </div>
        </div>

        {/* History Retrieval */}
        <Card className="bg-card/50 border-l-4 border-l-primary border-y-0 border-r-0 rounded-none p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <History className="w-16 h-16" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <History className="w-3 h-3" /> 上次成绩 // LAST ENTRY
              </div>
              {getProgressIndicator()}
            </div>
            {lastSet ? (
              <div className="flex items-baseline gap-3">
                {isCardio ? (
                  <>
                    <div className="text-3xl font-bold font-mono text-foreground">
                      {lastSet.duration}<span className="text-sm text-muted-foreground ml-1">MIN</span>
                    </div>
                    <div className="text-sm font-mono text-muted-foreground uppercase">
                      {lastSet.cardioType} INTENSITY
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold font-mono text-foreground">
                      {lastSet.weight}<span className="text-sm text-muted-foreground ml-1">KG</span>
                    </div>
                    <div className="text-xl font-mono text-muted-foreground">
                      x {lastSet.reps}<span className="text-sm ml-1">REPS</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground italic">暂无历史记录</div>
            )}
          </div>
        </Card>

        {/* Input Area */}
        <div className="space-y-4">
          {isCardio ? (
            // CARDIO FORM
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-bold uppercase tracking-widest">持续时间 (分钟)</label>
                <Input 
                  type="number" 
                  inputMode="decimal"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="h-16 text-3xl font-mono font-bold text-center bg-secondary/20 border-border focus:border-primary focus:ring-primary/20"
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-bold uppercase tracking-widest">有氧强度 // INTENSITY</label>
                <div className="grid grid-cols-3 gap-2">
                  {CARDIO_INTENSITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setCardioType(option.value)}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded border transition-all",
                        cardioType === option.value 
                          ? "bg-secondary border-primary ring-1 ring-primary" 
                          : "bg-card border-border hover:bg-secondary/50"
                      )}
                    >
                      <Activity className={cn("w-6 h-6 mb-2", option.color)} />
                      <span className="text-xs font-bold uppercase">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            // STRENGTH FORM
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-bold uppercase tracking-widest">重量 (KG)</label>
                  <Input 
                    type="number" 
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="h-16 text-3xl font-mono font-bold text-center bg-secondary/20 border-border focus:border-primary focus:ring-primary/20"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-bold uppercase tracking-widest">次数 (REPS)</label>
                  <Input 
                    type="number" 
                    inputMode="numeric"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="h-16 text-3xl font-mono font-bold text-center bg-secondary/20 border-border focus:border-primary focus:ring-primary/20"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-bold uppercase tracking-widest">训练感受 // FEELING</label>
                <div className="grid grid-cols-5 gap-1">
                  {RPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setRpe(option.value)}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded border transition-all relative overflow-hidden",
                        rpe === option.value 
                          ? "bg-secondary border-primary ring-1 ring-primary" 
                          : "bg-card border-border hover:bg-secondary/50"
                      )}
                    >
                      <option.icon className={cn("w-5 h-5 mb-1", option.color)} />
                      <span className="text-[10px] font-bold uppercase">{option.label}</span>
                      {rpe === option.value && (
                        <span className="absolute bottom-0 right-0 text-[8px] bg-primary text-black px-1 font-mono">
                          {option.rest}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <Button 
            onClick={handleSave}
            disabled={isCardio ? !duration : (!weight || !reps)}
            className="w-full h-14 text-lg font-black italic uppercase tracking-widest bg-primary text-black hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            完成本组 // FINISH SET
          </Button>
        </div>

        {/* Today's Sets */}
        <div className="space-y-2">
          <h3 className="text-xs text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full" />
            今日训练 // TODAY'S LOG
          </h3>
          {todaySets.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
              <div className="text-muted-foreground text-sm">准备开始第一组</div>
            </div>
          ) : (
            <div className="space-y-2">
              {todaySets.map((set, index) => (
                <div key={set.id || index} className="flex items-center justify-between p-3 bg-card border-l-2 border-l-muted hover:border-l-primary transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono">
                      {todaySets.length - index}
                    </div>
                    {isCardio ? (
                      <div className="font-mono flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-lg font-bold">{set.duration}</span>
                        <span className="text-xs text-muted-foreground">MIN</span>
                      </div>
                    ) : (
                      <>
                        <div className="font-mono">
                          <span className="text-lg font-bold">{set.weight}</span>
                          <span className="text-xs text-muted-foreground ml-1">KG</span>
                        </div>
                        <div className="text-muted-foreground">×</div>
                        <div className="font-mono">
                          <span className="text-lg font-bold">{set.reps}</span>
                          <span className="text-xs text-muted-foreground ml-1">REPS</span>
                        </div>
                      </>
                    )}
                  </div>
                  {isCardio ? (
                     <div className="flex items-center gap-1 px-2 py-1 rounded bg-secondary/50 text-[10px] font-bold uppercase text-muted-foreground">
                       {set.cardioType}
                     </div>
                  ) : (
                    set.rpe && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-secondary/50 text-[10px] font-bold uppercase text-muted-foreground">
                        {RPE_OPTIONS.find(o => o.value === set.rpe)?.label}
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rest Timer Overlay (Only for Strength) */}
      {showTimer && !isCardio && (
        <RestTimer 
          initialTime={timerDuration}
          onClose={() => setShowTimer(false)} 
          onComplete={() => {
            // Optional: Auto close or keep showing 00:00
          }}
        />
      )}
    </Layout>
  );
}
