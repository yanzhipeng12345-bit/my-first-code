#!/usr/bin/env python3
"""
Iron Tracker Calorie Calculation Engine (v4.5.1)
Core algorithm for workout energy expenditure estimation.
Supports strength training, cardio, and mixed sessions with post-edit detection.
"""

import json
import sys
import math
from typing import Dict, List, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import yaml

# Load configuration
CONFIG_PATH = "core/config.yaml"
try:
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        CONFIG = yaml.safe_load(f)
except FileNotFoundError:
    print(f"Error: {CONFIG_PATH} not found. Please ensure config.yaml is in core/ directory.", file=sys.stderr)
    sys.exit(1)


@dataclass
class CalorieBreakdown:
    """Detailed calorie expenditure breakdown"""
    gross_calories: float
    net_calories: float
    work_calories: float
    rest_calories: float
    cardio_calories: float
    idle_calories: float
    bmr_factor: float
    epoc_bonus: float


def calculate_bmr(weight: float, height: float, age: float, gender: str) -> float:
    """
    Calculate Basal Metabolic Rate using Mifflin-St Jeor formula.
    
    Args:
        weight: Body weight in kg
        height: Height in cm
        age: Age in years
        gender: 'male' or 'female'
    
    Returns:
        BMR in kcal/day
    """
    if gender.lower() == 'male':
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161
    
    return max(bmr, 1000)  # Minimum safety threshold


def calculate_bmr_factor(user_profile: Dict[str, Any]) -> float:
    """
    Calculate BMR correction factor based on user profile.
    Compares individual BMR to standard reference (75kg male, 180cm, 25yo).
    
    Returns:
        Correction factor (e.g., 0.9 or 1.1)
    """
    weight = user_profile.get('weight', 75)
    height = user_profile.get('height', 180)
    age = user_profile.get('age', 25)
    gender = user_profile.get('gender', 'male')
    
    user_bmr = calculate_bmr(weight, height, age, gender)
    
    # Standard reference: 75kg male, 180cm, 25 years old
    standard_bmr = calculate_bmr(75, 180, 25, 'male')
    
    factor = user_bmr / standard_bmr
    return max(factor, 0.8)  # Cap at 0.8 minimum


def calculate_intensity_factor(volume_per_weight: float) -> float:
    """
    Calculate intensity factor using linear interpolation.
    Replaces previous step-function with smooth scaling.
    
    Args:
        volume_per_weight: (total_weight * total_reps) / body_weight
    
    Returns:
        Intensity factor (1.0 to 1.5)
    """
    thresholds = CONFIG.get('intensity_factor_thresholds', [
        {'volume': 30, 'factor': 1.0},
        {'volume': 40, 'factor': 1.15},
        {'volume': 50, 'factor': 1.25},
        {'volume': 60, 'factor': 1.35},
        {'volume': 100, 'factor': 1.5},
    ])
    
    # Find surrounding thresholds for interpolation
    if volume_per_weight <= thresholds[0]['volume']:
        return thresholds[0]['factor']
    
    for i in range(len(thresholds) - 1):
        if thresholds[i]['volume'] <= volume_per_weight <= thresholds[i + 1]['volume']:
            # Linear interpolation
            v1, f1 = thresholds[i]['volume'], thresholds[i]['factor']
            v2, f2 = thresholds[i + 1]['volume'], thresholds[i + 1]['factor']
            
            t = (volume_per_weight - v1) / (v2 - v1)
            return f1 + t * (f2 - f1)
    
    return thresholds[-1]['factor']


def calculate_effective_duration(actions: List[Dict[str, Any]]) -> Tuple[float, bool]:
    """
    Calculate effective training duration accounting for rest gaps.
    Detects post-edit scenarios (gaps > 15 minutes).
    
    Returns:
        (total_duration_minutes, is_post_edit_detected)
    """
    if not actions:
        return 0, False
    
    # Sort by timestamp
    sorted_actions = sorted(actions, key=lambda x: x.get('timestamp', 0))
    
    gap_threshold = CONFIG.get('gap_threshold_seconds', 900)  # 15 minutes default
    total_duration = 0
    is_post_edit = False
    
    for i, action in enumerate(sorted_actions):
        action_duration = action.get('duration', 0)
        total_duration += action_duration
        
        # Check for gap to next action
        if i < len(sorted_actions) - 1:
            current_end = action.get('timestamp', 0) + (action_duration * 60)
            next_start = sorted_actions[i + 1].get('timestamp', 0)
            gap = next_start - current_end
            
            if gap > gap_threshold:
                is_post_edit = True
                # Don't count the gap as training time
    
    return total_duration, is_post_edit


