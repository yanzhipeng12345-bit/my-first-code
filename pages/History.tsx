import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { db, WorkoutSet, Exercise, RPE } from '@/lib/db';
import { calculateWorkoutCalories, calculateWorkoutCaloriesDetailed, calculateSimpleCalories, calculateEffectiveDuration, CalorieBreakdown } from '@/lib/calorieCalculator';
import { Card } from '@/components/ui/card';
import { Calendar, Dumbbell, Flame, Smile, Meh, Frown, Skull, AlertTriangle, Clock, Share2, Filter, X, Trash2, ChevronRight, MoreVertical, Edit2, Copy, TrendingUp } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ShareCard from '@/components/ShareCard';

const RPE_OPTIONS: { value: RPE; label: string; icon: any; color: string; dotColor: string }[] = [
  { value: 'warmup', label: '热身', icon: Flame, color: 'text-yellow-500', dotColor: 'bg-yellow-500' },
  { value: 'easy', label: '轻松', icon: Smile, color: 'text-emerald-400', dotColor: 'bg-emerald-400' },
  { value: 'medium', label: '适中', icon: Meh, color: 'text-cyan-400', dotColor: 'bg-cyan-400' },
  { value: 'hard', label: '困难', icon: Frown, color: 'text-orange-400', dotColor: 'bg-orange-400' },
  { value: 'failure', label: '力竭', icon: Skull, color: 'text-red-500', dotColor: 'bg-red-500' },
];

interface DailyStats {
  duration: number;
  calories: number;
  sets: number;
  volume?: number;
  isPostEditDetected?: boolean;
  calorieBreakdown?: CalorieBreakdown[];
}

interface DailyHistory {
  dateStr: string;
  rawDate: Date;
  stats: DailyStats;
  exercises: { name: string, sets: WorkoutSet[], exerciseId: string }[];
  allSets: WorkoutSet[];
}

// Bottom Sheet Component
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onCopy?: () => void;
  title: string;
}

