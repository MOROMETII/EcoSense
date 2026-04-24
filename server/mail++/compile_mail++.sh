#!/bin/sh

g++ -std=c++23 -Wall -Wextra -o mail++ test.cpp mail++.cpp -lssl -lcrypto

echo "compilation done"