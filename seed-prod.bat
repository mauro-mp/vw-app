@echo off
cd /d "%~dp0"
title Seed Producao - VW App

set VPS_IP=46.225.158.208
set VPS_USER=root
set VPS_DIR=/opt/vw-app

echo.
echo  =============================================
echo   VW App - Seed de Dados na Producao
echo  =============================================
echo.

echo  [1/2] Rodando seed de FAQ...
ssh %VPS_USER%@%VPS_IP% "cd %VPS_DIR% && docker compose -f docker-compose.prod.yml exec -T app npx tsx prisma/seed-faq.ts"
if %ERRORLEVEL% NEq 0 (
    echo  [ERRO] Falha no seed de FAQ.
    goto :erro
)
echo  [OK] FAQ importado.
echo.

echo  [2/2] Rodando seed de Cardapio...
ssh %VPS_USER%@%VPS_IP% "cd %VPS_DIR% && docker compose -f docker-compose.prod.yml exec -T app npx tsx prisma/seed-menu.ts"
if %ERRORLEVEL% NEq 0 (
    echo  [ERRO] Falha no seed de Cardapio.
    goto :erro
)
echo  [OK] Cardapio importado.
echo.

echo  =============================================
echo   Seeds concluidos com sucesso!
echo  =============================================
echo.
goto :fim

:erro
echo.
echo  =============================================
echo   [FALHA] Seed nao concluido.
echo  =============================================
echo.

:fim
pause
