import { ProcessedFiles } from '../services/api';
import { base64ToBlob, downloadBlob } from '../services/fileUtils';
export function DownloadPanel({ files, originalFileName, onReset }: { files: ProcessedFiles, originalFileName: string, onReset: () => void }) {
  const baseName = originalFileName.replace(/\.(mid|midi)$/i, '');
  const handleDownload = (b64: string, mime: string, ext: string) => downloadBlob(base64ToBlob(b64, mime), `${baseName}_16v.${ext}`);
  return (
    <div className="download-panel">
      <h2>¡Armonía de 16 Voces Generada!</h2>
      <div className="download-buttons">
        <button onClick={() => handleDownload(files.midi, 'audio/midi', 'mid')} className="btn btn-midi">.MID</button>
        <button onClick={() => handleDownload(files.musicxml, 'application/xml', 'musicxml')} className="btn btn-xml">.XML</button>
        <button onClick={() => handleDownload(files.pdf, 'application/pdf', 'pdf')} className="btn btn-pdf">.PDF</button>
      </div>
      <button onClick={onReset} className="btn btn-reset">Procesar otro</button>
    </div>
  );
}
