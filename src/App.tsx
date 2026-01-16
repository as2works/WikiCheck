import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './src/pages/Home';
import ChecklistPage from './src/pages/ChecklistPage';
import outputs from './amplify_outputs.json';

const App: React.FC = () => {
  const [isConfigValid, setIsConfigValid] = useState(true);

  useEffect(() => {
    // amplify_outputs.jsonの検証
    // Hosting環境ではデプロイ時に正常な設定ファイルが生成されます
    const hasConfig = outputs && (
      (outputs as any).data || 
      (outputs as any).auth ||
      Object.keys(outputs).length > 1 
    );
    setIsConfigValid(hasConfig);
  }, []);

  if (!isConfigValid) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans text-slate-800">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold mb-2 text-slate-700">Service Unavailable</h2>
          <p className="text-slate-500 text-sm mb-6">
            Unable to connect to the backend services. Please check the application configuration.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="min-h-screen bg-background text-primary selection:bg-accent selection:text-white pb-safe">
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