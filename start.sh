#!/bin/bash

# HighFive Suite - Docker Startup Script
# This script starts all services with Docker Compose

set -e

echo "🍕 HighFive Suite - Starting all services..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build and start all services
echo ""
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo ""
echo "🔍 Checking service status..."
echo ""

# Check API
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API${NC}         - http://localhost:3000"
else
    echo -e "${YELLOW}⏳ API${NC}         - http://localhost:3000 (starting...)"
fi

# Check POS
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5501 | grep -q "200\|304"; then
    echo -e "${GREEN}✅ POS${NC}         - http://localhost:5501"
else
    echo -e "${YELLOW}⏳ POS${NC}         - http://localhost:5501 (building...)"
fi

# Check Kitchen
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5502 | grep -q "200\|304"; then
    echo -e "${GREEN}✅ Kitchen${NC}     - http://localhost:5502"
else
    echo -e "${YELLOW}⏳ Kitchen${NC}     - http://localhost:5502 (building...)"
fi

# Check Landing
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5503 | grep -q "200\|304"; then
    echo -e "${GREEN}✅ Landing${NC}     - http://localhost:5503"
else
    echo -e "${YELLOW}⏳ Landing${NC}     - http://localhost:5503 (building...)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🍕 HighFive Suite Services:"
echo ""
echo "   📱 Customer (Landing)  → http://localhost:5503"
echo "   💼 POS System          → http://localhost:5501"
echo "   👨‍🍳 Kitchen Display     → http://localhost:5502"
echo "   🔌 API Backend         → http://localhost:3000"
echo ""
echo "   📊 View logs: docker-compose logs -f"
echo "   🛑 Stop all:  docker-compose down"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}🎉 HighFive Suite is starting!${NC}"
echo ""

