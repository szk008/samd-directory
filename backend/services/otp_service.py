import requests
from flask import current_app

def send_otp(phone: str, otp: str, prefer_whatsapp: bool = True) -> dict:
    """
    Send OTP via WhatsApp using MTalkz API, fallback to SMS.
    """
    api_key = current_app.config.get("MTALKZ_API_KEY")
    sender_id = current_app.config.get("MTALKZ_SENDER_ID", "SAMDDR")
    
    if not api_key:
        print(f"[OTP SIMULATION] Code for {phone}: {otp}")
        return {"success": True, "message": "OTP simulated (check console)", "simulated": True}

    phone_clean = ''.join(filter(str.isdigit, phone))[-10:]
    formatted_phone = f"91{phone_clean}"

    # Try WhatsApp first
    if prefer_whatsapp:
        try:
            payload = {
                "apikey": api_key,
                "channel": "whatsapp",
                "to": formatted_phone,
                "type": "template",
                "template_name": "otp_verification",
                "template_params": [otp],
                "message": f"Your SAMD Directory verification code is: {otp}. Valid for 5 minutes."
            }
            resp = requests.post("https://api.mtalkz.com/v2/whatsapp/send", json=payload, timeout=10)
            if resp.status_code == 200 and resp.json().get('status') == 'success':
                return {"success": True, "message": "OTP sent via WhatsApp"}
        except Exception as e:
            print(f"[OTP] WhatsApp failed: {e}")

    # Fallback to SMS
    try:
        payload = {
            "apikey": api_key,
            "senderid": sender_id,
            "number": formatted_phone,
            "message": f"Your SAMD Directory OTP is {otp}. Valid for 5 minutes. Do not share.",
            "format": "json"
        }
        resp = requests.post("https://api.mtalkz.com/v2/sendmessage", data=payload, timeout=10)
        if resp.status_code == 200 and resp.json().get('status') == 'success':
            return {"success": True, "message": "OTP sent via SMS"}
    except Exception as e:
        print(f"[OTP] SMS failed: {e}")

    print(f"[OTP FAILED] Code for {phone}: {otp}")
    return {"success": False, "message": "Failed to send OTP"}
