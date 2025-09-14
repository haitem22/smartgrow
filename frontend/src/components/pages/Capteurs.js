import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './Capteurs.css';

const SensorCard = ({ sensor, onCalibrate, onReset }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'warning': return 'Attention';
      case 'error': return 'Erreur';
      default: return 'Inactif';
    }
  };

  return (
    <div className="sensor-card">
      <div className="sensor-header">
        <div className="sensor-icon">{sensor.icon}</div>
        <div className="sensor-info">
          <h3>{sensor.name}</h3>
          <p className="sensor-type">{sensor.type}</p>
        </div>
        <div 
          className="sensor-status"
          style={{ backgroundColor: getStatusColor(sensor.status) }}
        >
          {getStatusText(sensor.status)}
        </div>
      </div>
      
      <div className="sensor-details">
        <div className="sensor-reading">
          <span className="reading-label">Valeur :</span>
          <span className="reading-value">{sensor.currentValue}</span>
        </div>
        
        <div className="sensor-specs">
          <div className="spec-item">
            <span>Plage de mesure:</span>
            <span>{sensor.range}</span>
          </div>
          <div className="spec-item">
            <span>Précision:</span>
            <span>{sensor.accuracy}</span>
          </div>
          <div className="spec-item">
            <span>Dernière calibration:</span>
            <span>{sensor.lastCalibration}</span>
          </div>
          <div className="spec-item">
            <span>Emplacement:</span>
            <span>{sensor.location}</span>
          </div>
        </div>
      </div>
      
      <div className="sensor-actions">
        <button 
          className="btn btn-primary"
          onClick={() => onCalibrate(sensor.id)}
        >
          📊 Calibrer
        </button>
        <button 
          className="btn btn-secondary"
          onClick={() => onReset(sensor.id)}
        >
          🔄 Réinitialiser
        </button>
      </div>
    </div>
  );
};

