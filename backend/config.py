import os

class Config:
    """Flask application configuration"""
    
    # Database - Use absolute path for PythonAnywhere
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(BASE_DIR, 'samd.db')
    
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DB_PATH}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT Secret (use environment variable in production!)
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-secret-change-in-production')
    JWT_EXPIRY_HOURS = 24  # JWT tokens expire after 24 hours
    
    # OTP Configuration
    OTP_EXPIRY_MINUTES = 5
    OTP_MAX_ATTEMPTS = 3
    OTP_RATE_LIMIT_PER_HOUR = 3  # Max OTP requests per phone per hour
    
    # mTalkz SMS/WhatsApp Gateway
    MTALKZ_API_KEY = os.getenv('MTALKZ_API_KEY', '')  # Set this in environment!
    MTALKZ_SENDER_ID = os.getenv('MTALKZ_SENDER_ID', 'SAMDDR')
    
    # Legacy SMS config (deprecated, using mTalkz now)
    SMS_GATEWAY_ENABLED = os.getenv('SMS_GATEWAY_ENABLED', 'False') == 'True'
    SMS_GATEWAY_API_KEY = os.getenv('SMS_GATEWAY_API_KEY', '')
    
    # Call Masking (stub for now)
    CALL_MASKING_ENABLED = os.getenv('CALL_MASKING_ENABLED', 'False') == 'True'
    
    # Admin
    ADMIN_TOKEN = os.getenv('ADMIN_TOKEN', 'admin-secret-123')  # Change in production!
    
    # Security
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')  # Restrict in production
