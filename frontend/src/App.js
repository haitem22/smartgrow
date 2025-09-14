import React, { useState } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import Login from './components/pages/Login';
import Signup from './components/pages/Signup';
import DashboardHome from './components/pages/DashboardHome';
import Capteurs from './components/pages/Capteurs';
import Historique from './components/pages/Historique';
import Configurations from './components/pages/Configurations';

import DashboardLayout from './components/layout/DashboardLayout'; // à créer : sidebar + header

console.log('Signup:', Signup);
// Composant pour protéger les routes privées
const PrivateRoute = ({ isAuthenticated, redirectPath = '/', children }) => {
  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }
  return children ? children : <Outlet />;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <Router>
      <Routes>
        {/* Page publique login */}
        <Route path="/" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
        <Route path="/signup" element={<Signup />} />
        {/* Routes protégées */}
        <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>
          {/* Layout commun avec navigation */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/capteurs" element={<Capteurs />} />
            <Route path="/historique" element={<Historique />} />
            <Route path="/configurations" element={<Configurations />} />
          </Route>
        </Route>

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
