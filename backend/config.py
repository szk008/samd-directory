import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "sqlite:///directory.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")

    MTALKZ_API_KEY = os.getenv("MTALKZ_API_KEY", "ImPBeDyAom6zfpFgJfhrI0OUivG26T")
    MTALKZ_SENDER_ID = "SAMDDR"
    
    ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "CHANGE_THIS_SECRET_IN_PROD")
