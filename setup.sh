#!/bin/bash

# RecipBot MVP - Setup Script
# This script sets up the project structure and configuration

set -e

echo "🚀 RecipBot MVP - Setup Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from recipbot directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.yml not found!${NC}"
    echo "Please run this script from your recipbot directory"
    exit 1
fi

echo -e "${YELLOW}Step 1: Cleaning up old directories...${NC}"
rm -rf backend frontend .harness specs docs .claude .github
echo -e "${GREEN}✅ Old directories removed${NC}"
echo ""

echo -e "${YELLOW}Step 2: Creating directory structure...${NC}"

# Backend directories
mkdir -p app/Models app/Http/Controllers app/Http/Requests app/Http/Resources
mkdir -p app/Services app/Repositories app/Jobs app/Events app/Listeners
mkdir -p app/Validators app/Enums app/Concerns
mkdir -p bootstrap/cache config database/migrations database/factories database/seeders
mkdir -p public resources/js resources/css routes storage/logs storage/app tests/Unit tests/Feature

# Frontend directories
mkdir -p frontend/src/components frontend/src/pages frontend/src/stores
mkdir -p frontend/src/composables frontend/src/types frontend/src/utils
mkdir -p frontend/public frontend/tests

# Documentation
mkdir -p docs specs .harness .harness/features

# CI/CD
mkdir -p .claude .github/workflows

echo -e "${GREEN}✅ Directory structure created${NC}"
echo ""

echo -e "${YELLOW}Step 3: Creating Laravel structure...${NC}"

# Create .gitkeep files for directories
touch app/.gitkeep
touch app/Models/.gitkeep
touch app/Services/.gitkeep
touch app/Repositories/.gitkeep
touch app/Validators/.gitkeep
touch database/factories/.gitkeep
touch database/seeders/.gitkeep
touch resources/js/.gitkeep
touch storage/logs/.gitkeep
touch tests/Unit/.gitkeep
touch tests/Feature/.gitkeep

echo -e "${GREEN}✅ Laravel structure created${NC}"
echo ""

echo -e "${YELLOW}Step 4: Creating Vue 3 structure...${NC}"

touch frontend/src/components/.gitkeep
touch frontend/src/stores/.gitkeep
touch frontend/src/composables/.gitkeep
touch frontend/tests/.gitkeep

echo -e "${GREEN}✅ Vue 3 structure created${NC}"
echo ""

echo -e "${YELLOW}Step 5: Creating documentation structure...${NC}"

touch docs/.gitkeep
touch specs/.gitkeep
touch .harness/features/.gitkeep

echo -e "${GREEN}✅ Documentation structure created${NC}"
echo ""

echo -e "${YELLOW}Step 6: Creating configuration files...${NC}"

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ .env created from .env.example${NC}"
else
    echo -e "${YELLOW}⚠️  .env already exists, skipping${NC}"
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo "✅ .gitignore will be provided"
else
    echo -e "${YELLOW}⚠️  .gitignore already exists${NC}"
fi

echo ""

echo -e "${YELLOW}Step 7: Checking Docker...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found! Please install Docker first${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found! Please install Docker Compose first${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed${NC}"
echo ""

echo "================================"
echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
echo "================================"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Review .env (database, redis settings):"
echo "   cat .env | grep -E 'DB_|REDIS_'"
echo ""
echo "2. Start Docker:"
echo "   docker-compose up --build"
echo ""
echo "3. Wait for services to be healthy (~1-2 minutes)"
echo ""
echo "4. In a new terminal, verify access:"
echo "   curl http://localhost:8000  # Backend"
echo "   curl http://localhost:5173  # Frontend"
echo ""
echo "5. Read documentation (in order):"
echo "   cat QUICK_START.md"
echo "   cat CLAUDE.md"
echo "   cat constitution.md"
echo "   cat HARNESS-GUIDE.md"
echo ""
echo "6. Start Claude Code:"
echo "   cat CLAUDE_PROMPT_START.md | head -30"
echo ""
echo "🚀 Ready to build RecipBot MVP!"
echo ""
