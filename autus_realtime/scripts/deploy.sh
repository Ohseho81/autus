#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS REALTIME - DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           🚀 AUTUS REALTIME DEPLOYMENT                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        echo -e "${RED}❗ Please edit .env with your actual values before deploying!${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.example not found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Parse command
COMMAND=${1:-docker}

case $COMMAND in
    docker)
        echo -e "${BLUE}🐳 Deploying with Docker Compose...${NC}"
        
        # Build and start services
        docker-compose -f docker-compose.prod.yml up -d --build
        
        # Wait for services to be healthy
        echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
        sleep 10
        
        # Check health
        if curl -s http://localhost:8000/health | grep -q "ok"; then
            echo -e "${GREEN}✅ AUTUS API is healthy!${NC}"
        else
            echo -e "${RED}❌ AUTUS API health check failed${NC}"
            docker-compose -f docker-compose.prod.yml logs autus-api
            exit 1
        fi
        
        echo -e "${GREEN}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║           ✅ DEPLOYMENT SUCCESSFUL!                           ║"
        echo "╠═══════════════════════════════════════════════════════════════╣"
        echo "║  API:       http://localhost:8000                             ║"
        echo "║  Dashboard: http://localhost                                  ║"
        echo "║  n8n:       http://localhost:5678                             ║"
        echo "║  Health:    http://localhost:8000/health                      ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        ;;
        
    local)
        echo -e "${BLUE}💻 Starting local development server...${NC}"
        
        # Check Python
        if ! command -v python3 &> /dev/null; then
            echo -e "${RED}❌ Python 3 not found${NC}"
            exit 1
        fi
        
        # Create virtual environment if not exists
        if [ ! -d "venv" ]; then
            echo -e "${YELLOW}Creating virtual environment...${NC}"
            python3 -m venv venv
        fi
        
        # Activate and install dependencies
        source venv/bin/activate
        pip install -r requirements.txt
        
        # Start server
        echo -e "${GREEN}🚀 Starting server on port 8001...${NC}"
        PORT=8001 python -m src.main
        ;;
        
    stop)
        echo -e "${YELLOW}🛑 Stopping services...${NC}"
        docker-compose -f docker-compose.prod.yml down
        echo -e "${GREEN}✅ Services stopped${NC}"
        ;;
        
    logs)
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
        
    restart)
        echo -e "${YELLOW}🔄 Restarting services...${NC}"
        docker-compose -f docker-compose.prod.yml restart
        echo -e "${GREEN}✅ Services restarted${NC}"
        ;;
        
    backup)
        echo -e "${BLUE}💾 Creating backup...${NC}"
        BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        docker exec autus-db pg_dump -U autus autus > "$BACKUP_DIR/database.sql"
        
        # Backup data directory
        cp -r data "$BACKUP_DIR/"
        
        echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
        ;;
        
    *)
        echo "Usage: $0 {docker|local|stop|logs|restart|backup}"
        echo ""
        echo "Commands:"
        echo "  docker   - Deploy with Docker Compose (production)"
        echo "  local    - Start local development server"
        echo "  stop     - Stop all services"
        echo "  logs     - View service logs"
        echo "  restart  - Restart all services"
        echo "  backup   - Create database backup"
        exit 1
        ;;
esac

#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS REALTIME - DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           🚀 AUTUS REALTIME DEPLOYMENT                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        echo -e "${RED}❗ Please edit .env with your actual values before deploying!${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.example not found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Parse command
COMMAND=${1:-docker}

