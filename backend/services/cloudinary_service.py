import cloudinary
import cloudinary.uploader
from flask import current_app

def init_cloudinary():
    """Initialize Cloudinary with config from Flask app"""
    cloudinary.config(
        cloud_name=current_app.config['CLOUDINARY_CLOUD_NAME'],
        api_key=current_app.config['CLOUDINARY_API_KEY'],
        api_secret=current_app.config['CLOUDINARY_API_SECRET'],
        secure=True
    )

def upload_image(file, folder='doctors'):
    """
    Upload image to Cloudinary
    Args:
        file: FileStorage object from Flask
        folder: Cloudinary folder name
    Returns:
        dict with url and public_id or None if failed
    """
    try:
        # Upload with transformations
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            transformation=[
                {'width': 800, 'height': 800, 'crop': 'limit'},
                {'quality': 'auto:good'},
                {'fetch_format': 'auto'}
            ]
        )
        
        return {
            'url': result.get('secure_url'),
            'public_id': result.get('public_id')
        }
    except Exception as e:
        current_app.logger.error(f"Cloudinary upload error: {e}")
        return None

def delete_image(public_id):
    """Delete image from Cloudinary"""
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result.get('result') == 'ok'
    except Exception as e:
        current_app.logger.error(f"Cloudinary delete error: {e}")
        return False
