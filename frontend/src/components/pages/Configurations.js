// src/components/pages/Configurations.js
import React, { useState, useEffect } from 'react';
import './Configurations.css';

const ConfigSection = ({ title, children, icon }) => (
  <div className="config-section">
    <div className="section-header">
      <div className="section-icon">{icon}</div>
      <h3>{title}</h3>
    </div>
    <div className="section-content">
      {children}
    </div>
  </div>
);

const SettingItem = ({ label, children, description, error }) => (
  <div className="setting-item">
    <div className="setting-info">
      <label className="setting-label">{label}</label>
      {description && <p className="setting-description">{description}</p>}
      {error && <p className="setting-error">{error}</p>}
    </div>
    <div className="setting-control">
      {children}
    </div>
  </div>
);

const Configurations = () => {
  const [profile, setProfile] = useState({
    name: '',
    prenom: '',
    username: '',
    email: '',
    city: '',
    surface_area: 0,
    devices: [], // Single-item array: [deviceId] or []
  });
  const [errors, setErrors] = useState({});
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:3000/api/user/profile', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch profile');
        const userData = await response.json();
        setProfile({
          name: userData.name || '',
          prenom: userData.prenom || '',
          username: userData.username || '',
          email: userData.email || '',
          city: userData.city || '',
          surface_area: userData.surface_area || 0,
          devices: userData.devices || [], // Expecting [deviceId] or []
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(''), 3000);
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Validate form fields
  const validateField = (key, value) => {
    let error = '';
    if (key === 'name' && !value.trim()) {
      error = 'Le nom est requis';
    } else if (key === 'prenom' && !value.trim()) {
      error = 'Le prénom est requis';
    } else if (key === 'username' && value.length < 3) {
      error = 'Le nom d’utilisateur doit contenir au moins 3 caractères';
    } else if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      error = 'L’email n’est pas valide';
    } else if (key === 'city' && !value.trim()) {
      error = 'La ville est requise';
    } else if (key === 'surface_area' && (isNaN(value) || value < 0)) {
      error = 'La surface doit être un nombre positif';
    } else if (key === 'device' && value.length > 0 && !value.trim()) {
      error = 'L’identifiant du dispositif ne peut pas être vide';
    }
    return error;
  };

  const handleProfileChange = (key, value) => {
    if (key === 'device') {
      setProfile(prev => ({
        ...prev,
        devices: value ? [value] : [], // Store as single-item array or empty
      }));
      setErrors(prev => ({
        ...prev,
        device: validateField('device', value),
      }));
    } else {
      setProfile(prev => ({
        ...prev,
        [key]: value,
      }));
      setErrors(prev => ({
        ...prev,
        [key]: validateField(key, value),
      }));
    }
    setUnsavedChanges(true);
    setSaveStatus('');
  };

  const handleSave = async () => {
    // Validate all fields before saving
    const newErrors = {};
    Object.keys(profile).forEach(key => {
      if (key === 'devices') {
        newErrors.device = validateField('device', profile.devices[0] || '');
      } else {
        newErrors[key] = validateField(key, profile[key]);
      }
    });
    setErrors(newErrors);

    if (Object.values(newErrors).some(error => error)) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    setSaveStatus('saving');
    try {
      const response = await fetch('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: "Bearer ${localStorage.getItem('token')}",
        },
        body: JSON.stringify(profile),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
      setSaveStatus('success');
      setUnsavedChanges(false);
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleReset = () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser le formulaire ?')) {
      setIsLoading(true);
      fetch('http://localhost:3000/api/user/profile', {
        headers: {
          Authorization: "Bearer ${localStorage.getItem('token')}",
        },
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch profile');
          return response.json();
        })
        .then(userData => {
          setProfile({
            name: userData.name || '',
            prenom: userData.prenom || '',
            username: userData.username || '',
            email: userData.email || '',
            city: userData.city || '',
            surface_area: userData.surface_area || 0,
            devices: userData.devices || [],
          });
          setErrors({});
          setUnsavedChanges(false);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error resetting profile:', error);
          setSaveStatus('error');
          setTimeout(() => setSaveStatus(''), 3000);
          setIsLoading(false);
        });
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">📊</div>
        <p>Chargement du profil...</p>
      </div>
    );
  }

  return (
    <main className="configurations-page">
      <header className="page-header">
        <h1>Profil Utilisateur</h1>
        <p className="page-subtitle">Modifiez les informations de votre profil</p>
        
        {unsavedChanges && (
          <div className="unsaved-changes-banner">
            ⚠️ Vous avez des modifications non sauvegardées
          </div>
        )}
      </header>

      <div className="config-container">
        <div className="config-content">
          {/* Personal Information */}
          <ConfigSection title="Informations Personnelles" icon="👤">
            <SettingItem 
              label="Nom"
              description="Votre nom de famille"
              error={errors.name}
            >
              <input
                type="text"
                value={profile.name}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                className="text-input"
                placeholder="Entrez votre nom"
              />
            </SettingItem>

            <SettingItem 
              label="Prénom"
              description="Votre prénom"
              error={errors.prenom}
            >
              <input
                type="text"
                value={profile.prenom}
                onChange={(e) => handleProfileChange('prenom', e.target.value)}
                className="text-input"
                placeholder="Entrez votre prénom"
              />
            </SettingItem>

            <SettingItem 
              label="Nom d'utilisateur"
              description="Votre identifiant unique (minimum 3 caractères)"
              error={errors.username}
            >
              <input
                type="text"
                value={profile.username}
                onChange={(e) => handleProfileChange('username', e.target.value)}
                className="text-input"
                placeholder="Entrez votre nom d'utilisateur"
              />
            </SettingItem>

            <SettingItem 
              label="Email"
              description="Votre adresse email"
              error={errors.email}
            >
              <input
                type="email"
                value={profile.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                className="text-input"
                placeholder="Entrez votre email"
              />
            </SettingItem>
          </ConfigSection>

          {/* Location and Area */}
          <ConfigSection title="Localisation et Surface" icon="🌍">
            <SettingItem 
              label="Ville"
              description="Votre ville de résidence"
              error={errors.city}
            >
              <input
                type="text"
                value={profile.city}
                onChange={(e) => handleProfileChange('city', e.target.value)}
                className="text-input"
                placeholder="Entrez votre ville"
              />
            </SettingItem>

            <SettingItem 
              label="Surface Cultivée (m²)"
              description="Surface totale de votre espace cultivé"
              error={errors.surface_area}
            >
              <input
                type="number"
                value={profile.surface_area}
                onChange={(e) => handleProfileChange('surface_area', parseFloat(e.target.value))}
                className="number-input"
                min="0"
                placeholder="Entrez la surface en m²"
              />
            </SettingItem>
          </ConfigSection>

          {/* Devices */}
          <ConfigSection title="Dispositif" icon="📡">
            <SettingItem 
              label="Identifiant du Dispositif"
              description="Identifiant unique du dispositif (ex: SmartGrow-001)"
              error={errors.device}
            >
              <input
                type="text"
                value={profile.devices[0] || ''}
                onChange={(e) => handleProfileChange('device', e.target.value)}
                className="text-input"
                placeholder="Entrez l’identifiant du dispositif"
              />
            </SettingItem>
          </ConfigSection>
        </div>

        {/* Side Panel */}
        <div className="config-sidebar">
          <div className="save-panel">
            <button 
              className={`save-btn ${saveStatus}`}
              onClick={handleSave}
              disabled={!unsavedChanges || saveStatus === 'saving' || Object.values(errors).some(error => error)}
            >
              {saveStatus === 'saving' && '⏳ Sauvegarde...'}
              {saveStatus === 'success' && '✅ Sauvegardé'}
              {saveStatus === 'error' && '❌ Erreur'}
              {saveStatus === '' && '💾 Sauvegarder'}
            </button>

            {saveStatus === 'success' && (
              <div className="save-message success">
                Profil sauvegardé avec succès !
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="save-message error">
                Erreur lors de la sauvegarde. Veuillez réessayer.
              </div>
            )}
          </div>

          <div className="actions-panel">
            <h4>Actions</h4>
            <button className="action-btn secondary" onClick={handleReset}>
              🔄 Réinitialiser
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Configurations;