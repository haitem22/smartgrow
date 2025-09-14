from flask import Flask, request, jsonify
import pickle
import joblib
import pandas as pd
import numpy as np
from flask_cors import CORS
from sklearn.ensemble import RandomForestClassifier

class ProgressRandomForestClassifier(RandomForestClassifier):
    def fit(self, X, y):
        pass

app = Flask(__name__)
CORS(app, resources={r"/predict": {"origins": ["http://localhost:3000", "http://localhost:3001"]}})

MODEL_PATH = r'D:/programing/New folder (2)\backend/pump_controller1.pkl'
try:
    
    model = joblib.load(MODEL_PATH)
    print(f"Model loaded successfully from {MODEL_PATH}")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

SCALER_PATH = r'D:/programing/New folder (2)\backend\scaler.pkl'
try:
    
    scaler = joblib.load(SCALER_PATH)
    print(f"Scaler loaded successfully from {SCALER_PATH}")
except Exception as e:
    print(f"Error loading scaler: {e}")
    scaler = None

@app.route('/predict', methods=['POST'])
def predict():
    if model is None or scaler is None:
        return jsonify({'error': 'Model or scaler not loaded'}), 500
    
    try:
        data = request.get_json()
        required_features = ['h', 't', 'm']
        if not all(k in data for k in required_features):
            return jsonify({'error': 'Missing features h, t, m'}), 400


        input_data = pd.DataFrame([{
            'Soil Moisture': float(data['m']),
            'Temperature': float(data['t']) if data['t'] is not None else 25.0,
            'Air Humidity': float(data['h']) if data['h'] is not None else 50.0,
        }])

        input_scaled = scaler.transform(input_data)
        prediction = model.predict(input_scaled)[0]
        prediction = prediction.item() if isinstance(prediction, np.integer) else prediction
        print(f"input data :{input_data}")
        print(f"input data scaled :{input_scaled}")
        print(f"prediction :{prediction}")
        if(prediction == 0):
            send_prediction = 1
            try:
                D = 0.6
                Q = 0.1
                E = 0.9
                A = 1
                FC_fraction = 0.25  # Field capacity for sandy loam (fraction)
                PWP_fraction = 0.1  # Permanent wilting point for sandy loam (fraction)
                sensor_reading_M = data['m']  # Current soil moisture sensor reading (0-1023)
                sensor_reading_FC = 200  # Sensor reading at field capacity
                sensor_reading_dry = 1023  # Sensor reading at dry soil (PWP)
                M_fraction = ((sensor_reading_dry - sensor_reading_M) / (sensor_reading_dry - sensor_reading_FC)
                              ) * (FC_fraction - PWP_fraction) + PWP_fraction
                FC_minus_M = FC_fraction - M_fraction
                T1 = FC_minus_M * A * D
                T2 = E * Q
                T = T1 / T2 #in heurs
                return jsonify({"prediction": send_prediction, "time": T}), 200
            except Exception as e:
                return jsonify({'error': f'Error calculating irrigation duration: {str(e)}'}), 500
        else:
            send_prediction = 0
            return jsonify({'prediction': send_prediction, "time": None}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)