# train.py - Standalone script to train the model on Kaggle CSV
# Run: python train.py
# Assumes data/crop_data.csv is the Kaggle file (e.g., 2200 rows, 22 crops)

import joblib
import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def train_model():
    try:
        # Load Kaggle CSV
        data = pd.read_csv('data/crop_data.csv')
        logger.info(f"Loaded dataset: {len(data)} samples, {data['label'].nunique()} unique crops")
        print(f"📊 Dataset Stats: {len(data)} soil/climate samples from Kaggle, covering {data['label'].nunique()} crops (e.g., rice, maize, etc.)")
        
        X = data[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']]
        y = data['label']

        # Encode labels (will handle 22 classes from Kaggle)
        label_encoder = LabelEncoder()
        y_encoded = label_encoder.fit_transform(y)

        # Train DecisionTree (quick for 2200 rows)
        model = DecisionTreeClassifier(random_state=42)
        model.fit(X, y_encoded)

        # Save
        joblib.dump(model, 'model.joblib')
        joblib.dump(label_encoder, 'label_encoder.joblib')
        
        # Log classes (22 from Kaggle)
        print(f"✅ Model trained on Kaggle data! Classes: {list(label_encoder.classes_)}")
        logger.info("Model trained and saved successfully.")
        
    except Exception as e:
        logger.error(f"Training failed: {e}")
        print(f"❌ Training failed: {e}")
        raise

if __name__ == '__main__':
    train_model()
