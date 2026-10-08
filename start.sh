#!/usr/bin/env bash
set -euo pipefail
PI_V2_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$PI_V2_ROOT/tools/v2/local.cjs" start "$@"
