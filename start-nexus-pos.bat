@echo off
title Nexus POS - Lanzador Local
echo =================================================================
echo        NEXUS POS - INICIANDO TERMINAL DE VENTA LOCAL
echo =================================================================
echo.

:: Asegurar que el directorio de trabajo sea la carpeta del script
cd /d "%~dp0"

:: 0. Verificar si ha extraido los archivos
if not exist package.json (
    echo [ERROR] No se encontro 'package.json'. Ejecute desde la carpeta extraida.
    pause
    exit /b
)

:: 1. Verificar si Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado. Descarguelo en https://nodejs.org/
    pause
    exit /b
)

:: 2. Instalar dependencias si faltan
if not exist node_modules (
    echo [INFO] Instalando dependencias - esto puede tardar...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Fallo al instalar dependencias.
        pause
        exit /b
    )
)

:: 3. Iniciar la aplicacion
echo [INFO] Iniciando aplicacion en modo desarrollo (Puerto 3010)...
set NODE_ENV=development
set PORT=3010

:: Ejecutar mostrando la salida en la consola directamente
call npm run dev

:: Si llega aqui, el servidor se detuvo
echo.
echo [ALERTA] La aplicacion se ha cerrado.
echo.
pause