case $COMMAND in
    docker)
        echo -e "${BLUE}🐳 Deploying with Docker Compose...${NC}"
        
        # Build and start services
        docker-compose -f docker-compose.prod.yml up -d --build
        
        # Wait for services to be healthy
        echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
        sleep 10
        
        # Check health
        if curl -s http://localhost:8000/health | grep -q "ok"; then
            echo -e "${GREEN}✅ AUTUS API is healthy!${NC}"
        else
            echo -e "${RED}❌ AUTUS API health check failed${NC}"
            docker-compose -f docker-compose.prod.yml logs autus-api
            exit 1
        fi
        
        echo -e "${GREEN}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║           ✅ DEPLOYMENT SUCCESSFUL!                           ║"
        echo "╠═══════════════════════════════════════════════════════════════╣"
        echo "║  API:       http://localhost:8000                             ║"
        echo "║  Dashboard: http://localhost                                  ║"
        echo "║  n8n:       http://localhost:5678                             ║"
        echo "║  Health:    http://localhost:8000/health                      ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        ;;
        
    local)
        echo -e "${BLUE}💻 Starting local development server...${NC}"
        
        # Check Python
        if ! command -v python3 &> /dev/null; then
            echo -e "${RED}❌ Python 3 not found${NC}"
            exit 1
        fi
        
        # Create virtual environment if not exists
        if [ ! -d "venv" ]; then
            echo -e "${YELLOW}Creating virtual environment...${NC}"
            python3 -m venv venv
        fi
        
        # Activate and install dependencies
        source venv/bin/activate
        pip install -r requirements.txt
        
        # Start server
        echo -e "${GREEN}🚀 Starting server on port 8001...${NC}"
        PORT=8001 python -m src.main
        ;;
        
    stop)
        echo -e "${YELLOW}🛑 Stopping services...${NC}"
        docker-compose -f docker-compose.prod.yml down
        echo -e "${GREEN}✅ Services stopped${NC}"
        ;;
        
    logs)
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
        
    restart)
        echo -e "${YELLOW}🔄 Restarting services...${NC}"
        docker-compose -f docker-compose.prod.yml restart
        echo -e "${GREEN}✅ Services restarted${NC}"
        ;;
        
    backup)
        echo -e "${BLUE}💾 Creating backup...${NC}"
        BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        docker exec autus-db pg_dump -U autus autus > "$BACKUP_DIR/database.sql"
        
        # Backup data directory
        cp -r data "$BACKUP_DIR/"
        
        echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
        ;;
        
    *)
        echo "Usage: $0 {docker|local|stop|logs|restart|backup}"
        echo ""
        echo "Commands:"
        echo "  docker   - Deploy with Docker Compose (production)"
        echo "  local    - Start local development server"
        echo "  stop     - Stop all services"
        echo "  logs     - View service logs"
        echo "  restart  - Restart all services"
        echo "  backup   - Create database backup"
        exit 1
        ;;
esac

#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS REALTIME - DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           🚀 AUTUS REALTIME DEPLOYMENT                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        echo -e "${RED}❗ Please edit .env with your actual values before deploying!${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.example not found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Parse command
COMMAND=${1:-docker}

