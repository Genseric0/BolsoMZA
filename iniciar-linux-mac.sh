#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
echo "BolsoMZ disponivel em http://localhost:8000"
echo "Pressiona Ctrl+C para terminar."
python3 -m http.server 8000
