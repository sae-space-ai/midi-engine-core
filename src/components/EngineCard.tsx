import { useRef } from 'react';
import { useEngine, EngineType } from '../hooks/useEngine';
import { downloadUint8Array, downloadString } from '../services/fileUtils';

interface EngineCardProps {
  title: string;
  description: string;
  engineType: EngineType;
  accentColor: string;
}

export function EngineCard({ title, description, engineType, accentColor }: EngineCardProps) {
  const { status, result, error, runEngine, reset } = useEngine(engineType);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log(`[Card] File selected for ${engineType}:`, file.name);
      runEngine(file);
    }
  };

  return (
    <div className="engine-card" style={{ borderColor: status === 'processing' ? accentColor : undefined }}>
      <div className="card-header">
        <h3 style={{ color: accentColor }}>{title}</h3>
        <p>{description}</p>
      </div>

      {status === 'idle' && (
        <div className="upload-area" onClick={() => inputRef.current?.click()}>
          <input
            type="file"
            ref={inputRef}
            accept=".mid,.midi"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <span className="upload-icon">⬆</span>
          <p>Subir MIDI</p>
        </div>
      )}

      {status === 'processing' && (
        <div className="status-area">
          <div className="spinner" style={{ borderTopColor: accentColor }}></div>
          <p>Procesando...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="status-area error">
          <p className="error-text">Error: {error}</p>
          <button onClick={reset} className="btn-reset">Reintentar</button>
        </div>
      )}

      {status === 'success' && result && (
        <div className="download-area">
          <p className="success-text">¡Procesado!</p>
          <div className="stats">
            <div className="stat">
              <span className="stat-label">Pistas:</span>
              <span className="stat-value">{result.projectData.tracks.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Notas:</span>
              <span className="stat-value">
                {result.projectData.tracks.reduce((sum: number, t: any) => sum + t.notes.length, 0)}
              </span>
            </div>
          </div>
          <div className="download-buttons">
            <button
              onClick={() => downloadUint8Array(result.files.midi, `result_${engineType}.mid`, 'audio/midi')}
              className="btn-dl"
            >
              MID
            </button>
            <button
              onClick={() => downloadString(result.files.musicxml, `result_${engineType}.musicxml`, 'application/xml')}
              className="btn-dl"
            >
              XML
            </button>
            <button
              onClick={() => downloadUint8Array(result.files.pdf, `result_${engineType}.pdf`, 'application/pdf')}
              className="btn-dl"
            >
              PDF
            </button>
          </div>
          <button onClick={reset} className="btn-reset">Nueva prueba</button>
        </div>
      )}
    </div>
  );
}
