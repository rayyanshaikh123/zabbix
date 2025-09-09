#!/usr/bin/env python3
"""
zabbix_network_agent_with_ingest.py
- Fixed version with dynamic data collection and forced Zabbix item updates
- Removes strict filtering that blocks items with no recent checks
- Adds dynamic interface discovery and forced item polling
"""

import os
import sys
import time
import json
import re
import requests
from typing import Optional, Dict, Any, List

# ------------- CONFIG -------------
ZABBIX_URL = os.environ.get("ZABBIX_URL", "http://192.168.0.134/zabbix/api_jsonrpc.php")
API_TOKEN = os.environ.get("ZABBIX_API_TOKEN", "4479cc87bee80c0d355b4c0480ce574cc0853d25dbb777f72745fd55e2e68974")
HEADERS = {"Content-Type": "application/json-rpc", "Authorization": f"Bearer {API_TOKEN}"}
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "30"))
CACHE_FILE = os.environ.get("CACHE_FILE", "counter_cache.json")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
BACKEND_METRICS_ENDPOINT = (BACKEND_URL.rstrip("/") + "/ingest/metrics") if BACKEND_URL else None
BACKEND_EVENTS_ENDPOINT = (BACKEND_URL.rstrip("/") + "/ingest/events") if BACKEND_URL else None
GEOIP_URL = "http://ip-api.com/json/"

# Environment variable to control whether to collect all items or just network items
ALL_ITEMS = os.environ.get("ALL_ITEMS", "false").lower() == "true"

# Enhanced network and system item terms for better matching
NETWORK_ITEM_TERMS = [
    "if", "traffic", "interface", "net", "bandwidth", "in", "out", "octets", "errors", "discard",
    "system", "os", "uptime", "memory", "cpu", "processor", "fan", "power", "temperature", "snmp",
    "contact", "description", "location", "name", "object", "hardware", "software", "version",
    "fa0", "gi0", "eth", "port", "link", "speed", "duplex", "status", "utilization"
]

# ------------- JSON-RPC helper with better error handling -------------
def api_call(method: str, params: dict = None, req_id: int = 1, timeout: int = 10) -> dict:
    payload = {"jsonrpc": "2.0", "method": method, "params": params or {}, "id": req_id}
    try:
        r = requests.post(ZABBIX_URL, headers=HEADERS, data=json.dumps(payload), timeout=timeout)
        r.raise_for_status()
        result = r.json()
        if "error" in result:
            print(f"[API ERROR] {method}: {result['error']}")
        return result
    except requests.RequestException as e:
        print(f"[REQUEST ERROR] {method}: {e}")
        return {"error": {"message": str(e)}}
    except ValueError as e:
        print(f"[JSON ERROR] {method}: {e}")
        return {"error": {"message": "Non-JSON response", "raw": r.text[:200]}}

# ------------- Force item update function -------------
def force_item_update(hostid: str, max_items: int = 50) -> bool:
    """Force Zabbix to update items for a host by triggering item checks"""
    print(f"[FORCE UPDATE] Triggering item updates for host {hostid}")
    
    # Get items that can be updated
    params = {
        "output": ["itemid", "key_", "name", "status", "state"],
        "hostids": hostid,
        "filter": {"status": 0},  # Only enabled items
        "limit": max_items
    }
    
    resp = api_call("item.get", params, req_id=601)
    if "error" in resp or not resp.get("result"):
        print("[FORCE UPDATE] Failed to get items for update")
        return False
    
    items = resp["result"]
    print(f"[FORCE UPDATE] Found {len(items)} items to update")
    
    # Try to force item updates using task.create (if available)
    updated_count = 0
    for item in items[:10]:  # Limit to first 10 items to avoid overwhelming
        itemid = item["itemid"]
        try:
            # Try to create a task to check the item now
            task_params = {
                "type": 6,  # Task type for item check
                "request": {
                    "itemid": itemid
                }
            }
            task_resp = api_call("task.create", task_params, req_id=602)
            if "result" in task_resp:
                updated_count += 1
        except Exception as e:
            # If task.create fails, continue with other methods
            pass
    
    if updated_count > 0:
        print(f"[FORCE UPDATE] Successfully triggered updates for {updated_count} items")
        time.sleep(5)  # Wait for updates to process
        return True
    
    return False

# ------------- Enhanced discovery with better filtering -------------
def discover_hosts() -> List[dict]:
    params = {
        "output": ["hostid", "host", "name", "status"],
        "selectInventory": ["type", "type_full", "location", "location_lat", "location_lon", "asset_tag"],
        "selectInterfaces": ["interfaceid", "ip", "type", "dns"],
        "filter": {"status": 0}  # Only monitored hosts
    }
    resp = api_call("host.get", params, req_id=101)
    if "error" in resp:
        print("[ERROR] host.get:", resp["error"])
        return []
    return resp.get("result", [])

