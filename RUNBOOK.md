# Iron Tracker Runbook: Deployment & Operations

## Quick Start

### Minimum Setup (Algorithm Only)

```bash
# 1. Install Python 3.11+
python3 --version

# 2. Install dependencies
pip install pyyaml

# 3. Run example
python core/calories.py examples/sample_input_1.json

# Expected output: JSON with calorie breakdown
```

### Full Stack Deployment

```bash
# 1. Clone or extract the package
tar -xzf irontracker_full_export_YYYYMMDD.tar.gz
cd irontracker_export_YYYYMMDD

# 2. Using Docker Compose (recommended)
docker-compose up -d

# 3. Access services
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
# Database: localhost:5432
```

## System Requirements

### Minimum

- Python 3.11+
- Node.js 22.13.0+
- 2GB RAM
- 500MB disk space

### Recommended

- Python 3.11+
- Node.js 22.13.0+
- PostgreSQL 15+
- Docker & Docker Compose
- 4GB RAM
- 2GB disk space

## Installation Steps

### 1. Backend Setup

```bash
cd irontracker_export_YYYYMMDD

# Install Python dependencies
pip install -r core/requirements.txt

# Verify installation
python core/calories.py examples/sample_input_1.json
```

### 2. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install
# or
pnpm install

# Build for production
npm run build

# Or run development server
npm run dev
```

### 3. Database Setup

```bash
# Using PostgreSQL directly
psql -U postgres -d iron_tracker -f db/schema.sql

# Or using Docker
docker run -d \
  --name iron-tracker-db \
  -e POSTGRES_DB=iron_tracker \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  postgres:15-alpine

# Apply schema
docker exec -i iron-tracker-db psql -U admin -d iron_tracker < db/schema.sql
```

## Configuration

### Environment Variables

Create `.env` file in project root:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iron_tracker
DB_USER=admin
DB_PASSWORD=secure_password

# Backend
BACKEND_PORT=8000
LOG_LEVEL=INFO
PYTHONUNBUFFERED=1

# Frontend
VITE_API_URL=http://localhost:8000
VITE_APP_TITLE=Iron Tracker
VITE_APP_LOGO=/logo.svg

# Secrets (use secure vault in production)
JWT_SECRET=your_jwt_secret_here
API_KEY=your_api_key_here
```

### Secrets Management

**NEVER commit secrets to version control.**

**Production Approach:**

1. Use environment variables from secure vault (AWS Secrets Manager, HashiCorp Vault, etc.)
2. Inject at runtime: `docker run -e DB_PASSWORD=$SECRET_PASSWORD ...`
3. Or use `.env` file (ensure it's in `.gitignore`)

**Example with AWS Secrets Manager:**

```bash
SECRET=$(aws secretsmanager get-secret-value --secret-id iron-tracker-db-password --query SecretString --output text)
export DB_PASSWORD=$SECRET
docker-compose up
```

## Deployment Scenarios

### Scenario 1: Local Development

```bash
# Terminal 1: Backend
cd core
python -m http.server 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Scenario 2: Docker Compose (Recommended)

```bash
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Scenario 3: Kubernetes (Production)

```bash
# Apply manifests
kubectl apply -f infra/k8s/

# Check deployment
kubectl get pods -n iron-tracker

# View logs
kubectl logs -n iron-tracker deployment/iron-tracker-backend
```

## Smoke Tests

### Test 1: Algorithm Functionality

```bash
python core/calories.py examples/sample_input_1.json > /tmp/output.json

# Verify output structure
python -c "import json; data = json.load(open('/tmp/output.json')); assert 'calories' in data; print('✓ Algorithm test passed')"
```

### Test 2: Frontend Build

```bash
cd frontend
npm run build
test -d dist && echo "✓ Frontend build successful" || echo "✗ Build failed"
```

### Test 3: Database Connection

```bash
psql -h localhost -U admin -d iron_tracker -c "SELECT version();"
# Expected: PostgreSQL version output
```

### Test 4: API Endpoint (if backend server running)

```bash
curl -X POST http://localhost:8000/api/calculate \
  -H "Content-Type: application/json" \
  -d @examples/sample_input_1.json
```

## Monitoring & Logging

### Backend Logs

```bash
# Docker
docker logs iron-tracker-backend

# Direct
tail -f logs/backend.log
```

### Frontend Logs

```bash
# Browser console
# Open http://localhost:5173 and check browser DevTools
```

### Database Logs

```bash
# Docker
docker logs iron-tracker-db

# Direct PostgreSQL
tail -f /var/log/postgresql/postgresql.log
```

## Backup & Recovery

### Database Backup

```bash
# Full dump
pg_dump -U admin -d iron_tracker > backup_$(date +%Y%m%d).sql

# With compression
pg_dump -U admin -d iron_tracker | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Database Restore

```bash
# From dump
psql -U admin -d iron_tracker < backup_20250102.sql

# From compressed dump
gunzip -c backup_20250102.sql.gz | psql -U admin -d iron_tracker
```

## Troubleshooting

### Issue: Algorithm crashes with "config.yaml not found"

**Solution:**

```bash
# Ensure config.yaml is in core/ directory
ls -la core/config.yaml

# Or specify config path
export CONFIG_PATH=/path/to/config.yaml
python core/calories.py examples/sample_input_1.json
```

### Issue: Frontend build fails

**Solution:**

```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Database connection refused

**Solution:**

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Or for local PostgreSQL
sudo systemctl status postgresql

# Verify credentials
psql -h localhost -U admin -d iron_tracker -c "SELECT 1;"
```

### Issue: Port already in use

**Solution:**

```bash
# Find process using port 5173
lsof -i :5173

# Kill process
kill -9 <PID>

# Or use different port
PORT=5174 npm run dev
```

## Performance Tuning

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_sessions_user_date ON sessions(user_id, session_date);
CREATE INDEX idx_actions_session ON actions(session_id);

-- Vacuum and analyze
VACUUM ANALYZE;
```

### Frontend Optimization

```bash
# Build with production optimizations
npm run build

# Check bundle size
npm run build -- --analyze
```

## Security Checklist

- [ ] Secrets are not in version control
- [ ] Database password is strong (>12 characters, mixed case, numbers, symbols)
- [ ] HTTPS is enabled in production
- [ ] API authentication is implemented (JWT or OAuth)
- [ ] Database backups are encrypted
- [ ] Logs don't contain sensitive data
- [ ] CORS is properly configured
- [ ] SQL injection prevention (use parameterized queries)

## Rollback Procedure

### If deployment fails:

```bash
# 1. Stop current deployment
docker-compose down

# 2. Restore previous database backup
psql -U admin -d iron_tracker < backup_previous.sql

# 3. Checkout previous code version
git checkout <previous_commit>

# 4. Rebuild and restart
docker-compose up -d

# 5. Verify
curl http://localhost:8000/health
```

## Support & Escalation

- **Algorithm Issues**: Check `docs/ALGORITHM_SPEC.md`
- **Database Issues**: Check PostgreSQL logs and run `VACUUM ANALYZE`
- **Frontend Issues**: Check browser console and network tab
- **Infrastructure Issues**: Check Docker/Kubernetes logs

## Version Information

- **Algorithm**: v4.5.1
- **Frontend**: React 19 + Tailwind 4
- **Backend**: Python 3.11
- **Database**: PostgreSQL 15
- **Docker**: Latest stable
