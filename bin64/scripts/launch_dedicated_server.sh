#!/bin/bash

# The location of the current script.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

export SteamAppId=322330                                                         
export SteamGameId=322330                                                        

if which xterm; then
        XTERM="xterm"
elif [ -f /usr/bin/xterm ]; then
        XTERM="/usr/bin/xterm"
else
        echo "Error launching dedicated server: Cannot locate xterm."
        exit 1
fixz

cd "$SCRIPT_DIR/.."
"$XTERM" -e "$SCRIPT_DIR/../dontstarve_dedicated_server_nullrenderer_x64" "$@"