def get_items_for_host(hostid: str, include_all: bool = False) -> List[dict]:
    """Get items for host with better filtering and status information"""
    params = {
        "output": ["itemid", "name", "key_", "value_type", "units", "lastvalue", "lastclock", "status", "state", "error"],
        "hostids": hostid,
        "sortfield": "name",
        "limit": 5000
    }
    
    # Don't filter by status initially to see all items
    if not include_all:
        params["filter"] = {"status": 0}  # Only enabled items
    
    resp = api_call("item.get", params, req_id=201)
    if "error" in resp:
        print("[ERROR] item.get:", resp["error"])
        return []
    
    items = resp.get("result", [])
    
    # Debug: Show item status information
    enabled_items = [i for i in items if int(i.get("status", 1)) == 0]
    disabled_items = [i for i in items if int(i.get("status", 1)) != 0]
    
    print(f"[DEBUG] Total items: {len(items)}, Enabled: {len(enabled_items)}, Disabled: {len(disabled_items)}")
    
    return enabled_items

def history_last_two(itemid: str, value_type: int = 3) -> Optional[List[dict]]:
    """Get last two history values with better error handling"""
    params = {
        "output": "extend",
        "history": value_type,
        "itemids": itemid,
        "sortfield": "clock",
        "sortorder": "DESC",
        "limit": 2
    }
    resp = api_call("history.get", params, req_id=301)
    if "error" in resp:
        return None
    return resp.get("result")

# ------------- Dynamic interface discovery -------------
def discover_interfaces_dynamically(items: List[dict]) -> Dict[str, List[str]]:
    """Dynamically discover interface patterns from item keys and names"""
    interface_patterns = {}
    
    for item in items:
        key = item.get("key_", "")
        name = item.get("name", "")
        
        # Look for interface indices in keys like [1], [2], etc.
        idx_match = re.search(r'\[(\d+)\]', key)
        if idx_match:
            idx = idx_match.group(1)
            interface_patterns.setdefault(f"if_{idx}", []).append(item)
            continue
        
        # Look for common interface names
        interface_names = ["Fa0/0", "Fa0/1", "GigabitEthernet", "FastEthernet", "Ethernet"]
        found_interface = False
        for iface_name in interface_names:
            if iface_name.lower() in name.lower() or iface_name.lower() in key.lower():
                interface_patterns.setdefault(iface_name, []).append(item)
                found_interface = True
                break
        
        if not found_interface:
            # Check for system-level items
            system_terms = ["system", "cpu", "memory", "uptime", "snmp", "chassis", "fan", "power", "temperature"]
            if any(term.lower() in name.lower() or term.lower() in key.lower() for term in system_terms):
                interface_patterns.setdefault("_system", []).append(item)
            else:
                interface_patterns.setdefault("_other", []).append(item)
    
    return interface_patterns

# ------------- cache helpers -------------
def load_cache() -> dict:
    try:
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {}

def save_cache(cache: dict):
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f, indent=2)
    except Exception as e:
        print("[CACHE ERROR] failed to save:", e)

# ------------- utilities -------------
RFC1918_PATTERNS = [
    re.compile(r"^10\."), 
    re.compile(r"^192\.168\."), 
    re.compile(r"^172\.(1[6-9]|2[0-9]|3[0-1])\.")
]

def is_private_ip(ip: str) -> bool:
    if not ip:
        return True
    for p in RFC1918_PATTERNS:
        if p.match(ip):
            return True
    return False

def geoip_lookup(ip: str) -> dict:
    if not ip or is_private_ip(ip):
        return {}
    try:
        r = requests.get(GEOIP_URL + ip, timeout=5)
        if r.status_code != 200:
            return {}
        data = r.json()
        if data.get("status") != "success":
            return {}
        return {
            "ip": ip, 
            "country": data.get("country"), 
            "region": data.get("regionName"), 
            "city": data.get("city"), 
            "lat": data.get("lat"), 
            "lon": data.get("lon"), 
            "isp": data.get("isp")
        }
    except Exception:
        return {}

def parse_ifindex_from_key(key: str) -> Optional[str]:
    m = re.search(r"\[(\d+)\]", key)
    return m.group(1) if m else None

# ------------- rate helpers -------------
def guess_counter_max(key: str) -> int:
    if "ifhc" in key.lower() or "hc" in key.lower() or "64" in key.lower():
        return 2**64
    return 2**32