case $COMMAND in
    docker)
        echo -e "${BLUE}🐳 Deploying with Docker Compose...${NC}"
        
        # Build and start services
        docker-compose -f docker-compose.prod.yml up -d --build
        
        # Wait for services to be healthy
        echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
        sleep 10
        
        # Check health
        if curl -s http://localhost:8000/health | grep -q "ok"; then
            echo -e "${GREEN}✅ AUTUS API is healthy!${NC}"
        else
            echo -e "${RED}❌ AUTUS API health check failed${NC}"
            docker-compose -f docker-compose.prod.yml logs autus-api
            exit 1
        fi
        
        echo -e "${GREEN}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║           ✅ DEPLOYMENT SUCCESSFUL!                           ║"
        echo "╠═══════════════════════════════════════════════════════════════╣"
        echo "║  API:       http://localhost:8000                             ║"
        echo "║  Dashboard: http://localhost                                  ║"
        echo "║  n8n:       http://localhost:5678                             ║"
        echo "║  Health:    http://localhost:8000/health                      ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        ;;
        
    local)
        echo -e "${BLUE}💻 Starting local development server...${NC}"
        
        # Check Python
        if ! command -v python3 &> /dev/null; then
            echo -e "${RED}❌ Python 3 not found${NC}"
            exit 1
        fi
        
        # Create virtual environment if not exists
        if [ ! -d "venv" ]; then
            echo -e "${YELLOW}Creating virtual environment...${NC}"
            python3 -m venv venv
        fi
        
        # Activate and install dependencies
        source venv/bin/activate
        pip install -r requirements.txt
        
        # Start server
        echo -e "${GREEN}🚀 Starting server on port 8001...${NC}"
        PORT=8001 python -m src.main
        ;;
        
    stop)
        echo -e "${YELLOW}🛑 Stopping services...${NC}"
        docker-compose -f docker-compose.prod.yml down
        echo -e "${GREEN}✅ Services stopped${NC}"
        ;;
        
    logs)
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
        
    restart)
        echo -e "${YELLOW}🔄 Restarting services...${NC}"
        docker-compose -f docker-compose.prod.yml restart
        echo -e "${GREEN}✅ Services restarted${NC}"
        ;;
        
    backup)
        echo -e "${BLUE}💾 Creating backup...${NC}"
        BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        docker exec autus-db pg_dump -U autus autus > "$BACKUP_DIR/database.sql"
        
        # Backup data directory
        cp -r data "$BACKUP_DIR/"
        
        echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
        ;;
        
    *)
        echo "Usage: $0 {docker|local|stop|logs|restart|backup}"
        echo ""
        echo "Commands:"
        echo "  docker   - Deploy with Docker Compose (production)"
        echo "  local    - Start local development server"
        echo "  stop     - Stop all services"
        echo "  logs     - View service logs"
        echo "  restart  - Restart all services"
        echo "  backup   - Create database backup"
        exit 1
        ;;
esac

#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS REALTIME - DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           🚀 AUTUS REALTIME DEPLOYMENT                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        echo -e "${RED}❗ Please edit .env with your actual values before deploying!${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.example not found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Parse command
COMMAND=${1:-docker}

case $COMMAND in
    docker)
        echo -e "${BLUE}🐳 Deploying with Docker Compose...${NC}"
        
        # Build and start services
        docker-compose -f docker-compose.prod.yml up -d --build
        
        # Wait for services to be healthy
        echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
        sleep 10
        
        # Check health
        if curl -s http://localhost:8000/health | grep -q "ok"; then
            echo -e "${GREEN}✅ AUTUS API is healthy!${NC}"
        else
            echo -e "${RED}❌ AUTUS API health check failed${NC}"
            docker-compose -f docker-compose.prod.yml logs autus-api
            exit 1
        fi
        
        echo -e "${GREEN}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║           ✅ DEPLOYMENT SUCCESSFUL!                           ║"
        echo "╠═══════════════════════════════════════════════════════════════╣"
        echo "║  API:       http://localhost:8000                             ║"
        echo "║  Dashboard: http://localhost                                  ║"
        echo "║  n8n:       http://localhost:5678                             ║"
        echo "║  Health:    http://localhost:8000/health                      ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        ;;
        
    local)
        echo -e "${BLUE}💻 Starting local development server...${NC}"
        
        # Check Python
        if ! command -v python3 &> /dev/null; then
            echo -e "${RED}❌ Python 3 not found${NC}"
            exit 1
        fi
        
        # Create virtual environment if not exists
        if [ ! -d "venv" ]; then
            echo -e "${YELLOW}Creating virtual environment...${NC}"
            python3 -m venv venv
        fi
        
        # Activate and install dependencies
        source venv/bin/activate
        pip install -r requirements.txt
        
        # Start server
        echo -e "${GREEN}🚀 Starting server on port 8001...${NC}"
        PORT=8001 python -m src.main
        ;;
        
    stop)
        echo -e "${YELLOW}🛑 Stopping services...${NC}"
        docker-compose -f docker-compose.prod.yml down
        echo -e "${GREEN}✅ Services stopped${NC}"
        ;;
        
    logs)
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
        
    restart)
        echo -e "${YELLOW}🔄 Restarting services...${NC}"
        docker-compose -f docker-compose.prod.yml restart
        echo -e "${GREEN}✅ Services restarted${NC}"
        ;;
        
    backup)
        echo -e "${BLUE}💾 Creating backup...${NC}"
        BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        docker exec autus-db pg_dump -U autus autus > "$BACKUP_DIR/database.sql"
        
        # Backup data directory
        cp -r data "$BACKUP_DIR/"
        
        echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
        ;;
        
    *)
        echo "Usage: $0 {docker|local|stop|logs|restart|backup}"
        echo ""
        echo "Commands:"
        echo "  docker   - Deploy with Docker Compose (production)"
        echo "  local    - Start local development server"
        echo "  stop     - Stop all services"
        echo "  logs     - View service logs"
        echo "  restart  - Restart all services"
        echo "  backup   - Create database backup"
        exit 1
        ;;
