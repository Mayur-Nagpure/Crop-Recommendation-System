# Agricultural Crop Recommendation System

## Overview
A full-stack web app using Flask (backend) and HTML/CSS/JS (frontend) for recommending crops based on soil/climate data. Uses DecisionTreeClassifier from scikit-learn, trained on crop_data.csv. Recommendations factor in model predictions, season matching, and productivity from crops_info.csv.

## Setup Instructions
1. Install Python 3.9+.
2. Create a project folder and add all files as per structure.
3. Install dependencies: `pip install -r requirements.txt`
4. (Optional) Replace data:
   - Download full dataset from Kaggle: https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset (columns: N, P, K, temperature, humidity, ph, rainfall, label)
   - Save as `data/crop_data.csv` (ensure exact columns).
   - For crops_info.csv, extend with real data (e.g., from agricultural sources; format: crop,common_seasons (comma-sep like "kharif,rabi"),avg_productivity (float, e.g., tons/ha)).
   - Retrain: Run `python train.py` or hit /train endpoint.
5. Set env: `export FLASK_APP=app.py` (Linux/Mac) or `set FLASK_APP=app.py` (Windows).
6. Run: `flask run` (app starts at http://127.0.0.1:5000).
7. On first run, model auto-trains if missing. DB (SQLite) auto-creates in `instance/app.db`.

## Usage
- Visit http://127.0.0.1:5000.
- Register/Login (session-based).
- Enter N, P, K, temperature, humidity, pH, rainfall, and optional season.
- Submit: Get top 3 crop recommendations with scores.
- Logout to end session.

## Endpoints
- POST /register: {username, password}
- POST /login: {username, password}
- POST /logout
- POST /api/recommend: {N, P, K, temperature, humidity, ph, rainfall, season?} (JSON response)
- POST /train: Retrain model (unprotected for demo)

## Notes
- Input validation: Numerics >0, required fields.
- To add admin to /train: Modify app.py to check session['is_admin'].
- For production: Use env vars for SECRET_KEY, proper DB, HTTPS.
- Reference: Based on IEEE paper; frontend mimics simple form-based UI.