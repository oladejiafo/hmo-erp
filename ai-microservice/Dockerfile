# HMO ERP — AI Microservice
# Docker image based on Python 3.12 slim
#
# Build:  docker build -t hmo-ai-service .
# Run:    docker run -p 8001:8001 --env-file .env hmo-ai-service
# Dev:    docker run -p 8001:8001 -v $(pwd):/app --env-file .env hmo-ai-service

FROM python:3.12-slim

# Prevent .pyc files and enable unbuffered stdout (important for log streaming)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system deps (needed for numpy/scikit-learn compilation on slim)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (layer cache — only rebuilds if requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Non-root user for security
RUN addgroup --system aiservice && adduser --system --ingroup aiservice aiservice
USER aiservice

EXPOSE 8001

# Health check: poll /health every 30s
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]