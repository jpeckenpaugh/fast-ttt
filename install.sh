#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
echo "✓ Installed (run ./run.sh to start the server)"
