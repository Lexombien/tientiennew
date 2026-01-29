@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

REM ===============================
REM  CAU HINH
REM ===============================
set REMOTE_URL=https://github.com/Lexombien/tientiennew.git

:: Chuyen den thu muc chua file bat nay
cd /d "%~dp0"

echo.
echo ============================================
echo   DONG BO GITHUB: %REMOTE_URL%
echo ============================================
echo.

REM ===============================
REM  INIT GIT NEU CHUA CO
REM ===============================
if not exist .git (
    echo [1/4] Khoi tao Git...
    git init
    git branch -M main
    git remote add origin %REMOTE_URL%
) else (
    echo [1/4] Cap nhat Remote URL...
    git remote set-url origin %REMOTE_URL%
)

REM ===============================
REM  THEM TAT CA FILE
REM ===============================
echo [2/4] Them file vao git...
git add -A

REM ===============================
REM  COMMIT
REM ===============================
echo [3/4] Kiem tra thay doi...
git diff --cached --quiet
if %errorlevel%==0 (
    echo ... Khong co file nao thay doi.
    goto PUSH
)

echo [3/4] Commit thay doi...
:: Tao message don gian de tranh loi format thoi gian
git commit -m "Auto sync %date% %time%"

:PUSH
REM ===============================
REM  PUSH LEN GITHUB
REM ===============================
echo [4/4] Day len GitHub...
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo [!] LOI: Khong day duoc len GitHub.
    echo 1. Kiem tra ket noi mang.
    echo 2. Kiem tra quyen truy cap GitHub của bạn.
    echo.
) else (
    echo.
    echo [OK] DONG BO THANH CONG!
)

echo.
pause
