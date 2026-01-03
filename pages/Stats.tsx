import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, Exercise, WorkoutSet } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, Dumbbell, Scale, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface WeightRecord {
  date: string;
  weight: number;
}

export default function Stats() {
  const [activeTab, setActiveTab] = useState<'strength' | 'bodyweight'>('strength');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [history, setHistory] = useState<WorkoutSet[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightRecord[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [stats, setStats] = useState({
    totalSets: 0,
    maxWeight: 0,
    totalVolume: 0,
  });

  useEffect(() => {
    db.getAllExercises().then(exs => {
      setExercises(exs);
      // Default to Bench Press if available, or first exercise
      if (exs.length > 0) {
        setSelectedExerciseId('bench-press');
      }
    });
    loadWeightHistory();
  }, []);

  const loadWeightHistory = () => {
    const saved = localStorage.getItem('iron-weight-history');
    if (saved) {
      setWeightHistory(JSON.parse(saved));
    }
  };

  const handleAddWeight = () => {
    if (!newWeight) return;
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) return;

    const record = {
      date: new Date().toISOString(),
      weight
    };

    const updated = [...weightHistory, record].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setWeightHistory(updated);
    localStorage.setItem('iron-weight-history', JSON.stringify(updated));
    localStorage.setItem('iron-bodyweight', weight.toString()); // Update current weight
    setNewWeight('');
    toast.success('体重记录已添加');
  };

  useEffect(() => {
    if (selectedExerciseId) {
      loadHistory(selectedExerciseId);
    }
  }, [selectedExerciseId]);

  const loadHistory = async (id: string) => {
    const data = await db.getHistoryByExercise(id);
    // Sort by date ascending for chart
    const sortedData = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
    setHistory(sortedData);

    // Calculate stats
    if (data.length > 0) {
      const maxW = Math.max(...data.map(s => s.weight));
      const totalS = data.length;
      const totalV = data.reduce((acc, curr) => acc + (curr.weight * curr.reps), 0);
      setStats({
        totalSets: totalS,
        maxWeight: maxW,
        totalVolume: totalV,
      });
    } else {
      setStats({ totalSets: 0, maxWeight: 0, totalVolume: 0 });
    }
  };

  // Prepare chart data - group by date and take max weight of the day
  const chartData = history.reduce((acc: any[], curr) => {
    const dateStr = new Date(curr.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
    const existing = acc.find(item => item.date === dateStr);
    
    if (existing) {
      if (curr.weight > existing.weight) {
        existing.weight = curr.weight;
      }
    } else {
      acc.push({ date: dateStr, weight: curr.weight });
    }
    return acc;
  }, []);

  const weightChartData = weightHistory.map(r => ({
    date: new Date(r.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
    weight: r.weight
  }));

  return (
    <Layout title="进度分析">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-secondary/20 rounded-lg">
          <button
            onClick={() => setActiveTab('strength')}
            className={`py-2 text-xs font-bold rounded transition-all ${activeTab === 'strength' ? 'bg-primary text-black shadow' : 'text-muted-foreground hover:text-white'}`}
          >
            力量进度
          </button>
          <button
            onClick={() => setActiveTab('bodyweight')}
            className={`py-2 text-xs font-bold rounded transition-all ${activeTab === 'bodyweight' ? 'bg-primary text-black shadow' : 'text-muted-foreground hover:text-white'}`}
          >
            体重记录
          </button>
        </div>

        {activeTab === 'strength' ? (
          <>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-bold">选择动作</label>
              <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
                <SelectTrigger className="w-full bg-card border-border h-12 font-bold">
                  <SelectValue placeholder="选择动作" />
                </SelectTrigger>
                <SelectContent>
                  {exercises.map(ex => (
                    <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Key Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 bg-card border-border flex flex-col items-center justify-center text-center">
                <div className="text-xs text-muted-foreground mb-1">最大重量</div>
                <div className="text-xl font-bold font-mono text-primary">{stats.maxWeight}<span className="text-xs ml-1 text-muted-foreground">KG</span></div>
              </Card>
              <Card className="p-3 bg-card border-border flex flex-col items-center justify-center text-center">
                <div className="text-xs text-muted-foreground mb-1">总组数</div>
                <div className="text-xl font-bold font-mono">{stats.totalSets}</div>
              </Card>
              <Card className="p-3 bg-card border-border flex flex-col items-center justify-center text-center">
                <div className="text-xs text-muted-foreground mb-1">总容量</div>
                <div className="text-xl font-bold font-mono text-xs">{stats.totalVolume > 1000 ? `${(stats.totalVolume/1000).toFixed(1)}k` : stats.totalVolume}</div>
              </Card>
            </div>

            {/* Chart */}
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs text-muted-foreground font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  力量趋势
                </h3>
              </div>
              
              <div className="h-[200px] w-full">
                {chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#666" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <YAxis 
                        stroke="#666" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        domain={['dataMin - 5', 'dataMax + 5']}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333', borderRadius: '0px' }}
                        itemStyle={{ color: '#CCFF00', fontFamily: 'monospace' }}
                        labelStyle={{ color: '#888', marginBottom: '5px' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#CCFF00" 
                        strokeWidth={3} 
                        dot={{ fill: '#121212', stroke: '#CCFF00', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#CCFF00' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50">
                    <Dumbbell className="w-8 h-8 mb-2 opacity-20" />
                    <div className="text-xs">需要更多数据来生成图表</div>
                  </div>
                )}
              </div>
            </Card>

            {/* Recent History List */}
            <div className="space-y-2">
              <h3 className="text-xs text-muted-foreground font-bold mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                历史记录
              </h3>
              <div className="space-y-2">
                {history.slice(0, 5).map((set, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-card border-l-2 border-l-muted hover:border-l-primary transition-colors text-sm">
                    <div className="text-muted-foreground font-mono">
                      {new Date(set.date).toLocaleDateString()}
                    </div>
                    <div className="font-mono font-bold">
                      {set.weight}KG <span className="text-muted-foreground mx-1">x</span> {set.reps}
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-xs">暂无记录</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Bodyweight Section */}
            <Card className="p-4 bg-card border-border">
              <div className="flex gap-2 mb-4">
                <Input 
                  type="number" 
                  placeholder="输入今日体重 (KG)" 
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="bg-secondary/20 border-border font-mono"
                />
                <Button onClick={handleAddWeight} className="bg-primary text-black font-bold shrink-0">
                  <Plus className="w-4 h-4 mr-1" /> 记录
                </Button>
              </div>

              <div className="h-[250px] w-full mt-6">
                {weightChartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#666" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <YAxis 
                        stroke="#666" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        domain={['dataMin - 2', 'dataMax + 2']}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333', borderRadius: '0px' }}
                        itemStyle={{ color: '#CCFF00', fontFamily: 'monospace' }}
                        labelStyle={{ color: '#888', marginBottom: '5px' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#CCFF00" 
                        strokeWidth={3} 
                        dot={{ fill: '#121212', stroke: '#CCFF00', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#CCFF00' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50">
                    <Scale className="w-8 h-8 mb-2 opacity-20" />
                    <div className="text-xs">记录至少两次体重以生成趋势图</div>
                  </div>
                )}
              </div>
            </Card>

            <div className="space-y-2">
              <h3 className="text-xs text-muted-foreground font-bold mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                体重记录
              </h3>
              <div className="space-y-2">
                {[...weightHistory].reverse().slice(0, 10).map((record, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-card border-l-2 border-l-muted hover:border-l-primary transition-colors text-sm">
                    <div className="text-muted-foreground font-mono">
                      {new Date(record.date).toLocaleDateString()}
                    </div>
                    <div className="font-mono font-bold">
                      {record.weight}KG
                    </div>
                  </div>
                ))}
                {weightHistory.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-xs">暂无记录</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
