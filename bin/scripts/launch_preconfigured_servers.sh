#!/bin/bash

# The location of the current script.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

DS="$SCRIPT_DIR/launch_dedicated_server.sh"

"$DS" -conf_dir DoNotStarveTogether_EasyConfigCaves -console &
"$DS" -conf_dir DoNotStarveTogether_EasyConfigOverworld -console &
