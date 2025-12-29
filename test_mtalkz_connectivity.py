"""
Test script to check if mTalkz API is accessible from PythonAnywhere.
Run this on PythonAnywhere console to verify connectivity.
"""

import requests

def test_mtalkz_connectivity():
    """Test if mTalkz API endpoints are accessible"""
    
    print("Testing mTalkz API connectivity from PythonAnywhere...\n")
    
    # mTalkz endpoints
    endpoints = {
        "WhatsApp": "https://api.mtalkz.com/v2/whatsapp/send",
        "SMS": "https://api.mtalkz.com/v2/sendmessage"
    }
    
    for name, url in endpoints.items():
        print(f"Testing {name} endpoint: {url}")
        try:
            # Try basic connection (will fail auth, but proves connectivity)
            response = requests.post(url, json={"test": "connectivity"}, timeout=5)
            print(f"✅ {name}: Connected! (Status: {response.status_code})")
            print(f"   Response: {response.text[:100]}")
        except requests.exceptions.ConnectionError as e:
            print(f"❌ {name}: CONNECTION BLOCKED by firewall")
            print(f"   Error: {str(e)[:100]}")
        except requests.exceptions.Timeout:
            print(f"⚠️  {name}: Timeout (might be slow, not blocked)")
        except Exception as e:
            print(f"⚠️  {name}: Other error - {str(e)[:100]}")
        print()
    
    print("\n" + "="*60)
    print("IMPORTANT:")
    print("- If you see ❌ CONNECTION BLOCKED, mTalkz is blocked by PythonAnywhere")
    print("- Solution: Upgrade to paid PythonAnywhere account")
    print("- Or: Use PythonAnywhere's whitelist request for mTalkz domains")
    print("- For now: OTPs will log to console (dev mode)")
    print("="*60)

if __name__ == "__main__":
    test_mtalkz_connectivity()