esac

#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS REALTIME - DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           🚀 AUTUS REALTIME DEPLOYMENT                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        echo -e "${RED}❗ Please edit .env with your actual values before deploying!${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.example not found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Parse command
COMMAND=${1:-docker}

case $COMMAND in
    docker)
        echo -e "${BLUE}🐳 Deploying with Docker Compose...${NC}"
        
        # Build and start services
        docker-compose -f docker-compose.prod.yml up -d --build
        
        # Wait for services to be healthy
        echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
        sleep 10
        
        # Check health
        if curl -s http://localhost:8000/health | grep -q "ok"; then
            echo -e "${GREEN}✅ AUTUS API is healthy!${NC}"
        else
            echo -e "${RED}❌ AUTUS API health check failed${NC}"
            docker-compose -f docker-compose.prod.yml logs autus-api
            exit 1
        fi
        
        echo -e "${GREEN}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║           ✅ DEPLOYMENT SUCCESSFUL!                           ║"
        echo "╠═══════════════════════════════════════════════════════════════╣"
        echo "║  API:       http://localhost:8000                             ║"
        echo "║  Dashboard: http://localhost                                  ║"
        echo "║  n8n:       http://localhost:5678                             ║"
        echo "║  Health:    http://localhost:8000/health                      ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        ;;
        
    local)
        echo -e "${BLUE}💻 Starting local development server...${NC}"
        
        # Check Python
        if ! command -v python3 &> /dev/null; then
            echo -e "${RED}❌ Python 3 not found${NC}"
            exit 1
        fi
        
        # Create virtual environment if not exists
        if [ ! -d "venv" ]; then
            echo -e "${YELLOW}Creating virtual environment...${NC}"
            python3 -m venv venv
        fi
        
        # Activate and install dependencies
        source venv/bin/activate
        pip install -r requirements.txt
        
        # Start server
        echo -e "${GREEN}🚀 Starting server on port 8001...${NC}"
        PORT=8001 python -m src.main
        ;;
        
    stop)
        echo -e "${YELLOW}🛑 Stopping services...${NC}"
        docker-compose -f docker-compose.prod.yml down
        echo -e "${GREEN}✅ Services stopped${NC}"
        ;;
        
    logs)
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
        
    restart)
        echo -e "${YELLOW}🔄 Restarting services...${NC}"
        docker-compose -f docker-compose.prod.yml restart
        echo -e "${GREEN}✅ Services restarted${NC}"
        ;;
        
    backup)
        echo -e "${BLUE}💾 Creating backup...${NC}"
        BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        docker exec autus-db pg_dump -U autus autus > "$BACKUP_DIR/database.sql"
        
        # Backup data directory
        cp -r data "$BACKUP_DIR/"
        
        echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
        ;;
        
    *)
        echo "Usage: $0 {docker|local|stop|logs|restart|backup}"
        echo ""
        echo "Commands:"
        echo "  docker   - Deploy with Docker Compose (production)"
        echo "  local    - Start local development server"
        echo "  stop     - Stop all services"
        echo "  logs     - View service logs"
        echo "  restart  - Restart all services"
        echo "  backup   - Create database backup"
        exit 1
        ;;
