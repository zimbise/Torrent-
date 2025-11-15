#!/data/data/com.termux/files/usr/bin/bash
tmux kill-session -t torznab 2>/dev/null
tmux new-session -d -s torznab 'node ~/torrent-search-app/torznab-shim/server.js'
echo "Torznab shim started at http://192.168.1.160:3000"
