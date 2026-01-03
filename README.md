# Iron Tracker - Full Export Package (v4.5.1)

**Complete, production-ready calorie calculation engine + frontend for strength training tracking.**

## Quick Start

### 1. Run Algorithm (Minimal Setup)

```bash
# Install dependencies
pip install pyyaml

# Run example
python core/calories.py examples/sample_input_1.json
```

**Expected Output:**
```json
{
  "calories": {
    "gross_calories": 487.5,
    "net_calories": 487.5,
    "work_calories": 387.2,
    "rest_calories": 45.0,
    "cardio_calories": 55.3,
    "idle_calories": 45.0,
    "bmr_factor": 1.0,
    "epoc_bonus": 19.4
  }
}
```

### 2. Full Stack Deployment (Docker)

```bash
docker-compose up -d

# Access:
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
# Database: localhost:5432
```

## Package Contents

```
irontracker_export_20250102/
├── README.md                    # This file
├── DELIVERY_CHECKLIST.md        # Delivery verification checklist
├── core/
│   ├── calories.py              # Main algorithm (v4.5.1)
│   ├── config.yaml              # All configurable parameters
│   └── requirements.txt          # Python dependencies
├── frontend/
│   ├── src/                     # React source code
│   ├── public/                  # Static assets
│   ├── build_instructions.md    # Frontend setup guide
│   └── package.json             # Node dependencies
├── infra/
│   ├── Dockerfile               # Container image
│   ├── docker-compose.yml       # Multi-service orchestration
│   ├── k8s/                     # Kubernetes manifests
│   └── ci_cd/                   # CI/CD pipeline configs
├── db/
│   ├── schema.sql               # Database schema
│   └── seed_data.sql            # Sample data
├── examples/
│   ├── sample_input_1.json      # Standard training scenario
│   ├── sample_input_2.json      # Post-edit scenario
│   ├── sample_output_1.json     # Expected output
│   └── run_example.sh           # Automated test runner
├── tests/
│   └── test_calories.py         # Unit + regression tests
└── docs/
    ├── ALGORITHM_SPEC.md        # Algorithm specification
    ├── RUNBOOK.md               # Deployment & operations guide
    └── UI_VERIFY.md             # Frontend verification guide
```

## Algorithm Overview

### Core Features

- **Personalized BMR Correction**: Uses Mifflin-St Jeor formula to account for individual metabolism
- **Linear Intensity Scaling**: Smooth intensity factor calculation (no step jumps)
- **Post-Edit Detection**: Identifies when exercises are added after leaving the gym (>15 min gaps)
- **EPOC Compensation**: Adds 5% bonus for high-intensity sessions
- **Conservative Estimation**: Errs on the side of underestimation

### Key Parameters (Configurable in `core/config.yaml`)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Chest MET | 5.1 | +10% from baseline |
| Back MET | 5.1 | +10% from baseline |
| Legs MET | 5.5 | Largest muscle group |
| Shoulders MET | 5.1 | +10% from baseline |
| Arms MET | 4.2 | +10% from baseline |
| Idle MET | 1.8 | Elevated (gym environment) |
| Gap Threshold | 900s | 15 minutes for post-edit detection |

## Testing

### Run All Tests

```bash
# Install test dependencies
pip install pytest pyyaml

# Run test suite
pytest tests/test_calories.py -v

# Expected: 20+ tests passing
```

### Run Examples

```bash
# Scenario 1: Standard training
./examples/run_example.sh 1

# Scenario 2: Post-edit cardio
./examples/run_example.sh 2

# Both scenarios
./examples/run_example.sh all
```

## Deployment

### Option 1: Docker Compose (Recommended)

```bash
docker-compose up -d
```

Includes: Backend, Frontend, PostgreSQL database

### Option 2: Kubernetes

```bash
kubectl apply -f infra/k8s/
```

### Option 3: Manual Setup

See `docs/RUNBOOK.md` for step-by-step instructions.

## Configuration

### Environment Variables

Create `.env` file:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iron_tracker
DB_USER=admin
DB_PASSWORD=secure_password
VITE_API_URL=http://localhost:8000
LOG_LEVEL=INFO
```

### Algorithm Parameters

Edit `core/config.yaml` to adjust:
- MET values by body part
- Intensity factor thresholds
- Gap threshold for post-edit detection
- Idle MET value

## Documentation

- **Algorithm Details**: See `docs/ALGORITHM_SPEC.md`
- **Deployment Guide**: See `docs/RUNBOOK.md`
- **Frontend Setup**: See `frontend/build_instructions.md`
- **UI Verification**: See `docs/UI_VERIFY.md`

## System Requirements

- **Python**: 3.11+
- **Node.js**: 22.13.0+
- **PostgreSQL**: 15+ (optional, for data persistence)
- **Docker**: Latest stable (for containerized deployment)

## Troubleshooting

### Algorithm crashes

```bash
# Verify config.yaml exists
ls -la core/config.yaml

# Install pyyaml
pip install pyyaml
```

### Frontend build fails

```bash
cd frontend
rm -rf node_modules
npm install
npm run build
```

### Database connection refused

```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check credentials
psql -h localhost -U admin -d iron_tracker -c "SELECT 1;"
```

## Support

- **Issues**: Check relevant documentation in `docs/`
- **Tests**: Run `pytest tests/test_calories.py -v` to verify functionality
- **Examples**: Use `./examples/run_example.sh` to test with sample data

## Version Information

- **Algorithm**: v4.5.1 (Optimized with BMR correction, linear intensity scaling, EPOC)
- **Frontend**: React 19 + Tailwind CSS 4
- **Backend**: Python 3.11
- **Database**: PostgreSQL 15
- **Export Date**: 2025-01-02

## License & Compliance

This package is provided for deployment and operational purposes. All source code, configurations, and documentation are included. Refer to your organization's policies for data handling and third-party integrations.

---

**Ready to deploy?** Start with `docker-compose up -d` or see `docs/RUNBOOK.md` for detailed instructions.
