@echo off
cd /d "%~dp0"
title VW App — Reiniciar Dev

echo.
echo  Encerrando servidor anterior...
taskkill /FI "WINDOWTITLE eq VW App" /F >nul 2>&1
timeout /t 1 /nobreak >nul

echo  Iniciando servidor...
echo.
echo   http://localhost:3001
echo.

set PORT=3001
cmd /k "npm run dev"
