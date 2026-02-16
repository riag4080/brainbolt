#!/bin/bash

echo "🚀 BrainBolt - Building and Running..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Clean up previous containers
echo "🧹 Cleaning up previous containers..."
docker-compose down -v 2>/dev/null || true

# Build and run
echo "🏗️  Building containers..."
docker-compose build

echo "🎬 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check health
echo "🏥 Checking service health..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend might still be starting..."
fi

echo ""
echo "✨ BrainBolt is running!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3001"
echo "💾 Database: localhost:5432"
echo "🔴 Redis: localhost:6379"
echo ""
echo "📋 View logs: docker-compose logs -f"
echo "🛑 Stop: docker-compose down"
echo ""

