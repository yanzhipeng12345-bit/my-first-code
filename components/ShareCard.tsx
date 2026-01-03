import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Share2 } from 'lucide-react';
import { WorkoutSet, Exercise } from '@/lib/db';

interface ShareCardProps {
  stats: {
    duration: number;
    calories: number;
    sets: number;
  };
  todaySets: WorkoutSet[];
  exercises: Exercise[];
  onClose: () => void;
}

export default function ShareCard({ stats, todaySets, exercises, onClose }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Group sets by exercise
  const groupedSets = todaySets.reduce((acc, set) => {
    if (!acc[set.exerciseId]) {
      acc[set.exerciseId] = [];
    }
    acc[set.exerciseId].push(set);
    return acc;
  }, {} as Record<string, WorkoutSet[]>);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center bg-black/90 p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md space-y-4 my-auto">
        {/* Top Actions Bar - Hidden in Preview Mode */}
        {!isPreviewMode && (
          <div className="flex flex-col gap-3 sticky top-0 z-50 pb-2 w-full">
            <div className="flex gap-3">
              <Button 
                onClick={() => setIsPreviewMode(true)} 
                className="flex-1 h-12 text-base font-bold bg-primary text-black hover:bg-primary/90 shadow-lg"
              >
                <span className="flex items-center gap-2">
                  <Share2 className="w-5 h-5" /> 全屏截图分享
                </span>
              </Button>
              <Button variant="outline" size="icon" onClick={onClose} className="h-12 w-12 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white">
                <X className="w-6 h-6" />
              </Button>
            </div>
            <div className="text-center text-xs text-zinc-500">
              点击上方按钮进入全屏模式，然后使用手机截图保存
            </div>
          </div>
        )}

        {/* Preview Mode Exit Overlay */}
        {isPreviewMode && (
          <div 
            className="fixed inset-0 z-[60] cursor-pointer"
            onClick={() => setIsPreviewMode(false)}
          >
            <div className="absolute top-8 left-0 right-0 text-center text-zinc-500 text-xs animate-pulse">
              点击任意处退出全屏
            </div>
          </div>
        )}

        {/* The Card to Capture - Compact Single Screen Layout */}
        <div 
          ref={cardRef} 
          className={`bg-[#121212] text-white p-4 rounded-lg shadow-2xl relative overflow-hidden w-full transition-transform origin-center ${isPreviewMode ? 'my-auto flex flex-col' : ''}`}
          style={isPreviewMode ? {
            maxHeight: '85vh',
            // Flexbox layout ensures content fits within viewport
          } : {}}
        >
          {/* Stats Grid - Compact Header */}
          <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
            <div className="text-center p-1.5 bg-zinc-900/50 rounded flex items-center justify-center gap-2">
              <div className="text-xs text-zinc-500">时长</div>
              <div className="text-lg font-bold font-mono leading-none">{stats.duration}<span className="text-[10px] text-zinc-500 ml-0.5 font-normal">分</span></div>
            </div>
            <div className="text-center p-1.5 bg-zinc-900/50 rounded flex items-center justify-center gap-2">
              <div className="text-xs text-zinc-500">消耗</div>
              <div className="text-lg font-bold font-mono leading-none text-orange-500">{stats.calories}<span className="text-[10px] text-orange-500/70 ml-0.5 font-normal">千卡</span></div>
            </div>
          </div>

          {/* Workout List - Maximized Space */}
          <div className="space-y-1 mb-3 flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="text-[10px] text-zinc-500 font-bold border-l-2 border-primary pl-2 mb-1 shrink-0 uppercase tracking-wider">
              WORKOUT LOG
            </div>
            
            {/* Use flex-shrink to allow list to compress if needed */}
            <div className="divide-y divide-zinc-800/50 overflow-y-auto pr-1 flex-1 min-h-0">
              {Object.entries(groupedSets).map(([exId, sets]) => {
                const exercise = exercises.find(e => e.id === exId);
                if (!exercise) return null;
                
                const isCardio = exercise.bodyPart === 'cardio';
                const maxWeight = Math.max(...sets.map(s => s.weight));
                const totalDuration = sets.reduce((acc, s) => acc + (s.duration || 0), 0);

                return (
                  <div key={exId} className="py-1.5 border-b border-zinc-800/30 last:border-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="font-bold text-xs text-zinc-200 truncate max-w-[70%]">{exercise.name}</div>
                      {isCardio ? (
                        <div className="text-primary font-bold font-mono text-xs">{totalDuration}MIN <span className="text-[10px] text-zinc-500 font-normal">TOTAL</span></div>
                      ) : (
                        <div className="text-primary font-bold font-mono text-xs">{maxWeight}KG <span className="text-[10px] text-zinc-500 font-normal">MAX</span></div>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 leading-tight truncate opacity-80">
                      {sets.map((s, i) => (
                        <span key={i} className={i === sets.length - 1 ? "" : "mr-2"}>
                          {isCardio ? (
                            `${s.duration}m(${s.cardioType === 'low' ? '低' : s.cardioType === 'high' ? '高' : '中'})`
                          ) : (
                            `${s.weight}x${s.reps}`
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer - Moved App Name & Date Here */}
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-zinc-600 shrink-0 mt-auto">
            <div>
              <div className="text-sm font-bold text-primary italic tracking-tighter leading-none">IRON TRACKER</div>
              <div className="text-[9px] text-zinc-500 mt-0.5">力量训练记录</div>
            </div>
            <div className="text-right">
               <div className="text-[10px] font-mono text-zinc-400">{new Date().toLocaleDateString()}</div>
               <div className="text-[9px] text-zinc-600 mt-0.5">MANUS.SPACE</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
