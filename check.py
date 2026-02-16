#!/usr/bin/env python3
"""
Reseed Server Check Script for CheckI2P Cloudflare backend
Runs reseed checks, retries failures through Tor, reports status via HTTP API,
and uploads SU3 files to R2 storage.
"""

import subprocess
import re
import time
import os
from datetime import datetime
import requests

API_BASE = (os.environ.get('CHECKI2P_API_ENDPOINT') or 'https://checki2p.com/api').rstrip('/')
API_KEY = os.environ.get('CHECKI2P_API_KEY')
INGEST_ENDPOINT = f"{API_BASE}/ingest"
UPLOAD_ENDPOINT = f"{API_BASE}/ingest/upload"
REQUEST_TIMEOUT = int(os.environ.get('CHECKI2P_API_TIMEOUT', '30'))

RESEEDER_CMD = 'cd /home/i2p/i2p && java -cp "lib/*" net.i2p.router.RouterCommandLine reseeder'
TOR_SOCKS_PROXY = 'socks5h://127.0.0.1:9050'

# Statuses that indicate a server may have been rate-limited or had transient failure
RETRIABLE_MESSAGES = ['Status code -1', 'Status code 500']


def execute_command(output_file, command):
    """Execute shell command and save output to file"""
    with open(output_file, "w") as file:
        subprocess.run(command, shell=True, stdout=file, stderr=subprocess.STDOUT)


def restart_tor_service():
    """Restart Tor service"""
    print("  Restarting Tor service...")
    subprocess.run("sudo systemctl restart tor", shell=True)
    time.sleep(30)


def request_new_tor_circuit():
    """Request a new Tor circuit by sending SIGHUP"""
    print("  Requesting new Tor circuit...")
    subprocess.run("sudo killall -HUP tor", shell=True)
    time.sleep(5)


def parse_reseed_output(output):
    """Parse the reseed checker output and extract server statuses"""
    servers = []

    host_blocks = re.split(r'(?=Host:)', output)

    for block in host_blocks:
        if 'Host:' not in block:
            continue

        host_match = re.search(r'Host:\s+(.*?)(?:\n|$)', block)
        if not host_match:
            continue

        hostname = host_match.group(1).strip()

        server_info = {
            'hostname': hostname,
            'status': 'unknown',
            'router_infos': 0,
            'message': '',
            'last_check': datetime.now().isoformat()
        }

        # Check for success
        success_match = re.search(r'Success:\s+(\d+)\s+RouterInfos returned', block)
        old_match = re.search(r'(\d+)\s+old RouterInfos returned', block)

        if success_match:
            router_count = int(success_match.group(1))
            server_info['status'] = 'online'
            server_info['router_infos'] = router_count
            server_info['message'] = f'{router_count} RouterInfos returned'
            if old_match:
                old_count = int(old_match.group(1))
                server_info['message'] += f' ({old_count} old)'

        elif old_match:
            old_count = int(old_match.group(1))
            server_info['status'] = 'online'
            server_info['router_infos'] = old_count
            server_info['message'] = f'{old_count} old RouterInfos returned'

        elif 'su3 file is too old' in block:
            server_info['status'] = 'warning'
            server_info['message'] = 'su3 file is too old'

        elif 'Status code -1' in block:
            server_info['status'] = 'offline'
            server_info['message'] = 'Connection failed (Status code -1)'

        elif 'Status code 500' in block:
            server_info['status'] = 'offline'
            server_info['message'] = 'Connection failed (Status code 500)'

        elif re.search(r'Only \d+ RouterInfos returned \(less than 50\)', block):
            router_match = re.search(r'Only (\d+) RouterInfos returned', block)
            if router_match:
                count = router_match.group(1)
                server_info['status'] = 'warning'
                server_info['message'] = f'Only {count} RouterInfos returned'
                server_info['router_infos'] = int(count)

        elif 'Not an su3 file' in block:
            server_info['status'] = 'error'
            server_info['message'] = 'Not an su3 file'

        elif 'Failure:' in block:
            failure_match = re.search(r'Failure:\s+(.*?)(?:\n|$)', block)
            if failure_match:
                server_info['status'] = 'error'
                server_info['message'] = failure_match.group(1).strip()

        servers.append(server_info)

    return servers


def retry_failed_servers(failed_servers):
    """Retry failed servers through Tor SOCKS5 proxy with a simple HTTP check"""
    if not failed_servers:
        return {}

    print(f"\n  Retrying {len(failed_servers)} failed servers through Tor...")
    request_new_tor_circuit()

    proxies = {'https': TOR_SOCKS_PROXY, 'http': TOR_SOCKS_PROXY}
    results = {}

    for server in failed_servers:
        hostname = server['hostname']
        url = f"https://{hostname}/i2pseeds.su3"
        try:
            resp = requests.get(url, proxies=proxies, timeout=30,
                                headers={'User-Agent': 'Wget/1.11.4'})
            if resp.status_code == 200 and len(resp.content) > 1024:
                print(f"  {hostname}: online (Tor retry succeeded, {len(resp.content)} bytes)")
                results[hostname] = {
                    'hostname': hostname,
                    'status': 'online',
                    'router_infos': 0,
                    'message': 'Success (verified via Tor retry)',
                    'last_check': datetime.now().isoformat()
                }
            else:
                print(f"  {hostname}: still offline (HTTP {resp.status_code}, {len(resp.content)} bytes)")
        except requests.RequestException as e:
            print(f"  {hostname}: still offline ({e})")

    return results


