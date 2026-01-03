import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Layout from '@/components/Layout';
import { db, Exercise, WorkoutSet } from '@/lib/db';
import { calculateWorkoutCalories, calculateSimpleCalories, calculateEffectiveDuration } from '@/lib/calorieCalculator';
import { Card } from '@/components/ui/card';
import { ChevronRight, Plus, Clock, Flame, Dumbbell, Share2, TrendingUp, Zap, Heart, Target } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ShareCard from '@/components/ShareCard';

const BODY_PARTS = [
  { id: 'cardio', name: '有氧', en: 'CARDIO', icon: Heart, tag: '高消耗' },
  { id: 'chest', name: '胸部', en: 'CHEST', icon: Target, tag: '大肌群' },
  { id: 'back', name: '背部', en: 'BACK', icon: Target, tag: '大肌群' },
  { id: 'legs', name: '腿部', en: 'LEGS', icon: Zap, tag: '大肌群' },
  { id: 'shoulders', name: '肩部', en: 'SHOULDERS', icon: Dumbbell, tag: '辅助' },
  { id: 'arms', name: '手臂', en: 'ARMS', icon: Dumbbell, tag: '辅助' },
  { id: 'core', name: '核心', en: 'CORE', icon: Target, tag: '稳定' },
];

// Mini Sparkline for home page
function MiniSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  
  const width = 60;
  const height = 20;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="sparkline-glow opacity-60">
      <polyline
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [todayStats, setTodayStats] = useState({
    duration: 0,
    calories: 0,
    sets: 0,
    volume: 0
  });
  const [showShare, setShowShare] = useState(false);
  const [todaySets, setTodaySets] = useState<WorkoutSet[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [weeklyCalories, setWeeklyCalories] = useState<number[]>([]);

  useEffect(() => {
    const initData = async () => {
      const exercises = await db.getAllExercises();
      setAllExercises(exercises);

      const sets = await db.getTodaySets();
      setTodaySets(sets);
      
      calculateStats(sets, exercises);
      loadWeeklyData(exercises);
    };

    initData();
  }, []);

  const loadWeeklyData = async (exercises: Exercise[]) => {
    // Get last 7 days of calories
    const weekData: number[] = [];
    const weight = parseFloat(localStorage.getItem('iron-bodyweight') || '75');
    const height = parseFloat(localStorage.getItem('iron-height') || '0');
    const age = parseFloat(localStorage.getItem('iron-age') || '0');
    const gender = (localStorage.getItem('iron-gender') || 'male') as 'male' | 'female';

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const allSets: WorkoutSet[] = [];
      for (const ex of exercises) {
        const sets = await db.getHistoryByExercise(ex.id);
        const daySets = sets.filter(s => {
          const setDate = new Date(s.date);
          setDate.setHours(0, 0, 0, 0);
          return setDate.getTime() === date.getTime();
        });
        allSets.push(...daySets);
      }
      
      if (allSets.length > 0) {
        const cal = calculateWorkoutCalories(allSets, exercises, { weight, height, age, gender });
        weekData.push(cal);
      } else {
        weekData.push(0);
      }
    }
    
    setWeeklyCalories(weekData);
  };

  const calculateStats = (sets: WorkoutSet[], exercises: Exercise[]) => {
    if (sets.length === 0) {
      setTodayStats({ duration: 0, calories: 0, sets: 0, volume: 0 });
      return;
    }

    const sortedSets = sets.sort((a, b) => a.timestamp - b.timestamp);
    const { totalDurationMinutes } = calculateEffectiveDuration(sortedSets);
    const durationMins = totalDurationMinutes;

    const weight = parseFloat(localStorage.getItem('iron-bodyweight') || '75');
    const height = parseFloat(localStorage.getItem('iron-height') || '0');
    const age = parseFloat(localStorage.getItem('iron-age') || '0');
    const gender = (localStorage.getItem('iron-gender') || 'male') as 'male' | 'female';

    let calories = 0;
    if (weight && height && age) {
      calories = calculateWorkoutCalories(sets, exercises, { weight, height, age, gender });
    } else {
      calories = calculateSimpleCalories(durationMins, weight);
    }

    // Calculate volume
    const volume = sets.reduce((sum, s) => {
      if (s.weight && s.reps) return sum + s.weight * s.reps;
      return sum;
    }, 0);

    setTodayStats({ duration: durationMins, calories, sets: sets.length, volume });
  };

  return (
    <Layout title="IRON TRACKER">
      <div className="space-y-6">
        {/* Hero Stats Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-muted-foreground font-bold flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded-full" />
              今日概览
            </h2>
            <button 
              onClick={() => {
                if (todayStats.sets === 0) {
                  toast.error("暂无训练数据", { description: "请先完成一组训练后再生成战报" });
                  return;
                }
                setShowShare(true);
              }}
              className="text-[10px] flex items-center gap-1.5 text-primary hover:text-primary/80 font-bold px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-all active:scale-95"
            >
              <Share2 className="w-3 h-3" />
              生成战报
            </button>
          </div>
          
          {/* Main Calorie Card */}
          <div className="glass-card rounded-2xl p-5 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                  <Flame className="w-3 h-3 text-primary" />
                  今日消耗
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-mono text-primary glow-text">{todayStats.calories}</span>
                  <span className="text-sm text-muted-foreground">kcal</span>
                </div>
                {weeklyCalories.length >= 2 && (
                  <div className="text-[9px] text-muted-foreground/60 mt-1">
                    本周累计 {weeklyCalories.reduce((a, b) => a + b, 0).toLocaleString()} kcal
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <MiniSparkline data={weeklyCalories} />
                <div className="text-[9px] text-muted-foreground/40">近7天趋势</div>
              </div>
            </div>
          </div>
          
          {/* Secondary Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="stat-card">
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mb-2">
                <Clock className="w-3 h-3" /> 时长
              </div>
              <div className="font-mono font-bold text-xl">
                {todayStats.duration}<span className="text-xs text-muted-foreground ml-0.5">m</span>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mb-2">
                <Dumbbell className="w-3 h-3" /> 组数
              </div>
              <div className="font-mono font-bold text-xl">
                {todayStats.sets}<span className="text-xs text-muted-foreground ml-0.5">组</span>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mb-2">
                <TrendingUp className="w-3 h-3" /> 容量
              </div>
              <div className="font-mono font-bold text-xl">
                {todayStats.volume > 1000 ? `${(todayStats.volume / 1000).toFixed(1)}k` : todayStats.volume}
                <span className="text-xs text-muted-foreground ml-0.5">kg</span>
              </div>
            </div>
          </div>
        </section>

        {/* Body Parts Grid */}
        <section>
          <h2 className="text-xs text-muted-foreground mb-4 font-bold flex items-center gap-2">
            <div className="w-1 h-4 bg-primary rounded-full" />
            部位分类
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {BODY_PARTS.map((part) => {
              const isLarge = part.id === 'cardio';
              const Icon = part.icon;
              
              return (
                <button
                  key={part.id}
                  onClick={() => setLocation(`/exercises/${part.id}`)}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border border-border/50 p-4 transition-all duration-300",
                    "hover:border-primary/40 hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.3)]",
                    "active:scale-[0.98] active:opacity-90",
                    "bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm",
                    isLarge ? 'col-span-2' : 'col-span-1'
                  )}
                >
                  {/* Glow Effect on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Background Icon */}
                  <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                    <Icon className={cn("text-primary", isLarge ? "w-24 h-24" : "w-16 h-16")} />
                  </div>

                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                        "bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110"
                      )}>
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">
                          {part.en}
                        </div>
                        <div className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                          {part.name}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground/60 px-2 py-0.5 rounded-full bg-muted/30 border border-border/30">
                        {part.tag}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Custom Plan Button */}
        <section className="pt-2">
          <button 
            onClick={() => toast.info("自定义计划功能开发中", { description: "目前请直接在各部位中添加自定义动作" })}
            className={cn(
              "w-full py-4 rounded-xl border-2 border-dashed border-muted/50",
              "text-muted-foreground hover:border-primary/50 hover:text-primary",
              "transition-all duration-300 font-bold tracking-wide",
              "flex items-center justify-center gap-2",
              "active:scale-[0.99] active:bg-primary/5",
              "hover:shadow-[0_0_20px_-10px_hsl(var(--primary)/0.3)]"
            )}
          >
            <Plus className="w-5 h-5" />
            自定义训练计划
          </button>
        </section>

        {/* Disclaimer */}
        <div className="text-center pt-4 pb-20">
          <p className="text-[9px] text-muted-foreground/30 italic">
            卡路里为估算值，已区分做组与休息时间
          </p>
        </div>

        {/* Share Modal */}
        {showShare && (
          <ShareCard 
            stats={todayStats}
            todaySets={todaySets}
            exercises={allExercises}
            onClose={() => setShowShare(false)}
          />
        )}
      </div>
    </Layout>
  );
}
