#!/usr/bin/env python3
"""
Unit and regression tests for Iron Tracker calorie calculation engine.
Run with: pytest tests/test_calories.py -v
"""

import sys
import json
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.calories import (
    calculate_bmr,
    calculate_bmr_factor,
    calculate_intensity_factor,
    calculate_effective_duration,
    calculate_workout_calories,
    CalorieBreakdown
)


class TestBMRCalculation:
    """Test BMR calculation using Mifflin-St Jeor formula"""
    
    def test_bmr_male_standard(self):
        """Standard male: 75kg, 180cm, 25yo"""
        bmr = calculate_bmr(75, 180, 25, 'male')
        assert 1600 < bmr < 1800, f"Expected BMR ~1700, got {bmr}"
    
    def test_bmr_female_standard(self):
        """Standard female: 65kg, 165cm, 25yo"""
        bmr = calculate_bmr(65, 165, 25, 'female')
        assert 1300 < bmr < 1500, f"Expected BMR ~1400, got {bmr}"
    
    def test_bmr_heavy_male(self):
        """Heavy male: 100kg"""
        bmr_light = calculate_bmr(75, 180, 25, 'male')
        bmr_heavy = calculate_bmr(100, 180, 25, 'male')
        assert bmr_heavy > bmr_light, "Heavier person should have higher BMR"


class TestBMRFactor:
    """Test BMR correction factor"""
    
    def test_bmr_factor_standard(self):
        """Standard profile should have factor ~1.0"""
        profile = {'weight': 75, 'height': 180, 'age': 25, 'gender': 'male'}
        factor = calculate_bmr_factor(profile)
        assert 0.95 < factor < 1.05, f"Expected factor ~1.0, got {factor}"
    
    def test_bmr_factor_heavy(self):
        """Heavier person should have higher factor"""
        profile_light = {'weight': 75, 'height': 180, 'age': 25, 'gender': 'male'}
        profile_heavy = {'weight': 100, 'height': 180, 'age': 25, 'gender': 'male'}
        
        factor_light = calculate_bmr_factor(profile_light)
        factor_heavy = calculate_bmr_factor(profile_heavy)
        
        assert factor_heavy > factor_light, "Heavier person should have higher BMR factor"


class TestIntensityFactor:
    """Test intensity factor calculation with linear interpolation"""
    
    def test_intensity_factor_low(self):
        """Low volume should give factor ~1.0"""
        factor = calculate_intensity_factor(20)
        assert 0.95 < factor < 1.05, f"Expected factor ~1.0, got {factor}"
    
    def test_intensity_factor_medium(self):
        """Medium volume should give factor ~1.15-1.25"""
        factor = calculate_intensity_factor(45)
        assert 1.10 < factor < 1.30, f"Expected factor ~1.15-1.25, got {factor}"
    
    def test_intensity_factor_high(self):
        """High volume should give factor ~1.35+"""
        factor = calculate_intensity_factor(70)
        assert factor > 1.30, f"Expected factor > 1.30, got {factor}"
    
    def test_intensity_factor_linear_interpolation(self):
        """Test that interpolation is smooth (not step-based)"""
        factor_39 = calculate_intensity_factor(39)
        factor_40 = calculate_intensity_factor(40)
        factor_41 = calculate_intensity_factor(41)
        
        # Should be smooth progression, not jumps
        diff1 = factor_40 - factor_39
        diff2 = factor_41 - factor_40
        
        assert abs(diff1 - diff2) < 0.01, "Interpolation should be smooth"


class TestEffectiveDuration:
    """Test effective duration calculation with gap detection"""
    
    def test_continuous_session(self):
        """Continuous session should count all time"""
        actions = [
            {'timestamp': 1000, 'duration': 20},
            {'timestamp': 1200, 'duration': 20},
            {'timestamp': 1400, 'duration': 20},
        ]
        duration, is_post_edit = calculate_effective_duration(actions)
        assert duration == 60, f"Expected 60 minutes, got {duration}"
        assert not is_post_edit, "Should not detect post-edit for continuous session"
    
    def test_post_edit_detection(self):
        """Large gap (>15min) should trigger post-edit flag"""
        actions = [
            {'timestamp': 1000, 'duration': 20},  # Ends at 1000 + 1200 = 2200
            {'timestamp': 3600, 'duration': 20},  # Starts at 3600 (1400 sec gap = 23 min)
        ]
        duration, is_post_edit = calculate_effective_duration(actions)
        assert is_post_edit, "Should detect post-edit for large gap"
    
    def test_empty_actions(self):
        """Empty actions should return 0 duration"""
        duration, is_post_edit = calculate_effective_duration([])
        assert duration == 0, "Empty actions should give 0 duration"


