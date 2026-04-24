@echo off
setlocal enabledelayedexpansion

if not exist "bin" (
    mkdir bin
)

echo generating the yaml file...
python generate_openapi.py
echo file generated!
echo.

if exist "openapi.yaml" (
    move ./openapi.yaml ./static/openapi.yaml
)

echo compiling cpp files...

:: Collect all .cpp files excluding specified patterns
set SOURCES=
for /r . %%f in (*.cpp) do (
    set "skip=0"
    
    :: Check exclusion patterns
    echo %%f | findstr /i /c:"\\test.cpp" >nul && set skip=1
    echo %%f | findstr /i /c:"\\mail++\\test.cpp" >nul && set skip=1
    echo %%f | findstr /i /c:"\\tests\\" >nul && set skip=1
    echo %%f | findstr /i /c:"\\fuzz\\" >nul && set skip=1
    echo %%f | findstr /i /c:"\\examples\\" >nul && set skip=1
    echo %%f | findstr /i /c:"\\test\\" >nul && set skip=1
    echo %%f | findstr /i /c:"\\CMakeFiles\\" >nul && set skip=1
    echo %%f | findstr /i /c:"CMakeCXXCompilerId" >nul && set skip=1
    
    if !skip! equ 0 (
        set "SOURCES=!SOURCES! "%%f""
    )
)

:: Remove the leading space
if defined SOURCES set "SOURCES=!SOURCES:~1!"

:: For debugging - uncomment to see what files are being compiled
:: echo Compiling: !SOURCES!

:: Use a temporary response file to avoid command line length limitations
set RSP_FILE=bin\files.rsp
echo !SOURCES! > %RSP_FILE%

:: Compile using the response file
g++ -std=c++23 -DWINDOWS -Wall -Wextra !SOURCES! -o ./bin/server.exe -lsqlite3 -lssl -lcrypto -lws2_32 -lmswsock

if %errorlevel% equ 0 (
    echo compilation done!
) else (
    echo compilation failed with error %errorlevel%
)

:: Clean up response file
if exist %RSP_FILE% del %RSP_FILE%

endlocal