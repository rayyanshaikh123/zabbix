#!/usr/bin/env python3
"""
Test script to verify Zabbix API connection
"""

import os
import json
import requests

# Configuration
ZABBIX_URL = os.environ.get("ZABBIX_URL", "http://192.168.0.134/zabbix/api_jsonrpc.php")
API_TOKEN = os.environ.get("ZABBIX_API_TOKEN", "")
HEADERS = {"Content-Type": "application/json-rpc", "Authorization": f"Bearer {API_TOKEN}"}

def api_call(method: str, params: dict = None, req_id: int = 1) -> dict:
    payload = {"jsonrpc": "2.0", "method": method, "params": params or {}, "id": req_id}
    try:
        r = requests.post(ZABBIX_URL, headers=HEADERS, data=json.dumps(payload), timeout=10)
        print(f"HTTP Status: {r.status_code}")
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return {"error": str(e)}

def main():
    print("Testing Zabbix API Connection")
    print("=" * 40)
    print(f"URL: {ZABBIX_URL}")
    print(f"Token Set: {'Yes' if API_TOKEN else 'No'}")
    print()

    if not API_TOKEN:
        print("❌ ERROR: ZABBIX_API_TOKEN not set!")
        print("Set it with: export ZABBIX_API_TOKEN='your-token-here'")
        return

    # Test API version
    print("Testing API version...")
    version_resp = api_call("apiinfo.version")
    if "error" in version_resp:
        print(f"❌ API Version Error: {version_resp['error']}")
        return
    else:
        print(f"✅ API Version: {version_resp.get('result', 'Unknown')}")

    # Test authentication by getting user info
    print("\nTesting authentication...")
    user_resp = api_call("user.get", {"output": ["userid", "username", "name"]})
    if "error" in user_resp:
        print(f"❌ Authentication Error: {user_resp['error']}")
        return
    else:
        user = user_resp.get("result", [{}])[0]
        print(f"✅ Authenticated as: {user.get('name', 'Unknown')} ({user.get('username', 'Unknown')})")

    # Test host discovery
    print("\nTesting host discovery...")
    host_resp = api_call("host.get", {
        "output": ["hostid", "host", "name"],
        "limit": 5
    })
    if "error" in host_resp:
        print(f"❌ Host Discovery Error: {host_resp['error']}")
        return
    else:
        hosts = host_resp.get("result", [])
        print(f"✅ Found {len(hosts)} hosts")
        for host in hosts:
            print(f"  - {host.get('host', 'Unknown')} ({host.get('name', 'No name')})")

    print("\n✅ All tests passed! Your Zabbix connection is working.")

if __name__ == "__main__":
    main()
