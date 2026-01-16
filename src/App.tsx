import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import ChecklistPage from './pages/ChecklistPage';
import outputs from '../amplify_outputs.json'; // Config validation

const App: React.FC = () => {
  const [isConfigValid, setIsConfigValid] = useState(true);

  useEffect(() => {
    // Check if the configuration has the required 'data' section
    // Gen 2 config usually has 'data' or 'auth' keys. The dummy one only has 'version'.
    const hasDataConfig = outputs && ((outputs as any).data || (outputs as any).auth);
    setIsConfigValid(!!hasDataConfig);
  }, []);

  if (!isConfigValid) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow-pop border-2 border-primary/10">
          <h1 className="text-2xl font-extrabold text-primary mb-4">設定ファイルが不完全です</h1>
          <p className="text-secondary mb-6 text-sm leading-relaxed">
            <code>amplify_outputs.json</code> にバックエンドの接続情報が含まれていません。<br/>
            前回の指示で作成したダミーファイルが原因の可能性があります。
          </p>
          <div className="bg-blue-50 p-4 rounded-xl text-left text-xs text-primary/80 mb-6 font-mono border border-primary/10">
            <p className="font-bold mb-2 text-accent">解決手順:</p>
            <ol className="list-decimal pl-4 space-y-2">
              <li>プロジェクト直下の <code>amplify_outputs.json</code> を削除してください。</li>
              <li>
                <strong>ローカルの場合:</strong> <br/>
                <code>npx ampx sandbox</code> を実行してファイルを再生成してください。
              </li>
              <li>
                <strong>クラウド(Amplify)の場合:</strong> <br/>
                リポジトリからこのファイルを削除してpushし、再デプロイしてください。
              </li>
            </ol>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primaryDark transition-colors w-full shadow-sm"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

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