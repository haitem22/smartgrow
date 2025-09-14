import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    prenom: '',
    username: '',
    password: '',
    email: '',
    city: '',
    surface_area: '',
    deviceId: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  const config = {
    minUsernameLength: 3,
    minPasswordLength: 6,
    enableDarkMode: true,
  };

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    document.documentElement.setAttribute('data-theme', savedDarkMode ? 'dark' : 'light');
  }, []);

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    switch (name) {
      case 'name':
        if (!value.trim()) newErrors.name = 'Nom requis';
        else delete newErrors.name;
        break;
      // Add other cases similarly
      case 'username':
        if (!value.trim()) newErrors.username = 'Nom d\'utilisateur requis';
        else if (value.length < config.minUsernameLength) newErrors.username = `Minimum ${config.minUsernameLength} caractères`;
        else delete newErrors.username;
        break;
      case 'password':
        if (!value) newErrors.password = 'Mot de passe requis';
        else if (value.length < config.minPasswordLength) newErrors.password = `Minimum ${config.minPasswordLength} caractères`;
        else delete newErrors.password;
        break;
      case 'city':
        if (!value.trim()) newErrors.city = 'Ville requise';
        else delete newErrors.city;
        break;
      case 'surface_area':
        if (!value) newErrors.surface_area = 'Superficie requise';
        else if (isNaN(value) || Number(value) < 0) newErrors.surface_area = 'Superficie invalide';
        else delete newErrors.surface_area;
        break;
      case 'email':
        if (!value.trim()) newErrors.email = 'Email requis';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) newErrors.email = 'Email invalide';
        else delete newErrors.email;
        break;
      case 'deviceId':
        if (!value.trim()) newErrors.deviceId = 'Device ID is required';
        else delete newErrors.deviceId;
        break;
      default:
        break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    validateField(name, value);
  };
  const handleSignup = async (e) => {
    e.preventDefault();

    // Validate all fields
    const isValid = Object.keys(formData).every(key => validateField(key, formData[key]));
    if (!isValid) return;

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          surface_area: Number(formData.surface_area),
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Signup failed');

      setShowSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setErrors({ general: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
 
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    document.documentElement.setAttribute('data-theme', newDarkMode ? 'dark' : 'light');
  };

  return (
    <div className={`login-page ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Background Animation */}
      <div className="background-animation">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
        <div className="floating-shape shape-4"></div>
      </div>

      {/* Theme Toggle */}
      {config.enableDarkMode && (
        <button className="theme-toggle" onClick={toggleDarkMode}>
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      )}

      <div className="login-container">
        {/* Header */}
        <div className="login-header">
          <div className="logo">
            <span className="logo-icon">🌱</span>
            <div className="logo-text">
              <h1>SmartGrow</h1>
              <p>Système d'Irrigation Intelligent</p>
            </div>
          </div>
        </div>

        {/* Success Animation */}
        {showSuccess && (
          <div className="success-overlay">
            <div className="success-animation">
              <div className="checkmark">✓</div>
              <p>Inscription réussie !</p>
            </div>
          </div>
        )}

        {/* Signup Form */}
        <div className="login-form-container">
          <form className="login-form" onSubmit={handleSignup}>
            <div className="form-header">
              <h2>Inscription</h2>
              <p>Créez votre compte</p>
            </div>

            {/* Error Message */}
            {errors.general && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {errors.general}
              </div>
            )}

            {/* Name Field */}
            <div className="input-group">
              <div className="input-container">
                <input
                  type="text"
                  name="name"
                  placeholder=" "
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={errors.name ? 'error' : ''}
                />
                <label>Nom</label>
                <span className="input-icon">👤</span>
              </div>
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            {/* Prenom Field */}
            <div className="input-group">
              <div className="input-container">
                <input
                  type="text"
                  name="prenom"
                  placeholder=" "
                  value={formData.prenom}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={errors.prenom ? 'error' : ''}
                />
                <label>Prénom</label>
                <span className="input-icon">👤</span>
              </div>
              {errors.prenom && <span className="field-error">{errors.prenom}</span>}
            </div>

            {/* Username Field */}
            <div className="input-group">
              <div className="input-container">
                <input
                  type="text"
                  name="username"
                  placeholder=" "
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={errors.username ? 'error' : ''}
                />
                <label>Nom d'utilisateur</label>
                <span className="input-icon">👤</span>
              </div>
              {errors.username && <span className="field-error">{errors.username}</span>}
            </div>
            
            {/* email Field */}
            <div className="input-group">
              <div className="input-container">
                <input
                  type="email"
                  name="email"
                  placeholder=" "
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={errors.email ? 'error' : ''}
                />
                <label>Email</label>
                <span className="input-icon">📧</span>
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            {/* Password Field */}
            <div className="input-group">
              <div className="input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder=" "
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={errors.password ? 'error' : ''}
                />
                <label>Mot de passe</label>
                <span className="input-icon">🔒</span>
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  disabled={isLoading}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            {/* City Field */}
            <div className="input-group">
              <div className="input-container">
                <input
                  type="text"
                  name="city"
                  placeholder=" "
                  value={formData.city}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={errors.city ? 'error' : ''}
                />
                <label>Ville</label>
                <span className="input-icon">🏙️</span>
              </div>
              {errors.city && <span className="field-error">{errors.city}</span>}
            </div>

            {/* Surface Area Field */}
            <div className="input-group">
              <div className="input-container">
                <input
                  type="number"
                  name="surface_area"
                  placeholder=" "
                  value={formData.surface_area}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={errors.surface_area ? 'error' : ''}
                  min="0"
                />
                <label>Superficie (m²)</label>
                <span className="input-icon">📏</span>
              </div>
              {errors.surface_area && <span className="field-error">{errors.surface_area}</span>}
            </div>
            
            {/* id Device Field */}
            <div className="input-group">
              <div className="input-container">
                <input
                  type="text"
                  name="deviceId"
                  placeholder=" "
                  value={formData.deviceId}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={errors.deviceId ? 'error' : ''}
                />
                <label>Device ID (e.g., MAC Address)</label>
                <span className="input-icon">🔗</span>
              </div>
              {errors.deviceId && <span className="field-error">{errors.deviceId}</span>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="login-button"
              disabled={isLoading || Object.keys(errors).length > 0}
            >
              {isLoading ? (
                <div className="loading-content">
                  <div className="spinner"></div>
                  <span>Inscription...</span>
                </div>
              ) : (
                <span>S'inscrire</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>© 2024 SmartGrow - Tous droits réservés</p>
          <div className="footer-links">
            <a href="#privacy">Confidentialité</a>
            <a href="#terms">Conditions</a>
            <a href="#support">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;