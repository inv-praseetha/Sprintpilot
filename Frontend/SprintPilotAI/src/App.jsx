import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayouut from './components/layout/MainLayouut';
import Dashboard from './pages/private/dashboard';
import Test from './pages/private/test';
import NotFound from './pages/public/NotFound';
import Login from './pages/auth/login';
import ProjectCreation from './pages/private/projectcreation';
import ProjectDetail from './pages/private/projectdetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
         <Route path="*" element={
          <MainLayouut>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<ProjectCreation/>} />
              <Route path="/projects/:projectId" element={<ProjectDetail />} />
              <Route path="/test" element={<Test />} />
              {/* Fallback to 404 page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MainLayouut>
        } />
      </Routes>
    </Router>
  );
}

export default App;
