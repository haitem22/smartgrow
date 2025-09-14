import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: "Humidité faible détectée", type: "warning", time: "Il y a 5 min" },
    { id: 2, message: "Irrigation terminée avec succès", type: "success", time: "Il y a 15 min" }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStatus, setSystemStatus] = useState({
    esp32: 'connected',
    sensors: 3,
    lastUpdate: 'Il y a 2 min'
  });
  const [deviceId, setDeviceId] = useState(null);
  const [irrigationDuration, setIrrigationDuration] = useState('');
  const [irrigationStatus, setIrrigationStatus] = useState('');
  const [irrigationError, setIrrigationError] = useState('');

  const location = useLocation();

  // Fetch device ID on mount
  useEffect(() => {
    const fetchDeviceId = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/user/profile', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch profile');
        const userData = await response.json();
        setDeviceId(userData.devices && userData.devices.length > 0 ? userData.devices[0] : null);
      } catch (error) {
        console.error('Error fetching device ID:', error);
        setDeviceId(null);
      }
    };
    fetchDeviceId();
  }, []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Navigation items with icons and descriptions
  const navItems = [
    {
      path: '/dashboard',
      name: 'Accueil',
      icon: '🏠',
      description: 'Vue d\'ensemble',
      badge: null
    },
    {
      path: '/capteurs',
      name: 'Capteurs',
      icon: '📊',
      description: 'Monitoring temps réel',
    },
    {
      path: '/historique',
      name: 'Historique',
      icon: '📈',
      description: 'Analyses et tendances',
      badge: null
    },
    {
      path: '/configurations',
      name: 'Profil Config',
      icon: '⚙️',
      description: 'Paramètres système',
    }
  ];

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'light' : 'dark');
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getCurrentPageName = () => {
    const currentItem = navItems.find(item => item.path === location.pathname);
    return currentItem ? currentItem.name : 'SmartGrow';
  };

  const getBreadcrumb = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    return pathSegments.map(segment => 
      segment.charAt(0).toUpperCase() + segment.slice(1)
    ).join(' > ');
  };

  const handleIrrigation = async () => {
    const duration = parseFloat(irrigationDuration);
    if (!deviceId) {
      setIrrigationError('Aucun dispositif configuré');
      setIrrigationStatus('error');
      setTimeout(() => {
        setIrrigationStatus('');
        setIrrigationError('');
      }, 3000);
      return;
    }
    if (isNaN(duration) || duration <= 0) {
      setIrrigationError('La durée doit être un nombre positif');
      setIrrigationStatus('error');
      setTimeout(() => {
        setIrrigationStatus('');
        setIrrigationError('');
      }, 3000);
      return;
    }

    setIrrigationStatus('sending');
    try {
      const response = await fetch('http://localhost:3000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ deviceId, duration }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send irrigation command');
      }
      setIrrigationStatus('success');
      setIrrigationDuration('');
      setTimeout(() => setIrrigationStatus(''), 3000);
    } catch (error) {
      console.error('Error sending irrigation command:', error);
      setIrrigationError(error.message);
      setIrrigationStatus('error');
      setTimeout(() => {
        setIrrigationStatus('');
        setIrrigationError('');
      }, 3000);
    }
  };

  return (
    <div className={`dashboard-layout ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Sidebar */}
      <nav className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🌱</span>
            {!isSidebarCollapsed && <span className="logo-text">SmartGrow</span>}
          </div>
          <button className="collapse-btn" onClick={toggleSidebar}>
            {isSidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <div className="sidebar-content">
          {/* System Status */}
          <div className="system-status">
            <div className={`status-indicator ${systemStatus.esp32}`}>
              <span className="status-dot"></span>
              {!isSidebarCollapsed && (
                <div className="status-info">
                  <span className="status-text">ESP32</span>
                  <span className="status-value">
                    {systemStatus.esp32 === 'connected' ? 'Connecté' : 'Déconnecté'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <ul className="nav-menu">
            {navItems.map((item) => (
              <li key={item.path} className="nav-item">
                <Link 
                  to={item.path} 
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                  title={isSidebarCollapsed ? item.name : ''}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!isSidebarCollapsed && (
                    <>
                      <div className="nav-content">
                        <span className="nav-name">{item.name}</span>
                        <span className="nav-description">{item.description}</span>
                      </div>
                      {item.badge && (
                        <span className="nav-badge">{item.badge}</span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Quick Actions */}
          {!isSidebarCollapsed && (
            <div className="quick-actions">
              <h4>Actions Rapides</h4>
              <div className="quick-action-grid">
                <div className="irrigation-control">
                  <input
                    type="number"
                    value={irrigationDuration}
                    onChange={(e) => {
                      setIrrigationDuration(e.target.value);
                      setIrrigationError('');
                      setIrrigationStatus('');
                    }}
                    className="number-input"
                    placeholder="Durée (min)"
                    min="1"
                    step="1"
                  />
                  <button 
                    className={`quick-action-btn ${irrigationStatus}`}
                    onClick={handleIrrigation}
                    disabled={irrigationStatus === 'sending'}
                  >
                    <span>💧</span>
                    <span>
                      {irrigationStatus === 'sending' ? 'Envoi...' : 
                       irrigationStatus === 'success' ? 'Envoyé' : 
                       irrigationStatus === 'error' ? 'Erreur' : 'Irriguer'}
                    </span>
                  </button>
                  {irrigationError && (
                    <div className="irrigation-error">{irrigationError}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {!isSidebarCollapsed && (
            <div className="user-info">
              <div className="user-avatar">👤</div>
              <div className="user-details">
                <span className="user-name">Utilisateur</span>
                <span className="user-role">Agriculteur</span>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="main-header">
          <div className="breadcrumb-section">
            <h1 className="page-title">{getCurrentPageName()}</h1>
            <nav className="breadcrumb">
              <span>SmartGrow</span>
              {getBreadcrumb() && (
                <>
                  <span className="breadcrumb-separator">›</span>
                  <span>{getBreadcrumb()}</span>
                </>
              )}
            </nav>
          </div>

          <div className="header-actions">
            {/* Theme Toggle */}
            <button className="theme-toggle" onClick={toggleDarkMode}>
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            {/* Time */}
            <div className="current-time">
              {currentTime.toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          <div className="content-wrapper">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="main-footer">
          <div className="footer-content">
            <span>© 2025 SmartGrow - Système d'Irrigation Intelligent</span>
            <div className="footer-links">
              <span>Dernière mise à jour: {systemStatus.lastUpdate}</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Menu Overlay */}
      {!isSidebarCollapsed && (
        <div 
          className="sidebar-overlay"
          onClick={toggleSidebar}
        ></div>
      )}
    </div>
  );
};

export default DashboardLayout;