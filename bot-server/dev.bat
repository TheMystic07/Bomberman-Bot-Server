@echo off
REM Bomberman Bot Server Development Mode for Windows

echo 🤖 Starting Bomberman Bot Server (Development Mode)...

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
)

REM Start in development mode
echo 🚀 Starting development server...
call npm run dev

