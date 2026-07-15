import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import PublicRoute from './components/Auth/PublicRoute';
import MainLayouut from './components/layout/MainLayouut';
import Dashboard from './pages/private/dashboard';
import Test from './pages/private/test';
import NotFound from './pages/public/NotFound';
import Login from './pages/auth/login';
import ProjectCreation from './pages/private/projectcreation';
import ProjectTest from './pages/private/ProjectTest';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route element={<PublicRoute />}>
            <Route path="/" element={<Login />} />
          </Route>

          {/* PROTECTED ROUTES */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayouut />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<ProjectCreation />} />
              <Route path="/test" element={<ProjectTest />} />
              {/* Fallback to 404 page */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
export default App;
