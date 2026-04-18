@echo off
cd /d "%~dp0"
title VW App

echo Iniciando VW App...
echo.

if not exist ".env.local" (
  echo ERRO: .env.local nao encontrado.
  echo Copie .env.example para .env.local e preencha as variaveis.
  pause
  exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
  echo ERRO: Docker nao esta rodando. Inicie o Docker Desktop.
  pause
  exit /b 1
)

echo [1/4] Subindo banco de dados PostgreSQL...
docker compose up -d postgres

echo Aguardando PostgreSQL ficar pronto...
:wait_db
docker compose exec -T postgres pg_isready -U vwapp -d vwapp >nul 2>&1
if errorlevel 1 (
  timeout /t 2 /nobreak >nul
  goto wait_db
)
echo PostgreSQL pronto.
echo.

if not exist "node_modules" (
  echo [2/4] Instalando dependencias...
  npm install
) else (
  echo [2/4] Dependencias OK.
)
echo.

echo [3/4] Aplicando migrations...
npx prisma migrate deploy
if errorlevel 1 (
  npx prisma db push
)
echo.

set /p SEED_CHOICE=[4/4] Popular banco com dados do Fillmore? (S/N):
if /i "%SEED_CHOICE%"=="S" (
  npm run seed
)
echo.

echo Servidor disponivel em http://localhost:3001
echo Console operacional em http://localhost:3001/ops
echo.

set PORT=3001
npm run dev
