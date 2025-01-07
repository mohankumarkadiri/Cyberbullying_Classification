from flask import Flask
from flask_cors import CORS
from app.config.settings import DevelopmentConfig, ProductionConfig
from werkzeug.middleware.proxy_fix import ProxyFix
import os


def create_app():
    app = Flask(__name__)

    env = os.getenv("FLASK_DEBUG", "development")
    if env == "production":
        app.config.from_object(ProductionConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    # Enable proxy support for production environments
    if env == "production":
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

    # Configure CORS
    CORS(
        app,
        origins=["http://localhost:17293"],
        methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
        supports_credentials=True,
        max_age=3600,
    )

    # Register blueprints
    with app.app_context():
        try:
            from app.routes.api_routes import api_bp
            app.register_blueprint(api_bp, url_prefix="/api")
        except Exception as e:
            print(f"⛔ Failed to register blueprints: {str(e)}")
            raise

    return app
