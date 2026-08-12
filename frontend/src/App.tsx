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
import NgoProjectsPage from './pages/NgoProjectsPage';
import NgoProfilePage from './pages/NgoProfilePage';
import EvidenceUploadPage from './pages/EvidenceUploadPage';
import NgoProjectCreationPage from './pages/NgoProjectCreationPage';
import NgoProjectWorkspace from './pages/NgoProjectWorkspace';
import VerificationCenter from './pages/VerificationCenter';
import NgoGlobalFundsPage from './pages/NgoGlobalFundsPage';
import NgoGlobalImpactPage from './pages/NgoGlobalImpactPage';
import NgoGlobalBeneficiariesPage from './pages/NgoGlobalBeneficiariesPage';
import PublicBeneficiaryFormPage from './pages/PublicBeneficiaryFormPage';

import NgoExpensesPage from './pages/NgoExpensesPage';
import AddExpensePage from './pages/AddExpensePage';
import ExpenseDetailPage from './pages/ExpenseDetailPage';
import DashboardLayout from './components/DashboardLayout';

const ProtectedRoute = ({ children, role }: { children: JSX.Element, role?: string }) => {
    const { token, user } = useAuth();
    if (!token) return <Navigate to="/login" />;
    // if (role && user?.role !== role) return <Navigate to="/dashboard" />;
    return children;
};

const DashboardWrapper = ({ children }: { children: React.ReactNode }) => (
    <DashboardLayout>{children}</DashboardLayout>
);

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/audit" element={<PublicAuditDashboard />} />
      
      {/* NGO Routes */}
      <Route 
        path="/ngo/needs/new" 
        element={<ProtectedRoute role="NGO"><DashboardWrapper><NgoNeedFormPage /></DashboardWrapper></ProtectedRoute>} 
      />
      <Route 
        path="/ngo/match-requests" 
        element={<ProtectedRoute role="NGO"><DashboardWrapper><NgoMatchRequestsPage /></DashboardWrapper></ProtectedRoute>} 
      />
      <Route 
        path="/ngo/dashboard" 
        element={<ProtectedRoute role="NGO"><DashboardWrapper><NgoDashboardPage /></DashboardWrapper></ProtectedRoute>} 
      />
      <Route 
        path="/ngo/projects" 
        element={<ProtectedRoute role="NGO"><DashboardWrapper><NgoProjectsPage /></DashboardWrapper></ProtectedRoute>} 
      />
      <Route 
        path="/ngo/projects/new" 
        element={<ProtectedRoute role="NGO"><DashboardWrapper><NgoProjectCreationPage /></DashboardWrapper></ProtectedRoute>} 
      />
      <Route 
        path="/ngo/profile" 
        element={<ProtectedRoute role="NGO"><DashboardWrapper><NgoProfilePage /></DashboardWrapper></ProtectedRoute>} 
      />
      <Route 
        path="/ngo/evidence/new" 
        element={<ProtectedRoute role="NGO"><DashboardWrapper><EvidenceUploadPage /></DashboardWrapper></ProtectedRoute>} 
      />
      <Route 
        path="/projects/:id/milestones/new" 
        element={<ProtectedRoute role="NGO"><DashboardWrapper><MilestoneCreationPage /></DashboardWrapper></ProtectedRoute>} 
      />
      <Route 
        path="/ngo/projects/:id" 
        element={<ProtectedRoute role="NGO"><DashboardWrapper><NgoProjectWorkspace /></DashboardWrapper></ProtectedRoute>} 
      />
      {/* We use a query parameter to select the tab (e.g. ?tab=BENEFICIARIES) so we don't need a separate route for tabs */}
      <Route 
        path="/ngo/projects/:id/milestones/:milestoneId" 
        element={<ProtectedRoute role="NGO"><DashboardWrapper><NgoProjectWorkspace /></DashboardWrapper></ProtectedRoute>} 
      />
      <Route 
        path="/ngo/verification" 
        element={<ProtectedRoute role="NGO"><DashboardWrapper><VerificationCenter /></DashboardWrapper></ProtectedRoute>} 
      />
      <Route 
        path="/ngo/funds" 
        element={<ProtectedRoute role="NGO"><DashboardWrapper><NgoGlobalFundsPage /></DashboardWrapper></ProtectedRoute>} 
      />
      <Route 
        path="/ngo/impact" 
        element={<ProtectedRoute role="NGO"><DashboardWrapper><NgoGlobalImpactPage /></DashboardWrapper></ProtectedRoute>} 
      />
      <Route 
        path="/ngo/beneficiaries" 
        element={<ProtectedRoute role="NGO"><DashboardWrapper><NgoGlobalBeneficiariesPage /></DashboardWrapper></ProtectedRoute>} 
      />

      <Route path="/verify/:token" element={<PublicBeneficiaryFormPage />} />

      {/* NGO Expenses Routes */}
      <Route path="/ngo/expenses" element={<ProtectedRoute><DashboardLayout><NgoExpensesPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/ngo/expenses/new" element={<ProtectedRoute><DashboardLayout><AddExpensePage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/ngo/expenses/:id" element={<ProtectedRoute><DashboardLayout><ExpenseDetailPage /></DashboardLayout></ProtectedRoute>} />

      {/* Funder Routes */}
      <Route 
        path="/funder/dashboard" 
        element={<ProtectedRoute role="FUNDER"><DashboardWrapper><FunderDashboardPage /></DashboardWrapper></ProtectedRoute>} 
      />
      <Route 
        path="/funder/projects/new" 
        element={<ProtectedRoute role="FUNDER"><DashboardWrapper><ProjectCreationPage /></DashboardWrapper></ProtectedRoute>} 
      />

      {/* Shared Authenticated Routes */}
      <Route 
        path="/projects/:id" 
        element={<ProtectedRoute><DashboardWrapper><ProjectDetailPage /></DashboardWrapper></ProtectedRoute>} 
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
