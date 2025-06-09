.PHONY: help install install-dev format lint type-check test test-cov run docker-build docker-run clean

# Default target
help:
	@echo "Available commands:"
	@echo "  make install       - Install production dependencies"
	@echo "  make install-dev   - Install all dependencies including dev"
	@echo "  make format        - Format code with ruff"
	@echo "  make format-check  - Check code formatting without changes"
	@echo "  make lint          - Run linting checks"
	@echo "  make type-check    - Run type checking with ty"
	@echo "  make test          - Run tests"
	@echo "  make test-cov      - Run tests with coverage"
	@echo "  make run           - Run the development server"
	@echo "  make docker-build  - Build Docker image"
	@echo "  make docker-run    - Run Docker container"
	@echo "  make clean         - Clean up generated files"

# Install production dependencies
install:
	uv sync --frozen --no-dev

# Install all dependencies including dev
install-dev:
	uv sync --frozen

# Format code
format:
	uv run ruff format .
	uv run ruff check --fix .

# Check formatting without making changes
format-check:
	uv run ruff format --check .

# Run linting
lint:
	uv run ruff check .

# Run type checking
type-check:
	uv run ty check *.py

# Run tests
test:
	uv run pytest

# Run tests with coverage
test-cov:
	uv run pytest --cov

# Run development server
run:
	uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Build Docker image
docker-build:
	docker build -t thunderbolt-backend:latest .

# Run Docker container
docker-run:
	docker run -p 8000:8000 --env-file .env thunderbolt-backend:latest

# Clean up
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type f -name ".coverage" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	find . -type d -name ".ty_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	find . -type d -name "htmlcov" -exec rm -rf {} + 