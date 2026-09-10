"""
MENOTIPUS STORE MIS - Flask Backend
A RESTful API for managing store operations
"""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_marshmallow import Marshmallow
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

# Load environment variables
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
ma = Marshmallow()


def setup_logging(app):
    """Configure application logging."""
    if not app.debug and not app.testing:
        # Create logs directory
        log_dir = Path(app.root_path) / '..' / 'logs'
        log_dir.mkdir(exist_ok=True)
        
        # File handler
        file_handler = RotatingFileHandler(
            log_dir / 'app.log',
            maxBytes=10240000,  # 10MB
            backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
        console_handler.setLevel(logging.DEBUG if app.debug else logging.INFO)
        
        # App logger
        app.logger.addHandler(file_handler)
        app.logger.addHandler(console_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('MENOTIPUS Store MIS startup')


def create_app(config_object=None):
    """Application factory for creating Flask app instance."""
    app = Flask(__name__)
    
    # Configuration
    if config_object:
        if isinstance(config_object, dict):
            app.config.from_mapping(config_object)
        else:
            app.config.from_object(config_object)
    else:
        app.config.from_mapping(
            SECRET_KEY=os.getenv('SECRET_KEY', 'dev-secret-key'),
            SQLALCHEMY_DATABASE_URI=os.getenv('DATABASE_URL', 'postgresql://localhost/menotipus_store'),
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
            JWT_SECRET_KEY=os.getenv('JWT_SECRET_KEY', 'jwt-secret-key'),
            JWT_ACCESS_TOKEN_EXPIRES=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600)),
            JWT_REFRESH_TOKEN_EXPIRES=int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 2592000)),
            TESTING=os.getenv('TESTING', 'False').lower() == 'true',
        )
    
    # Database engine options for connection pooling
    if not app.config.get('TESTING'):
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_size': 10,
            'pool_recycle': 300,
            'pool_pre_ping': True,
        }
    
    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    ma.init_app(app)
    
    # Configure CORS
    cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')
    CORS(app, 
         origins=cors_origins,
         supports_credentials=os.getenv('CORS_SUPPORTS_CREDENTIALS', 'true').lower() == 'true',
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
    
    # Setup logging
    setup_logging(app)
    
    # Register blueprints
    api_version = os.getenv('API_VERSION', 'v1')
    from app.blueprints import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return {
            'status': 'healthy',
            'message': 'MENOTIPUS Store API is running',
            'version': api_version
        }
    
    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return {'error': 'Resource not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        app.logger.error(f'Internal error: {error}')
        return {'error': 'Internal server error'}, 500
    
    @app.errorhandler(422)
    def unprocessable_entity_error(error):
        return {'error': 'Unprocessable entity', 'details': error.description}, 422
    
    return app
