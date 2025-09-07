# Zabbix Network Agent Runner for Windows PowerShell
# Set your Zabbix API token here or use environment variables

# Replace YOUR_ZABBIX_API_TOKEN_HERE with your actual Zabbix API token
$env:ZABBIX_API_TOKEN = "YOUR_ZABBIX_API_TOKEN_HERE"

# Optional: Set other environment variables
$env:ZABBIX_URL = "http://192.168.0.134/zabbix/api_jsonrpc.php"
$env:BACKEND_URL = "http://localhost:3000"
$env:POLL_INTERVAL = "30"
$env:ALL_ITEMS = "false"

Write-Host "Starting Zabbix Network Agent..." -ForegroundColor Green
Write-Host "ZABBIX_API_TOKEN: $env:ZABBIX_API_TOKEN" -ForegroundColor Yellow
Write-Host "ZABBIX_URL: $env:ZABBIX_URL" -ForegroundColor Yellow
Write-Host "BACKEND_URL: $env:BACKEND_URL" -ForegroundColor Yellow
Write-Host "POLL_INTERVAL: $env:POLL_INTERVAL" -ForegroundColor Yellow
Write-Host "ALL_ITEMS: $env:ALL_ITEMS" -ForegroundColor Yellow
Write-Host ""

python zabbix_network_agent_with_ingest.py
