@ECHO OFF

set SteamAppId=322330
set SteamGameId=322330

cd ..
start "Don't Starve Together Overworld" /D "%~dp0.." "%~dp0..\dontstarve_dedicated_server_nullrenderer.exe" -conf_dir DoNotStarveTogether_EasyConfigOverworld -console
start "Don't Starve Together Caves"     /D "%~dp0.." "%~dp0..\dontstarve_dedicated_server_nullrenderer.exe" -conf_dir DoNotStarveTogether_EasyConfigCaves -console

