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
    
    # Favicon route (prevents 404 errors)
    @app.route("/favicon.ico")
    def favicon():
        return "", 204
    
    # Error handlers (simplified for deployment stability)
    @app.errorhandler(500)
    def internal_error(e):
        app.logger.error(f"Internal error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500
    
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
