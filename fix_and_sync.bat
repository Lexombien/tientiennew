@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

REM =============================================
REM  AUTO-FIX BAT: CAP NHAT GIT VA DONG BO
REM =============================================

echo.
echo ============================================
echo   [1/2] CAP NHAT FILE SETUP LEN GITHUB
echo ============================================

REM 1. Set remote URL
set REMOTE_URL=https://github.com/Lexombien/tientiennew.git
cd /d "%~dp0"

REM 2. Init Git neu chua co
if not exist .git (
    echo ... Khoi tao Git
    git init
    git branch -M main
    git remote add origin !REMOTE_URL!
) else (
    echo ... Cap nhat Remote URL
    git remote set-url origin !REMOTE_URL!
)

REM 3. Add va Commit file moi
echo ... Them file vao Git
git add setup-vps.sh
git add -A

echo ... Commit thay doi
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set d=%datetime:~6,2%
set m=%datetime:~4,2%
set y=%datetime:~0,4%
set hh=%datetime:~8,2%
set mm=%datetime:~10,2%
set ss=%datetime:~12,2%

git commit -m "Auto Update setup-vps.sh fix nodejs error %d%-%m%-%y% %hh%:%mm%"

REM 4. Push len GitHub
echo ... Day len GitHub
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo ❌ LOI: Khong day duoc len GitHub.
    echo Kiem tra ket noi mang hoac dang nhap Git.
    pause
    exit /b
)

echo.
echo ✅ DONG BO THANH CONG!
echo Bay gio ban hay vao VPS chay lenh sau de update va cai dat:
echo.
echo    git pull
echo    bash setup-vps.sh
echo.

pause
