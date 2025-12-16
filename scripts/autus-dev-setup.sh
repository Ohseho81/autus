#!/bin/bash
# ╔════════════════════════════════════════════════════════════╗
# ║  AUTUS — Complete Development Environment Setup            ║
# ║  "See the Future. Don't Touch It."                         ║
# ╚════════════════════════════════════════════════════════════╝

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  AUTUS Development Environment Setup                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================
# Configuration
# ============================================
AUTUS_ROOT="$HOME/Desktop/autus"
VENV_NAME="venv"

# ============================================
# 1. Create Project Structure
# ============================================
echo "[1/7] Creating project structure..."

mkdir -p "$AUTUS_ROOT"
cd "$AUTUS_ROOT"

# Backend
mkdir -p app/physics
mkdir -p app/api
mkdir -p alembic/versions

# Frontend
mkdir -p frontend/assets
mkdir -p frontend/packs

# Extension
mkdir -p extension/icons

# Docs & Tests
mkdir -p docs
mkdir -p tests

# Config
mkdir -p config

echo "✓ Project structure created"

# ============================================
# 2. Create requirements.txt
# ============================================
echo "[2/7] Creating requirements.txt..."

cat > requirements.txt << 'EOF'
# AUTUS Development Dependencies

# Core Framework
fastapi>=0.109.0
uvicorn[standard]>=0.27.0

# Database
sqlalchemy>=2.0.25
asyncpg>=0.29.0
alembic>=1.13.0

# Validation
pydantic>=2.5.0
pydantic-settings>=2.1.0

# Environment
python-dotenv>=1.0.0

# HTTP Client (for testing)
httpx>=0.26.0

# Testing
pytest>=7.4.0
pytest-asyncio>=0.23.0

# Development
black>=23.12.0
ruff>=0.1.0

# Optional: Redis (EP10-②)
# redis>=5.0.0
EOF

echo "✓ requirements.txt created"

# ============================================
# 3. Create .env
# ============================================
echo "[3/7] Creating .env..."

cat > .env << 'EOF'
# AUTUS Development Environment

# Database (Local PostgreSQL)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/autus

# App
APP_NAME=AUTUS
APP_VERSION=1.0.0
DEBUG=true

# API
API_PREFIX=/api/v1

# CORS
CORS_ORIGINS=*

# Server
HOST=0.0.0.0
PORT=8000
EOF

echo "✓ .env created"

# ============================================
# 4. Create Python Virtual Environment
# ============================================
echo "[4/7] Creating Python virtual environment..."

if command -v python3 &> /dev/null; then
    python3 -m venv "$VENV_NAME"
    echo "✓ Virtual environment created: $VENV_NAME"
    
    # Activate and install
    source "$VENV_NAME/bin/activate"
    pip install --upgrade pip
    pip install -r requirements.txt
    echo "✓ Dependencies installed"
else
    echo "⚠️ Python3 not found. Please install Python 3.11+"
fi

# ============================================
# 5. Create Git Repository
# ============================================
echo "[5/7] Initializing Git repository..."

if [ ! -d ".git" ]; then
    git init
    
    # .gitignore
    cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
.venv/
ENV/

# IDE
.idea/
.vscode/
*.swp
*.swo
.DS_Store

# Environment
.env
.env.local
*.local

# Database
*.db
*.sqlite

# Logs
*.log
logs/

# Build
dist/
build/
*.egg-info/

# Test
.pytest_cache/
.coverage
htmlcov/

# Alembic
alembic/versions/*.pyc
EOF

    git add .gitignore
    echo "✓ Git repository initialized"
else
    echo "✓ Git repository already exists"
fi

# ============================================
# 6. Create VS Code Settings
# ============================================
echo "[6/7] Creating VS Code settings..."

mkdir -p .vscode

cat > .vscode/settings.json << 'EOF'
{
    "python.defaultInterpreterPath": "${workspaceFolder}/venv/bin/python",
    "python.formatting.provider": "none",
    "[python]": {
        "editor.defaultFormatter": "ms-python.black-formatter",
        "editor.formatOnSave": true
    },
    "editor.rulers": [88],
    "files.exclude": {
        "**/__pycache__": true,
        "**/*.pyc": true,
        "**/venv": true
    },
    "python.analysis.typeCheckingMode": "basic",
    "python.linting.enabled": true
}
EOF

cat > .vscode/launch.json << 'EOF'
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "AUTUS Server",
            "type": "python",
            "request": "launch",
            "module": "uvicorn",
            "args": ["app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
            "cwd": "${workspaceFolder}",
            "env": {
                "DEBUG": "true"
            }
        },
        {
            "name": "AUTUS Tests",
            "type": "python",
            "request": "launch",
            "module": "pytest",
            "args": ["-v", "tests/"],
            "cwd": "${workspaceFolder}"
        }
    ]
}
EOF

echo "✓ VS Code settings created"

# ============================================
# 7. Create Run Scripts
# ============================================
echo "[7/7] Creating run scripts..."

# Development server
cat > run-dev.sh << 'EOF'
#!/bin/bash
# AUTUS Development Server

source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
EOF
chmod +x run-dev.sh

# Database migration
cat > run-migrate.sh << 'EOF'
#!/bin/bash
# AUTUS Database Migration

source venv/bin/activate

case "$1" in
    init)
        alembic revision --autogenerate -m "init"
        ;;
    up)
        alembic upgrade head
        ;;
    down)
        alembic downgrade -1
        ;;
    *)
        echo "Usage: ./run-migrate.sh [init|up|down]"
        ;;
esac
EOF
chmod +x run-migrate.sh

# Test runner
cat > run-test.sh << 'EOF'
#!/bin/bash
# AUTUS Test Runner

source venv/bin/activate
pytest -v tests/
EOF
chmod +x run-test.sh

# Format code
cat > run-format.sh << 'EOF'
#!/bin/bash
# AUTUS Code Formatter

source venv/bin/activate
black app/ tests/
ruff check app/ tests/ --fix
EOF
chmod +x run-format.sh

echo "✓ Run scripts created"

# ============================================
# Summary
# ============================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ AUTUS Development Environment Ready                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📁 Location: $AUTUS_ROOT"
echo ""
echo "📂 Structure:"
echo "autus/"
echo "├── app/                 # Backend (FastAPI)"
echo "│   ├── main.py"
echo "│   ├── physics/"
echo "│   └── api/"
echo "├── alembic/             # DB Migrations"
echo "├── extension/           # Chrome Extension"
echo "├── frontend/            # HUD Frontend"
echo "├── tests/               # Test Suite"
echo "├── docs/                # Documentation"
echo "├── venv/                # Python Environment"
echo "├── requirements.txt"
echo "├── .env"
echo "└── run-*.sh             # Run Scripts"
echo ""
echo "🚀 Quick Start:"
echo ""
echo "   cd $AUTUS_ROOT"
echo "   source venv/bin/activate"
echo "   ./run-dev.sh"
echo ""
echo "📍 Server: http://localhost:8000"
echo "📍 Docs:   http://localhost:8000/docs"
echo ""
