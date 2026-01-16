import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './src/pages/Home';
import ChecklistPage from './src/pages/ChecklistPage';
import outputs from './amplify_outputs.json';

const App: React.FC = () => {
  const [isConfigValid, setIsConfigValid] = useState(true);

  useEffect(() => {
    // amplify_outputs.jsonが正しく生成されているかチェック
    // ダミーファイルの場合、authやdataセクションが存在しない可能性が高い
    const hasConfig = outputs && (
      (outputs as any).auth || 
      (outputs as any).data || 
      Object.keys(outputs).length > 1 // versionのみの場合はキーが1つ
    );
    setIsConfigValid(hasConfig);
  }, []);

  if (!isConfigValid) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-xl bg-white p-10 rounded-3xl shadow-xl border border-slate-200">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-slate-800 mb-3">アプリの準備が必要です</h1>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed">
            バックエンドとの接続設定が見つかりません。<br/>
            現在、ビルド用の仮設定ファイル（ダミー）で動作しています。
          </p>
          
          <div className="bg-slate-50 p-6 rounded-2xl text-left text-sm text-slate-600 mb-8 border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              対応手順
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-1">ローカル環境の場合</p>
                <p className="mb-2">ターミナルで以下のコマンドを実行し、サンドボックス環境を起動してください。</p>
                <code className="block bg-slate-800 text-white px-4 py-3 rounded-lg font-mono text-xs">
                  npx ampx sandbox
                </code>
                <p className="text-xs text-slate-400 mt-2">※ これにより正しい <code>amplify_outputs.json</code> が生成されます。</p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-1">Amplify Hosting (クラウド) の場合</p>
                <p>
                  通常、デプロイ時に自動的に設定が注入されます。<br/>
                  この画面が表示される場合、ビルド設定を見直すか、再デプロイを試してください。
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
          >
            ページを再読み込み
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