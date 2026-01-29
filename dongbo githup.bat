@echo off
setlocal EnableDelayedExpansion

REM ===============================
REM  CAU HINH
REM ===============================
:: Set remote URL moi
set REMOTE_URL=https://github.com/Lexombien/tientiennew.git

:: Chuyen den thu muc chua file bat nay
cd /d "%~dp0"

echo ===============================
echo   DONG BO GITHUB: %REMOTE_URL%
echo ===============================

REM ===============================
REM  INIT GIT NEU CHUA CO
REM ===============================
if not exist .git (
    echo [1/5] Khoi tao Git...
    git init
    git branch -M main
    git remote add origin !REMOTE_URL!
) else (
    echo [1/5] Git da ton tai, cap nhat Remote...
    git remote set-url origin !REMOTE_URL!
)

REM ===============================
REM  LAY THOI GIAN DE COMMIT
REM ===============================
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set y=%datetime:~0,4%
set m=%datetime:~4,2%
set d=%datetime:~6,2%
set hh=%datetime:~8,2%
set mm=%datetime:~10,2%
set ss=%datetime:~12,2%

set commit_msg=Auto sync %d%-%m%-%y% %hh%:%mm%:%ss%

REM ===============================
REM  THEM TAT CA FILE (BAO GOM XOA/MOI)
REM ===============================
echo [2/5] Them file vao git...
git add -A

REM ===============================
REM  COMMIT
REM ===============================
echo [3/5] Commit thay doi...
git diff --cached --quiet
if %errorlevel%==0 (
    echo -> Khong co file nao thay doi.
    :: Neu met muon force push ke ca ko co thay doi thi bo comment dong duoi
    :: goto PUSH
)

git commit -m "%commit_msg%"

:PUSH
REM ===============================
REM  PUSH LEN GITHUB
REM ===============================
echo [4/5] Day len GitHub...
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo ❌ LOI: Khong day duoc len GitHub.
    echo 1. Kiem tra mang.
    echo 2. Kiem tra quyen truy cap (ban da dang nhap git chua?).
    echo.
) else (
    echo.
    echo ✅ DONG BO THANH CONG!
)

pause
