# 🔭 Happy-Observatory Poetry → UV Migration Guide

## Overview

Happy-Observatory is the monitoring and observability system for the Happy ecosystem. It collects metrics, traces, and logs from all components and depends heavily on shared-config for type definitions and configuration.

## Architecture Context

```
happy-observatory/
├── collectors/           # Metric collection agents
│   ├── system/          # System metrics collector
│   ├── application/     # App metrics collector
│   └── custom/          # Custom metric handlers
├── processors/          # Data processing pipeline
│   ├── aggregators/     # Metric aggregation
│   └── transformers/    # Data transformation
├── storage/             # Time-series storage
├── api/                 # Query API
├── dashboard/           # Grafana dashboards
└── pyproject.toml      # Poetry config to migrate
```

## Pre-Migration Requirements

### ✅ Prerequisites
- [ ] shared-config migration complete and packages published
- [ ] UV installed (`brew install uv`)
- [ ] GitHub Packages access configured
- [ ] Document all collector dependencies

### 📊 Dependency Audit
```bash
cd ~/Development/business-org/happy-observatory

# Export current dependencies
poetry show --tree > migration-audit/deps-tree.txt
poetry export -f requirements.txt > migration-audit/requirements.txt

# Check for shared-config usage
grep -r "business-org-shared-config" . > migration-audit/shared-config-usage.txt
grep -r "observatory-types" . > migration-audit/observatory-types-usage.txt

# List all collectors
find collectors -name "*.py" -exec basename {} \; | sort > migration-audit/collectors.txt
```

## Migration Steps

### Phase 1: Project Setup

#### 1. Create Migration Branch
```bash
git checkout main
git pull origin main
git checkout -b chore/migrate-to-uv-observatory

# Backup current configuration
cp pyproject.toml pyproject.toml.poetry-backup
cp poetry.lock poetry.lock.backup
```

#### 2. Run UV Migration
```bash
# Use the migration tool
uvx migrate-to-uv

# Create Python version file
echo "3.13" > .python-version
```

### Phase 2: Update Configuration

#### 1. Enhanced pyproject.toml
```toml
[project]
name = "happy-observatory"
version = "2.0.0"
description = "Monitoring and observability for Happy ecosystem"
readme = "README.md"
requires-python = ">=3.12"
license = {text = "MIT"}
authors = [
    {name = "Happy Patterns Org", email = "observatory@happypatterns.org"}
]

dependencies = [
    # Shared packages
    "business-org-shared-config>=1.0.0",
    
    # Metrics collection
    "prometheus-client>=0.20.0",
    "opentelemetry-api>=1.24.0",
    "opentelemetry-sdk>=1.24.0",
    "opentelemetry-instrumentation>=0.45b0",
    
    # System monitoring
    "psutil>=5.9.0",
    "py-cpuinfo>=9.0.0",
    
    # Data processing
    "pandas>=2.0.0",
    "numpy>=1.24.0",
    
    # Storage
    "influxdb-client>=1.38.0",
    "redis>=5.0.0",
    
    # API
    "fastapi>=0.100.0",
    "uvicorn[standard]>=0.30.0",
    
    # Async support
    "aiofiles>=23.0.0",
    "aiocron>=1.8",
    
    # Utilities
    "structlog>=24.0.0",
    "pydantic>=2.0.0",
    "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
# Collector-specific dependencies
docker = ["docker>=7.0.0"]
kubernetes = ["kubernetes>=28.0.0"]
aws = ["boto3>=1.28.0"]
gcp = ["google-cloud-monitoring>=2.15.0"]

[project.scripts]
observatory-collector = "collectors.main:main"
observatory-processor = "processors.main:main"
observatory-api = "api.main:main"

[tool.uv]
package = true
env-file = ".env"

# GitHub Packages configuration
index-url = "https://pypi.org/simple"
extra-index-url = ["https://pypi.pkg.github.com/happy-patterns-org"]

# Compile bytecode for performance
compile-bytecode = true

[tool.uv.dev-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "pytest-benchmark>=4.0.0",
    "mypy>=1.11.0",
    "ruff>=0.6.0",
    "black>=23.0",
    "httpx>=0.27.0",
    "fakeredis>=2.20.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["collectors", "processors", "storage", "api"]
```

### Phase 3: Collector Updates

#### 1. Base Collector with Shared Config
```python
# collectors/base.py
from abc import ABC, abstractmethod
from typing import AsyncIterator
import structlog
from shared_config import Config
from observatory_types import MetricEvent, MetricType

logger = structlog.get_logger()

class BaseCollector(ABC):
    """Base class for all metric collectors"""
    
    def __init__(self):
        self.config = Config()
        self.enabled = True
        self.collection_interval = self.config.observatory_collection_interval
    
    @abstractmethod
    async def collect(self) -> AsyncIterator[MetricEvent]:
        """Collect metrics"""
        pass
    
    async def run(self):
        """Main collection loop"""
        logger.info(f"Starting {self.__class__.__name__}")
        
        while self.enabled:
            try:
                async for metric in self.collect():
                    await self.publish(metric)
            except Exception as e:
                logger.error(f"Collection error: {e}")
            
            await asyncio.sleep(self.collection_interval)
```

