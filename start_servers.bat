@echo off
echo Starting Backend Server...
start "Backend" cmd /k "cd backend && .\mvnw spring-boot:run"

echo Starting Frontend Server...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo Both servers are starting in separate terminal windows!
