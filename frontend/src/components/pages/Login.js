import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = ({ setIsAuthenticated }) => {
  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const navigate = useNavigate();

  // Configuration
  const config = {
    maxLoginAttempts: 3,
    blockDurationMinutes: 5,
    minUsernameLength: 3,
    minPasswordLength: 6,
    enableDarkMode: true,
    enableRememberMe: true,
    enableForgotPassword: true,
  };

  // Load saved preferences
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    const savedUsername = localStorage.getItem('username') || '';

    setIsDarkMode(savedDarkMode);
    setRememberMe(savedRememberMe);
    if (savedRememberMe && savedUsername) {
      setFormData(prev => ({ ...prev, username: savedUsername }));
    }

    // Check if user is blocked
    const blockEndTime = localStorage.getItem('blockEndTime');
    if (blockEndTime && new Date().getTime() < parseInt(blockEndTime)) {
      setIsBlocked(true);
      const remaining = Math.ceil((parseInt(blockEndTime) - new Date().getTime()) / 1000);
      setBlockTimeRemaining(remaining);
    }

    document.documentElement.setAttribute('data-theme', savedDarkMode ? 'dark' : 'light');
  }, []);

  // Block timer countdown
  useEffect(() => {
    let timer;
    if (isBlocked && blockTimeRemaining > 0) {
      timer = setInterval(() => {
        setBlockTimeRemaining(prev => {
          if (prev <= 1) {
            setIsBlocked(false);
            setLoginAttempts(0);
            localStorage.removeItem('blockEndTime');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isBlocked, blockTimeRemaining]);

  // Real-time validation
  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
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
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    validateField(name, value);
  };

  // Handle login submission
  const handleLogin = async (e) => {
    e.preventDefault();

    if (isBlocked) return;

    // Validate all fields
    const isUsernameValid = validateField('username', formData.username);
    const isPasswordValid = validateField('password', formData.password);

    if (!isUsernameValid || !isPasswordValid) return;

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Login failed');

      setShowSuccess(true);

      // Save preferences
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('username', formData.username);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('username');
      }

      // Reset attempts
      setLoginAttempts(0);
      localStorage.removeItem('blockEndTime');

      // Store token
      localStorage.setItem('token', data.token);
      setIsAuthenticated(true);

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      if (newAttempts >= config.maxLoginAttempts) {
        const blockEndTime = new Date().getTime() + (config.blockDurationMinutes * 60 * 1000);
        localStorage.setItem('blockEndTime', blockEndTime.toString());
        setIsBlocked(true);
        setBlockTimeRemaining(config.blockDurationMinutes * 60);
        setErrors({ general: `Trop de tentatives. Bloqué pour ${config.blockDurationMinutes} minutes.` });
      } else {
        const remainingAttempts = config.maxLoginAttempts - newAttempts;
        setErrors({ general: `Identifiants incorrects. ${remainingAttempts} tentative(s) restante(s).` });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    document.documentElement.setAttribute('data-theme', newDarkMode ? 'dark' : 'light');
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    setShowForgotPassword(true);
    setTimeout(() => {
      setShowForgotPassword(false);
      alert('Instructions envoyées par email !');
    }, 2000);
  };

  // Format block time
  const formatBlockTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
              <p>Connexion réussie !</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <div className="login-form-container">
          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-header">
              <h2>Connexion</h2>
              <p>Accédez à votre tableau de bord</p>
            </div>

            {/* Error Message */}
            {errors.general && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {errors.general}
              </div>
            )}

            {/* Block Message */}
            {isBlocked && (
              <div className="block-message">
                <span className="block-icon">🔒</span>
                <p>Compte temporairement bloqué</p>
                <div className="block-timer">{formatBlockTime(blockTimeRemaining)}</div>
              </div>
            )}

            {/* Username Field */}
            <div className="input-group">
              <div className="input-container">
                <input
                  type="text"
                  name="username"
                  placeholder=" "
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={isLoading || isBlocked}
                  className={errors.username ? 'error' : ''}
                />
                <label>Nom d'utilisateur</label>
                <span className="input-icon">👤</span>
              </div>
              {errors.username && <span className="field-error">{errors.username}</span>}
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
                  disabled={isLoading || isBlocked}
                  className={errors.password ? 'error' : ''}
                />
                <label>Mot de passe</label>
                <span className="input-icon">🔒</span>
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  disabled={isLoading || isBlocked}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="form-options">
              {config.enableRememberMe && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading || isBlocked}
                  />
                  <span className="checkmark"></span>
                  Se souvenir de moi
                </label>
              )}

              {config.enableForgotPassword && (
                <button
                  type="button"
                  className="forgot-password"
                  onClick={handleForgotPassword}
                  disabled={isLoading || isBlocked || showForgotPassword}
                >
                  {showForgotPassword ? 'Envoi en cours...' : 'Mot de passe oublié ?'}
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="login-button"
              disabled={isLoading || isBlocked || Object.keys(errors).length > 0}
            >
              {isLoading ? (
                <div className="loading-content">
                  <div className="spinner"></div>
                  <span>Connexion...</span>
                </div>
              ) : (
                <span>Se connecter</span>
              )}
            </button>

            {/* Login Attempts Indicator */}
            {loginAttempts > 0 && !isBlocked && (
              <div className="attempts-indicator">
                <div className="attempts-dots">
                  {[...Array(config.maxLoginAttempts)].map((_, index) => (
                    <div
                      key={index}
                      className={`attempt-dot ${index < loginAttempts ? 'failed' : ''}`}
                    ></div>
                  ))}
                </div>
                <span>{config.maxLoginAttempts - loginAttempts} tentative(s) restante(s)</span>
              </div>
            )}

            {/* Signup Link */}
            <div className="signup-link" style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                S’inscrire si tu n’as pas un compte.{' '}
                <button
                  type="button"
                  className="forgot-password"
                  onClick={() => navigate('/signup')}
                  disabled={isLoading || isBlocked}
                >
                  S'inscrire
                </button>
              </p>
            </div>
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

export default Login;