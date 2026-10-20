/**
 * INTERFAZ DE PRUEBA DEL MOTOR — FASE 01
 * Harness mínimo para validar el pipeline completo.
 */

import { useState, useCallback, useRef } from 'react';
import { ingestMidi } from './engine/ingest';
import { quantizeProject } from './engine/quantize';
import { harmonizeProject } from './engine/harmonize';
import { exportToMidi } from './engine/export/midi';
import { exportToMusicXML } from './engine/export/xml';
import { exportToPdf } from './engine/export/pdf';
import type { ProjectData } from './engine/types';

interface ExportFiles {
  midi: Uint8Array;
  musicxml: string;
  pdf: Uint8Array;
}

function App() {
  const [fileName, setFileName] = useState<string>('');
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [exportFiles, setExportFiles] = useState<ExportFiles | null>(null);
  const [error, setError] = useState<string>('');
  const [stage, setStage] = useState<string>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setExportFiles(null);
    setError('');
    setProjectData(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Stage 1: Ingesta
      setStage('ingesting');
      let data = ingestMidi(buffer);

      // Stage 2: Cuantización
      setStage('quantizing');
      data = quantizeProject(data, 16);

      // Stage 3: Armonización
      setStage('harmonizing');
      data = harmonizeProject(data);

      setProjectData(data);

      // Stage 4: Exportación
      setStage('exporting');
      const midiBuffer = exportToMidi(data);
      const xmlString = exportToMusicXML(data);
      const pdfBuffer = exportToPdf(data);

      setExportFiles({
        midi: new Uint8Array(midiBuffer),
        musicxml: xmlString,
        pdf: new Uint8Array(pdfBuffer),
      });

      setStage('complete');
    } catch (err) {
      setError((err as Error).message);
      setStage('error');
    }
  }, []);

  const downloadFile = useCallback((data: Uint8Array | string, filename: string, mimeType: string) => {
    const blob = new Blob([data as unknown as BlobPart], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const stageLabels: Record<string, string> = {
    idle: '⏸ Idle',
    ingesting: '📥 Ingesting MIDI...',
    quantizing: '🎯 Quantizing to grid (1/16)...',
    harmonizing: '🎵 Harmonizing (key detection + bass)...',
    exporting: '📦 Exporting .mid / .musicxml / .pdf...',
    complete: '✅ Complete!',
    error: '❌ Error',
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold text-emerald-400">
          🎹 MIDI Engine Core <span className="text-gray-500 text-sm">v0.1.0 — Phase 01</span>
        </h1>
        <p className="text-gray-500 text-xs mt-1">
          Ingesta → Cuantización → Armonización → Exportación (.mid / .musicxml / .pdf)
        </p>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Upload */}
        <section className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">1. Cargar archivo MIDI</h2>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".mid,.midi"
              onChange={handleFileUpload}
              className="hidden"
              id="midi-file"
            />
            <label
              htmlFor="midi-file"
              className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Seleccionar MIDI
            </label>
            {fileName && <span className="text-gray-400 text-sm">{fileName}</span>}
          </div>
        </section>

        {/* Pipeline Status */}
        <section className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">2. Estado del Pipeline</h2>
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-sm font-bold ${
              stage === 'error' ? 'text-red-400' : 
              stage === 'complete' ? 'text-emerald-400' : 'text-yellow-400'
            }`}>
              {stageLabels[stage] || stage}
            </span>
          </div>

          <div className="flex gap-2">
            {['ingesting', 'quantizing', 'harmonizing', 'exporting'].map((s) => {
              const stages = ['idle', 'ingesting', 'quantizing', 'harmonizing', 'exporting', 'complete'];
              const currentIdx = stages.indexOf(stage);
              const stageIdx = stages.indexOf(s);
              const isActive = currentIdx >= stageIdx + 1;
              const isCurrent = stage === s;
              return (
                <div
                  key={s}
                  className={`flex-1 text-center py-2 rounded text-xs font-medium ${
                    isCurrent ? 'bg-emerald-600 text-white' :
                    isActive ? 'bg-emerald-900/50 text-emerald-300' :
                    'bg-gray-800 text-gray-600'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mt-4 bg-red-900/30 border border-red-800 rounded p-3 text-red-300 text-xs">
              {error}
            </div>
          )}
        </section>

        {/* Analysis */}
        {projectData && (
          <section className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">3. Datos del Proyecto</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded p-3">
                <div className="text-xs text-gray-500">Tempo</div>
                <div className="text-lg font-bold text-blue-400">{projectData.tempo} BPM</div>
              </div>
              <div className="bg-gray-800 rounded p-3">
                <div className="text-xs text-gray-500">Métrica</div>
                <div className="text-lg font-bold text-purple-400">
                  {projectData.timeSignature[0]}/{projectData.timeSignature[1]}
                </div>
              </div>
              <div className="bg-gray-800 rounded p-3">
                <div className="text-xs text-gray-500">Tracks</div>
                <div className="text-lg font-bold text-yellow-400">{projectData.tracks.length}</div>
              </div>
              <div className="bg-gray-800 rounded p-3">
                <div className="text-xs text-gray-500">Total Notas</div>
                <div className="text-lg font-bold text-emerald-400">
                  {projectData.tracks.reduce((sum, t) => sum + t.notes.length, 0)}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {projectData.tracks.map(track => (
                <div key={track.id} className="bg-gray-800 rounded p-2 flex justify-between text-sm">
                  <span className="text-gray-300">{track.name}</span>
                  <span className="text-gray-500">{track.notes.length} notas</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Downloads */}
        {exportFiles && (
          <section className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">4. Archivos de Exportación</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => downloadFile(exportFiles.midi, 'output.mid', 'audio/midi')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                🎵 Download .mid
                <span className="text-xs opacity-70">({(exportFiles.midi.length / 1024).toFixed(1)} KB)</span>
              </button>
              <button
                onClick={() => downloadFile(exportFiles.musicxml, 'output.musicxml', 'application/xml')}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                📄 Download .musicxml
                <span className="text-xs opacity-70">({(exportFiles.musicxml.length / 1024).toFixed(1)} KB)</span>
              </button>
              <button
                onClick={() => downloadFile(exportFiles.pdf, 'output.pdf', 'application/pdf')}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                📋 Download .pdf
                <span className="text-xs opacity-70">({(exportFiles.pdf.length / 1024).toFixed(1)} KB)</span>
              </button>
            </div>
          </section>
        )}

        {/* Module Info */}
        <section className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-200">Motor — Módulos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-800 rounded p-3">
              <span className="text-emerald-400 font-bold">INGESTA</span>
              <p className="text-gray-400 mt-1">Parser MIDI binario → ProjectData JSON. Extrae notas por track.</p>
            </div>
            <div className="bg-gray-800 rounded p-3">
              <span className="text-yellow-400 font-bold">CUANTIZACIÓN</span>
              <p className="text-gray-400 mt-1">Snap perfecto al grid (4/8/16/32). Resolución de overlaps.</p>
            </div>
            <div className="bg-gray-800 rounded p-3">
              <span className="text-blue-400 font-bold">ARMONIZACIÓN</span>
              <p className="text-gray-400 mt-1">Key detection con tonal.js. Genera bajo y acordes.</p>
            </div>
            <div className="bg-gray-800 rounded p-3">
              <span className="text-purple-400 font-bold">EXPORTACIÓN</span>
              <p className="text-gray-400 mt-1">MIDI binario, MusicXML 3.1, PDF con jsPDF.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
