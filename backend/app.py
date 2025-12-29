from flask import Flask, jsonify
from flask_cors import CORS
from backend.config import Config
from backend.database import db
from backend.routes.search import search_bp
from backend.routes.public import public_bp
from backend.routes.admin import admin_bp
from backend.routes.auth import auth_bp
from backend.routes.doctor_self import doctor_self_bp

def create_app():
    app = Flask(__name__, template_folder="../web/templates", static_folder="../web/static")
    app.config.from_object(Config)
    
    # Enable CORS for API routes
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    db.init_app(app)

    app.register_blueprint(search_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(doctor_self_bp)

    with app.app_context():
        db.create_all()
    
    # Configure logging
    if not app.debug:
        import logging
        logging.basicConfig(level=logging.INFO)
        app.logger.setLevel(logging.INFO)
    
    # Error handlers
    @app.errorhandler(Exception)
    def server_error(e):
        app.logger.error(f"Unhandled exception: {str(e)}")
        return jsonify({"error": "Server error"}), 500
    
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404
    
    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"error": "Forbidden"}), 403

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
