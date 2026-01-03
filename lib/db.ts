import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Exercise {
  id: string;
  name: string;
  bodyPart: string; // 'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other'
  custom?: boolean;
}

export type RPE = 'warmup' | 'easy' | 'medium' | 'hard' | 'failure';

export interface WorkoutSet {
  id?: number;
  exerciseId: string;
  weight: number;
  reps: number;
  rpe?: RPE;
  // Cardio specific fields
  duration?: number; // minutes
  distance?: number; // km
  cardioType?: 'low' | 'medium' | 'high';
  timestamp: number;
  date: Date;
}

interface IronTrackerDB extends DBSchema {
  exercises: {
    key: string;
    value: Exercise;
    indexes: { 'by-bodyPart': string };
  };
  sets: {
    key: number;
    value: WorkoutSet;
    indexes: {
      'by-exercise': string;
      'by-date': Date;
      'by-exercise-date': [string, Date];
    };
  };
}

const DB_NAME = 'iron-tracker-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<IronTrackerDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<IronTrackerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Exercises store
        const exerciseStore = db.createObjectStore('exercises', { keyPath: 'id' });
        exerciseStore.createIndex('by-bodyPart', 'bodyPart');

        // Sets store
        const setStore = db.createObjectStore('sets', { keyPath: 'id', autoIncrement: true });
        setStore.createIndex('by-exercise', 'exerciseId');
        setStore.createIndex('by-date', 'date');
        setStore.createIndex('by-exercise-date', ['exerciseId', 'date']);

        // Seed initial exercises
        const initialExercises: Exercise[] = [
          { id: 'bench-press', name: '杠铃卧推', bodyPart: 'chest' },
          { id: 'incline-bench-press', name: '上斜杠铃卧推', bodyPart: 'chest' },
          { id: 'dumbbell-press', name: '哑铃卧推', bodyPart: 'chest' },
          { id: 'cable-fly', name: '绳索夹胸', bodyPart: 'chest' },
          
          { id: 'pull-up', name: '引体向上', bodyPart: 'back' },
          { id: 'lat-pulldown', name: '高位下拉', bodyPart: 'back' },
          { id: 'barbell-row', name: '杠铃划船', bodyPart: 'back' },
          { id: 'deadlift', name: '硬拉', bodyPart: 'back' },
          
          { id: 'squat', name: '深蹲', bodyPart: 'legs' },
          { id: 'leg-press', name: '倒蹬机', bodyPart: 'legs' },
          { id: 'leg-extension', name: '腿屈伸', bodyPart: 'legs' },
          { id: 'leg-curl', name: '腿弯举', bodyPart: 'legs' },
          
          { id: 'overhead-press', name: '站姿推举', bodyPart: 'shoulders' },
          { id: 'lateral-raise', name: '侧平举', bodyPart: 'shoulders' },
          { id: 'face-pull', name: '面拉', bodyPart: 'shoulders' },
          
          { id: 'bicep-curl', name: '二头弯举', bodyPart: 'arms' },
          { id: 'tricep-pushdown', name: '三头下压', bodyPart: 'arms' },

          // Cardio Exercises
          { id: 'treadmill', name: '跑步机/户外跑', bodyPart: 'cardio' },
          { id: 'elliptical', name: '椭圆机/划船机', bodyPart: 'cardio' },
          { id: 'stair-climber', name: '爬坡/跳绳', bodyPart: 'cardio' },
        ];

        initialExercises.forEach(ex => {
          exerciseStore.put(ex);
        });
      },
    });
  }
  return dbPromise;
};

export const db = {
  async getAllExercises() {
    const db = await initDB();
    return db.getAll('exercises');
  },

  async getExercisesByBodyPart(bodyPart: string) {
    const db = await initDB();
    return db.getAllFromIndex('exercises', 'by-bodyPart', bodyPart);
  },

  async addExercise(exercise: Exercise) {
    const db = await initDB();
    return db.put('exercises', exercise);
  },

  async deleteExercise(id: string) {
    const db = await initDB();
    return db.delete('exercises', id);
  },

  async addSet(set: Omit<WorkoutSet, 'id'>) {
    const db = await initDB();
    return db.add('sets', set);
  },

  async deleteSet(id: number) {
    const db = await initDB();
    return db.delete('sets', id);
  },

  async getSetsByExercise(exerciseId: string) {
    const db = await initDB();
    return db.getAllFromIndex('sets', 'by-exercise', exerciseId);
  },

  async getLastSet(exerciseId: string): Promise<WorkoutSet | undefined> {
    const db = await initDB();
    const sets = await db.getAllFromIndex('sets', 'by-exercise', exerciseId);
    if (sets.length === 0) return undefined;
    // Sort by date descending, then timestamp descending
    return sets.sort((a, b) => {
      const dateDiff = b.date.getTime() - a.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.timestamp - a.timestamp;
    })[0];
  },

  async getHistoryByExercise(exerciseId: string): Promise<WorkoutSet[]> {
    const db = await initDB();
    const sets = await db.getAllFromIndex('sets', 'by-exercise', exerciseId);
    return sets.sort((a, b) => b.date.getTime() - a.date.getTime());
  },
  
  async getTodaySets(): Promise<WorkoutSet[]> {
    const db = await initDB();
    const allSets = await db.getAll('sets');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allSets.filter(set => {
      const setDate = new Date(set.date);
      setDate.setHours(0, 0, 0, 0);
      return setDate.getTime() === today.getTime();
    }).sort((a, b) => b.timestamp - a.timestamp);
  },

  async getAllSets(): Promise<WorkoutSet[]> {
    const db = await initDB();
    return db.getAll('sets');
  }
};
