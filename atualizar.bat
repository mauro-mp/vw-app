@echo off
cd /d "%~dp0"
title Atualizar VW App na VPS
setlocal EnableDelayedExpansion

set VPS_IP=46.225.158.208
set VPS_USER=root
set VPS_DIR=/opt/vw-app
set APP_URL=https://vw.arklab.com.br

echo.
echo  =============================================
echo   VW App - Deploy para VPS Hetzner
echo  =============================================
echo.

:: ── 1. Git: commit e push ─────────────────────────────────────────────────
echo  [1/5] Enviando codigo para o GitHub...
git add .

git diff --cached --quiet
if !ERRORLEVEL! NEq 0 (
    git commit -m "deploy: %DATE% %TIME%"
    if !ERRORLEVEL! NEq 0 (
        echo  [ERRO] Falha no git commit.
        goto :erro
    )
) else (
    echo  [INFO] Nenhuma alteracao local. Pulando commit.
)

git push origin main
if %ERRORLEVEL% NEq 0 (
    echo  [ERRO] Falha no git push.
    goto :erro
)
echo  [OK] Codigo enviado ao GitHub.
echo.

:: ── 2. Testa conexao SSH ──────────────────────────────────────────────────
echo  [2/5] Verificando conexao com a VPS...
ssh -o ConnectTimeout=10 -o BatchMode=yes %VPS_USER%@%VPS_IP% "echo ok" >nul 2>&1
if %ERRORLEVEL% NEq 0 (
    echo  [ERRO] Nao foi possivel conectar na VPS %VPS_IP%.
    goto :erro
)
echo  [OK] VPS acessivel.
echo.

:: ── 3. Atualiza codigo na VPS ─────────────────────────────────────────────
echo  [3/5] Baixando atualizacoes na VPS...
ssh %VPS_USER%@%VPS_IP% "cd %VPS_DIR% && git pull origin main"
if %ERRORLEVEL% NEq 0 (
    echo  [ERRO] Falha ao fazer git pull na VPS.
    goto :erro
)
echo  [OK] Codigo atualizado na VPS.
echo.

:: ── 4. Rebuild e restart dos containers ──────────────────────────────────
echo  [4/5] Rebuild e reiniciando containers (aguarde ~2 min)...
ssh %VPS_USER%@%VPS_IP% "cd %VPS_DIR% && docker compose -f docker-compose.prod.yml up -d --build --remove-orphans"
if %ERRORLEVEL% NEq 0 (
    echo  [ERRO] Falha no docker compose. Verificando logs...
    ssh %VPS_USER%@%VPS_IP% "cd %VPS_DIR% && docker compose -f docker-compose.prod.yml logs --tail=30"
    goto :erro
)
echo  [OK] Containers atualizados.
echo.

:: ── 4b. Sincroniza schema do banco ────────────────────────────────────────
echo  [4b/5] Sincronizando schema do banco de dados...
ssh %VPS_USER%@%VPS_IP% "cd %VPS_DIR% && docker compose -f docker-compose.prod.yml exec -T app npx prisma db push 2>&1"
if %ERRORLEVEL% NEq 0 (
    echo.
    echo  [ATENCAO] Schema nao sincronizado automaticamente.
    echo  Para forcar: ssh %VPS_USER%@%VPS_IP% "cd %VPS_DIR% && docker compose -f docker-compose.prod.yml exec app npx prisma db push --accept-data-loss"
    echo.
) else (
    echo  [OK] Banco sincronizado.
)
echo.

:: ── 5. Health check ───────────────────────────────────────────────────────
echo  [5/5] Verificando se o app subiu corretamente...
timeout /t 10 /nobreak >nul

ssh %VPS_USER%@%VPS_IP% "curl -sf -o /dev/null -w %%{http_code} http://localhost:3003/ 2>/dev/null" > %TEMP%\vw_hcheck.txt 2>&1
set /p HTTP_CODE=<%TEMP%\vw_hcheck.txt

if "%HTTP_CODE%"=="200" (
    echo  [OK] Aplicacao respondendo (HTTP 200).
) else if "%HTTP_CODE%"=="307" (
    echo  [OK] Aplicacao respondendo (HTTP 307 - redirect de login).
) else (
    echo  [AVISO] Aplicacao retornou HTTP %HTTP_CODE%. Verificando logs...
    ssh %VPS_USER%@%VPS_IP% "cd %VPS_DIR% && docker compose -f docker-compose.prod.yml logs app --tail=40"
)
echo.

echo  =============================================
echo   Deploy concluido!
echo  =============================================
echo.
echo   Acesse: %APP_URL%
echo.
goto :fim

:erro
echo.
echo  =============================================
echo   [FALHA] Deploy nao concluido.
echo  =============================================
echo.
echo  Logs da VPS:
echo    ssh %VPS_USER%@%VPS_IP% "cd %VPS_DIR% && docker compose -f docker-compose.prod.yml logs --tail=50"
echo.

:fim
pause