esac











#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS REALTIME - DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           🚀 AUTUS REALTIME DEPLOYMENT                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        echo -e "${RED}❗ Please edit .env with your actual values before deploying!${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.example not found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Parse command
COMMAND=${1:-docker}

case $COMMAND in
    docker)
        echo -e "${BLUE}🐳 Deploying with Docker Compose...${NC}"
        
        # Build and start services
        docker-compose -f docker-compose.prod.yml up -d --build
        
        # Wait for services to be healthy
        echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
        sleep 10
        
        # Check health
        if curl -s http://localhost:8000/health | grep -q "ok"; then
            echo -e "${GREEN}✅ AUTUS API is healthy!${NC}"
        else
            echo -e "${RED}❌ AUTUS API health check failed${NC}"
            docker-compose -f docker-compose.prod.yml logs autus-api
            exit 1
        fi
        
        echo -e "${GREEN}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║           ✅ DEPLOYMENT SUCCESSFUL!                           ║"
        echo "╠═══════════════════════════════════════════════════════════════╣"
        echo "║  API:       http://localhost:8000                             ║"
        echo "║  Dashboard: http://localhost                                  ║"
        echo "║  n8n:       http://localhost:5678                             ║"
        echo "║  Health:    http://localhost:8000/health                      ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        ;;
        
    local)
        echo -e "${BLUE}💻 Starting local development server...${NC}"
        
        # Check Python
        if ! command -v python3 &> /dev/null; then
            echo -e "${RED}❌ Python 3 not found${NC}"
            exit 1
        fi
        
        # Create virtual environment if not exists
        if [ ! -d "venv" ]; then
            echo -e "${YELLOW}Creating virtual environment...${NC}"
            python3 -m venv venv
        fi
        
        # Activate and install dependencies
        source venv/bin/activate
        pip install -r requirements.txt
        
        # Start server
        echo -e "${GREEN}🚀 Starting server on port 8001...${NC}"
        PORT=8001 python -m src.main
        ;;
        
    stop)
        echo -e "${YELLOW}🛑 Stopping services...${NC}"
        docker-compose -f docker-compose.prod.yml down
        echo -e "${GREEN}✅ Services stopped${NC}"
        ;;
        
    logs)
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
        
    restart)
        echo -e "${YELLOW}🔄 Restarting services...${NC}"
        docker-compose -f docker-compose.prod.yml restart
        echo -e "${GREEN}✅ Services restarted${NC}"
        ;;
        
    backup)
        echo -e "${BLUE}💾 Creating backup...${NC}"
        BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        docker exec autus-db pg_dump -U autus autus > "$BACKUP_DIR/database.sql"
        
        # Backup data directory
        cp -r data "$BACKUP_DIR/"
        
        echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
        ;;
        
    *)
        echo "Usage: $0 {docker|local|stop|logs|restart|backup}"
        echo ""
        echo "Commands:"
        echo "  docker   - Deploy with Docker Compose (production)"
        echo "  local    - Start local development server"
        echo "  stop     - Stop all services"
        echo "  logs     - View service logs"
        echo "  restart  - Restart all services"
        echo "  backup   - Create database backup"
        exit 1
        ;;
esac

#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS REALTIME - DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           🚀 AUTUS REALTIME DEPLOYMENT                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        echo -e "${RED}❗ Please edit .env with your actual values before deploying!${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.example not found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Parse command
COMMAND=${1:-docker}