#### 2. System Metrics Collector
```python
# collectors/system/cpu.py
import psutil
from collectors.base import BaseCollector
from observatory_types import MetricEvent, MetricType

class CPUCollector(BaseCollector):
    """Collect CPU metrics"""
    
    async def collect(self) -> AsyncIterator[MetricEvent]:
        cpu_percent = psutil.cpu_percent(interval=1)
        
        yield MetricEvent(
            name="system.cpu.usage",
            value=cpu_percent,
            type=MetricType.GAUGE,
            tags={
                "host": self.config.hostname,
                "collector": "cpu"
            }
        )
        
        # Per-core metrics
        for i, percent in enumerate(psutil.cpu_percent(percpu=True)):
            yield MetricEvent(
                name="system.cpu.core.usage",
                value=percent,
                type=MetricType.GAUGE,
                tags={
                    "host": self.config.hostname,
                    "core": str(i),
                    "collector": "cpu"
                }
            )
```

### Phase 4: Processing Pipeline

#### 1. Metric Processor
```python
# processors/aggregator.py
from typing import List
import pandas as pd
from shared_config import Config
from observatory_types import MetricEvent, AggregatedMetric

class MetricAggregator:
    """Aggregate metrics over time windows"""
    
    def __init__(self):
        self.config = Config()
        self.window_size = self.config.observatory_aggregation_window
        self.buffer: List[MetricEvent] = []
    
    def add(self, metric: MetricEvent):
        """Add metric to buffer"""
        self.buffer.append(metric)
    
    def aggregate(self) -> List[AggregatedMetric]:
        """Perform aggregation"""
        if not self.buffer:
            return []
        
        # Convert to DataFrame for easy aggregation
        df = pd.DataFrame([m.dict() for m in self.buffer])
        
        # Group by metric name and tags
        grouped = df.groupby(['name', 'tags'])
        
        results = []
        for (name, tags), group in grouped:
            results.append(AggregatedMetric(
                name=name,
                tags=dict(tags) if isinstance(tags, dict) else {},
                count=len(group),
                sum=group['value'].sum(),
                mean=group['value'].mean(),
                min=group['value'].min(),
                max=group['value'].max(),
                p50=group['value'].quantile(0.5),
                p95=group['value'].quantile(0.95),
                p99=group['value'].quantile(0.99),
                timestamp=group['timestamp'].max()
            ))
        
        return results
```

### Phase 5: Build and Deployment

#### 1. Makefile
```makefile
.PHONY: help bootstrap test build run-collector run-api docker

help:
	@echo "Happy Observatory - UV Build System"
	@echo "  bootstrap      - Set up development environment"
	@echo "  test          - Run all tests"
	@echo "  test-perf     - Run performance benchmarks"
	@echo "  run-collector - Start metric collectors"
	@echo "  run-api       - Start query API"
	@echo "  docker        - Build Docker images"

bootstrap:
	@echo "🔭 Bootstrapping Happy Observatory..."
	@which uv || brew install uv
	uv sync
	@echo "✅ Bootstrap complete"

test:
	@echo "🧪 Running tests..."
	uv run pytest tests/ -v
	uv run mypy collectors/ processors/ api/

test-perf:
	@echo "⚡ Running performance benchmarks..."
	uv run pytest tests/benchmarks/ -v --benchmark-only

run-collector:
	@echo "📊 Starting metric collectors..."
	uv run observatory-collector

run-api:
	@echo "🌐 Starting Observatory API..."
	uv run uvicorn api.main:app --reload

docker:
	@echo "🐳 Building Docker images..."
	docker build -f docker/Dockerfile.collector -t happy-observatory-collector .
	docker build -f docker/Dockerfile.api -t happy-observatory-api .
```

#### 2. Dockerfile for Collectors
```dockerfile
# docker/Dockerfile.collector
FROM python:3.13-slim

# Install system dependencies for psutil
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install UV
RUN pip install uv

WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Configure GitHub Packages access
ARG GITHUB_TOKEN
ENV UV_EXTRA_INDEX_URL="https://${GITHUB_TOKEN}@pypi.pkg.github.com/happy-patterns-org"

# Install dependencies
RUN uv sync --frozen --no-dev

# Copy application code
COPY collectors ./collectors
COPY processors ./processors
COPY storage ./storage

# Run collectors
CMD ["uv", "run", "observatory-collector"]
```