class TestCalorieCalculation:
    """Integration tests for full calorie calculation"""
    
    def test_strength_training_basic(self):
        """Basic strength training should produce reasonable calories"""
        actions = [
            {
                'type': 'strength',
                'body_part': 'chest',
                'sets': 4,
                'reps': 8,
                'weight': 80,
                'duration': 20,
                'timestamp': 1000
            }
        ]
        user = {'weight': 75, 'height': 180, 'age': 25, 'gender': 'male'}
        
        result = calculate_workout_calories(actions, user)
        
        assert result.work_calories > 0, "Work calories should be positive"
        assert result.gross_calories > 0, "Gross calories should be positive"
        assert result.gross_calories < 1000, "Gross calories should be reasonable"
    
    def test_cardio_training(self):
        """Cardio training should be calculated separately"""
        actions = [
            {
                'type': 'cardio',
                'exercise': 'Running',
                'cardio_type': 'high',
                'duration': 30,
                'timestamp': 1000
            }
        ]
        user = {'weight': 75, 'height': 180, 'age': 25, 'gender': 'male'}
        
        result = calculate_workout_calories(actions, user)
        
        assert result.cardio_calories > 0, "Cardio calories should be positive"
        assert result.work_calories == 0, "Work calories should be 0 for cardio-only"
    
    def test_mixed_training(self):
        """Mixed strength + cardio should sum correctly"""
        actions = [
            {
                'type': 'strength',
                'body_part': 'legs',
                'sets': 5,
                'reps': 5,
                'weight': 100,
                'duration': 30,
                'timestamp': 1000
            },
            {
                'type': 'cardio',
                'exercise': 'Treadmill',
                'cardio_type': 'medium',
                'duration': 15,
                'timestamp': 2000
            }
        ]
        user = {'weight': 75, 'height': 180, 'age': 25, 'gender': 'male'}
        
        result = calculate_workout_calories(actions, user)
        
        assert result.work_calories > 0, "Work calories should be positive"
        assert result.cardio_calories > 0, "Cardio calories should be positive"
        assert result.gross_calories > result.work_calories, "Gross should include cardio"
    
    def test_bmr_factor_applied(self):
        """BMR factor should affect total calories"""
        actions = [
            {
                'type': 'strength',
                'body_part': 'chest',
                'sets': 4,
                'reps': 8,
                'weight': 80,
                'duration': 20,
                'timestamp': 1000
            }
        ]
        
        # Standard profile
        user_standard = {'weight': 75, 'height': 180, 'age': 25, 'gender': 'male'}
        result_standard = calculate_workout_calories(actions, user_standard)
        
        # Heavy profile (should have higher calories)
        user_heavy = {'weight': 100, 'height': 180, 'age': 25, 'gender': 'male'}
        result_heavy = calculate_workout_calories(actions, user_heavy)
        
        assert result_heavy.gross_calories > result_standard.gross_calories, \
            "Heavier person should burn more calories"


class TestRegressionScenarios:
    """Regression tests with real-world scenarios"""
    
    def test_scenario_1_standard_workout(self):
        """Scenario 1: Standard 60-minute mixed training"""
        with open('examples/sample_input_1.json', 'r') as f:
            input_data = json.load(f)
        
        user = input_data['user']
        actions = input_data['actions']
        
        result = calculate_workout_calories(actions, user)
        
        # Should be in reasonable range (400-600 kcal for 60min mixed training)
        assert 400 < result.gross_calories < 600, \
            f"Expected 400-600 kcal, got {result.gross_calories}"
    
    def test_scenario_2_post_edit_cardio(self):
        """Scenario 2: Post-edit cardio (large time gap)"""
        with open('examples/sample_input_2.json', 'r') as f:
            input_data = json.load(f)
        
        user = input_data['user']
        actions = input_data['actions']
        
        duration, is_post_edit = calculate_effective_duration(actions)
        
        # Should detect post-edit
        assert is_post_edit, "Should detect post-edit scenario"
    
    def test_scenario_3_pure_strength(self):
        """Scenario 3: Pure strength training (shoulders)"""
        actions = [
            {
                'type': 'strength',
                'body_part': 'shoulders',
                'sets': 3,
                'reps': 10,
                'weight': 40,
                'duration': 15,
                'timestamp': 1000
            }
        ]
        user = {'weight': 70, 'height': 175, 'age': 28, 'gender': 'male'}
        
        result = calculate_workout_calories(actions, user)
        
        # Shoulders are smaller muscle group, should be conservative
        assert 100 < result.work_calories < 250, \
            f"Expected 100-250 kcal for shoulder training, got {result.work_calories}"


class TestEdgeCases:
    """Test edge cases and boundary conditions"""
    
    def test_zero_weight_user(self):
        """Zero weight should not crash"""
        actions = [{'type': 'strength', 'body_part': 'chest', 'sets': 1, 'reps': 1, 'weight': 50, 'duration': 10, 'timestamp': 1000}]
        user = {'weight': 0, 'height': 180, 'age': 25, 'gender': 'male'}
        
        # Should handle gracefully (use default or minimum)
        result = calculate_workout_calories(actions, user)
        assert result.gross_calories >= 0, "Should not produce negative calories"
    
    def test_empty_actions(self):
        """Empty actions list should return zero calories"""
        user = {'weight': 75, 'height': 180, 'age': 25, 'gender': 'male'}
        result = calculate_workout_calories([], user)
        
        assert result.gross_calories == 0, "Empty actions should give 0 calories"


if __name__ == '__main__':
    import pytest
    pytest.main([__file__, '-v'])