def calculate_workout_calories(
    actions: List[Dict[str, Any]],
    user_profile: Dict[str, Any]
) -> CalorieBreakdown:
    """
    Main calorie calculation engine.
    
    Args:
        actions: List of workout actions with type, duration, weight, reps, etc.
        user_profile: User data (weight, height, age, gender)
    
    Returns:
        CalorieBreakdown object with detailed breakdown
    """
    weight = user_profile.get('weight', 75)
    
    # Calculate BMR factor
    bmr_factor = calculate_bmr_factor(user_profile)
    
    # Calculate effective duration
    total_duration_minutes, is_post_edit = calculate_effective_duration(actions)
    
    # Separate actions by type
    strength_actions = [a for a in actions if a.get('type') == 'strength']
    cardio_actions = [a for a in actions if a.get('type') == 'cardio']
    
    work_calories = 0
    rest_calories = 0
    cardio_calories = 0
    idle_calories = 0
    
    # === STRENGTH TRAINING ===
    if strength_actions:
        strength_duration = sum(a.get('duration', 0) for a in strength_actions)
        
        # Calculate volume
        total_volume = 0
        for action in strength_actions:
            sets = action.get('sets', 0)
            reps = action.get('reps', 0)
            weight_kg = action.get('weight', 0)
            total_volume += sets * reps * weight_kg
        
        volume_per_weight = total_volume / weight if weight > 0 else 0
        intensity_factor = calculate_intensity_factor(volume_per_weight)
        
        # Get MET for body part
        body_part = strength_actions[0].get('body_part', 'general')
        met_table = CONFIG.get('met_table', {})
        base_met = met_table.get(body_part, 4.0)
        
        # Strength calories = duration * MET * weight * intensity_factor * BMR_factor
        work_calories = (strength_duration / 60) * base_met * weight * intensity_factor * bmr_factor
        
        # EPOC bonus for high-intensity sessions
        if intensity_factor > 1.1:
            epoc_bonus = work_calories * 0.05  # 5% post-burn effect
            work_calories += epoc_bonus
    
    # === CARDIO TRAINING ===
    if cardio_actions:
        for action in cardio_actions:
            duration_minutes = action.get('duration', 0)
            cardio_type = action.get('cardio_type', 'medium')
            
            # Get MET for cardio type
            cardio_met_map = CONFIG.get('cardio_met_map', {
                'low': 5.0,
                'medium': 7.5,
                'high': 10.0
            })
            met = cardio_met_map.get(cardio_type, 7.5)
            
            cardio_calories += (duration_minutes / 60) * met * weight * bmr_factor
    
    # === REST & IDLE TIME ===
    rest_duration = total_duration_minutes - sum(a.get('duration', 0) for a in strength_actions + cardio_actions)
    idle_met = CONFIG.get('idle_met', 1.8)  # Elevated from 1.3 to account for gym environment
    idle_calories = (rest_duration / 60) * idle_met * weight * bmr_factor
    rest_calories = idle_calories
    
    # === TOTALS ===
    gross_calories = work_calories + rest_calories + cardio_calories
    net_calories = gross_calories  # Net = Gross (no separate BMR subtraction in this model)
    
    return CalorieBreakdown(
        gross_calories=round(gross_calories, 1),
        net_calories=round(net_calories, 1),
        work_calories=round(work_calories, 1),
        rest_calories=round(rest_calories, 1),
        cardio_calories=round(cardio_calories, 1),
        idle_calories=round(idle_calories, 1),
        bmr_factor=round(bmr_factor, 3),
        epoc_bonus=round(work_calories * 0.05 if any(a.get('type') == 'strength' for a in actions) else 0, 1)
    )


def main():
    """CLI entry point"""
    if len(sys.argv) < 2:
        print("Usage: python core/calories.py <input_json_file>", file=sys.stderr)
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input file '{input_file}' not found.", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in '{input_file}': {e}", file=sys.stderr)
        sys.exit(1)
    
    user_profile = data.get('user', {})
    actions = data.get('actions', [])
    
    result = calculate_workout_calories(actions, user_profile)
    
    output = {
        'user': user_profile,
        'session': data.get('session', {}),
        'actions_count': len(actions),
        'calories': asdict(result)
    }
    
    print(json.dumps(output, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