case $COMMAND in
    docker)
        echo -e "${BLUE}🐳 Deploying with Docker Compose...${NC}"
        
        # Build and start services
        docker-compose -f docker-compose.prod.yml up -d --build
        
        # Wait for services to be healthy
        echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
        sleep 10
        
        # Check health
        if curl -s http://localhost:8000/health | grep -q "ok"; then
            echo -e "${GREEN}✅ AUTUS API is healthy!${NC}"
        else
            echo -e "${RED}❌ AUTUS API health check failed${NC}"
            docker-compose -f docker-compose.prod.yml logs autus-api
            exit 1
        fi
        
        echo -e "${GREEN}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║           ✅ DEPLOYMENT SUCCESSFUL!                           ║"
        echo "╠═══════════════════════════════════════════════════════════════╣"
        echo "║  API:       http://localhost:8000                             ║"
        echo "║  Dashboard: http://localhost                                  ║"
        echo "║  n8n:       http://localhost:5678                             ║"
        echo "║  Health:    http://localhost:8000/health                      ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        ;;
        
    local)
        echo -e "${BLUE}💻 Starting local development server...${NC}"
        
        # Check Python
        if ! command -v python3 &> /dev/null; then
            echo -e "${RED}❌ Python 3 not found${NC}"
            exit 1
        fi
        
        # Create virtual environment if not exists
        if [ ! -d "venv" ]; then
            echo -e "${YELLOW}Creating virtual environment...${NC}"
            python3 -m venv venv
        fi
        
        # Activate and install dependencies
        source venv/bin/activate
        pip install -r requirements.txt
        
        # Start server
        echo -e "${GREEN}🚀 Starting server on port 8001...${NC}"
        PORT=8001 python -m src.main
        ;;
        
    stop)
        echo -e "${YELLOW}🛑 Stopping services...${NC}"
        docker-compose -f docker-compose.prod.yml down
        echo -e "${GREEN}✅ Services stopped${NC}"
        ;;
        
    logs)
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
        
    restart)
        echo -e "${YELLOW}🔄 Restarting services...${NC}"
        docker-compose -f docker-compose.prod.yml restart
        echo -e "${GREEN}✅ Services restarted${NC}"
        ;;
        
    backup)
        echo -e "${BLUE}💾 Creating backup...${NC}"
        BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        docker exec autus-db pg_dump -U autus autus > "$BACKUP_DIR/database.sql"
        
        # Backup data directory
        cp -r data "$BACKUP_DIR/"
        
        echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
        ;;
        
    *)
        echo "Usage: $0 {docker|local|stop|logs|restart|backup}"
        echo ""
        echo "Commands:"
        echo "  docker   - Deploy with Docker Compose (production)"
        echo "  local    - Start local development server"
        echo "  stop     - Stop all services"
        echo "  logs     - View service logs"
        echo "  restart  - Restart all services"
        echo "  backup   - Create database backup"
        exit 1
        ;;
esac

#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS REALTIME - DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           🚀 AUTUS REALTIME DEPLOYMENT                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        echo -e "${RED}❗ Please edit .env with your actual values before deploying!${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.example not found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Parse command
COMMAND=${1:-docker}

