@echo off
REM Bomberman Bot Server Start Script for Windows

echo 🤖 Starting Bomberman Bot Server...

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
)

REM Build TypeScript
echo 🔨 Building TypeScript...
call npm run build

REM Start the server
echo 🚀 Starting server...
call npm start

