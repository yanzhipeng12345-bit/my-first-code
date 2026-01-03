import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Database, Moon, Sun, Volume2, Download, Upload, User, Scale, Ruler, Calendar, Activity } from 'lucide-react';
import { db } from '@/lib/db';
import { toast } from 'sonner';

export default function Settings() {
  const [bodyweight, setBodyweight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  useEffect(() => {
    const savedBodyweight = localStorage.getItem('iron-bodyweight');
    if (savedBodyweight) setBodyweight(savedBodyweight);

    const savedHeight = localStorage.getItem('iron-height');
    if (savedHeight) setHeight(savedHeight);

    const savedAge = localStorage.getItem('iron-age');
    if (savedAge) setAge(savedAge);

    const savedGender = localStorage.getItem('iron-gender');
    if (savedGender) setGender(savedGender as 'male' | 'female');
  }, []);

  const handleSaveProfile = () => {
    if (bodyweight) {
      localStorage.setItem('iron-bodyweight', bodyweight);
    }
    if (height) {
      localStorage.setItem('iron-height', height);
    }
    if (age) {
      localStorage.setItem('iron-age', age);
    }
    if (gender) {
      localStorage.setItem('iron-gender', gender);
    }
    toast.success('个人档案已更新，卡路里算法已校准');
  };

  const clearData = () => {
    if (confirm('确定要清除所有数据吗？此操作不可恢复。')) {
      indexedDB.deleteDatabase('iron-tracker-db');
      toast.success('数据已清除，请刷新页面');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const exportData = async () => {
    try {
      const exercises = await db.getAllExercises();
      const sets = await db.getAllSets(); 
      
      const data = {
        version: 1,
        timestamp: Date.now(),
        exercises,
        sets
      };
      
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iron-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('备份文件已下载');
    } catch (e) {
      console.error(e);
      toast.error('导出失败');
    }
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (!json.exercises || !json.sets) {
            throw new Error('Invalid backup file');
          }
          
          // Import exercises
          for (const ex of json.exercises) {
            await db.addExercise(ex);
          }
          
          // Import sets
          for (const s of json.sets) {
            // Fix date strings back to Date objects
            const set = { ...s, date: new Date(s.date) };
            delete set.id;
            await db.addSet(set);
          }
          
          toast.success('数据导入成功');
          setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
          console.error(err);
          toast.error('导入失败：文件格式错误');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <Layout title="设置">
      <div className="space-y-6">
        <section>
          <h2 className="text-xs text-muted-foreground font-bold mb-3 pl-2 border-l-2 border-primary">
            个人档案
          </h2>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm">基本信息</div>
                <div className="text-xs text-muted-foreground">用于显示和卡路里估算</div>
              </div>
            </div>
            
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-bold">性别</label>
                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        variant={gender === 'male' ? 'default' : 'outline'}
                        className={`flex-1 ${gender === 'male' ? 'bg-primary text-black' : 'border-border'}`}
                        onClick={() => setGender('male')}
                      >
                        男
                      </Button>
                      <Button 
                        type="button"
                        variant={gender === 'female' ? 'default' : 'outline'}
                        className={`flex-1 ${gender === 'female' ? 'bg-primary text-black' : 'border-border'}`}
                        onClick={() => setGender('female')}
                      >
                        女
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-bold">年龄</label>
                    <div className="relative">
                      <Input 
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="25"
                        className="bg-secondary/20 border-border font-mono pl-10"
                      />
                      <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-bold">身高 (CM)</label>
                    <div className="relative">
                      <Input 
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="175"
                        className="bg-secondary/20 border-border font-mono pl-10"
                      />
                      <Ruler className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-bold">体重 (KG)</label>
                    <div className="relative">
                      <Input 
                        type="number"
                        value={bodyweight}
                        onChange={(e) => setBodyweight(e.target.value)}
                        placeholder="75"
                        className="bg-secondary/20 border-border font-mono pl-10"
                      />
                      <Scale className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/20 p-3 rounded text-xs text-muted-foreground border border-border/50 flex gap-2 items-start">
                  <Activity className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p>完善身体数据可激活 <strong>Mifflin-St Jeor</strong> 医疗级代谢算法，结合训练强度（METs）为您提供精准的热量消耗估算。</p>
                </div>

                <Button onClick={handleSaveProfile} className="w-full bg-primary text-black font-bold">
                  保存档案
                </Button>
              </div>
          </Card>
        </section>

        <section>
          <h2 className="text-xs text-muted-foreground font-bold mb-3 pl-2 border-l-2 border-primary">
            应用设置
          </h2>
          <div className="space-y-3">
            <Card className="p-4 bg-card border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-bold text-sm">深色模式</div>
                  <div className="text-xs text-muted-foreground">始终开启 (Cyberpunk Theme)</div>
                </div>
              </div>
              <div className="text-xs font-mono text-primary uppercase">开启</div>
            </Card>
            
            <Card className="p-4 bg-card border-border flex items-center justify-between opacity-50">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5" />
                <div>
                  <div className="font-bold text-sm">声音提示</div>
                  <div className="text-xs text-muted-foreground">计时结束时播放</div>
                </div>
              </div>
              <div className="text-xs font-mono uppercase">开启</div>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-xs text-muted-foreground font-bold mb-3 pl-2 border-l-2 border-primary">
            数据备份与迁移
          </h2>
          <div className="space-y-3">
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-bold text-sm">本地离线模式</div>
                  <div className="text-xs text-muted-foreground">数据仅保存在本机，无需联网，永久可用</div>
                </div>
              </div>
              
              <div className="bg-secondary/20 p-3 rounded mb-4 text-xs text-muted-foreground border border-border/50">
                <p className="mb-2">💡 <strong>换手机怎么办？</strong></p>
                <p>点击“导出备份”生成文件，发送到新手机，再点击“导入备份”即可恢复所有数据。</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <Button 
                  variant="outline" 
                  onClick={exportData}
                  className="w-full font-bold flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-black h-12"
                >
                  <Download className="w-4 h-4" />
                  导出备份
                </Button>
                <Button 
                  variant="outline" 
                  onClick={importData}
                  className="w-full font-bold flex items-center gap-2 border-border hover:border-primary hover:text-primary h-12"
                >
                  <Upload className="w-4 h-4" />
                  导入备份
                </Button>
              </div>
            </Card>
            
            <Card className="p-4 bg-card border-border opacity-80 hover:opacity-100 transition-opacity">
               <div className="flex items-center gap-3 mb-4">
                <Trash2 className="w-5 h-5 text-destructive" />
                <div>
                  <div className="font-bold text-sm text-destructive">危险区域</div>
                  <div className="text-xs text-muted-foreground">清空所有数据，不可恢复</div>
                </div>
              </div>
              <Button 
                variant="destructive" 
                onClick={clearData}
                className="w-full font-bold uppercase tracking-widest flex items-center gap-2"
              >
                清除所有数据
              </Button>
            </Card>
          </div>
        </section>
        
        <div className="text-center pt-8 pb-4">
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
            Iron Tracker v1.1.0
          </div>
          <div className="text-[10px] text-muted-foreground/50 font-mono mt-1">
            由 MANUS 构建
          </div>
        </div>
      </div>
    </Layout>
  );
}
