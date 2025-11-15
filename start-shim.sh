#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

SESSION="shim"
PORT=3000

# Kill old node if needed
pkill -f "node .*server.js" 2>/dev/null || true

# Start or reuse tmux session
if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "[shim] Reusing tmux session: $SESSION"
else
  tmux new-session -d -s "$SESSION"
  echo "[shim] Created tmux session: $SESSION"
fi

# Run server inside tmux
tmux send-keys -t "$SESSION" "cd ~/torrent-search-app && node server.js" C-m

echo "[shim] Listening on http://127.0.0.1:${PORT} (LAN: http://192.168.1.160:${PORT})"
echo "[shim] Detach/attach: Ctrl+b d | tmux attach -t ${SESSION}"
