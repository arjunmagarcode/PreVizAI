#!/usr/bin/env python3
"""
Simple test script to verify all dependencies are installed correctly.
"""

import sys
import os

def test_imports():
    """Test that all required modules can be imported."""
    print("Testing Python dependencies...")
    
    try:
        import flask
        print("✓ Flask imported successfully")
    except ImportError as e:
        print(f"✗ Flask import failed: {e}")
        return False
        
    try:
        import flask_cors
        print("✓ Flask-CORS imported successfully")
    except ImportError as e:
        print(f"✗ Flask-CORS import failed: {e}")
        return False
        
    try:
        import openai
        print("✓ OpenAI imported successfully")
    except ImportError as e:
        print(f"✗ OpenAI import failed: {e}")
        return False
        
    try:
        import neo4j
        print("✓ Neo4j driver imported successfully")
    except ImportError as e:
        print(f"✗ Neo4j driver import failed: {e}")
        return False
        
    try:
        from dotenv import load_dotenv
        print("✓ python-dotenv imported successfully")
    except ImportError as e:
        print(f"✗ python-dotenv import failed: {e}")
        return False
        
    return True

def test_environment():
    """Test environment configuration."""
    print("\nTesting environment configuration...")
    
    # Check if .env file exists
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        print("✓ .env file found")
    else:
        print("⚠️  .env file not found - you'll need to create one with your API keys")
    
    return True

def test_local_imports():
    """Test that local modules can be imported."""
    print("\nTesting local modules...")
    
    try:
        from createKnowledgeGraph import build_knowledge_graph
        print("✓ createKnowledgeGraph module imported successfully")
    except ImportError as e:
        print(f"✗ createKnowledgeGraph import failed: {e}")
        return False
        
    try:
        from reviseKnowledgeGraph import revise_knowledge_graph
        print("✓ reviseKnowledgeGraph module imported successfully")
    except ImportError as e:
        print(f"✗ reviseKnowledgeGraph import failed: {e}")
        return False
        
    try:
        from generatePatientReport import generate_patient_report
        print("✓ generatePatientReport module imported successfully")
    except ImportError as e:
        print(f"✗ generatePatientReport import failed: {e}")
        return False
        
    return True

if __name__ == "__main__":
    print("PreViz AI Backend - Dependency Test")
    print("=" * 40)
    
    success = True
    success &= test_imports()
    success &= test_environment() 
    success &= test_local_imports()
    
    print("\n" + "=" * 40)
    if success:
        print("✅ All tests passed! Backend is ready to run.")
        print("\nTo start the backend server, run:")
        print("python run_server.py")
    else:
        print("❌ Some tests failed. Please check the error messages above.")
        sys.exit(1)
