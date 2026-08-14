@echo off
title Transparency Chain Launcher
echo ====================================================
echo Stopping any existing instances on ports 8081 & 5173...
echo ====================================================

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8081" ^| findstr "LISTENING"') do (
    echo Stopping old backend process (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo Stopping old frontend process (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo ====================================================
echo Starting Transparency Chain Servers...
echo ====================================================

set "POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/alch_xkq1H9kClPmrO7XVGVWrC"
set "BLOCKCHAIN_PRIVATE_KEY=45c181d5ededa7e65c215f5ab629fcd7d93f669a36c94bb8d77f6047050892f1"
set "BLOCKCHAIN_WALLET_ADDRESS=0x0C33849740C0b6faf9Ad021508C6Ee27BCF2A66C"
set "BLOCKCHAIN_CHAIN_ID=80002"
set "BLOCKCHAIN_CONTRACT_ADDRESS=0xb0f1b1e8805f7a90da89a4476c741b95de201d4e"

echo Starting Backend Server on port 8081...
start "Backend Server (Spring Boot)" cmd /k "cd backend && set POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/alch_xkq1H9kClPmrO7XVGVWrC&& set BLOCKCHAIN_PRIVATE_KEY=45c181d5ededa7e65c215f5ab629fcd7d93f669a36c94bb8d77f6047050892f1&& set BLOCKCHAIN_WALLET_ADDRESS=0x0C33849740C0b6faf9Ad021508C6Ee27BCF2A66C&& set BLOCKCHAIN_CHAIN_ID=80002&& set BLOCKCHAIN_CONTRACT_ADDRESS=0xb0f1b1e8805f7a90da89a4476c741b95de201d4e&& mvn spring-boot:run"

echo Starting Frontend Server on port 5173...
start "Frontend Server (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo ====================================================
echo Both servers are launching in separate windows!
echo Backend:  http://localhost:8081
echo Frontend: http://localhost:5173
echo ====================================================
