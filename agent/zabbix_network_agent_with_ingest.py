#!/usr/bin/env python3
"""
zabbix_network_agent_with_ingest.py
- Based on your fixed agent
- Adds bulk posting of metrics and events to a FastAPI ingestion backend
- Configure BACKEND_URL via env var e.g. http://127.0.0.1:8000
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
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")  # FastAPI backend for netmon database
BACKEND_METRICS_ENDPOINT = (BACKEND_URL.rstrip("/") + "/ingest/metrics") if BACKEND_URL else None
BACKEND_EVENTS_ENDPOINT = (BACKEND_URL.rstrip("/") + "/ingest/events") if BACKEND_URL else None
# Removed NOMINATIM_REVERSE_GEOCODE_URL and GEOIP_URL is for IP-based lookup which is a fallback
GEOIP_URL = "http://ip-api.com/json/"

NETWORK_ITEM_TERMS = ["ifIn", "ifOut", "ifDescr", "ifInOctets", "ifOutOctets", "ifHCInOctets", "ifHCOutOctets", "ifSpeed", "ifHighSpeed", "ifOperStatus", "Interface", "Network", "Traffic", "Port", "Link", "Bits received", "Bits sent", "Operational status", "Duplex status", "Speed", "Inbound packets", "Outbound packets"]

# ------------- JSON-RPC helper -------------
def api_call(method: str, params: dict = None, req_id: int = 1, timeout: int = 10) -> dict:
    payload = {"jsonrpc": "2.0", "method": method, "params": params or {}, "id": req_id}
    try:
        r = requests.post(ZABBIX_URL, headers=HEADERS, data=json.dumps(payload), timeout=timeout)
        r.raise_for_status()
    except requests.RequestException as e:
        return {"error": {"message": str(e)}}
    try:
        return r.json()
    except ValueError:
        return {"error": {"message": "Non-JSON response", "raw": r.text}}

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
            json.dump(cache, f)
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
        return {"ip": ip, "country": data.get("country"), "region": data.get("regionName"), "city": data.get("city"), "lat": data.get("lat"), "lon": data.get("lon"), "isp": data.get("isp")}
    except Exception:
        return {}

# Removed reverse_geocode_coordinates function

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

# ------------- discovery & items -------------
def discover_hosts() -> List[dict]:
    params = {"output": ["hostid", "host", "name"], "selectInventory": ["type", "type_full", "location", "location_lat", "location_lon", "asset_tag"], "selectInterfaces": ["interfaceid", "ip", "type", "dns"]}
    resp = api_call("host.get", params, req_id=101)
    if "error" in resp:
        print("[ERROR] host.get:", resp["error"])
        return []
    return resp.get("result", [])

def get_items_for_host(hostid: str) -> List[dict]:
    params = {"output": ["itemid", "name", "key_", "value_type", "units", "lastvalue"], "hostids": hostid, "sortfield": "name", "limit": 5000}
    resp = api_call("item.get", params, req_id=201)
    if "error" in resp:
        print("[ERROR] item.get:", resp["error"])
        return []
    return resp.get("result", [])

def history_last_two(itemid: str, value_type: int = 3) -> Optional[List[dict]]:
    params = {"output": "extend", "history": value_type, "itemids": itemid, "sortfield": "clock", "sortorder": "DESC", "limit": 2}
    resp = api_call("history.get", params, req_id=301)
    if "error" in resp:
        return None
    return resp.get("result")

# ------------- ifDescr mapping -------------
def get_ifdescr_map(hostid: str) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    params = {"output": ["itemid", "name", "key_", "lastvalue"], "hostids": hostid, "search": {"name": "ifDescr"}, "limit": 1000}
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
    if not mapping:
        params2 = {"output": ["itemid", "name", "key_", "lastvalue"], "hostids": hostid, "search": {"key_": "ifDescr"}, "limit": 1000}
        resp2 = api_call("item.get", params2, req_id=402)
        if "result" in resp2 and resp2["result"]:
            for it in resp2["result"]:
                key = it.get("key_", "") or ""
                last = it.get("lastvalue") or ""
                name = it.get("name") or ""
                m = re.search(r"\[(\d+)\]", key)
                if m:
                    idx = m.group(1)
                    mapping[idx] = last if last else name
    return mapping

# ------------- backend post helpers (with simple retry) -------------
def post_with_retries(url: str, json_payload, max_retries: int = 3, backoff: float = 1.0):
    if not url:
        return False, "no_url_configured"
    for attempt in range(1, max_retries + 1):
        try:
            r = requests.post(url, json=json_payload, timeout=8)
            if 200 <= r.status_code < 300:
                return True, r.text
            else:
                err = f"{r.status_code} {r.text}"
        except Exception as e:
            err = str(e)
        time.sleep(backoff * attempt)
    return False, err

# ------------- main loop -------------
def main():
    if not API_TOKEN:
        print("ERROR: Set ZABBIX_API_TOKEN environment variable.")
        print("Example: export ZABBIX_API_TOKEN='your-zabbix-api-token-here'")
        sys.exit(1)

    cache = load_cache()
    hosts = discover_hosts()
    if not hosts:
        print("No hosts discovered.")
        sys.exit(1)

    network_hosts = []
    for h in hosts:
        hid = h.get("hostid")
        hostname = h.get("host", "").lower()
        
        # Skip Zabbix server
        if "zabbix" in hostname or "server" in hostname:
            continue
            
        if not hid:
            continue
        # Check for various network interface patterns
        network_patterns = ["ifIn", "ifOut", "Interface", "Network", "Traffic", "Bits received", "Bits sent", "Operational status"]
        found_network_items = False

        for pattern in network_patterns:
            items_check = api_call("item.get", {"output": ["itemid"], "hostids": hid, "search": {"name": pattern}, "limit": 1}, req_id=501)
            if "result" in items_check and items_check["result"]:
                found_network_items = True
                break

        if found_network_items:
            network_hosts.append(h)
            continue
        inv = h.get("inventory") or {}
        if any(w in (inv.get("type") or "").lower() for w in ("router", "switch")):
            network_hosts.append(h)
            continue
        if any(k in (h.get("host") or "").lower() for k in ("router", "switch", "sw")):
            network_hosts.append(h)

    print(f"Found {len(network_hosts)} network devices.")
    # prebuild ifDescr maps for devices
    ifdescr_maps: Dict[str, Dict[str, str]] = {}
    for nh in network_hosts:
        hid = nh.get("hostid")
        mapping = get_ifdescr_map(hid)
        ifdescr_maps[hid] = mapping

    while True:
        all_metrics = []  # list of metric docs to send in bulk
        all_events = []   # list of event docs to send in bulk

        for nh in network_hosts:
            hostid = nh.get("hostid")
            dev = nh.get("host")
            interfaces = nh.get("interfaces") or []
            ip_for_geo = interfaces[0].get("ip") if interfaces else None
            
            # Extract inventory location and coordinates if available
            raw_inventory = nh.get("inventory", {}) # This might be a list or a dict
            
            zabbix_location = None
            zabbix_lat = None
            zabbix_lon = None

            # Safely extract inventory details, assuming it's a list of dicts
            if isinstance(raw_inventory, list) and raw_inventory:
                for inv_item in raw_inventory:
                    if isinstance(inv_item, dict):
                        zabbix_location = inv_item.get("location")
                        zabbix_lat = inv_item.get("location_lat")
                        zabbix_lon = inv_item.get("location_lon")
                        if zabbix_location or (zabbix_lat and zabbix_lon): # Found relevant data
                            break
            elif isinstance(raw_inventory, dict): # Handle case where it might be a single dict
                zabbix_location = raw_inventory.get("location")
                zabbix_lat = raw_inventory.get("location_lat")
                zabbix_lon = raw_inventory.get("location_lon")

            # Prepare geo object with raw Zabbix coordinates and location string
            geo = {
                "lat": float(zabbix_lat) if zabbix_lat else None,
                "lon": float(zabbix_lon) if zabbix_lon else None,
                "zabbix_location_str": zabbix_location if zabbix_location and zabbix_location != "" else None,
                "source": "zabbix_inventory"
            }
            
            # Fallback to GeoIP if no Zabbix coords provided
            if (geo["lat"] is None or geo["lon"] is None) and ip_for_geo:
                geoip_data = geoip_lookup(ip_for_geo) or {}
                if geoip_data:
                    geo["lat"] = geoip_data.get("lat")
                    geo["lon"] = geoip_data.get("lon")
                    geo["country"] = geoip_data.get("country")
                    geo["city"] = geoip_data.get("city")
                    geo["source"] = "geoip_fallback"
            
            # The location_str will be determined by the frontend API using geocoding
            location_str = geo["zabbix_location_str"] or geo.get("city", "Unknown Location")

            mapping = ifdescr_maps.get(hostid, {})

            items = get_items_for_host(hostid)
            if not items:
                print(f"[{dev}] no items found at all.")
                continue

            print(f"[{dev}] found {len(items)} total items")

            by_iface = {}
            network_items_found = 0
            for it in items:
                key = it.get("key_") or ""
                name = it.get("name") or ""

                # Check if this is a network-related item
                is_network_item = any(term.lower() in key.lower() or term.lower() in name.lower() for term in NETWORK_ITEM_TERMS)

                if is_network_item:
                    network_items_found += 1
                    idx = parse_ifindex_from_key(key) or "_global"
                    by_iface.setdefault(idx, []).append(it)

            print(f"[{dev}] found {network_items_found} network-related items out of {len(items)} total items")

            if network_items_found == 0:
                print(f"[{dev}] no network items found. Sample item names:")
                for i, item in enumerate(items[:5]):  # Show first 5 items
                    print(f"  {i+1}. Name: {item.get('name', 'N/A')}, Key: {item.get('key_', 'N/A')}")
                continue

            for idx, its in by_iface.items():
                iface_label = mapping.get(idx) if idx != "_global" else None
                iface_label = iface_label or (f"ifIndex {idx}" if idx != "_global" else "_global")

                # find possible link speed
                link_speed_bps = None
                for it in its:
                    k = it.get("key_") or ""
                    name = it.get("name") or ""
                    if any(x in k.lower() for x in ("ifspeed", "ifhighspeed")) or "speed" in name.lower():
                        try:
                            sp = float(it.get("lastvalue") or 0)
                            if "ifhighspeed" in k.lower():
                                link_speed_bps = sp * 1_000_000.0
                            else:
                                link_speed_bps = sp
                        except Exception:
                            pass

                for it in its:
                    itemid = str(it.get("itemid"))
                    key = it.get("key_") or ""
                    name = it.get("name") or key
                    raw_value = it.get("lastvalue") or "0"
                    vt = int(it.get("value_type") or 3)

                    # compute rate for network traffic items
                    rate_bps = None
                    is_traffic_item = any(term.lower() in name.lower() for term in ["bits received", "bits sent", "ifin", "ifout", "octets"])
                    
                    if is_traffic_item:
                        hist = history_last_two(itemid, value_type=vt)
                        if hist and len(hist) >= 2:
                            new = hist[0]; old = hist[1]
                            try:
                                new_v = float(new["value"]); old_v = float(old["value"])
                                new_ts = int(new["clock"]); old_ts = int(old["clock"])
                                maxc = guess_counter_max(key)
                                bps = safe_compute_rate(old_v, old_ts, new_v, new_ts, maxc)
                                if bps is not None:
                                    rate_bps = bps * 8.0
                            except Exception:
                                rate_bps = None

                    if rate_bps is None and is_traffic_item:
                        try:
                            current_val = float(raw_value)
                            current_ts = int(time.time())
                            if itemid in cache:
                                prev = cache[itemid]
                                prev_val = float(prev.get("value", 0))
                                prev_ts = int(prev.get("ts", current_ts))
                                maxc = guess_counter_max(key)
                                bytes_per_sec = safe_compute_rate(prev_val, prev_ts, current_val, current_ts, maxc)
                                if bytes_per_sec is not None:
                                    rate_bps = bytes_per_sec * 8.0
                            cache[itemid] = {"value": current_val, "ts": current_ts}
                        except Exception:
                            pass

                    if rate_bps is not None and link_speed_bps and rate_bps > link_speed_bps * 10:
                        rate_bps = None

                    # oper status
                    oper_up = None
                    for j in its:
                        jkey = j.get("key_") or ""
                        jname = (j.get("name") or "").lower()
                        if any(term in jname for term in ["operational status", "oper status", "operstatus"]) or "ifoperstatus" in jkey.lower():
                            try:
                                oper_up = oper_status_is_up(j.get("lastvalue"))
                                break
                            except Exception:
                                continue

                    status = "OK"
                    if oper_up is False:
                        status = "Operational state != up — check link/config"
                    else:
                        if rate_bps is not None:
                            if link_speed_bps:
                                pct = (rate_bps / link_speed_bps) * 100.0
                                if pct > 90.0:
                                    status = f"High bandwidth ({pct:.1f}% of link)"
                            else:
                                if rate_bps > 100e6:
                                    status = "High bandwidth (bps)"
                        else:
                            if oper_up is False:
                                status = "Operational state != up — check link/config"
                            else:
                                status = "No rate available (idle or insufficient history)"

                    # Build metric doc (time-series friendly)
                    try:
                        numeric_value = float(raw_value)
                    except Exception:
                        numeric_value = None

                    # Determine if this is a counter or gauge
                    is_counter = any(term.lower() in name.lower() for term in ["bits received", "bits sent", "ifin", "ifout", "octets", "packets"])
                    
                    metric_doc = {
                        "ts": int(time.time()),
                        "meta": {
                            "device_id": dev,
                            "hostid": hostid,
                            "ifindex": idx if idx != "_global" else None,
                            "ifdescr": iface_label if iface_label else None,
                            "location": location_str, # Use the determined location string
                            "geo": geo or None # Store full geo object
                        },
                        "metric": key or name,
                        "value": numeric_value if numeric_value is not None else raw_value,
                        "value_type": "counter" if is_counter else "gauge"
                    }
                    all_metrics.append(metric_doc)

                    # Build event doc only when status != OK (so we don't flood the events collection)
                    if status != "OK":
                        event_doc = {
                            "device_id": dev,
                            "hostid": hostid,
                            "iface": iface_label,
                            "metric": key or name,
                            "value": raw_value,
                            "status": status,
                            "severity": "warning" if "High" in status else "critical" if "Operational" in status else "info",
                            "detected_at": int(time.time()),
                            "location": location_str, # Use the determined location string
                            "evidence": {"rate_bps": rate_bps, "link_speed_bps": link_speed_bps},
                            "labels": [label for label in ([ "link-down" ] if "Operational" in status else ["high-bandwidth"] if "High bandwidth" in status else [])]
                        }
                        all_events.append(event_doc)

                    # print local line
                    print(f"[{dev}] {iface_label} - {name}: {raw_value} | rate_bps={rate_bps} -> {status}")

        # send bulk metrics & events to backend
        if BACKEND_METRICS_ENDPOINT and all_metrics:
            ok, resp = post_with_retries(BACKEND_METRICS_ENDPOINT, all_metrics)
            print("[BACKEND] metrics posted:", ok, resp)
        if BACKEND_EVENTS_ENDPOINT and all_events:
            ok, resp = post_with_retries(BACKEND_EVENTS_ENDPOINT, all_events)
            print("[BACKEND] events posted:", ok, resp)

        save_cache(cache)
        print(f"Cycle complete. sleeping {POLL_INTERVAL}s\n")
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
