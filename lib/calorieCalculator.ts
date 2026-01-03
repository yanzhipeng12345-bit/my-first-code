/**
 * Iron Tracker Calorie Calculation Algorithm v4.5.1
 * 
 * CRITICAL: This is the authoritative version used in production.
 * Any discrepancies between this and the frontend version indicate a bug.
 * 
 * Algorithm Overview:
 * 1. Extract effective duration (filters post-edit gaps > 15 min)
 * 2. Calculate strength calories (MET-based, intensity-scaled)
 * 3. Calculate cardio calories (duration-based)
 * 4. Calculate idle calories (remaining time at low MET)
 * 5. Apply BMR correction factor (personalization)
 * 6. Apply EPOC bonus for high-intensity sets (+5%)
 * 7. Cap total at safety limit
 */

interface UserProfile {
  weight: number; // kg
  height?: number; // cm
  age?: number;
  gender?: 'male' | 'female';
}

interface WorkoutSet {
  id?: string | number;
  exerciseId: string;
  reps?: number;
  weight?: number;
  duration?: number;
  cardioType?: string;
  timestamp: number;
  date?: Date;
  rpe?: string;
}

interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  category?: string;
}

// ==========================================
// CONFIGURATION LAYER (配置层)
// All magic numbers must be defined here
// ==========================================
const CalorieConfig = {
  // 1. MET Values (Metabolic Equivalent of Task)
  MET: {
    STRENGTH: {
      CHEST: 5.7,      // +10% from baseline 5.2
      BACK: 6.0,       // +10% from baseline 5.5
      SHOULDERS: 5.1,  // +10% from baseline 4.6
      ARMS: 4.2,       // +10% from baseline 3.8
      CORE: 4.4,       // +10% from baseline 4.0
      LEGS: 6.6,       // +10% from baseline 6.0
      OTHER: 4.4,      // +10% from baseline 4.0
    },
    CARDIO: {
      LOW: 4.0,    // ~5-6 km/h (LISS)
      MEDIUM: 8.0, // ~8-9 km/h (MISS)
      HIGH: 11.5,  // ~10+ km/h (HIIT)
    },
    IDLE: 1.8,     // Active recovery (walking, loading plates)
  },

  // 2. Time Constants (seconds)
  TIME: {
    SECONDS_PER_REP: 3.0,
    SECONDS_REST_PER_SET: 90,
    GAP_THRESHOLD_MINUTES: 15,
  },

  // 3. Calculation Constants
  CONSTANTS: {
    K_CALORIE_FACTOR: 0.0175, // kcal per kg per minute per MET
    MAX_CALORIE_MULTIPLIER: 12, // Safety cap: max kcal <= weight * 12
  }
};

// ==========================================
// LOGIC LAYER (逻辑层)
// Pure functions for calculation
// ==========================================

/**
 * Calculate Effective Duration using Gap Threshold Algorithm
 * Filters out post-edit time and long gaps
 */
export function calculateEffectiveDuration(sets: WorkoutSet[]): { 
  totalDurationMinutes: number, 
  isPostEditDetected: boolean 
} {
  if (sets.length === 0) return { totalDurationMinutes: 0, isPostEditDetected: false };
  if (sets.length === 1) return { totalDurationMinutes: 15, isPostEditDetected: false };

  const sortedSets = [...sets].sort((a, b) => a.timestamp - b.timestamp);
  const gapThresholdMs = CalorieConfig.TIME.GAP_THRESHOLD_MINUTES * 60 * 1000;
  
  let totalDurationMs = 0;
  let currentSessionStart = sortedSets[0].timestamp;
  let lastTimestamp = sortedSets[0].timestamp;
  let isPostEditDetected = false;

  for (let i = 1; i < sortedSets.length; i++) {
    const currentTimestamp = sortedSets[i].timestamp;
    const gap = currentTimestamp - lastTimestamp;

    if (gap > gapThresholdMs) {
      totalDurationMs += (lastTimestamp - currentSessionStart);
      isPostEditDetected = true;
      currentSessionStart = currentTimestamp;
    }
    lastTimestamp = currentTimestamp;
  }

  totalDurationMs += (lastTimestamp - currentSessionStart);
  totalDurationMs += 5 * 60 * 1000; // Buffer for last set

  let totalDurationMinutes = Math.round(totalDurationMs / (1000 * 60));
  if (totalDurationMinutes < 15) totalDurationMinutes = 15;

  return { totalDurationMinutes, isPostEditDetected };
}

/**
 * Calculate Intensity Factor based on Volume/Weight Ratio (Smoothed)
 * Linear interpolation between steps to avoid jumps.
 */
function calculateIntensityFactor(volume: number, bodyWeight: number): number {
  const score = volume / bodyWeight;
  
  // Linear interpolation logic
  if (score <= 20) return 0.9;
  if (score >= 100) return 1.45;
  
  // Linear mapping between 20 (0.9) and 100 (1.45)
  // Slope = (1.45 - 0.9) / (100 - 20) = 0.55 / 80 = 0.006875
  return 0.9 + (score - 20) * 0.006875;
}

