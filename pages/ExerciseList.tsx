import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import Layout from '@/components/Layout';
import { db, Exercise } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { ChevronLeft, Plus, Search, X, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const BODY_PART_NAMES: Record<string, string> = {
  cardio: '有氧',
  chest: '胸部',
  back: '背部',
  legs: '腿部',
  shoulders: '肩部',
  arms: '手臂',
  core: '核心',
};

export default function ExerciseList() {
  const [, params] = useRoute('/exercises/:part');
  const [, setLocation] = useLocation();
  const partId = params?.part || '';
  const partName = BODY_PART_NAMES[partId] || '动作列表';
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);

  useEffect(() => {
    loadExercises();
  }, [partId]);

  const loadExercises = () => {
    if (partId) {
      db.getExercisesByBodyPart(partId).then(setExercises);
    }
  };

  const handleAddExercise = async () => {
    if (!newExerciseName.trim()) {
      toast.error("请输入动作名称");
      return;
    }

    const id = newExerciseName.toLowerCase().replace(/\s+/g, '-');
    const newExercise: Exercise = {
      id,
      name: newExerciseName,
      bodyPart: partId,
      custom: true
    };

    try {
      await db.addExercise(newExercise);
      toast.success("动作添加成功");
      setNewExerciseName('');
      setIsDialogOpen(false);
      loadExercises();
    } catch (e) {
      toast.error("添加失败，可能动作已存在");
    }
  };

  const confirmDelete = (e: React.MouseEvent, exercise: Exercise) => {
    e.stopPropagation();
    setExerciseToDelete(exercise);
    setDeleteDialogOpen(true);
  };

  const handleDeleteExercise = async () => {
    if (!exerciseToDelete) return;
    
    try {
      await db.deleteExercise(exerciseToDelete.id);
      toast.success("动作已删除");
      setDeleteDialogOpen(false);
      setExerciseToDelete(null);
      loadExercises();
    } catch (e) {
      toast.error("删除失败");
    }
  };

  const filteredExercises = exercises.filter(ex => 
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout title={`${partName} // EXERCISES`}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <button 
            onClick={() => setLocation('/')}
            className="p-2 -ml-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索动作..." 
              className="pl-9 bg-card border-border focus:border-primary h-10 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-3">
          {filteredExercises.map((ex) => (
            <Card 
              key={ex.id}
              onClick={() => setLocation(`/logger/${ex.id}`)}
              className="p-4 border-border bg-card hover:border-primary transition-all cursor-pointer active:scale-[0.99] flex items-center justify-between group relative pr-14"
            >
              <div>
                <div className="font-bold text-lg group-hover:text-primary transition-colors">
                  {ex.name}
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-1">
                  ID: {ex.id.toUpperCase()}
                </div>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button 
                  onClick={(e) => confirmDelete(e, ex)}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-destructive hover:bg-destructive hover:text-white transition-all z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center group-hover:border-primary group-hover:bg-primary group-hover:text-black transition-all">
                  <Plus className="w-5 h-5" />
                </div>
              </div>
            </Card>
          ))}
          
          {filteredExercises.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <div className="text-4xl mb-2">∅</div>
              <div>暂无动作</div>
            </div>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button className="w-full py-3 mt-4 bg-secondary text-secondary-foreground font-bold uppercase tracking-wider hover:bg-primary hover:text-black transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              添加新动作
            </button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold uppercase tracking-widest flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                添加新动作 // NEW EXERCISE
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-widest">动作名称</Label>
                <Input 
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="例如：反向飞鸟"
                  className="bg-background border-border focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-widest">所属部位</Label>
                <div className="p-3 bg-secondary/30 border border-border rounded text-sm font-mono uppercase">
                  {partName} ({partId})
                </div>
              </div>
              <Button 
                onClick={handleAddExercise}
                className="w-full bg-primary text-black font-bold uppercase tracking-widest hover:bg-primary/90"
              >
                确认添加 // CONFIRM
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold uppercase tracking-widest text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                删除动作 // DELETE
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                确定要删除 "{exerciseToDelete?.name}" 吗？此操作不可恢复，且会隐藏该动作的历史记录。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialogOpen(false)}
                className="flex-1 border-border"
              >
                取消
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteExercise}
                className="flex-1"
              >
                确认删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
