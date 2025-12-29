from flask import Flask
from backend.config import Config
from backend.database import db
from backend.routes.search import search_bp
from backend.routes.public import public_bp
from backend.routes.admin import admin_bp
from backend.routes.auth import auth_bp

def create_app():
    app = Flask(__name__, template_folder="../web/templates", static_folder="../web/static")
    app.config.from_object(Config)

    db.init_app(app)

    app.register_blueprint(search_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(auth_bp)

    with app.app_context():
        db.create_all()

    return app

app = create_app()

@app.errorhandler(Exception)
def server_error(e):
    # Log the error here in production
    return jsonify({"error": "Server error"}), 500

if __name__ == "__main__":
    app.run(debug=True)