def safe_compute_rate(old_val: float, old_ts: int, new_val: float, new_ts: int, max_counter: int) -> Optional[float]:
    dt = new_ts - old_ts
    if dt <= 0 or dt < 2:
        return None
    if new_val < old_val:
        delta = (new_val + max_counter) - old_val
    else:
        delta = new_val - old_val
    if delta < 0 or delta > (max_counter // 2):
        return None
    bytes_per_sec = delta / dt
    if bytes_per_sec > 5e12:
        return None
    return bytes_per_sec

def oper_status_is_up(value: str) -> Optional[bool]:
    if value is None:
        return None
    v = str(value).strip().lower()
    try:
        iv = int(float(v))
        return iv == 1
    except Exception:
        pass
    if v in ("up", "running", "1"):
        return True
    if v in ("down", "notpresent", "lowerlayerdown", "0"):
        return False
    return None

# ------------- ifDescr mapping -------------
def get_ifdescr_map(hostid: str) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    
    # Try multiple approaches to get interface descriptions
    search_terms = ["ifDescr", "Interface", "Description"]
    
    for term in search_terms:
        params = {
            "output": ["itemid", "name", "key_", "lastvalue"],
            "hostids": hostid,
            "search": {"name": term},
            "limit": 1000
        }
        resp = api_call("item.get", params, req_id=401)
        
        if "result" in resp and resp["result"]:
            for it in resp["result"]:
                key = it.get("key_", "") or ""
                last = it.get("lastvalue") or ""
                name = it.get("name") or ""
                m = re.search(r"\[(\d+)\]", key)
                if m:
                    idx = m.group(1)
                    descr = last if last else name
                    mapping[idx] = str(descr)
    
    return mapping

# ------------- backend post helpers -------------
def post_with_retries(url: str, json_payload, max_retries: int = 3, backoff: float = 1.0):
    if not url:
        print(f"[POST] No URL configured for backend POST: {url}")
        return False, "no_url_configured"
    print(f"[POST] Attempting to POST to {url}")
    print(f"[POST] Payload (truncated to 1000 chars): {json.dumps(json_payload)[:1000]}")
    for attempt in range(1, max_retries + 1):
        try:
            r = requests.post(url, json=json_payload, timeout=8)
            print(f"[POST] Response status: {r.status_code}")
            print(f"[POST] Response body (truncated to 1000 chars): {r.text[:1000]}")
            if 200 <= r.status_code < 300:
                return True, r.text
            else:
                err = f"{r.status_code} {r.text}"
        except Exception as e:
            err = str(e)
            print(f"[POST] Exception during POST: {err}")
        if attempt < max_retries:
            print(f"[POST] Retry {attempt} failed, retrying after {backoff * attempt}s...")
            time.sleep(backoff * attempt)
    print(f"[POST] All retries failed. Last error: {err}")
    return False, err

# ------------- main loop -------------
def main():
    if not API_TOKEN:
        print("ERROR: Set ZABBIX_API_TOKEN environment variable.")
        print("Example: export ZABBIX_API_TOKEN='your-zabbix-api-token-here'")
        sys.exit(1)

    cache = load_cache()
    
    # Test Zabbix connection first - apiinfo.version doesn't need auth
    test_payload = {"jsonrpc": "2.0", "method": "apiinfo.version", "params": {}, "id": 1}
    try:
        r = requests.post(ZABBIX_URL, headers={"Content-Type": "application/json-rpc"}, 
                         data=json.dumps(test_payload), timeout=10)
        r.raise_for_status()
        version_resp = r.json()
        if "result" in version_resp:
            print(f"[SUCCESS] Connected to Zabbix API version: {version_resp['result']}")
        else:
            print(f"[WARNING] Zabbix API responded but no version info: {version_resp}")
    except Exception as e:
        print(f"[WARNING] Cannot test Zabbix API version: {e}")
    
    # Test authentication with a simple API call
    auth_test = api_call("host.get", {"output": ["hostid"], "limit": 1}, req_id=2)
    if "error" in auth_test:
        print("ERROR: Cannot authenticate to Zabbix API. Check URL and token.")
        print(f"Error details: {auth_test['error']}")
        sys.exit(1)
    else:
        print("[SUCCESS] Zabbix API authentication successful")

    while True:
        all_metrics = []
        all_events = []

        # Discover all hosts
        all_hosts = discover_hosts()
        print(f"\nDiscovered {len(all_hosts)} total devices from Zabbix.")
        
        # Print summary of all devices
        for h in all_hosts:
            print(f"Device: {h.get('host', 'Unknown')} | HostID: {h.get('hostid', 'N/A')} | Status: {h.get('status', 'N/A')}")

        # Filter network devices
        network_hosts = []
        zabbix_server_info = None
        
        for h in all_hosts:
            hid = h.get("hostid")
            hostname = h.get("host", "").lower()
            
            # Handle Zabbix server separately
            if "zabbix" in hostname or "server" in hostname:
                zabbix_server_info = {
                    "hostid": hid,
                    "hostname": h.get("host"),
                    "name": h.get("name"),
                    "interfaces": h.get("interfaces", []),
                    "inventory": h.get("inventory", {})
                }
                continue
                
            if not hid:
                continue

            # Force update items for this host to get fresh data
            force_item_update(hid)
            
            # Check for network-related items with relaxed criteria
            items_sample = get_items_for_host(hid)
            has_network_items = False
            
            if items_sample:
                # Check if any items match network patterns
                for item in items_sample:
                    key = item.get("key_", "").lower()
                    name = item.get("name", "").lower()
                    
                    # More permissive matching
                    if any(term in key or term in name for term in ["if", "interface", "net", "traffic", "octets", "snmp"]):
                        has_network_items = True
                        break
                    
                    # Also check for router/switch specific patterns
                    if any(pattern in name or pattern in key for pattern in ["fa0", "gi0", "eth", "cisco", "router", "switch"]):
                        has_network_items = True
                        break

            if has_network_items or len(items_sample) > 10:  # If many items, likely a network device
                network_hosts.append(h)
                print(f"[ADDED] {hostname} as network device ({len(items_sample)} items)")

        print(f"Found {len(network_hosts)} network devices.")

        # Process each network device
        for nh in network_hosts:
            hostid = nh.get("hostid")
            dev = nh.get("host")
            interfaces = nh.get("interfaces") or []
            ip_for_geo = interfaces[0].get("ip") if interfaces else None
            
            print(f"\n[PROCESSING] {dev} (HostID: {hostid})")
            
            # Get all items for this host (including those without recent checks)
            items = get_items_for_host(hostid, include_all=True)
            if not items:
                print(f"[{dev}] No items found at all.")
                continue

            print(f"[{dev}] Found {len(items)} total items")

            # Show sample of items for debugging
            print(f"[{dev}] Sample items:")
            for i, item in enumerate(items[:10]):
                status = "Enabled" if int(item.get("status", 1)) == 0 else "Disabled"
                lastclock = item.get("lastclock")
                age = "Never" if not lastclock else f"{int(time.time()) - int(lastclock)}s ago"
                print(f"  {i+1}. {item.get('name', 'N/A')[:50]} | Status: {status} | Last: {age}")

            # Filter for network items
            network_items = []
            for item in items:
                key = item.get("key_", "").lower()
                name = item.get("name", "").lower()
                
                if ALL_ITEMS:
                    network_items.append(item)
                else:
                    # Enhanced matching for network items
                    is_network_item = (
                        any(term in key or term in name for term in NETWORK_ITEM_TERMS) or
                        any(pattern in name or pattern in key for pattern in ["fa0", "gi0", "eth", "port", "link"]) or
                        re.search(r'interface|if\w*\[|octets|traffic|bandwidth', key + name, re.I)
                    )
                    
                    if is_network_item:
                        network_items.append(item)

            print(f"[{dev}] Found {len(network_items)} network items")

            if len(network_items) == 0:
                print(f"[{dev}] No network items found. Skipping.")
                continue

            # Dynamically discover interface groupings
            interface_groups = discover_interfaces_dynamically(network_items)
            
            print(f"[{dev}] Discovered interface groups: {list(interface_groups.keys())}")

            # Get interface descriptions mapping
            ifdescr_map = get_ifdescr_map(hostid)

            # Process each interface group
            for group_name, group_items in interface_groups.items():
                if group_name == "_system":
                    iface_label = "System"
                elif group_name == "_other":
                    iface_label = "Other"
                elif group_name.startswith("if_"):
                    idx = group_name[3:]
                    iface_label = ifdescr_map.get(idx, f"Interface {idx}")
                else:
                    iface_label = group_name

                # Process each item in the group
                for item in group_items:
                    itemid = str(item.get("itemid"))
                    key = item.get("key_") or ""
                    name = item.get("name") or key
                    raw_value = item.get("lastvalue")
                    lastclock = item.get("lastclock")
                    
                    # Skip items with no value
                    if raw_value is None or raw_value == "":
                        print(f"[{dev}] {iface_label} - {name}: No data available")
                        continue

                    # Determine data freshness
                    age_seconds = 0
                    if lastclock:
                        age_seconds = int(time.time()) - int(lastclock)
                    
                    freshness = "Fresh" if age_seconds < 300 else f"Stale ({age_seconds}s)"
                    
                    # Calculate rate for traffic items
                    rate_bps = None
                    is_traffic_item = any(term in name.lower() or term in key.lower() 
                                        for term in ["in", "out", "octets", "traffic", "bandwidth"])
                    
                    if is_traffic_item:
                        # Try to get rate from history
                        hist = history_last_two(itemid, value_type=int(item.get("value_type", 3)))
                        if hist and len(hist) >= 2:
                            try:
                                new_v = float(hist[0]["value"])
                                old_v = float(hist[1]["value"])
                                new_ts = int(hist[0]["clock"])
                                old_ts = int(hist[1]["clock"])
                                maxc = guess_counter_max(key)
                                bps = safe_compute_rate(old_v, old_ts, new_v, new_ts, maxc)
                                if bps is not None:
                                    rate_bps = bps * 8.0  # Convert to bits per second
                            except Exception as e:
                                print(f"[{dev}] Rate calculation error for {name}: {e}")

                    # Determine status
                    status = "Up"  # Default
                    if "status" in name.lower() and "oper" in name.lower():
                        status = "Up" if oper_status_is_up(raw_value) else "Down"
                    elif is_traffic_item and rate_bps is not None:
                        status = "Active" if rate_bps > 0 else "Idle"

                    # Build metric document
                    try:
                        numeric_value = float(raw_value)
                    except:
                        numeric_value = None

                    # Geo location handling
                    raw_inventory = nh.get("inventory", {})
                    location_str = "Unknown Location"
                    geo = {"lat": None, "lon": None, "source": "unknown"}
                    
                    if isinstance(raw_inventory, dict):
                        location_str = raw_inventory.get("location", "Unknown Location")
                        if raw_inventory.get("location_lat"):
                            geo["lat"] = float(raw_inventory["location_lat"])
                        if raw_inventory.get("location_lon"):
                            geo["lon"] = float(raw_inventory["location_lon"])
                        if geo["lat"] and geo["lon"]:
                            geo["source"] = "zabbix_inventory"

                    metric_doc = {
                        "ts": int(time.time()),
                        "meta": {
                            "device_id": dev,
                            "hostid": hostid,
                            "ifindex": group_name if not group_name.startswith("_") else None,
                            "ifdescr": iface_label,
                            "location": location_str,
                            "geo": geo,
                            "device_status": "available",
                            "data_age_seconds": age_seconds,
                            "freshness": freshness
                        },
                        "metric": key or name,
                        "value": numeric_value if numeric_value is not None else raw_value,
                        "value_type": "counter" if is_traffic_item else "gauge"
                    }
                    all_metrics.append(metric_doc)

                    # Build event document
                    severity = "info"
                    labels = ["interface-up"]
                    
                    if status == "Down":
                        severity = "critical"
                        labels = ["interface-down"]
                    elif status == "Idle":
                        severity = "warning" 
                        labels = ["interface-idle"]

                    event_doc = {
                        "device_id": dev,
                        "hostid": hostid,
                        "iface": iface_label,
                        "metric": key or name,
                        "value": raw_value,
                        "status": status,
                        "severity": severity,
                        "detected_at": int(time.time()),
                        "location": location_str,
                        "evidence": {
                            "rate_bps": rate_bps,
                            "data_age_seconds": age_seconds,
                            "freshness": freshness
                        },
                        "labels": labels
                    }
                    all_events.append(event_doc)

                    # Print status line
                    rate_str = f"rate_bps={rate_bps:.2f}" if rate_bps else "rate_bps=None"
                    print(f"[{dev}] {iface_label} - {name}: {raw_value} | {rate_str} | {freshness} -> {status}")

        # Send bulk data to backend
        if BACKEND_METRICS_ENDPOINT and all_metrics:
            print(f"\n[BACKEND] Sending {len(all_metrics)} metrics...")
            ok, resp = post_with_retries(BACKEND_METRICS_ENDPOINT, all_metrics)
            print(f"[BACKEND] Metrics posted: {ok} - {resp[:100] if resp else 'No response'}")
            
        if BACKEND_EVENTS_ENDPOINT and all_events:
            print(f"[BACKEND] Sending {len(all_events)} events...")
            ok, resp = post_with_retries(BACKEND_EVENTS_ENDPOINT, all_events)
            print(f"[BACKEND] Events posted: {ok} - {resp[:100] if resp else 'No response'}")

        # Save cache
        save_cache(cache)
        print(f"\nCycle complete. Sleeping {POLL_INTERVAL}s...")
        print("=" * 80)
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()