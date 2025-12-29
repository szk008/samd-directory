"""
Email Service - Send magic links and notifications
Supports dev mode (console logging) and production (SMTP)
"""

import logging
from backend.config import Config

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, body: str, html_body: str = None):
    """
    Send email via SMTP or log to console in dev mode.
    """
    
    if not Config.EMAIL_SERVICE_ENABLED:
        # Development mode - log to console
        logger.warning(f"[DEV MODE] Email to {to_email}")
        print(f"\n{'='*60}")
        print(f"📧 EMAIL TO: {to_email}")
        print(f"SUBJECT: {subject}")
        print(f"{'='*60}")
        print(body)
        print(f"{'='*60}\n")
        return True, "Email logged (dev mode)"
    
    # Production mode - send via SMTP
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        msg = MIMEMultipart('alternative')
        msg['From'] = Config.SMTP_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add plain text
        msg.attach(MIMEText(body, 'plain'))
        
        # Add HTML if provided
        if html_body:
            msg.attach(MIMEText(html_body, 'html'))
        
        # Send via SMTP
        with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT) as server:
            server.starttls()
            server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
            server.send_message(msg)
        
        return True, "Email sent"
        
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False, f"Email failed: {str(e)}"


def send_magic_link(email: str, magic_link_url: str):
    """
    Send magic link email for authentication.
    """
    
    subject = "Login to SAMD Directory"
    
    # Plain text version
    body = f"""
Hello,

Click the link below to log in to SAMD Directory:

{magic_link_url}

This link will expire in 15 minutes.

If you didn't request this, please ignore this email.

—
SAMD Directory Team
"""
    
    # HTML version
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
<style>
    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
    .button {{ 
        display: inline-block; 
        padding: 12px 24px; 
        background-color: #00897b; 
        color: white !important; 
        text-decoration: none; 
        border-radius: 4px;
        margin: 20px 0;
    }}
    .footer {{ color: #666; font-size: 12px; margin-top: 30px; }}
</style>
</head>
<body>
    <div class="container">
        <h2>Login to SAMD Directory</h2>
        <p>Click the button below to log in:</p>
        <a href="{magic_link_url}" class="button">Log In</a>
        <p><small>Or copy this link: {magic_link_url}</small></p>
        <p class="footer">
            This link will expire in 15 minutes.<br>
            If you didn't request this, please ignore this email.
        </p>
    </div>
</body>
</html>
"""
    
    return send_email(email, subject, body, html_body)