const Capteurs = () => {
  const [sensors, setSensors] = useState([
    {
      id: 1,
      name: 'Capteur d\'Humidité du Sol YL-69',
      type: 'Humidité du Sol',
      icon: '💧',
      currentValue: '--',
      status: 'inactive',
      range: '0-100%',
      accuracy: '±2%',
      lastCalibration: '--',
      location: 'Zone de culture A',
      technicalSpecs: {
        voltage: '3.3V - 5V',
        output: 'Signal analogique',
        material: 'Électrodes en nickel',
        dimensions: '60mm x 20mm x 5mm'
      }
    },
    {
      id: 2,
      name: 'Capteur DHT11',
      type: 'Température & Humidité Air',
      icon: '🌡️',
      currentValue: '--',
      status: 'inactive',
      range: '0-50°C / 20-90%',
      accuracy: '±2°C / ±5%',
      lastCalibration: '--',
      location: 'Serre principale',
      technicalSpecs: {
        voltage: '3V - 5.5V',
        output: 'Signal numérique',
        interface: 'Single-wire',
        dimensions: '15.5mm x 12mm x 5.5mm'
      }
    },
  ]);
  const [error, setError] = useState(null);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:3000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      setError(null);
    });

    socket.on('sensorData', (data) => {
      try {
        console.log('Received sensor data:', data);

        const timestamp = data.ts
          ? new Date(data.ts * 1000).toLocaleDateString('fr-FR')
          : new Date().toLocaleDateString('fr-FR');

        const soilMoistureStatus = data.h_soil_pourcentage
          ? data.h_soil_pourcentage === 0 ? 'error' : data.h_soil_pourcentage < 40 ? 'warning' : 'active'
          : 'inactive';
        const tempStatus = data.t
          ? data.t < 10 || data.t > 40 ? 'error' : data.t < 15 || data.t > 35 ? 'warning' : 'active'
          : 'inactive';
        const humidityStatus = data.h_air
          ? data.h_air < 30 ? 'error' : data.h_air < 50 ? 'warning' : 'active'
          : 'inactive';

        const updatedSensors = [
          {
            id: 1,
            name: 'Capteur d\'Humidité du Sol YL-69',
            type: 'Humidité du Sol',
            icon: '💧',
            currentValue: data.h_soil_pourcentage ? `${data.h_soil_pourcentage}%` : '--',
            status: soilMoistureStatus,
            range: '0-100%',
            accuracy: '±2%',
            lastCalibration: timestamp,
            location: 'Zone de culture A',
            technicalSpecs: {
              voltage: '3.3V - 5V',
              output: 'Signal analogique',
              material: 'Électrodes en nickel',
              dimensions: '60mm x 20mm x 5mm'
            }
          },
          {
            id: 2,
            name: 'Capteur DHT11',
            type: 'Température & Humidité Air',
            icon: '🌡️',
            currentValue: data.t && data.h_air ? `${data.t}°C / ${data.h_air}%` : '--',
            status: tempStatus === 'error' || humidityStatus === 'error' ? 'error' :
                    tempStatus === 'warning' || humidityStatus === 'warning' ? 'warning' : 'active',
            range: '0-50°C / 20-90%',
            accuracy: '±2°C / ±5%',
            lastCalibration: timestamp,
            location: 'Serre principale',
            technicalSpecs: {
              voltage: '3V - 5.5V',
              output: 'Signal numérique',
              interface: 'Single-wire',
              dimensions: '15.5mm x 12mm x 5.5mm'
            }
          },
        ];

        setSensors(updatedSensors);
        setError(null);
      } catch (err) {
        console.error('Data parsing error:', err);
        setError('Échec de l\'analyse des données des capteurs');
      }
    });

    socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err);
      setError('Échec de la connexion au serveur');
    });

    const timeout = setTimeout(() => {
      if (!sensors.some(sensor => sensor.currentValue !== '--')) {
        setError('Aucune réponse du serveur');
      }
    }, 10000); // 10 seconds timeout

    return () => {
      socket.disconnect();
      clearTimeout(timeout);
      console.log('Disconnected from Socket.IO server');
    };
  }, []);

  const handleCalibrate = (sensorId) => {
    const sensor = sensors.find(s => s.id === sensorId);
    setSelectedSensor(sensor);
    setShowCalibrationModal(true);
  };

  const handleReset = (sensorId) => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser ce capteur ?')) {
      console.log("Resetting sensor ${sensor FHAId}");
      alert('Capteur réinitialisé avec succès!');
    }
  };

  const handleCalibrationSubmit = (e) => {
    e.preventDefault();
    console.log('Calibrating sensor:', selectedSensor.id);
    alert('Calibration effectuée avec succès!');
    setShowCalibrationModal(false);
  };

  return (
    <main className="capteurs-page">
      {error && (
        <div className="error-container">
          <p>{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Réessayer
          </button>
        </div>
      )}
      <header className="page-header">
        <h1>Gestion des Capteurs</h1>
        <p className="page-subtitle">Surveillance et configuration des capteurs du système</p>
        <div className="sensors-summary">
          <div className="summary-item">
            <span className="summary-number">{sensors.length}</span>
            <span className="summary-label">Capteurs</span>
          </div>
          <div className="summary-item">
            <span className="summary-number">{sensors.filter(s => s.status === 'active').length}</span>
            <span className="summary-label">Actifs</span>
          </div>
          <div className="summary-item">
            <span className="summary-number">{sensors.filter(s => s.status === 'warning').length}</span>
            <span className="summary-label">Alertes</span>
          </div>
        </div>
      </header>

      <section className="sensors-grid">
        {sensors.map(sensor => (
          <SensorCard
            key={sensor.id}
            sensor={sensor}
            onCalibrate={handleCalibrate}
            onReset={handleReset}
          />
        ))}
      </section>

      <section className="system-status">
        <h2>État du Système</h2>
        <div className="status-grid">
          <div className="status-card">
            <div className="status-icon">🔌</div>
            <div className="status-info">
              <h3>Connexion ESP32</h3>
              <p className="status-value active">{error ? 'Déconnecté' : 'Connecté'}</p>
              <span className="status-time">Dernière comm.: il y a 2 min</span>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">📡</div>
            <div className="status-info">
              <h3>Signal WiFi</h3>
              <p className="status-value active">{error ? '--' : 'Excellent (-45 dBm)'}</p>
              <span className="status-time">SSID: SmartGrow_Network</span>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">🔋</div>
            <div className="status-info">
              <h3>Alimentation</h3>
              <p className="status-value active">{error ? '--' : '5.0V (Normale)'}</p>
              <span className="status-time">Consommation: 850mA</span>
            </div>
          </div>
        </div>
      </section>

      {showCalibrationModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Calibration - {selectedSensor?.name}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCalibrationModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCalibrationSubmit}>
              <div className="modal-body">
                <div className="calibration-info">
                  <p>🔧 Calibration automatique du capteur</p>
                  <p>Assurez-vous que le capteur est dans des conditions normales avant de continuer.</p>
                </div>
                
                <div className="calibration-steps">
                  <div className="step">
                    <span className="step-number">1</span>
                    <span>Vérifier les connexions physiques</span>
                  </div>
                  <div className="step">
                    <span className="step-number">2</span>
                    <span>Placer le capteur dans un environnement de référence</span>
                  </div>
                  <div className="step">
                    <span className="step-number">3</span>
                    <span>Lancer la calibration</span>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCalibrationModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Démarrer la Calibration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Capteurs;