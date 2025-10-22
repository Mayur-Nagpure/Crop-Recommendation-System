# app.py - Final Production-Ready Version for Render Deployment
# Updated: Switched to psycopg (v3) for Python 3.13 compatibility.
# Run locally: python train.py first to generate models.

import os
import traceback
import logging
import json
import urllib.parse
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import joblib
import pandas as pd
import numpy as np

# --- Basic Setup ---
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret')

# Database: Use DATABASE_URL (Render provides this for free Postgres) - Updated URI for psycopg v3
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///local.db').replace('postgresql://', 'postgresql+psycopg://')  # Fallback to SQLite for local
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)
CORS(app)

# --- Database Model ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)

with app.app_context():
    db.create_all()

# --- ML Model Loading ---
model = None
label_encoder = None
crops_info = None

def load_model_and_data():
    """Loads the pre-trained model and the crop details CSV."""
    global model, label_encoder, crops_info
    try:
        model = joblib.load('model.joblib')
        label_encoder = joblib.load('label_encoder.joblib')
        crops_info = pd.read_csv('data/crops_info.csv', on_bad_lines='skip')
        # Clean crop names on load to guarantee reliable matching
        crops_info['crop'] = crops_info['crop'].str.strip().str.lower()
        logger.info("Model and crop info data loaded successfully.")
    except FileNotFoundError as e:
        logger.error(f"FATAL: Model or data file not found: {e}. Please run train.py first.")
        raise
    except Exception as e:
        logger.error(f"An unexpected error occurred during loading: {e}")
        raise

# Load everything on startup
load_model_and_data()

# --- Routes --- (Unchanged)

@app.route('/')
def index():
    return render_template('index.html', logged_in=('user_id' in session))

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'success': False, 'error': 'Username already exists'}), 400
    user = User(username=data['username'], password_hash=generate_password_hash(data['password']))
    db.session.add(user)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if user and check_password_hash(user.password_hash, data['password']):
        session['user_id'] = user.id
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'success': True})

@app.route('/api/detailed-recommend', methods=['POST'])
def detailed_recommend():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    try:
        data = request.json
        input_features = pd.DataFrame([data], columns=['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall'])
        proba = model.predict_proba(input_features)[0]
        
        # Get top 3 predictions directly from the model
        top_indices = np.argsort(proba)[-3:][::-1]
        top_crops = label_encoder.inverse_transform(top_indices)
        top_scores = proba[top_indices]

        # Convert scores to standard float for JSON serialization
        recommendations = [{'crop': crop, 'score': float(score)} for crop, score in zip(top_crops, top_scores)]
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'user_inputs': data
        })
    except Exception as e:
        logger.error(f"Error in detailed-recommend: {e}")
        return jsonify({'success': False, 'error': 'An internal error occurred'}), 500

@app.route('/api/crop-details', methods=['GET'])
def crop_details():
    crop_name = request.args.get('crop', '').strip().lower()
    if not crop_name:
        return jsonify({'success': False, 'error': 'Crop name required'}), 400

    # The data is pre-cleaned, so this lookup is now reliable
    crop_row = crops_info[crops_info['crop'] == crop_name]
    
    if crop_row.empty:
        logger.error(f"Details not found for '{crop_name}'. Ensure it exists in 'crops_info.csv'.")
        return jsonify({'success': False, 'error': f'Details for {crop_name} not found'}), 404

    details = crop_row.iloc[0].to_dict()
    details['success'] = True
    return jsonify(details)

@app.route('/detailed-recommendations')
def detailed_recommendations_page():
    data_str = request.args.get('data', '')
    data = json.loads(urllib.parse.unquote(data_str)) if data_str else {}
    return render_template('detailed_recommendations.html', data=data)

if __name__ == '__main__':
    # Production: Debug only if explicitly set
    app.run(debug=os.environ.get('FLASK_DEBUG', 'False').lower() == 'true')