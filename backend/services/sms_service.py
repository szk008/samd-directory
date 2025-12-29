from backend.config import Config
import logging

logger = logging.getLogger(__name__)

def send_sms(mobile_number, message):
    """
    Send SMS to a mobile number.
    Currently a stub - integrate with Twilio/SMS gateway in production.
    """
    if Config.SMS_GATEWAY_ENABLED:
        # TODO: Integrate with actual SMS gateway
        # Example: Twilio, MSG91, AWS SNS, etc.
        logger.info(f"SMS would be sent to {mobile_number}: {message}")
        return True, "SMS sent"
    else:
        # Development mode - log OTP to console
        logger.warning(f"[DEV MODE] SMS to {mobile_number}: {message}")
        print(f"\n{'='*50}")
        print(f"📱 OTP FOR {mobile_number}: {message}")
        print(f"{'='*50}\n")
        return True, "OTP logged (dev mode)"

def send_otp(mobile_number, otp):
    """Send OTP via SMS"""
    message = f"Your SAMD Directory OTP is: {otp}. Valid for 5 minutes. Do not share."
    return send_sms(mobile_number, message)
