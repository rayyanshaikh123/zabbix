#!/usr/bin/env python3
"""
Debug script to see what items are available on Zabbix hosts
"""

import os
import sys
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
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return {"error": str(e)}

def main():
    if not API_TOKEN:
        print("ERROR: Set ZABBIX_API_TOKEN environment variable.")
        print("Example: export ZABBIX_API_TOKEN='your-zabbix-api-token-here'")
        sys.exit(1)

    # Get all hosts
    print("Fetching hosts...")
    hosts_resp = api_call("host.get", {
        "output": ["hostid", "host", "name"],
        "selectInventory": ["type", "type_full"]
    })

    if "error" in hosts_resp:
        print("Error fetching hosts:", hosts_resp["error"])
        return

    hosts = hosts_resp.get("result", [])
    print(f"Found {len(hosts)} hosts")

    # Show details for each host
    for host in hosts:
        hostid = host.get("hostid")
        hostname = host.get("host", "Unknown")
        inventory = host.get("inventory", {})

        print(f"\n=== Host: {hostname} (ID: {hostid}) ===")
        print(f"Inventory Type: {inventory.get('type', 'N/A')}")

        # Get items for this host
        items_resp = api_call("item.get", {
            "output": ["itemid", "name", "key_", "value_type", "lastvalue"],
            "hostids": hostid,
            "limit": 20  # Just get first 20 items
        })

        if "error" in items_resp:
            print("Error fetching items:", items_resp["error"])
            continue

        items = items_resp.get("result", [])
        print(f"Total items: {len(items)}")

        if items:
            print("\nFirst 10 items:")
            for i, item in enumerate(items[:10]):
                name = item.get("name", "N/A")
                key = item.get("key_", "N/A")
                value_type = item.get("value_type", "N/A")
                lastvalue = item.get("lastvalue", "N/A")

                # Check if it's network-related
                network_terms = ["if", "interface", "network", "traffic", "port", "link"]
                is_network = any(term.lower() in name.lower() or term.lower() in key.lower() for term in network_terms)

                network_indicator = "[NETWORK]" if is_network else "[OTHER]"

                print(f"  {i+1}. {network_indicator} Name: {name}")
                print(f"      Key: {key}")
                print(f"      Type: {value_type}, Last Value: {lastvalue}")
                print()
        else:
            print("No items found for this host!")

if __name__ == "__main__":
    main()
