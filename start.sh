#!/usr/bin/env bash
set -e

echo "============================================"
echo "  Gemini Virtual Try-On - Launcher"
echo "============================================"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "[OK] Node.js found: $(node --version)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo
    echo "[INFO] Installing dependencies..."
    if ! npm install; then
        echo "[ERROR] Failed to install dependencies."
        exit 1
    fi
    echo "[OK] Dependencies installed."
else
    echo "[OK] Dependencies already installed."
fi

echo
echo "[INFO] Starting development server..."
echo "[INFO] The app will open at http://localhost:3000"
echo "[INFO] Press Ctrl+C to stop the server."
echo

npm run dev
