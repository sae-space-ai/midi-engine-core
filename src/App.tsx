import { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { DownloadPanel } from './components/DownloadPanel';
import { useMidiEngine } from './hooks/useMidiEngine';

function App() {
  const { status, result, error, progress, runEngine, reset } = useMidiEngine();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>MIDI ENGINE <span>16V</span></h1>
        <p>Sistema de Cuantización y Armonización Polifónica (16 Voces)</p>
      </header>

      <main className="app-main">
        {status === 'idle' && (
          <FileUploader
            onFileSelect={(f) => {
              setSelectedFile(f);
              runEngine(f);
            }}
            disabled={false}
          />
        )}

        {status === 'processing' && (
          <div className="status-panel processing">
            <div className="spinner"></div>
            <h2>Generando 16 Voces...</h2>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="progress-text">{progress}%</p>
          </div>
        )}

        {status === 'error' && (
          <div className="status-panel error">
            <h2>❌ Error</h2>
            <p>{error}</p>
            <button onClick={reset} className="btn btn-reset">Reintentar</button>
          </div>
        )}

        {status === 'success' && result && selectedFile && (
          <DownloadPanel
            result={result}
            originalFileName={selectedFile.name}
            onReset={reset}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>MIDI Engine v0.2.0 | Procesamiento 100% en el navegador</p>
      </footer>
    </div>
  );
}

export default App;
