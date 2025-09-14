// src/components/pages/Historique.js
import React, { useState, useEffect } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './Historique.css';

const StatisticsCard = ({ title, value, icon, color }) => (
  <div className="statistics-card">
    <div className="stat-header">
      <div className="stat-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="stat-info">
        <h3>{title}</h3>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  </div>
);

const Historique = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('humidity');
  const [data, setData] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Générer des données d'exemple
  const generateSampleData = (period) => {
    const days = period === '24h' ? 1 : period === '7d' ? 7 : 30;
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      data.push({
        date: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
        fullDate: date.toISOString().split('T')[0],
        humidity: Math.floor(30 + Math.random() * 40),
        moisture: Math.floor(20 + Math.random() * 60),
        temperature: Math.floor(18 + Math.random() * 15)
      });
    }
    return data;
  };

  // Calculer les moyennes des capteurs
  const calculateStatistics = (data) => {
    if (!data || data.length === 0) {
      return {
        averageHumidity: { value: '--' },
        averageMoisture: { value: '--' },
        averageTemperature: { value: '--' }
      };
    }
    const totalHumidity = data.reduce((sum, item) => sum + (item.humidity || 0), 0);
    const totalMoisture = data.reduce((sum, item) => sum + (item.moisture || 0), 0);
    const totalTemperature = data.reduce((sum, item) => sum + (item.temperature || 0), 0);
    const countHumidity = data.filter(item => item.humidity != null).length;
    const countMoisture = data.filter(item => item.moisture != null).length;
    const countTemperature = data.filter(item => item.temperature != null).length;
    const avgHumidity = countHumidity > 0 ? Math.round(totalHumidity / countHumidity) : '--';
    const avgMoisture = countMoisture > 0 ? Math.round(totalMoisture / countMoisture) : '--';
    const avgTemperature = countTemperature > 0 ? Math.round(totalTemperature / countTemperature) : '--';
    return {
      averageHumidity: { value: avgHumidity },
      averageMoisture: { value: avgMoisture },
      averageTemperature: { value: avgTemperature }
    };
  };

  useEffect(() => {
    const fetchHistoricalData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:3000/api/sensor-data/history/period?period=${selectedPeriod}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch historical data');
        const serverData = await response.json();
        const mappedData = serverData.map(item => ({
          date: new Date(item.timestamp).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
          fullDate: new Date(item.timestamp).toISOString().split('T')[0],
          humidity: item.h_air != null ? item.h_air : 0,
          moisture: item.h_soil_pourcentage != null ? item.h_soil_pourcentage : 0,
          temperature: item.t != null ? item.t : 0,
        }));
        setData(mappedData);
        setStatistics(calculateStatistics(mappedData));
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching historical data:', error);
        setData([]);
        setStatistics({
          averageHumidity: { value: '--' },
          averageMoisture: { value: '--' },
          averageTemperature: { value: '--' }
        });
        setIsLoading(false);
      }
    };
    fetchHistoricalData();
  }, [selectedPeriod]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">📊</div>
        <p>Chargement de l'historique...</p>
      </div>
    );
  }

  return (
    <main className="historique-page">
      <header className="page-header">
        <h1>Historique des Capteurs</h1>
        <p className="page-subtitle">Analyse des données des capteurs sur la période sélectionnée</p>
        
        <div className="controls">
          <div className="period-selector">
            <button 
              className={selectedPeriod === '24h' ? 'active' : ''}
              onClick={() => setSelectedPeriod('24h')}
            >
              24 Heures
            </button>
            <button 
              className={selectedPeriod === '7d' ? 'active' : ''}
              onClick={() => setSelectedPeriod('7d')}
            >
              7 Jours
            </button>
            <button 
              className={selectedPeriod === '30d' ? 'active' : ''}
              onClick={() => setSelectedPeriod('30d')}
            >
              30 Jours
            </button>
          </div>
        </div>
      </header>

      {/* Statistics Overview - Moyennes des capteurs */}
      <section className="statistics-overview">
        <h2>Moyennes de la Période</h2>
        <div className="statistics-grid">
          <StatisticsCard
            title="Humidité de l'Air Moyenne"
            value={statistics.averageHumidity?.value}
            icon="💨"
            color="#2196f3"
          />
          <StatisticsCard
            title="Humidité du Sol Moyenne"
            value={statistics.averageMoisture?.value}
            icon="💧"
            color="#4caf50"
          />
          <StatisticsCard
            title="Température Moyenne"
            value={statistics.averageTemperature?.value}
            icon="🌡"
            color="#ff9800"
          />
        </div>
      </section>

      {/* Charts Section */}
      <section className="charts-section">
        <div className="chart-container">
          <div className="chart-header">
            <h2>Évolution des Capteurs</h2>
            <div className="metric-selector">
              <button 
                className={selectedMetric === 'humidity' ? 'active' : ''}
                onClick={() => setSelectedMetric('humidity')}
              >
                Humidité Air
              </button>
              <button 
                className={selectedMetric === 'moisture' ? 'active' : ''}
                onClick={() => setSelectedMetric('moisture')}
              >
                Humidité Sol
              </button>
              <button 
                className={selectedMetric === 'temperature' ? 'active' : ''}
                onClick={() => setSelectedMetric('temperature')}
              >
                Température
              </button>
            </div>
          </div>
          
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <CartesianGrid stroke="#f0f0f0" strokeDasharray="2 2" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #ccc',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey={selectedMetric} 
                  stroke={selectedMetric === 'humidity' ? '#2196f3' : 
                          selectedMetric === 'moisture' ? '#4caf50' : '#ff9800'} 
                  strokeWidth={3}
                  dot={{ 
                    fill: selectedMetric === 'humidity' ? '#2196f3' : 
                          selectedMetric === 'moisture' ? '#4caf50' : '#ff9800', 
                    strokeWidth: 2, 
                    r: 4 
                  }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  name={selectedMetric === 'humidity' ? "Humidité de l'Air (%)" : 
                        selectedMetric === 'moisture' ? 'Humidité du Sol (%)' : 'Température (°C)'}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Historique;