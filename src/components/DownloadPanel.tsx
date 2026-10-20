import type { EngineResult } from '../hooks/useMidiEngine';
import { downloadUint8Array, downloadString } from '../services/fileUtils';

interface DownloadPanelProps {
  result: EngineResult;
  originalFileName: string;
  onReset: () => void;
}

export function DownloadPanel({ result, originalFileName, onReset }: DownloadPanelProps) {
  const baseName = originalFileName.replace(/\.(mid|midi)$/i, '');
  const { files, projectData } = result;

  return (
    <div className="download-panel">
      <h2>¡Armonía de 16 Voces Generada!</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Tonalidad</div>
          <div className="stat-value">{projectData.tracks[0]?.name || 'N/A'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pistas</div>
          <div className="stat-value">{projectData.tracks.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Notas totales</div>
          <div className="stat-value">
            {projectData.tracks.reduce((sum, t) => sum + t.notes.length, 0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tempo</div>
          <div className="stat-value">{projectData.tempo} BPM</div>
        </div>
      </div>

      <div className="track-list">
        <h3>Pistas generadas:</h3>
        {projectData.tracks.map(track => (
          <div key={track.id} className="track-item">
            <span className="track-name">{track.name}</span>
            <span className="track-notes">{track.notes.length} notas</span>
          </div>
        ))}
      </div>

      <div className="download-buttons">
        <button
          onClick={() => downloadUint8Array(files.midi, `${baseName}_16v.mid`, 'audio/midi')}
          className="btn btn-midi"
        >
          ⬇ .MID
          <span className="btn-size">{(files.midi.length / 1024).toFixed(1)} KB</span>
        </button>
        <button
          onClick={() => downloadString(files.musicxml, `${baseName}_16v.musicxml`, 'application/xml')}
          className="btn btn-xml"
        >
          ⬇ .XML
          <span className="btn-size">{(files.musicxml.length / 1024).toFixed(1)} KB</span>
        </button>
        <button
          onClick={() => downloadUint8Array(files.pdf, `${baseName}_16v.pdf`, 'application/pdf')}
          className="btn btn-pdf"
        >
          ⬇ .PDF
          <span className="btn-size">{(files.pdf.length / 1024).toFixed(1)} KB</span>
        </button>
      </div>

      <button onClick={onReset} className="btn btn-reset">Procesar otro archivo</button>
    </div>
  );
}
