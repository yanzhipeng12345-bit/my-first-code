#!/bin/bash

# Iron Tracker Example Runner
# Usage: ./examples/run_example.sh [scenario]
# Scenarios: 1, 2, all (default: all)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🏋️  Iron Tracker Calorie Calculator - Example Runner"
echo "=================================================="
echo ""

# Verify Python and dependencies
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 not found. Please install Python 3.11+"
    exit 1
fi

echo "✓ Python version: $(python3 --version)"

# Check for pyyaml
if ! python3 -c "import yaml" 2>/dev/null; then
    echo "⚠️  Installing pyyaml..."
    pip install pyyaml
fi

echo ""

# Function to run a scenario
run_scenario() {
    local scenario=$1
    local input_file="$SCRIPT_DIR/sample_input_${scenario}.json"
    local expected_file="$SCRIPT_DIR/sample_output_${scenario}.json"
    
    if [ ! -f "$input_file" ]; then
        echo "❌ Input file not found: $input_file"
        return 1
    fi
    
    echo "📋 Scenario $scenario: Running calorie calculation..."
    echo "   Input: $input_file"
    
    # Run the algorithm
    output=$(python3 "$PROJECT_ROOT/core/calories.py" "$input_file" 2>&1)
    
    if [ $? -ne 0 ]; then
        echo "❌ Algorithm failed:"
        echo "$output"
        return 1
    fi
    
    echo "✓ Algorithm executed successfully"
    echo ""
    echo "📊 Output:"
    echo "$output" | python3 -m json.tool 2>/dev/null || echo "$output"
    echo ""
    
    # Compare with expected output (if exists)
    if [ -f "$expected_file" ]; then
        echo "🔍 Comparing with expected output..."
        
        # Extract gross_calories from both
        actual_calories=$(echo "$output" | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('calories', {}).get('gross_calories', 0))" 2>/dev/null || echo "0")
        expected_calories=$(python3 -c "import json; data = json.load(open('$expected_file')); print(data.get('calories', {}).get('gross_calories', 0))" 2>/dev/null || echo "0")
        
        # Allow 10% tolerance
        tolerance=$(python3 -c "print(abs(float($expected_calories) * 0.1))")
        diff=$(python3 -c "print(abs(float($actual_calories) - float($expected_calories)))")
        
        if python3 -c "exit(0 if float($diff) <= float($tolerance) else 1)"; then
            echo "✓ Output matches expected (±10% tolerance)"
            echo "  Expected: $expected_calories kcal"
            echo "  Actual:   $actual_calories kcal"
        else
            echo "⚠️  Output differs from expected:"
            echo "  Expected: $expected_calories kcal"
            echo "  Actual:   $actual_calories kcal"
            echo "  Difference: $diff kcal"
        fi
    fi
    
    echo ""
    echo "✓ Scenario $scenario completed"
    echo "=================================================="
    echo ""
}

# Determine which scenarios to run
scenario=${1:-all}

case $scenario in
    1)
        run_scenario 1
        ;;
    2)
        run_scenario 2
        ;;
    all)
        run_scenario 1
        run_scenario 2
        ;;
    *)
        echo "❌ Unknown scenario: $scenario"
        echo "Usage: ./examples/run_example.sh [1|2|all]"
        exit 1
        ;;
esac

echo "🎉 All examples completed successfully!"
