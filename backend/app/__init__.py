from flask import Flask

from app.config import Config
from app.errors import register_error_handlers
from app.extensions import cors, jwt


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)

    cors.init_app(app)  # allow the frontend (different origin in dev) to call this API
    jwt.init_app(app)
    register_error_handlers(app)

    # Imported here (not at module top) so app.db's sys.path setup runs
    # after Flask config/env loading, and so a config error surfaces as a
    # normal exception instead of an import-time crash.
    from app.db import init_db

    init_db(app)

    from app.analytics.routes import bp as analytics_bp
    from app.auth.routes import bp as auth_bp
    from app.departments.routes import bp as departments_bp
    from app.issues.routes import bp as issues_bp
    from app.notifications.routes import bp as notifications_bp
    from app.uploads.routes import bp as uploads_bp

    app.register_blueprint(analytics_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(departments_bp)
    app.register_blueprint(issues_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(uploads_bp)

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app
