@echo off
cd /d "%~dp0"
title VW App — Local

echo.
echo  =============================================
echo   VW App - Iniciar ambiente local
echo  =============================================
echo.

:: ── 1. Banco de dados ─────────────────────────────────────────────────────
echo  [1/3] Subindo PostgreSQL...
docker compose up -d postgres
if %ERRORLEVEL% NEQ 0 (
  echo  [ERRO] Docker nao esta rodando. Inicie o Docker Desktop.
  pause & exit /b 1
)

:wait_db
docker compose exec -T postgres pg_isready -U postgres -d vwapp >nul 2>&1
if errorlevel 1 (
  timeout /t 2 /nobreak >nul
  goto wait_db
)
echo  [OK] PostgreSQL pronto.
echo.

:: ── 2. Schema ─────────────────────────────────────────────────────────────
echo  [2/3] Sincronizando schema...
npx prisma db push --skip-generate >nul 2>&1
echo  [OK] Schema sincronizado.
echo.

:: ── 3. Dev server + browser ───────────────────────────────────────────────
echo  [3/3] Iniciando servidor...
echo.
echo   http://localhost:3001
echo   Login: admin@fillmore.com.br / senha1234
echo.

set PORT=3001
start "VW App" cmd /k "cd /d "%~dp0" && npm run dev"
timeout /t 6 /nobreak >nul
rundll32 url.dll,FileProtocolHandler http://localhost:3001
