#!/bin/bash

if [ ! -d "bin" ]; then
    # echo "no bin dir"
    mkdir bin
fi

echo "generating the yaml file..."
python3 generate_openapi.py
echo "file generated!"
echo
if [ -f "openapi.yaml" ]; then
    mv ./openapi.yaml ./static/openapi.yaml
fi

echo "compiling cpp files..."
SOURCES=$(find . -name "*.cpp" \
    ! -path "./test.cpp" \
    ! -path "./mail++/test.cpp" \
    ! -path "*/tests/*" \
    ! -path "*/fuzz/*" \
    ! -path "*/examples/*" \
    ! -path "./test/*" \
    ! -path "*/CMakeFiles/*" \
    ! -path "*CMakeCXXCompilerId*")
g++ -std=c++23 -DLINUX -Wall -Wextra -pthread $SOURCES -o ./bin/server -lsqlite3 -lssl -lcrypto
echo "compilation done!"