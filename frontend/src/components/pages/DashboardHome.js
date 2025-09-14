import React, { useState, useEffect } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, ResponsiveContainer } from 'recharts';
import io from 'socket.io-client';
import './DashboardHome.css';

const StatCard = ({ title, value, icon, status = 'normal' }) => (
  <div className={`stat-card ${status}`}>
    <div className="stat-icon">{icon}</div>
    <h4>{title}</h4>
    <p><strong>{value}</strong></p>
  </div>
);

const DashboardHome = () => {
  const [chartData, setChartData] = useState([]);
  const [currentStats, setCurrentStats] = useState({
    moisture: 0,
    humidity: 0,
    temperature: 0,
  });

   // Nouveaux états pour l'irrigation
  const [irrigationState, setIrrigationState] = useState('Arrêté');
  const [irrigationDuration, setIrrigationDuration] = useState(0);
  const [irrigationQueue, setIrrigationQueue] = useState([]);
  const [currentIrrigationTimer, setCurrentIrrigationTimer] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Fonction pour démarrer une irrigation
  const startIrrigation = (duration) => {
    console.log("🚿 Démarrage irrigation pour ${duration} secondes");
    setIrrigationState('En cours');
    setIrrigationDuration(duration);
    
    // Timer pour compter la durée restante
    const timer = setInterval(() => {
      setIrrigationDuration(prev => {
        if (prev <= 1) {
          // Irrigation terminée
          finishIrrigation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setCurrentIrrigationTimer(timer);
  };

  // Fonction pour terminer une irrigation
  const finishIrrigation = () => {
    console.log('✅ Irrigation terminée');
    setIrrigationState('Arrêté');
    setIrrigationDuration(0);
    
    if (currentIrrigationTimer) {
      clearInterval(currentIrrigationTimer);
      setCurrentIrrigationTimer(null);
    }
    
    // Traiter le prochain ordre dans la file d'attente (kas thahed wa9ila)
    setIrrigationQueue(prev => {
      const newQueue = [...prev];
      const nextOrder = newQueue.shift();
      
      if (nextOrder) {
        console.log("📋 Traitement de l'ordre suivant: ${nextOrder} secondes");
        setTimeout(() => startIrrigation(nextOrder), 500); // Petit délai avant le prochain
      }
      
      return newQueue;
    });
  };

  // Fonction pour ajouter un ordre d'irrigation (durée en heures)
  const addIrrigationOrder = (durationInHours) => {
    // Convertir les heures en secondes
    const durationInSeconds = Math.floor(durationInHours * 3600);
    
    if (irrigationState === 'Arrêté') {
      // Aucune irrigation en cours, démarrer immédiatement
      startIrrigation(durationInSeconds);
    } else {
      // Irrigation en cours, ajouter à la file d'attente (kas thahed wa9ila)
      console.log("📝 Ordre d'irrigation ajouté à la file d'attente: ${durationInHours}h (${durationInSeconds}s)");
      setIrrigationQueue(prev => [...prev, durationInSeconds]);
    }
  };

  // Initialize Socket.IO connection
  useEffect(() => {
    const socket = io('http://localhost:3000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Handle Socket.IO connection
    socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      setConnectionStatus('connected');
      setError(null);
      setIsLoading(false);
    });

    // Handle sensor data from server
    socket.on('sensorData', (sensorData) => {
      console.log('Data received from server:', sensorData);
      
      if (sensorData && typeof sensorData === 'object') {
        // Update current stats
        setCurrentStats({
          moisture: sensorData.h_soil_pourcentage, // Match MQTT data field 'h' for humidity
          humidity: sensorData.h_air != null ? sensorData.h_air : "--",
          temperature: sensorData.t != null ? sensorData.t : "--",
        });

         // Vérifier s'il y a un ordre d'irrigation dans les données (????XXX)
        if (sensorData.prediction && sensorData.time) {
          console.log("🚿 Ordre d'irrigation reçu: ${sensorData.irrigation_duration}h");
          addIrrigationOrder(sensorData.irrigation_duration); // Durée en heures
        }

        // Create chart data point
        const now = new Date();
        const timeString = now.toLocaleTimeString().slice(0, 5);

        const newDataPoint = {
          time: timeString,
          humidity: sensorData.h_air != null ? sensorData.h_air : 0, // Use h_air for chart
          temperature: sensorData.t != null ? sensorData.t : 0,
          timestamp: sensorData.ts ? new Date(sensorData.ts * 1000).toISOString() : now.toISOString()
        };

        // Add to chart data (keep last 10 points)
        setChartData(prevData => {
          const updatedData = [...prevData, newDataPoint];
          return updatedData.slice(-100); 
        });

        console.log('✅ Data updated successfully');
      } else {
        console.log('⚠️ Invalid data received from server');
        setError('Invalid data received from server');
      }
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      setConnectionStatus('disconnected');
      setError('Failed to connect to server');
      setIsLoading(false);

      // Use fallback data if no real data available
      if (chartData.length === 0) {
        const fallbackData = createFallbackData();
        setChartData(fallbackData);
        setCurrentStats({
          moisture: "--",
          humidity: "--",
          temperature: "--",
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from Socket.IO server');
      setConnectionStatus('disconnected');
      setError('Server disconnected');
    });

    // Fetch historical data
    const fetchHistoricalData = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/sensor-data/history', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch historical data');
        const data = await response.json();

        const mappedData = data.map(item => ({
          time: new Date(item.timestamp).toLocaleTimeString().slice(0, 5),
          humidity: item.h_air != null ? item.h_air : 0,
          temperature: item.t != null ? item.t : 0,
          timestamp: item.timestamp,
        }));

        setChartData(mappedData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching historical data:', error);
        setError('Failed to load historical data');
        setIsLoading(false);
        setChartData(createFallbackData());
      }
    };

    fetchHistoricalData();

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      console.log('🧹 Socket.IO connection closed');
    };
  }, []);

  // Nettoyage du timer lors du démontage du composant
  useEffect(() => {
    return () => {
      if (currentIrrigationTimer) {
        clearInterval(currentIrrigationTimer);
      }
    };
  }, [currentIrrigationTimer]);

  // Fallback data when server is not available
  const createFallbackData = () => {
    const data = [];
    const now = new Date();
    
    for (let i = 99; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 300000);
      data.push({
        time: time.toLocaleTimeString().slice(0, 5),
        humidity: Math.floor(30 + Math.random() * 50),
        temperature: Math.floor(15 + Math.random() * 15),
        timestamp: time.toISOString()
      });
    }
    return data;
  };

  // Get status colors for stat cards
  const getmoisureStatus = () => {
    if (typeof currentStats.moisture === 'number') {
        if (currentStats.moisture < 20) return 'danger';
        if (currentStats.moisture < 30) return 'warning';
        return 'normal';
      }
      return 'normal';
  };

  // Get status colors for stat cards
  const getHumidityStatus = () => {
    if (typeof currentStats.humidity === 'number') {
      if (currentStats.humidity < 20) return 'danger';
      if (currentStats.humidity < 30) return 'warning';
      return 'normal';
    }
    return 'normal';
  };

  const getTemperatureStatus = () => {
    if (typeof currentStats.temperature === 'number') {
      if (currentStats.temperature > 35) return 'warning';
      if (currentStats.temperature > 40) return 'danger';
      return 'normal';
    }
    return 'normal';
  };

  const getIrrigationStatus = () => {
    return irrigationState === 'En cours' ? 'warning' : 'normal';
  };

  const getDurationStatus = () => {
    return irrigationDuration > 0 ? 'warning' : 'normal';
  };

  // Formatage de la durée (secondes vers heures:minutes:secondes)
  const formatDuration = (seconds) => {
    if (seconds === 0) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    let result = [];
    
    if (hours > 0) {
      result.push({hours});
    }
    if (minutes > 0) {
      result.push({minutes});
    }
    if (remainingSeconds > 0 || result.length === 0) {
      result.push({remainingSeconds});
    }
    
    return result.join(' ');
  };

  // Show loading 
  if (isLoading) {
    return (
      <div className="loading-container" style={{ padding: '50px', textAlign: 'center' }}>
        <div className="loading-spinner">⏳</div>
        <p>Chargement des données du serveur...</p>
      </div>
    );
  }

  return (
    <main className="dashboard-home">
      {/* Header with connection status */}
      <header className="dashboard-header">
        <h1>Système d'Irrigation Intelligent</h1>
        <div className={`connection-status ${connectionStatus}`}>
          <span className="status-dot">
            {connectionStatus === 'connected' ? '🟢' : '🔴'}
          </span>
          <span className="status-text">
            {connectionStatus === 'connected' ? 'Serveur connecté' : 'Serveur déconnecté'}
          </span>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="error-banner" style={{ 
          background: '#ffebee', 
          color: '#c62828', 
          padding: '10px', 
          borderRadius: '5px', 
          margin: '10px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {error}</span>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
            style={{
              background: '#c62828',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <section className="stats-section" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        margin: '20px 0' 
      }}>
        <StatCard 
          title="Humidité du sol" 
          value={`${currentStats.moisture}%`} 
          icon="💧"
          status={getmoisureStatus()}
        />
        <StatCard 
          title="Température" 
          value={`${currentStats.temperature}°C`} 
          icon="🌡️"
          status={getTemperatureStatus()}
        />
        <StatCard 
          title="Humidité de l'air" 
          value={`${currentStats.humidity}%`} 
          icon="💧"
          status={getHumidityStatus()}
        />
        <StatCard 
          title="État d'irrigation" 
          value={irrigationState} 
          icon="🚿"
          status={getIrrigationStatus()}
        />
        <StatCard 
          title="Durée d'irrigation" 
          value={formatDuration(irrigationDuration)} 
          icon="⏱"
          status={getDurationStatus()}
        />
      </section>

      {/* Affichage de la file d'attente si elle n'est pas vide */}
      {irrigationQueue.length > 0 && (
        <div className="irrigation-queue" style={{
          background: '#fff3cd',
          color: '#856404',
          padding: '10px',
          borderRadius: '5px',
          margin: '10px 0',
          border: '1px solid #ffeaa7'
        }}>
          <strong>📋 File d'attente d'irrigation:</strong> {irrigationQueue.length} ordre(s) en attente
          <div style={{ fontSize: '0.9em', marginTop: '5px' }}>
            Prochains: {irrigationQueue.slice(0, 3).map(durationInSeconds => formatDuration(durationInSeconds)).join(', ')}
            {irrigationQueue.length > 3 && '...'}
          </div>
        </div>
      )}

      {/* Charts */}
      {chartData.length > 0 && (
        <>
          <section className="chart-section" style={{ margin: '30px 0' }}>
            <h2>Évolution de l'humidité de l'air et température</h2>
            <div className="chart-container" style={{ height: '300px', margin: '20px 0' }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" orientation="left" stroke="#1a562f" />
                  <YAxis yAxisId="right" orientation="right" stroke="#8884d8" />
                  <Tooltip />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="humidity" 
                    stroke="#1a562f" 
                    strokeWidth={2}
                    name="Humidité (%)"
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Température (°C)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </main>
  );
};

export default DashboardHome;