# PowerShell script to start the Zabbix agent with proper environment variables
# Run this script from the agent directory

Write-Host "Starting Zabbix Network Agent with Backend Integration..." -ForegroundColor Green

# Set environment variables
$env:BACKEND_URL = "http://localhost:8000"
$env:ZABBIX_URL = "http://192.168.2.20/zabbix/api_jsonrpc.php"
$env:ZABBIX_API_TOKEN = "94a6d99d8564f1c7bf09b8b542567671f1837fc0ef778dd5a3f4380275f3ac4a"
$env:POLL_INTERVAL = "30"

Write-Host "Environment variables set:" -ForegroundColor Yellow
Write-Host "  BACKEND_URL: $env:BACKEND_URL" -ForegroundColor Cyan
Write-Host "  ZABBIX_URL: $env:ZABBIX_URL" -ForegroundColor Cyan
Write-Host "  POLL_INTERVAL: $env:POLL_INTERVAL seconds" -ForegroundColor Cyan

Write-Host "`nStarting agent..." -ForegroundColor Green
Write-Host "Look for '[BACKEND] metrics posted:' messages to confirm data flow" -ForegroundColor Yellow

# Start the agent
python zabbix_network_agent_with_ingest.py
