import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './src/pages/Home';
import ChecklistPage from './src/pages/ChecklistPage';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-background text-primary selection:bg-accent selection:text-white">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/list/:id" element={<ChecklistPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;