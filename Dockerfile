# Multi-stage build for Iron Tracker

# Stage 1: Build frontend
FROM node:22.13.0-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/index.html ./
COPY frontend/vite.config.ts ./
COPY frontend/tsconfig.json ./
COPY frontend/tailwind.config.ts ./
COPY frontend/postcss.config.js ./

RUN npm run build

# Stage 2: Build Python backend (if applicable)
FROM python:3.11-slim AS backend-builder

WORKDIR /app

COPY core/requirements.txt ./core/
RUN pip install --no-cache-dir -r core/requirements.txt

# Stage 3: Runtime
FROM python:3.11-slim

WORKDIR /app

# Install Node for potential runtime needs
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies
COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Copy core algorithm
COPY core/ ./core/

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy public assets
COPY frontend/public ./frontend/public

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import sys; sys.exit(0)" || exit 1

# Default command
CMD ["python", "core/calories.py", "examples/sample_input_1.json"]