/**
 * Calculate BMR Correction Factor using Mifflin-St Jeor Equation
 * Returns a multiplier (e.g., 1.05) to adjust total calories based on user metabolism.
 */
function calculateBMRCorrection(profile: UserProfile): number {
  const weight = profile.weight || 75;
  const height = profile.height || 175;
  const age = profile.age || 25;
  const gender = profile.gender || 'male';
  
  // Standard BMR (Mifflin-St Jeor)
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr += (gender === 'male' ? 5 : -161);
  
  // Reference BMR for a "standard" user (e.g., 75kg male, 175cm, 25yo) -> ~1740 kcal
  const referenceBMR = 1740;
  
  // Damping factor: we don't want linear scaling, just a gentle nudge.
  const ratio = bmr / referenceBMR;
  return 1.0 + (ratio - 1.0) * 0.5; // 50% impact
}

/**
 * Get MET value for a body part
 */
function getStrengthMET(bodyPart: string): number {
  const part = bodyPart.toUpperCase();
  switch (part) {
    case 'CHEST': return CalorieConfig.MET.STRENGTH.CHEST;
    case 'BACK': return CalorieConfig.MET.STRENGTH.BACK;
    case 'SHOULDERS': return CalorieConfig.MET.STRENGTH.SHOULDERS;
    case 'ARMS': return CalorieConfig.MET.STRENGTH.ARMS;
    case 'CORE': return CalorieConfig.MET.STRENGTH.CORE;
    case 'LEGS': return CalorieConfig.MET.STRENGTH.LEGS;
    default: return CalorieConfig.MET.STRENGTH.OTHER;
  }
}

/**
 * Get cardio MET value
 */
function getCardioMET(intensity: string): number {
  const level = (intensity || 'medium').toUpperCase();
  switch (level) {
    case 'LOW': return CalorieConfig.MET.CARDIO.LOW;
    case 'HIGH': return CalorieConfig.MET.CARDIO.HIGH;
    default: return CalorieConfig.MET.CARDIO.MEDIUM;
  }
}

// ==========================================
// PUBLIC API
// ==========================================

export interface CalorieBreakdown {
  exerciseId: string;
  exerciseName: string;
  bodyPart: string;
  sets: number;
  workCalories: number;
  restCalories: number;
  totalCalories: number;
  intensityFactor: number;
  met: number;
}

export interface CalorieResult {
  totalCalories: number;
  strengthCalories: number;
  cardioCalories: number;
  idleCalories: number;
  bmrFactor: number;
  epocBonus: number;
  activeMinutes: number;
  idleMinutes: number;
  totalDurationMinutes: number;
  breakdown: CalorieBreakdown[];
}

/**
 * Calculate Total Calories (Main Entry Point)
 * Pipeline: Time Calc -> Intensity/MET -> Calories
 */