case $COMMAND in
    docker)
        echo -e "${BLUE}🐳 Deploying with Docker Compose...${NC}"
        
        # Build and start services
        docker-compose -f docker-compose.prod.yml up -d --build
        
        # Wait for services to be healthy
        echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
        sleep 10
        
        # Check health
        if curl -s http://localhost:8000/health | grep -q "ok"; then
            echo -e "${GREEN}✅ AUTUS API is healthy!${NC}"
        else
            echo -e "${RED}❌ AUTUS API health check failed${NC}"
            docker-compose -f docker-compose.prod.yml logs autus-api
            exit 1
        fi
        
        echo -e "${GREEN}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║           ✅ DEPLOYMENT SUCCESSFUL!                           ║"
        echo "╠═══════════════════════════════════════════════════════════════╣"
        echo "║  API:       http://localhost:8000                             ║"
        echo "║  Dashboard: http://localhost                                  ║"
        echo "║  n8n:       http://localhost:5678                             ║"
        echo "║  Health:    http://localhost:8000/health                      ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        ;;
        
    local)
        echo -e "${BLUE}💻 Starting local development server...${NC}"
        
        # Check Python
        if ! command -v python3 &> /dev/null; then
            echo -e "${RED}❌ Python 3 not found${NC}"
            exit 1
        fi
        
        # Create virtual environment if not exists
        if [ ! -d "venv" ]; then
            echo -e "${YELLOW}Creating virtual environment...${NC}"
            python3 -m venv venv
        fi
        
        # Activate and install dependencies
        source venv/bin/activate
        pip install -r requirements.txt
        
        # Start server
        echo -e "${GREEN}🚀 Starting server on port 8001...${NC}"
        PORT=8001 python -m src.main
        ;;
        
    stop)
        echo -e "${YELLOW}🛑 Stopping services...${NC}"
        docker-compose -f docker-compose.prod.yml down
        echo -e "${GREEN}✅ Services stopped${NC}"
        ;;
        
    logs)
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
        
    restart)
        echo -e "${YELLOW}🔄 Restarting services...${NC}"
        docker-compose -f docker-compose.prod.yml restart
        echo -e "${GREEN}✅ Services restarted${NC}"
        ;;
        
    backup)
        echo -e "${BLUE}💾 Creating backup...${NC}"
        BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        docker exec autus-db pg_dump -U autus autus > "$BACKUP_DIR/database.sql"
        
        # Backup data directory
        cp -r data "$BACKUP_DIR/"
        
        echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
        ;;
        
    *)
        echo "Usage: $0 {docker|local|stop|logs|restart|backup}"
        echo ""
        echo "Commands:"
        echo "  docker   - Deploy with Docker Compose (production)"
        echo "  local    - Start local development server"
        echo "  stop     - Stop all services"
        echo "  logs     - View service logs"
        echo "  restart  - Restart all services"
        echo "  backup   - Create database backup"
        exit 1
        ;;
esac

#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS REALTIME - DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           🚀 AUTUS REALTIME DEPLOYMENT                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        echo -e "${RED}❗ Please edit .env with your actual values before deploying!${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.example not found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Parse command
COMMAND=${1:-docker}

case $COMMAND in
    docker)
        echo -e "${BLUE}🐳 Deploying with Docker Compose...${NC}"
        
        # Build and start services
        docker-compose -f docker-compose.prod.yml up -d --build
        
        # Wait for services to be healthy
        echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
        sleep 10
        
        # Check health
        if curl -s http://localhost:8000/health | grep -q "ok"; then
            echo -e "${GREEN}✅ AUTUS API is healthy!${NC}"
        else
            echo -e "${RED}❌ AUTUS API health check failed${NC}"
            docker-compose -f docker-compose.prod.yml logs autus-api
            exit 1
        fi
        
        echo -e "${GREEN}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║           ✅ DEPLOYMENT SUCCESSFUL!                           ║"
        echo "╠═══════════════════════════════════════════════════════════════╣"
        echo "║  API:       http://localhost:8000                             ║"
        echo "║  Dashboard: http://localhost                                  ║"
        echo "║  n8n:       http://localhost:5678                             ║"
        echo "║  Health:    http://localhost:8000/health                      ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        ;;
        
    local)
        echo -e "${BLUE}💻 Starting local development server...${NC}"
        
        # Check Python
        if ! command -v python3 &> /dev/null; then
            echo -e "${RED}❌ Python 3 not found${NC}"
            exit 1
        fi
        
        # Create virtual environment if not exists
        if [ ! -d "venv" ]; then
            echo -e "${YELLOW}Creating virtual environment...${NC}"
            python3 -m venv venv
        fi
        
        # Activate and install dependencies
        source venv/bin/activate
        pip install -r requirements.txt
        
        # Start server
        echo -e "${GREEN}🚀 Starting server on port 8001...${NC}"
        PORT=8001 python -m src.main
        ;;
        
    stop)
        echo -e "${YELLOW}🛑 Stopping services...${NC}"
        docker-compose -f docker-compose.prod.yml down
        echo -e "${GREEN}✅ Services stopped${NC}"
        ;;
        
    logs)
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
        
    restart)
        echo -e "${YELLOW}🔄 Restarting services...${NC}"
        docker-compose -f docker-compose.prod.yml restart
        echo -e "${GREEN}✅ Services restarted${NC}"
        ;;
        
    backup)
        echo -e "${BLUE}💾 Creating backup...${NC}"
        BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        docker exec autus-db pg_dump -U autus autus > "$BACKUP_DIR/database.sql"
        
        # Backup data directory
        cp -r data "$BACKUP_DIR/"
        
        echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
        ;;
        
    *)
        echo "Usage: $0 {docker|local|stop|logs|restart|backup}"
        echo ""
        echo "Commands:"
        echo "  docker   - Deploy with Docker Compose (production)"
        echo "  local    - Start local development server"
        echo "  stop     - Stop all services"
        echo "  logs     - View service logs"
        echo "  restart  - Restart all services"
        echo "  backup   - Create database backup"
        exit 1
        ;;
