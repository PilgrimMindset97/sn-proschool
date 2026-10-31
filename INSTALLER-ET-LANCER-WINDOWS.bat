@echo off
setlocal
cd /d "%~dp0"
echo =============================================
echo SN ProSchool - Installation des dependances
echo =============================================
where node >nul 2>nul
if errorlevel 1 (
  echo ERREUR : Node.js n'est pas installe. Installez une version LTS de Node.js.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERREUR : npm est introuvable.
  pause
  exit /b 1
)
echo.
echo Installation des dependances npm...
npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo ECHEC : verifiez votre connexion Internet et relancez ce fichier.
  pause
  exit /b 1
)
echo.
echo Verification de compilation...
npm run build
if errorlevel 1 (
  echo La compilation a signale une erreur. Consultez les messages ci-dessus.
  pause
  exit /b 1
)
echo.
echo Installation et compilation terminees.
echo Lancement du serveur local...
npm run dev
pause
