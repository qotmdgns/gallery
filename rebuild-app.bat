@echo off
echo ========================================
echo Complete App Rebuild Script
echo ========================================
echo.

echo [1/5] Stopping Metro...
taskkill /F /IM node.exe 2>nul
timeout /t 2

echo [2/5] Cleaning Android build...
cd android
call gradlew.bat clean
cd ..

echo [3/5] Clearing Metro cache...
rmdir /S /Q %TEMP%\metro-* 2>nul
rmdir /S /Q %TEMP%\haste-map-* 2>nul

echo [4/5] Verifying .env file...
type .env

echo [5/5] Building and installing app...
call npm run android

echo.
echo ========================================
echo Rebuild Complete!
echo ========================================
pause