function BottomSheet({ isOpen, onClose, onEdit, onDelete, onCopy, title }: BottomSheetProps) {
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className={cn(
        "fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-card/95 backdrop-blur-xl border-t border-primary/20 p-4 pb-8 transition-transform duration-300",
        isOpen ? "translate-y-0" : "translate-y-full"
      )}>
        {/* Handle */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
        
        <div className="text-sm font-bold text-center mb-4 text-muted-foreground">{title}</div>
        
        <div className="space-y-2">
          {onCopy && (
            <button 
              onClick={() => { onCopy(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <Copy className="w-5 h-5 text-primary" />
              <span className="font-medium">复制到今天</span>
            </button>
          )}
          {onEdit && (
            <button 
              onClick={() => { onEdit(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <Edit2 className="w-5 h-5 text-cyan-400" />
              <span className="font-medium">编辑</span>
            </button>
          )}
          <button 
            onClick={() => { onDelete(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors text-red-400"
          >
            <Trash2 className="w-5 h-5" />
            <span className="font-medium">删除</span>
          </button>
        </div>
        
        <button 
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-muted/50 text-muted-foreground font-medium hover:bg-muted transition-colors"
        >
          取消
        </button>
      </div>
    </>
  );
}

// Capsule Set Display
interface CapsuleSetProps {
  set: WorkoutSet;
  isCardio: boolean;
  onClick: () => void;
}

function CapsuleSet({ set, isCardio, onClick }: CapsuleSetProps) {
  const rpeOption = set.rpe ? RPE_OPTIONS.find(o => o.value === set.rpe) : null;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "capsule group hover:scale-105 transition-all duration-200",
        rpeOption && "border-l-2",
        rpeOption?.dotColor.replace('bg-', 'border-')
      )}
    >
      {isCardio ? (
        <span className="font-mono text-[11px]">{set.duration}<span className="text-muted-foreground/60 ml-0.5">m</span></span>
      ) : (
        <span className="font-mono text-[11px]">
          <span className="text-foreground">{set.weight}</span>
          <span className="text-muted-foreground/40 mx-0.5">×</span>
          <span className="text-foreground">{set.reps}</span>
        </span>
      )}
    </button>
  );
}

// Premium Exercise Card Component
interface ExerciseCardProps {
  exerciseGroup: { name: string; sets: WorkoutSet[]; exerciseId: string };
  allExercises: Exercise[];
  dateStr: string;
  onDeleteSet: (set: WorkoutSet) => void;
}

function ExerciseCard({ exerciseGroup, allExercises, dateStr, onDeleteSet }: ExerciseCardProps) {
  const [selectedSet, setSelectedSet] = useState<WorkoutSet | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isCardio = allExercises.find(e => e.id === exerciseGroup.exerciseId)?.bodyPart === 'cardio';
  const sortedSets = [...exerciseGroup.sets].sort((a, b) => a.timestamp - b.timestamp);
  const maxWeight = isCardio ? 0 : Math.max(...sortedSets.map(s => s.weight || 0));
  const totalDuration = isCardio ? sortedSets.reduce((sum, s) => sum + (s.duration || 0), 0) : 0;
  const totalVolume = isCardio ? 0 : sortedSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);

  const handleSetClick = (set: WorkoutSet) => {
    setSelectedSet(set);
    setShowBottomSheet(true);
  };

  const handleDelete = async () => {
    if (!selectedSet) return;
    setIsDeleting(true);
    setTimeout(() => {
      onDeleteSet(selectedSet);
      setSelectedSet(null);
      setIsDeleting(false);
    }, 300);
  };

  if (isDeleting) {
    return <div className="glass-card rounded-xl h-16 animate-pulse opacity-50" />;
  }

  return (
    <>
      <div className="glass-card rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm truncate">{exerciseGroup.name}</h4>
              <div className="text-[10px] text-muted-foreground font-mono">
                {isCardio ? (
                  <span>{totalDuration} 分钟</span>
                ) : (
                  <span>{sortedSets.length} 组 · {maxWeight}kg · {totalVolume.toLocaleString()}kg</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Menu Button */}
          <button 
            onClick={() => { setSelectedSet(sortedSets[0]); setShowBottomSheet(true); }}
            className="menu-dots"
          >
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Capsule Sets - Horizontal Flow */}
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {sortedSets.map((set, k) => (
            <CapsuleSet
              key={set.id || k}
              set={set}
              isCardio={!!isCardio}
              onClick={() => handleSetClick(set)}
            />
          ))}
        </div>
      </div>

      {/* Bottom Sheet */}
      <BottomSheet
        isOpen={showBottomSheet}
        onClose={() => { setShowBottomSheet(false); setSelectedSet(null); }}
        onDelete={handleDelete}
        title={selectedSet ? `${exerciseGroup.name} - ${isCardio ? `${selectedSet.duration}分钟` : `${selectedSet.weight}kg × ${selectedSet.reps}`}` : ''}
      />
    </>
  );
}

// Mini Sparkline Component
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
}

function Sparkline({ data, width = 120, height = 32 }: SparklineProps) {
  if (data.length < 2) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  
  const lastValue = data[data.length - 1];
  const prevValue = data[data.length - 2];
  const trend = lastValue >= prevValue ? 'up' : 'down';
  
  return (
    <div className="relative">
      <svg width={width} height={height} className="sparkline-glow">
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {/* End dot */}
        <circle
          cx={(data.length - 1) / (data.length - 1) * width}
          cy={height - ((lastValue - min) / range) * (height - 4) - 2}
          r="3"
          fill="hsl(var(--primary))"
          className="animate-pulse"
        />
      </svg>
    </div>
  );
}

export default function HistoryPage() {
  const [history, setHistory] = useState<DailyHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<DailyHistory[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<DailyHistory | null>(null);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [weeklyVolume, setWeeklyVolume] = useState<number[]>([]);

  useEffect(() => {
    loadHistory();
    
    // Scroll listener for sticky header
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setFilteredHistory(history.filter(h => h.dateStr === selectedDate));
    } else {
      setFilteredHistory(history);
    }
  }, [selectedDate, history]);

  const loadHistory = async () => {
    const exercises = await db.getAllExercises();
    setAllExercises(exercises);
    
    const allSets: (WorkoutSet & { exerciseName: string })[] = [];
    
    for (const ex of exercises) {
      const sets = await db.getHistoryByExercise(ex.id);
      sets.forEach(s => {
        allSets.push({
          ...s,
          exerciseName: ex.name
        });
      });
    }
    
    allSets.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    const grouped: Record<string, (WorkoutSet & { exerciseName: string })[]> = {};
    allSets.forEach(set => {
      const dateStr = new Date(set.date).toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      });
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(set);
    });
    
    const processedHistory: DailyHistory[] = Object.entries(grouped).map(([dateStr, sets]) => {
      const sortedSets = [...sets].sort((a, b) => a.timestamp - b.timestamp);
      const { totalDurationMinutes, isPostEditDetected } = calculateEffectiveDuration(sortedSets);
      const durationMins = totalDurationMinutes;

      const weight = parseFloat(localStorage.getItem('iron-bodyweight') || '75');
      const height = parseFloat(localStorage.getItem('iron-height') || '0');
      const age = parseFloat(localStorage.getItem('iron-age') || '0');
      const gender = (localStorage.getItem('iron-gender') || 'male') as 'male' | 'female';

      let calories = 0;
      let calorieBreakdown: CalorieBreakdown[] = [];
      if (weight) {
        const result = calculateWorkoutCaloriesDetailed(sets, exercises, { weight, height, age, gender });
        calories = result.totalCalories;
        calorieBreakdown = result.breakdown;
      } else {
        calories = calculateSimpleCalories(durationMins, 75);
      }

      // Calculate volume
      const volume = sets.reduce((sum, s) => {
        if (s.weight && s.reps) {
          return sum + s.weight * s.reps;
        }
        return sum;
      }, 0);

      const exerciseGroups: Record<string, { name: string, sets: WorkoutSet[], exerciseId: string }> = {};
      sets.forEach(set => {
        if (!exerciseGroups[set.exerciseId]) {
          exerciseGroups[set.exerciseId] = {
            name: set.exerciseName,
            sets: [],
            exerciseId: set.exerciseId
          };
        }
        exerciseGroups[set.exerciseId].sets.push(set);
      });

      const groupedExercises = Object.values(exerciseGroups).sort((a, b) => {
        const maxTimeA = Math.max(...a.sets.map(s => s.timestamp));
        const maxTimeB = Math.max(...b.sets.map(s => s.timestamp));
        return maxTimeB - maxTimeA;
      });

      return {
        dateStr,
        rawDate: sets[0].date,
        stats: {
          duration: durationMins,
          calories,
          sets: sets.length,
          volume,
          isPostEditDetected,
          calorieBreakdown
        },
        exercises: groupedExercises,
        allSets: sets
      };
    });
    
    setHistory(processedHistory);
    
    // Calculate weekly volume for sparkline
    const last7Days = processedHistory.slice(0, 7).reverse();
    setWeeklyVolume(last7Days.map(d => d.stats.volume || 0));
  };

  const handleDeleteSet = async (set: WorkoutSet) => {
    if (!set.id) return;
    try {
      await db.deleteSet(set.id);
      toast.success('已删除');
      loadHistory();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('删除失败');
    }
  };

  // Calculate totals for header
  const todayStats = history[0]?.stats || { duration: 0, calories: 0, sets: 0, volume: 0 };

  return (
    <Layout title="训练日志">
      <div className="space-y-4 pb-24">
        {/* Sticky Header with Stats */}
        <div className={cn(
          "sticky top-0 z-30 -mx-4 px-4 py-3 transition-all duration-300",
          isScrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg" : "bg-transparent"
        )}>
          {/* Filter Bar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Filter className="w-3 h-3" />
              {selectedDate ? '筛选结果' : '全部记录'}
            </div>
            
            {selectedDate ? (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedDate(null)}
                className="h-7 px-2 text-xs"
              >
                <X className="w-3 h-3 mr-1" /> 清除
              </Button>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50">
                    按日期筛选
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 glass-card" align="end">
                  <div className="max-h-60 overflow-y-auto p-1">
                    {history.map((day) => (
                      <div 
                        key={day.dateStr}
                        onClick={() => setSelectedDate(day.dateStr)}
                        className="px-3 py-2 hover:bg-primary/10 cursor-pointer text-xs rounded-lg flex items-center justify-between gap-3 transition-colors"
                      >
                        <span>{day.dateStr}</span>
                        <span className="text-[10px] text-primary font-mono">{day.stats.sets}组</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Weekly Volume Sparkline */}
          {weeklyVolume.length >= 2 && !isScrolled && (
            <div className="glass-card rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    近7天训练容量
                  </div>
                  <div className="font-mono font-bold text-lg text-primary glow-text">
                    {weeklyVolume.reduce((a, b) => a + b, 0).toLocaleString()} kg
                  </div>
                </div>
                <Sparkline data={weeklyVolume} />
              </div>
            </div>
          )}
        </div>

        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
            <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="text-sm font-bold uppercase tracking-widest">暂无记录</div>
            <div className="text-[10px] mt-1">开始你的第一次训练吧</div>
          </div>
        ) : (
          filteredHistory.map((day, i) => (
            <div key={i} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-xs text-primary font-bold flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {day.dateStr}
                </h3>
                <button 
                  onClick={() => setShareTarget(day)}
                  className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors font-medium px-2 py-1 rounded-lg hover:bg-primary/10"
                >
                  <Share2 className="w-3 h-3" />
                  战报
                </button>
              </div>
              
              {/* Daily Stats - Premium Glass Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="stat-card">
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1">
                    <Clock className="w-3 h-3" /> 时长
                  </div>
                  <div className={cn(
                    "font-mono font-bold text-lg number-transition",
                    isScrolled && "text-sm"
                  )}>
                    {day.stats.duration}<span className="text-xs text-muted-foreground">m</span>
                  </div>
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="stat-card highlight cursor-pointer hover:scale-[1.02] transition-transform">
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1">
                        <Flame className="w-3 h-3" /> 消耗
                      </div>
                      <div className={cn(
                        "font-mono font-bold text-lg text-primary glow-text number-transition",
                        isScrolled && "text-sm"
                      )}>
                        {day.stats.calories}
                      </div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 glass-card" align="center">
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-foreground flex items-center gap-2">
                        <Flame className="w-4 h-4 text-primary" />
                        热量明细
                      </div>
                      {day.stats.calorieBreakdown && day.stats.calorieBreakdown.length > 0 ? (
                        <>
                          {day.stats.calorieBreakdown.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-border/30 last:border-0">
                              <span className="text-muted-foreground truncate max-w-[120px]">{item.exerciseName}</span>
                              <span className="font-mono text-foreground">{Math.round(item.totalCalories)} kcal</span>
                            </div>
                          ))}
                          <div className="pt-2 flex items-center justify-between text-xs font-bold">
                            <span>总计</span>
                            <span className="font-mono text-primary">{day.stats.calories} kcal</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-[11px] text-muted-foreground">暂无明细</div>
                      )}
                      <div className="text-[9px] text-muted-foreground/50 italic pt-2 border-t border-border/30">
                        卡路里为估算值，已区分做组与休息时间
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                
                <div className="stat-card">
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1">
                    <Dumbbell className="w-3 h-3" /> 容量
                  </div>
                  <div className={cn(
                    "font-mono font-bold text-lg number-transition",
                    isScrolled && "text-sm"
                  )}>
                    {day.stats.sets}<span className="text-xs text-muted-foreground">组</span>
                  </div>
                </div>
              </div>

              {/* Exercises List */}
              <div className="space-y-2">
                {day.exercises.map((exGroup, j) => (
                  <ExerciseCard
                    key={j}
                    exerciseGroup={exGroup}
                    allExercises={allExercises}
                    dateStr={day.dateStr}
                    onDeleteSet={handleDeleteSet}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        
        {/* Disclaimer */}
        {history.length > 0 && (
          <div className="mt-8 mb-4 px-4 text-center">
            <p className="text-[9px] text-muted-foreground/30 italic">
              卡路里为估算值，已区分做组与休息时间
            </p>
          </div>
        )}
      </div>

      {/* Share Card Modal */}
      {shareTarget && (
        <ShareCard 
          stats={shareTarget.stats}
          todaySets={shareTarget.allSets}
          exercises={allExercises}
          onClose={() => setShareTarget(null)}
        />
      )}
    </Layout>
  );
}
