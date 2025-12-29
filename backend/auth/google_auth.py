"""
Google OAuth Authentication Module
Verifies Google ID tokens and extracts user information.
"""

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from backend.config import Config

def verify_google_token(id_token_string: str):
    """
    Verify Google ID token and extract user information.
    Returns: (user_info, error) tuple
    
    user_info contains: {
        'google_sub': str,  # Unique Google ID
        'email': str,
        'name': str,
        'picture': str
    }
    """
    
    if not Config.GOOGLE_CLIENT_ID:
        return None, "Google authentication not configured"
    
    try:
        # Verify token with Google
        idinfo = id_token.verify_oauth2_token(
            id_token_string,
            google_requests.Request(),
            Config.GOOGLE_CLIENT_ID
        )
        
        # Extract user info
        user_info = {
            'google_sub': idinfo['sub'],
            'email': idinfo.get('email', '').lower(),
            'name': idinfo.get('name', ''),
            'picture': idinfo.get('picture', ''),
            'email_verified': idinfo.get('email_verified', False)
        }
        
        return user_info, None
        
    except ValueError as e:
        return None, f"Invalid Google token: {str(e)}"
    except Exception as e:
        return None, f"Google authentication error: {str(e)}"


def extract_google_info(user_info: dict):
    """
    Extract and format Google user information for doctor profile.
    """
    return {
        'google_sub': user_info['google_sub'],
        'email': user_info['email'],
        'name': user_info.get('name', ''),
        # Note: mobile will be collected separately (REQUIRED)
    }
