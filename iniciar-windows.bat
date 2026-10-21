@echo off
cd /d "%~dp0"
echo.
echo =============================================
echo  BolsoMZ - Financas pessoais
 echo  Abre no navegador: http://localhost:8000
 echo  Prima Ctrl+C para terminar.
echo =============================================
where py >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:8000"
  py -3 -m http.server 8000
  goto :end
)
where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:8000"
  python -m http.server 8000
  goto :end
)
echo Python nao encontrado. Instala Python 3 e volta a abrir este ficheiro.
pause
:end