### Phase 6: CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: Observatory CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.12', '3.13']
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install UV
        run: |
          curl -LsSf https://astral.sh/uv/install.sh | sh
          echo "$HOME/.cargo/bin" >> $GITHUB_PATH
      
      - name: Set up Python with UV
        run: |
          uv python install ${{ matrix.python-version }}
          uv python pin ${{ matrix.python-version }}
      
      - name: Configure GitHub Packages
        run: |
          echo "UV_EXTRA_INDEX_URL=https://${{ secrets.GITHUB_TOKEN }}@pypi.pkg.github.com/happy-patterns-org" >> $GITHUB_ENV
      
      - name: Cache UV
        uses: actions/cache@v4
        with:
          path: ~/.cache/uv
          key: ${{ runner.os }}-uv-${{ hashFiles('uv.lock') }}
      
      - name: Install dependencies
        run: uv sync
      
      - name: Run tests
        run: |
          uv run pytest tests/ -v --cov=collectors --cov=processors
          uv run mypy collectors/ processors/ api/
      
      - name: Run benchmarks
        run: uv run pytest tests/benchmarks/ --benchmark-json=benchmark.json
      
      - name: Upload benchmark results
        uses: actions/upload-artifact@v4
        with:
          name: benchmarks-${{ matrix.python-version }}
          path: benchmark.json

  docker:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push collector
        uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/Dockerfile.collector
          push: true
          tags: ghcr.io/happy-patterns-org/happy-observatory-collector:latest
          build-args: |
            GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN }}
```

### Phase 7: Performance Testing

#### 1. Benchmark Tests
```python
# tests/benchmarks/test_collector_performance.py
import pytest
import asyncio
from collectors.system.cpu import CPUCollector

@pytest.mark.benchmark(group="collectors")
def test_cpu_collector_performance(benchmark):
    """Benchmark CPU collector performance"""
    collector = CPUCollector()
    
    async def collect_once():
        metrics = []
        async for metric in collector.collect():
            metrics.append(metric)
        return metrics
    
    result = benchmark(lambda: asyncio.run(collect_once()))
    assert len(result) > 0
    
    # Performance assertions
    assert benchmark.stats['mean'] < 0.1  # Should complete in < 100ms
```

## Integration Testing

### 1. Test Shared Config Integration
```python
# tests/test_shared_config_integration.py
import pytest
from shared_config import Config
from observatory_types import MetricEvent

def test_config_loading():
    """Test that shared config loads correctly"""
    config = Config()
    assert config.observatory_enabled is True
    assert config.observatory_collection_interval > 0

def test_metric_event_creation():
    """Test creating metric events with shared types"""
    event = MetricEvent(
        name="test.metric",
        value=42.0,
        tags={"test": "true"}
    )
    assert event.name == "test.metric"
    assert event.value == 42.0
```

### 2. End-to-End Test
```bash
#!/bin/bash
# scripts/test-e2e.sh

echo "🔭 Running Observatory E2E tests..."

# Start InfluxDB for storage
docker run -d --name influxdb -p 8086:8086 influxdb:2.7

# Start collectors
uv run observatory-collector &
COLLECTOR_PID=$!

# Start API
uv run observatory-api &
API_PID=$!

# Wait for startup
sleep 10

# Test metric collection
curl http://localhost:8000/metrics

# Test query API
curl http://localhost:8000/api/v1/query?metric=system.cpu.usage

# Cleanup
kill $COLLECTOR_PID $API_PID
docker stop influxdb && docker rm influxdb
```

## Rollback Plan

### Immediate Rollback
```bash
# Restore Poetry files
cp pyproject.toml.poetry-backup pyproject.toml
cp poetry.lock.backup poetry.lock

# Clean UV environment
rm -rf .venv
rm -rf ~/.cache/uv

# Reinstall with Poetry
poetry install

# Revert Git changes
git checkout main
git branch -D chore/migrate-to-uv-observatory
```

### Docker Rollback
1. Use previous image tags
2. Update Kubernetes deployments
3. Monitor metric collection

## Performance Metrics

### Collection Performance
| Metric | Poetry | UV (Target) |
|--------|--------|------------|
| Startup time | 30s | 3s |
| Memory usage | 150MB | 100MB |
| CPU overhead | 5% | 2% |
| Collection latency | 100ms | 50ms |

### CI/CD Performance
| Stage | Poetry | UV (Target) |
|-------|--------|------------|
| Dependency install | 3 min | 15 sec |
| Test suite | 5 min | 3 min |
| Docker build | 4 min | 1 min |
| Total pipeline | 12 min | 5 min |

## Verification Checklist

- [ ] All collectors start successfully
- [ ] Metrics are collected and stored
- [ ] API endpoints respond correctly
- [ ] Shared-config imports work
- [ ] Observatory-types are used correctly
- [ ] Docker images build and run
- [ ] Performance benchmarks pass
- [ ] Integration tests pass
- [ ] Grafana dashboards still work

## Common Issues

### Issue: Collector fails to start
```bash
# Check UV environment
uv run python -c "from shared_config import Config; print(Config())"

# Verify GitHub Packages access
uv pip list | grep business-org
```

### Issue: Performance regression
```bash
# Run benchmarks
uv run pytest tests/benchmarks/ -v

# Profile collector
uv run python -m cProfile -o profile.out collectors/main.py
```

### Issue: Docker build fails
```dockerfile
# Ensure build args are passed
docker build --build-arg GITHUB_TOKEN=$GITHUB_TOKEN ...
```

## Next Steps

1. Update Grafana dashboards if needed
2. Document new UV commands for operators
3. Update deployment procedures
4. Monitor collector performance for 72 hours
5. Plan team training session
6. Update runbooks
