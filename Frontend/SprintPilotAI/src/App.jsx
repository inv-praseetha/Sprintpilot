import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import PublicRoute from './components/Auth/PublicRoute';
import MainLayouut from './components/layout/MainLayouut';
import Dashboard from './pages/private/dashboard';
import NotFound from './pages/public/NotFound';
import Login from './pages/auth/login';
import ProjectCreation from './pages/private/projectcreation';
import ProjectDetail from './pages/private/projectdetail';
import SprintDetail from './pages/private/SprintDetail';
import JiraCallback from './pages/public/JiraCallback';
import Status from './pages/private/Status';

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
              <Route path="/projects" element={<ProjectCreation/>} />
              <Route path="/projects/:projectId" element={<ProjectDetail />} />
              <Route path="/projects/:projectId/sprints/:sprintId" element={<SprintDetail />} />
              <Route path="/jira/callback" element={<JiraCallback />} />
              <Route path="/status" element={<Status />} />

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
