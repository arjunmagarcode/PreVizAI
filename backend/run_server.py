#!/usr/bin/env python3
"""
Startup script for the PreViz AI Flask backend server.
Run this script to start the backend server for the healthcare application.
"""

import os
import sys
from dotenv import load_dotenv

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Load environment variables
load_dotenv()

from app import app

if __name__ == "__main__":
    # Get configuration from environment variables
    host = os.getenv("FLASK_HOST", "127.0.0.1")
    port = int(os.getenv("FLASK_PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    
    print(f"Starting PreViz AI Backend Server...")
    print(f"Server will be available at: http://{host}:{port}")
    print(f"Debug mode: {debug}")
    
    # Start the Flask application
    app.run(host=host, port=port, debug=debug)