export function calculateWorkoutCaloriesDetailed(
  sets: WorkoutSet[], 
  exercises: Exercise[],
  profile: UserProfile
): CalorieResult {
  if (sets.length === 0) {
    return {
      totalCalories: 0,
      strengthCalories: 0,
      cardioCalories: 0,
      idleCalories: 0,
      bmrFactor: 1.0,
      epocBonus: 0,
      activeMinutes: 0,
      idleMinutes: 0,
      totalDurationMinutes: 0,
      breakdown: [],
    };
  }

  const weight = profile.weight || 75;

  // Step 1: Calculate Total Effective Duration
  const { totalDurationMinutes } = calculateEffectiveDuration(sets);

  let totalStrengthCalories = 0;
  let totalCardioCalories = 0;
  let totalActiveMinutes = 0;
  let totalEPOCBonus = 0;
  const breakdown: CalorieBreakdown[] = [];

  // Group sets by exercise
  const setsByExercise: Record<string, WorkoutSet[]> = {};
  sets.forEach(set => {
    if (!setsByExercise[set.exerciseId]) setsByExercise[set.exerciseId] = [];
    setsByExercise[set.exerciseId].push(set);
  });

  // Step 2: Iterate through exercises to calculate Active Burn
  Object.keys(setsByExercise).forEach(exerciseId => {
    const exerciseSets = setsByExercise[exerciseId];
    const exercise = exercises.find(e => e.id === exerciseId);
    const bodyPart = exercise?.bodyPart || 'other';
    const exerciseName = exercise?.name || 'Unknown';

    if (bodyPart === 'cardio') {
      // --- Cardio Logic ---
      let cardioBurn = 0;
      let cardioDuration = 0;
      
      exerciseSets.forEach(s => {
        const duration = s.duration || 0;
        const met = getCardioMET(s.cardioType || 'medium');
        
        const burn = duration * weight * CalorieConfig.CONSTANTS.K_CALORIE_FACTOR * met;
        cardioBurn += burn;
        cardioDuration += duration;
      });
      
      totalCardioCalories += cardioBurn;
      totalActiveMinutes += cardioDuration;
      
      breakdown.push({
        exerciseId,
        exerciseName,
        bodyPart,
        sets: exerciseSets.length,
        workCalories: Math.round(cardioBurn),
        restCalories: 0,
        totalCalories: Math.round(cardioBurn),
        intensityFactor: 1.0,
        met: getCardioMET(exerciseSets[0]?.cardioType || 'medium'),
      });
    } else {
      // --- Strength Logic (v4.5.1) ---
      const baseMet = getStrengthMET(bodyPart);
      
      // Calculate Volume & IF
      let volume = 0;
      let totalReps = 0;
      exerciseSets.forEach(s => {
        const w = (s.weight && s.weight > 0) ? s.weight : weight * 0.4;
        const reps = s.reps || 0;
        volume += w * reps;
        totalReps += reps;
      });
      const intensityFactor = calculateIntensityFactor(volume, weight);

      // Time Splitting
      const workTimeMin = (totalReps * CalorieConfig.TIME.SECONDS_PER_REP) / 60;
      const restTimeMin = (Math.max(0, exerciseSets.length - 1) * CalorieConfig.TIME.SECONDS_REST_PER_SET) / 60;
      const activeBlockMin = workTimeMin + restTimeMin;

      // Calculate work and rest calories separately
      const workBurn = workTimeMin * weight * CalorieConfig.CONSTANTS.K_CALORIE_FACTOR * baseMet * intensityFactor;
      const restBurn = restTimeMin * weight * CalorieConfig.CONSTANTS.K_CALORIE_FACTOR * baseMet * intensityFactor;
      let blockBurn = workBurn + restBurn;

      // EPOC Compensation for high intensity sets (v4.5.1)
      let epocAmount = 0;
      if (intensityFactor > 1.1) {
        epocAmount = blockBurn * 0.05; // +5% EPOC
        blockBurn *= 1.05;
        totalEPOCBonus += epocAmount;
      }

      totalStrengthCalories += blockBurn;
      totalActiveMinutes += activeBlockMin;
      
      breakdown.push({
        exerciseId,
        exerciseName,
        bodyPart,
        sets: exerciseSets.length,
        workCalories: Math.round(workBurn),
        restCalories: Math.round(restBurn),
        totalCalories: Math.round(blockBurn),
        intensityFactor: parseFloat(intensityFactor.toFixed(2)),
        met: baseMet,
      });
    }
  });

  // Step 3: Calculate True Idle Burn
  let idleMinutes = totalDurationMinutes - totalActiveMinutes;
  if (idleMinutes < 0) idleMinutes = 0;
  
  const idleBurn = idleMinutes * weight * CalorieConfig.CONSTANTS.K_CALORIE_FACTOR * CalorieConfig.MET.IDLE;

  // Step 4: Apply BMR Correction (v4.5.1)
  const bmrFactor = calculateBMRCorrection(profile);
  totalStrengthCalories *= bmrFactor;
  totalCardioCalories *= bmrFactor;
  const adjustedIdleBurn = idleBurn * bmrFactor;
  
  // Update breakdown with BMR factor
  breakdown.forEach(b => {
    b.workCalories = Math.round(b.workCalories * bmrFactor);
    b.restCalories = Math.round(b.restCalories * bmrFactor);
    b.totalCalories = Math.round(b.totalCalories * bmrFactor);
  });

  // Step 5: Sum & Cap
  let totalGrossCalories = totalStrengthCalories + totalCardioCalories + adjustedIdleBurn;
  const maxCalories = weight * CalorieConfig.CONSTANTS.MAX_CALORIE_MULTIPLIER;
  
  if (totalGrossCalories > maxCalories) totalGrossCalories = maxCalories;

  return {
    totalCalories: Math.round(totalGrossCalories),
    strengthCalories: Math.round(totalStrengthCalories),
    cardioCalories: Math.round(totalCardioCalories),
    idleCalories: Math.round(adjustedIdleBurn),
    bmrFactor: parseFloat(bmrFactor.toFixed(3)),
    epocBonus: Math.round(totalEPOCBonus * bmrFactor),
    activeMinutes: Math.round(totalActiveMinutes),
    idleMinutes: Math.round(idleMinutes),
    totalDurationMinutes,
    breakdown,
  };
}

/**
 * Simple calorie calculation (backward compatible)
 */
export function calculateWorkoutCalories(
  sets: WorkoutSet[], 
  exercises: Exercise[],
  profile: UserProfile
): number {
  const result = calculateWorkoutCaloriesDetailed(sets, exercises, profile);
  return result.totalCalories;
}

/**
 * Simple calorie calculation based on duration only (fallback)
 */
export function calculateSimpleCalories(durationMinutes: number, weightKg: number): number {
  // Average MET of 5.0 for mixed workout
  return Math.round(durationMinutes * weightKg * CalorieConfig.CONSTANTS.K_CALORIE_FACTOR * 5.0);
}

export { CalorieConfig, UserProfile, WorkoutSet, Exercise };