esac

#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS REALTIME - DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           🚀 AUTUS REALTIME DEPLOYMENT                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        echo -e "${RED}❗ Please edit .env with your actual values before deploying!${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.example not found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Parse command
COMMAND=${1:-docker}

case $COMMAND in
    docker)
        echo -e "${BLUE}🐳 Deploying with Docker Compose...${NC}"
        
        # Build and start services
        docker-compose -f docker-compose.prod.yml up -d --build
        
        # Wait for services to be healthy
        echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
        sleep 10
        
        # Check health
        if curl -s http://localhost:8000/health | grep -q "ok"; then
            echo -e "${GREEN}✅ AUTUS API is healthy!${NC}"
        else
            echo -e "${RED}❌ AUTUS API health check failed${NC}"
            docker-compose -f docker-compose.prod.yml logs autus-api
            exit 1
        fi
        
        echo -e "${GREEN}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║           ✅ DEPLOYMENT SUCCESSFUL!                           ║"
        echo "╠═══════════════════════════════════════════════════════════════╣"
        echo "║  API:       http://localhost:8000                             ║"
        echo "║  Dashboard: http://localhost                                  ║"
        echo "║  n8n:       http://localhost:5678                             ║"
        echo "║  Health:    http://localhost:8000/health                      ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        ;;
        
    local)
        echo -e "${BLUE}💻 Starting local development server...${NC}"
        
        # Check Python
        if ! command -v python3 &> /dev/null; then
            echo -e "${RED}❌ Python 3 not found${NC}"
            exit 1
        fi
        
        # Create virtual environment if not exists
        if [ ! -d "venv" ]; then
            echo -e "${YELLOW}Creating virtual environment...${NC}"
            python3 -m venv venv
        fi
        
        # Activate and install dependencies
        source venv/bin/activate
        pip install -r requirements.txt
        
        # Start server
        echo -e "${GREEN}🚀 Starting server on port 8001...${NC}"
        PORT=8001 python -m src.main
        ;;
        
    stop)
        echo -e "${YELLOW}🛑 Stopping services...${NC}"
        docker-compose -f docker-compose.prod.yml down
        echo -e "${GREEN}✅ Services stopped${NC}"
        ;;
        
    logs)
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
        
    restart)
        echo -e "${YELLOW}🔄 Restarting services...${NC}"
        docker-compose -f docker-compose.prod.yml restart
        echo -e "${GREEN}✅ Services restarted${NC}"
        ;;
        
    backup)
        echo -e "${BLUE}💾 Creating backup...${NC}"
        BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        docker exec autus-db pg_dump -U autus autus > "$BACKUP_DIR/database.sql"
        
        # Backup data directory
        cp -r data "$BACKUP_DIR/"
        
        echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
        ;;
        
    *)
        echo "Usage: $0 {docker|local|stop|logs|restart|backup}"
        echo ""
        echo "Commands:"
        echo "  docker   - Deploy with Docker Compose (production)"
        echo "  local    - Start local development server"
        echo "  stop     - Stop all services"
        echo "  logs     - View service logs"
        echo "  restart  - Restart all services"
        echo "  backup   - Create database backup"
        exit 1
        ;;
esac
















