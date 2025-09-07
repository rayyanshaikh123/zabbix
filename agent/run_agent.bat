@echo off
REM Zabbix Network Agent Runner for Windows
REM Set your Zabbix API token here or use environment variables

REM Replace YOUR_ZABBIX_API_TOKEN_HERE with your actual Zabbix API token
set ZABBIX_API_TOKEN=YOUR_ZABBIX_API_TOKEN_HERE

REM Optional: Set other environment variables
set ZABBIX_URL=http://192.168.0.134/zabbix/api_jsonrpc.php
set BACKEND_URL=http://localhost:3000
set POLL_INTERVAL=30

echo Starting Zabbix Network Agent...
echo ZABBIX_API_TOKEN: %ZABBIX_API_TOKEN%
echo ZABBIX_URL: %ZABBIX_URL%
echo BACKEND_URL: %BACKEND_URL%
echo POLL_INTERVAL: %POLL_INTERVAL%
echo.

python zabbix_network_agent_with_ingest.py

pause