def download_su3_file(hostname):
    """Download su3 file from reseed server using wget"""
    url = f"https://{hostname}/i2pseeds.su3"
    output_file = f"{hostname}.su3"

    wget_command = [
        'wget',
        '--user-agent=Wget/1.11.4',
        '--timeout=30',
        '--tries=2',
        '-O', output_file,
        url
    ]

    print(f"  Downloading from {hostname}...")

    try:
        result = subprocess.run(wget_command, capture_output=True, text=True)
        if result.returncode == 0 and os.path.exists(output_file):
            file_size = os.path.getsize(output_file)
            print(f"  Downloaded ({file_size} bytes)")
            return output_file
        else:
            print(f"  Download failed")
            return None
    except Exception as e:
        print(f"  Download error: {e}")
        return None


def post_server_statuses(servers):
    """Send reseed server statuses to the CheckI2P ingest API"""
    if not API_KEY:
        print("CHECKI2P_API_KEY is not set")
        return False

    if not servers:
        print("No servers to send")
        return False

    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }

    payload = {'servers': servers}

    try:
        response = requests.post(
            INGEST_ENDPOINT,
            json=payload,
            headers=headers,
            timeout=REQUEST_TIMEOUT
        )
        if response.status_code not in (200, 207):
            print(f"Ingest failed ({response.status_code}): {response.text}")
            return False
        data = response.json()
        print(f"Ingest OK: {data.get('updated', 0)} updated, {len(data.get('errors', []))} errors")
        return True
    except requests.RequestException as error:
        print(f"Ingest request error: {error}")
        return False


def upload_su3_to_api(hostname, file_path):
    """Upload a downloaded SU3 file to the CheckI2P upload API"""
    if not API_KEY:
        return False

    if not os.path.exists(file_path):
        return False

    headers = {'Authorization': f'Bearer {API_KEY}'}
    data = {'hostname': hostname}

    try:
        with open(file_path, 'rb') as file_handle:
            files = {
                'file': (os.path.basename(file_path), file_handle, 'application/octet-stream')
            }
            response = requests.post(
                UPLOAD_ENDPOINT,
                headers=headers,
                data=data,
                files=files,
                timeout=REQUEST_TIMEOUT
            )
        if response.status_code != 200:
            print(f"  Upload failed ({response.status_code}): {response.text}")
            return False
        print(f"  Uploaded to R2")
        return True
    except requests.RequestException as error:
        print(f"  Upload error: {error}")
        return False


def process_su3_uploads(servers):
    """Download SU3 files for online servers and send to the API"""
    print("\n--- SU3 uploads ---")
    if not API_KEY:
        print("CHECKI2P_API_KEY is not set, skipping uploads")
        return

    online_servers = [s for s in servers if s['status'] == 'online']
    print(f"Uploading for {len(online_servers)} online servers\n")

    downloaded = 0
    uploaded = 0

    for server in online_servers:
        hostname = server['hostname']
        print(f"{hostname}:")
        file_path = download_su3_file(hostname)
        if not file_path:
            continue

        downloaded += 1
        if upload_su3_to_api(hostname, file_path):
            uploaded += 1

        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError:
            pass

    print(f"\nSU3 complete: {downloaded} downloaded, {uploaded} uploaded")


def main():
    print("=" * 60)
    print("I2P RESEED SERVER CHECK")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    # Step 1: Run reseeder (direct, no torsocks)
    print("\n--- Running reseed checks (direct) ---")
    output_file = "reseed_output.txt"
    execute_command(output_file, RESEEDER_CMD)

    with open(output_file, 'r') as file:
        output = file.read()

    # Step 2: Parse results
    print("\n--- Parsing results ---")
    servers = parse_reseed_output(output)
    print(f"Found {len(servers)} servers")

    # Step 3: Identify failures that might be rate-limited
    failed = [s for s in servers if any(msg in s['message'] for msg in RETRIABLE_MESSAGES)]

    if failed:
        print(f"\n--- Rate-limit retry ({len(failed)} servers) ---")
        retry_results = retry_failed_servers(failed)

        # Merge retry results into servers list
        for i, server in enumerate(servers):
            if server['hostname'] in retry_results:
                servers[i] = retry_results[server['hostname']]

    # Step 4: Check if Tor restart is needed (many failures even after retry)
    still_failed = sum(1 for s in servers if s['status'] in ('offline', 'error'))
    if still_failed > 5:
        print(f"\n--- {still_failed} servers still failing, restarting Tor ---")
        restart_tor_service()

    # Step 5: Summary
    print("\n--- Summary ---")
    online = sum(1 for s in servers if s['status'] == 'online')
    offline = sum(1 for s in servers if s['status'] == 'offline')
    warning = sum(1 for s in servers if s['status'] == 'warning')
    error = sum(1 for s in servers if s['status'] == 'error')
    print(f"Online: {online}  Offline: {offline}  Warning: {warning}  Error: {error}")

    for s in servers:
        marker = {'online': '+', 'offline': '-', 'warning': '~', 'error': '!'}.get(s['status'], '?')
        print(f"  [{marker}] {s['hostname']}: {s['message']}")

    # Step 6: Send to ingest API
    print("\n--- Sending to ingest API ---")
    post_server_statuses(servers)

    # Step 7: Upload SU3 files
    process_su3_uploads(servers)

    print("\n" + "=" * 60)
    print(f"Finished: {datetime.now().isoformat()}")
    print("=" * 60)


if __name__ == "__main__":
    main()
