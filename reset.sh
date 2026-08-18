#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
source .venv/bin/activate
cd src
rm -f data.db
echo "✓ Database reset (recreated on next server start)"
