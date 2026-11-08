#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DISPLAY="${DISPLAY:-:1}"
export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-1}"
unset ELECTRON_RUN_AS_NODE
exec "$DIR/node_modules/electron/dist/electron" "$DIR" --no-sandbox "$@"

