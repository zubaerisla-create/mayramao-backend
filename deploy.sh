#!/bin/bash
set -e

echo "Pulling latest changes from main branch..."
git fetch origin main
git reset --hard origin/main

echo "Building and restarting Docker container..."
docker compose up -d --build

echo "Cleaning up dangling images..."
docker image prune -f

echo "Deployment successful!"
