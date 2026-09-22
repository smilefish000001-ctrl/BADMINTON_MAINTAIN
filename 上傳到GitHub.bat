@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title 羽球活動表 - 上傳到 GitHub
cd /d "%~dp0"

echo.
echo ========================================
echo   羽球活動表 GitHub 上傳工具
echo ========================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo 找不到 Git，請先安裝 Git for Windows。
  goto :end
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo 尚未建立 Git Repository，請先依 README 完成 GitHub 初始化。
  goto :end
)

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo 尚未設定 GitHub origin，請先依 README 完成 GitHub 初始化。
  goto :end
)

echo [1/5] 取得 GitHub 最新狀態...
git fetch origin main
if errorlevel 1 goto :failed

for /f "tokens=1,2" %%A in ('git rev-list --left-right --count HEAD...origin/main') do (
  set LOCAL_AHEAD=%%A
  set REMOTE_AHEAD=%%B
)
if not "!REMOTE_AHEAD!"=="0" (
  echo 遠端 main 有本機尚未取得的更新，請先執行 git pull --rebase origin main。
  goto :end
)

echo.
echo [2/5] 本次異動：
git status --short
set "HAS_CHANGES="
for /f "delims=" %%A in ('git status --porcelain') do set "HAS_CHANGES=1"
if not defined HAS_CHANGES (
  echo 沒有可提交的變更。
  goto :end
)

echo.
echo [3/5] 執行程式檢查與測試...
call npm run check
if errorlevel 1 goto :failed
call npm test
if errorlevel 1 goto :failed

set "COMMIT_MESSAGE="
set /p "COMMIT_MESSAGE=請輸入本次更新說明： "
if "!COMMIT_MESSAGE!"=="" set "COMMIT_MESSAGE=更新羽球活動表"

echo.
echo [4/5] 準備提交以下檔案：
git add -A
git diff --cached --name-only

git diff --cached --name-only | findstr /i /r /c:"^\.env$" /c:"\.sqlite$" /c:"\.sqlite-wal$" /c:"\.sqlite-shm$" >nul
if not errorlevel 1 (
  echo 偵測到環境變數或資料庫檔案，已停止上傳。
  goto :end
)

choice /c YN /m "確認提交並推送到 GitHub main"
if errorlevel 2 goto :end

git commit -m "!COMMIT_MESSAGE!"
if errorlevel 1 goto :failed

echo.
echo [5/5] 正在推送至 GitHub...
git push origin main
if errorlevel 1 goto :failed
echo 上傳完成；Railway 若已開啟自動部署，將自動建置新版。
goto :end

:failed
echo 操作失敗，請查看上方錯誤訊息。

:end
echo.
pause
endlocal
