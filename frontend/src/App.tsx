import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NgoDashboardPage from './pages/NgoDashboardPage';
import FunderDashboardPage from './pages/FunderDashboardPage';
import ProjectCreationPage from './pages/ProjectCreationPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import MarketplacePage from './pages/MarketplacePage';
import NgoNeedFormPage from './pages/NgoNeedFormPage';
import NgoMatchRequestsPage from './pages/NgoMatchRequestsPage';
import MilestoneCreationPage from './pages/MilestoneCreationPage';
import PublicAuditDashboard from './pages/PublicAuditDashboard';

const ProtectedRoute = ({ children, role }: { children: JSX.Element, role?: string }) => {
    const { token, user } = useAuth();
    if (!token) return <Navigate to="/login" />;
    // if (role && user?.role !== role) return <Navigate to="/dashboard" />;
    return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/audit" element={<PublicAuditDashboard />} />
      <Route 
        path="/ngo/needs/new" 
        element={<ProtectedRoute role="NGO"><NgoNeedFormPage /></ProtectedRoute>} 
      />
      <Route 
        path="/ngo/match-requests" 
        element={<ProtectedRoute role="NGO"><NgoMatchRequestsPage /></ProtectedRoute>} 
      />
      <Route 
        path="/ngo/dashboard" 
        element={
          <ProtectedRoute role="NGO">
            <NgoDashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/funder/dashboard" 
        element={<ProtectedRoute role="FUNDER"><FunderDashboardPage /></ProtectedRoute>} 
      />
      <Route 
        path="/funder/projects/new" 
        element={<ProtectedRoute role="FUNDER"><ProjectCreationPage /></ProtectedRoute>} 
      />
      <Route 
        path="/projects/:id" 
        element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} 
      />
      <Route 
        path="/projects/:id/milestones/new" 
        element={<ProtectedRoute role="NGO"><MilestoneCreationPage /></ProtectedRoute>} 
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
