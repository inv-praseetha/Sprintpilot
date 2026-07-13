import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayouut from './components/layout/MainLayouut';
import Dashboard from './pages/private/dashboard';
import Test from './pages/private/test';
import NotFound from './pages/public/NotFound';

function App() {
  return (
    <Router>
      <MainLayouut>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/test" element={<Test />} />
          {/* Fallback to 404 page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MainLayouut>
    </Router>
  );
}

export default App;
