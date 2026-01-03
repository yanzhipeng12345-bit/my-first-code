# Iron Tracker Algorithm Specification (v4.5.1)

## Overview

The Iron Tracker calorie calculation engine estimates energy expenditure for strength training, cardio, and mixed workout sessions. The algorithm combines **Metabolic Equivalent (MET)** values, **intensity factors**, and **BMR correction** to provide personalized, conservative estimates.

## Input Schema

### User Profile

```json
{
  "weight": 75,           // kg (required)
  "height": 180,          // cm (optional, for BMR calculation)
  "age": 25,              // years (optional, for BMR calculation)
  "gender": "male",       // "male" or "female" (optional)
  "body_fat": 15          // percentage (optional, for future Katch-McArdle formula)
}
```

### Session

```json
{
  "date": "2025-01-02",
  "total_duration_minutes": 60,
  "notes": "Chest & Back Day"
}
```

### Actions (Workout Exercises)

```json
{
  "id": "action_1",
  "type": "strength",                 // "strength", "cardio", "mobility"
  "body_part": "chest",               // See MET_TABLE below
  "exercise": "Bench Press",
  "sets": 4,
  "reps": 8,
  "weight": 80,                       // kg
  "duration": 20,                     // minutes
  "timestamp": 1704192000,            // Unix timestamp
  "rpe": "medium"                     // "easy", "medium", "hard"
}
```

### Edits (Post-Edit Tracking)

```json
{
  "action_id": "action_3",
  "edited_at": 1704196800,
  "reason": "post_edit"               // Indicates action added after session
}
```

## Output Schema

```json
{
  "calories": {
    "gross_calories": 487.5,          // Total energy expenditure
    "net_calories": 487.5,            // Net (excluding BMR)
    "work_calories": 387.2,           // Strength + cardio work
    "rest_calories": 45.0,            // Rest/idle time
    "cardio_calories": 55.3,          // Cardio-specific
    "idle_calories": 45.0,            // Low-intensity rest
    "bmr_factor": 1.0,                // Personalization multiplier
    "epoc_bonus": 19.4                // Post-exercise oxygen consumption
  }
}
```

## Core Calculations

### 1. BMR (Basal Metabolic Rate)

**Formula (Mifflin-St Jeor):**

```
Male:   BMR = 10*W + 6.25*H - 5*A + 5
Female: BMR = 10*W + 6.25*H - 5*A - 161

W = weight (kg)
H = height (cm)
A = age (years)
```

**BMR Factor Calculation:**

```
User_BMR = calculate_bmr(user_profile)
Standard_BMR = calculate_bmr(75kg, 180cm, 25yo, male)
BMR_Factor = User_BMR / Standard_BMR
```

This factor personalizes all calorie estimates based on individual metabolism.

### 2. Strength Training Calories

**Formula:**

```
Work_Calories = (Duration_min / 60) × MET × Weight × Intensity_Factor × BMR_Factor
```

**MET Table (v4.5.1 - Updated):**

| Body Part | MET | Notes |
|-----------|-----|-------|
| Chest | 5.1 | Large muscle group (+10% from 4.6) |
| Back | 5.1 | Large muscle group (+10% from 4.6) |
| Legs | 5.5 | Largest muscle group |
| Shoulders | 5.1 | Medium-large (+10% from 4.6) |
| Arms | 4.2 | Smaller muscle group (+10% from 3.8) |
| Core | 3.8 | Stabilizer muscles |
| General | 4.0 | Default fallback |

### 3. Intensity Factor (Linear Interpolation)

**Volume Calculation:**

```
Volume_per_Weight = (Total_Weight × Total_Reps) / Body_Weight
```

**Interpolation Table:**

| Volume | Factor | Notes |
|--------|--------|-------|
| 30 | 1.0 | Low volume |
| 40 | 1.15 | Medium-low |
| 50 | 1.25 | Medium |
| 60 | 1.35 | High |
| 100+ | 1.5 | Very high |

**Linear Interpolation:**

```
If V1 ≤ Volume ≤ V2:
  Factor = F1 + (Volume - V1) / (V2 - V1) × (F2 - F1)
```

This replaces the previous step-function to ensure smooth scaling.

### 4. Cardio Calories

**Formula:**

```
Cardio_Calories = (Duration_min / 60) × MET × Weight × BMR_Factor
```

**Cardio MET Map:**

| Type | MET | Examples |
|------|-----|----------|
| Low | 5.0 | Walking, light cycling |
| Medium | 7.5 | Jogging, moderate cycling |
| High | 10.0 | Running, HIIT, rowing |

### 5. Rest & Idle Calories

**Formula:**

```
Idle_Duration = Total_Duration - (Strength_Duration + Cardio_Duration)
Idle_Calories = (Idle_Duration / 60) × IDLE_MET × Weight × BMR_Factor
```

**IDLE_MET = 1.8** (elevated from 1.3)

**Rationale:** Gym environment involves walking, equipment changes, and muscle tension recovery—not complete stillness.

### 6. EPOC (Excess Post-Exercise Oxygen Consumption)

**Condition:** Applied when `Intensity_Factor > 1.1`

**Formula:**

```
EPOC_Bonus = Work_Calories × 5%
Total_Work = Work_Calories + EPOC_Bonus
```

### 7. Post-Edit Detection

**Gap Threshold:** 900 seconds (15 minutes)

**Logic:**

```
For each consecutive pair of actions:
  Gap = Next_Action_Start - Current_Action_End
  If Gap > 900s:
    is_post_edit = True
    Don't count gap as training time
```

This prevents inflated calorie estimates when users add exercises after leaving the gym.

## Configuration Parameters

All parameters are defined in `core/config.yaml`:

```yaml
met_table:
  chest: 5.1
  back: 5.1
  legs: 5.5
  shoulders: 5.1
  arms: 4.2
  core: 3.8
  general: 4.0

cardio_met_map:
  low: 5.0
  medium: 7.5
  high: 10.0

idle_met: 1.8

gap_threshold_seconds: 900

intensity_factor_thresholds:
  - volume: 30
    factor: 1.0
  - volume: 40
    factor: 1.15
  - volume: 50
    factor: 1.25
  - volume: 60
    factor: 1.35
  - volume: 100
    factor: 1.5

epoc_percentage: 5
```

## Design Principles

1. **Conservative Estimation**: Calorie estimates err on the side of underestimation rather than overestimation.
2. **Personalization**: BMR factor ensures estimates reflect individual metabolic differences.
3. **Smooth Scaling**: Linear interpolation prevents unrealistic jumps in calorie estimates.
4. **Post-Edit Awareness**: Large time gaps trigger conservative handling of added exercises.
5. **Gym-Aware Idle**: Idle MET reflects realistic gym environment (walking, equipment changes).

## Validation & Testing

- Unit tests cover: BMR calculation, intensity factor interpolation, effective duration detection, and edge cases.
- Regression tests validate: standard workouts, post-edit scenarios, and mixed training sessions.
- All tests can be run with: `pytest tests/test_calories.py -v`

## Future Enhancements

1. **Katch-McArdle Formula**: Incorporate body fat percentage for more precise BMR calculation.
2. **Heart Rate Integration**: Use HR zones to dynamically adjust intensity factors.
3. **RPE Calibration**: Allow users to input Rate of Perceived Exertion for fine-tuning.
4. **Machine Learning**: Personalize MET values based on user's historical data.
