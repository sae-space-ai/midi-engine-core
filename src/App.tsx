/**
 * INTERFAZ MÍNIMA DE PRUEBA DEL MOTOR
 * Solo para validar el pipeline. No es la UI final del producto.
 */

import { useState, useCallback, useRef } from 'react';
import { MidiPipeline } from './engine/pipeline';
import type { PipelineState, ExportResult, HarmonizedMIDI } from './engine/types';

function App() {
  const [state, setState] = useState<PipelineState>({ stage: 'idle', progress: 0 });
  const [fileName, setFileName] = useState<string>('');
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [analysisInfo, setAnalysisInfo] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setExportResult(null);
    setAnalysisInfo(null);

    const buffer = await file.arrayBuffer();

    const pipeline = new MidiPipeline(
      {
        quantization: { gridDivision: 'sixteenth', strength: 1.0, removeOverlap: true },
        harmonization: { style: 'pop', useExtensions: true },
        export: { format: 'format1', includeOriginal: true, includeHarmony: true, includeBass: true },
      },
      (newState) => setState({ ...newState })
    );

    try {
      const result = await pipeline.process(new Uint8Array(buffer));
      setExportResult(result);

      const finalState = pipeline.getState();
      const harmonized = finalState.harmonized;
      if (harmonized) {
        setAnalysisInfo({
          key: harmonized.harmonicAnalysis.key,
          tempo: harmonized.tempo,
          timeSignature: harmonized.timeSignature,
          totalNotes: harmonized.notes.length,
          harmonyNotes: harmonized.harmonyNotes.length,
          bassNotes: harmonized.bassNotes.length,
          chords: harmonized.harmonicAnalysis.chords.map(c => c.symbol),
        });
      }
    } catch (error) {
      console.error('Pipeline error:', error);
    }
  }, []);

  const downloadFile = useCallback((data: Uint8Array | string, filename: string, mimeType: string) => {
    let blob: Blob;
    if (typeof data === 'string') {
      blob = new Blob([data], { type: mimeType });
    } else {
      blob = new Blob([data as unknown as BlobPart], { type: mimeType });
    }
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
    quantizing: '🎯 Quantizing to grid...',
    harmonizing: '🎵 Harmonizing...',
    exporting: '📦 Exporting files...',
    complete: '✅ Complete!',
    error: '❌ Error',
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold text-emerald-400">
          🎹 MIDI Engine <span className="text-gray-500 text-sm">v1.0 — Phase 00</span>
        </h1>
        <p className="text-gray-500 text-xs mt-1">
          Motor de procesamiento MIDI: Ingesta → Cuantización → Armonización → Exportación
        </p>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Upload Section */}
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
            {fileName && (
              <span className="text-gray-400 text-sm">{fileName}</span>
            )}
          </div>
        </section>

        {/* Pipeline Status */}
        <section className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">2. Estado del Pipeline</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Stage:</span>
              <span className={`text-sm font-bold ${state.stage === 'error' ? 'text-red-400' : state.stage === 'complete' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {stageLabels[state.stage] || state.stage}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Progress:</span>
              <div className="flex-1 bg-gray-800 rounded-full h-2 max-w-xs">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${state.progress * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-500">{(state.progress * 100).toFixed(0)}%</span>
            </div>
            {state.error && (
              <div className="bg-red-900/30 border border-red-800 rounded p-3 text-red-300 text-xs">
                {state.error}
              </div>
            )}
          </div>

          {/* Pipeline stages visualization */}
          <div className="mt-4 flex gap-2">
            {['ingesting', 'quantizing', 'harmonizing', 'exporting'].map((stage, i) => {
              const stages = ['idle', 'ingesting', 'quantizing', 'harmonizing', 'exporting', 'complete'];
              const currentIdx = stages.indexOf(state.stage);
              const stageIdx = i + 1;
              const isActive = currentIdx >= stageIdx;
              const isCurrent = state.stage === stage;
              return (
                <div
                  key={stage}
                  className={`flex-1 text-center py-2 rounded text-xs font-medium ${
                    isCurrent ? 'bg-emerald-600 text-white' :
                    isActive ? 'bg-emerald-900/50 text-emerald-300' :
                    'bg-gray-800 text-gray-600'
                  }`}
                >
                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                </div>
              );
            })}
          </div>
        </section>

        {/* Analysis Results */}
        {analysisInfo && (
          <section className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">3. Análisis Armónico</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded p-3">
                <div className="text-xs text-gray-500">Tonalidad</div>
                <div className="text-lg font-bold text-emerald-400">{analysisInfo.key?.key}</div>
                <div className="text-xs text-gray-500">
                  Confianza: {(analysisInfo.key?.confidence * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-800 rounded p-3">
                <div className="text-xs text-gray-500">Tempo</div>
                <div className="text-lg font-bold text-blue-400">{analysisInfo.tempo} BPM</div>
              </div>
              <div className="bg-gray-800 rounded p-3">
                <div className="text-xs text-gray-500">Métrica</div>
                <div className="text-lg font-bold text-purple-400">
                  {analysisInfo.timeSignature?.numerator}/{analysisInfo.timeSignature?.denominator}
                </div>
              </div>
              <div className="bg-gray-800 rounded p-3">
                <div className="text-xs text-gray-500">Notas</div>
                <div className="text-lg font-bold text-yellow-400">{analysisInfo.totalNotes}</div>
                <div className="text-xs text-gray-500">
                  + {analysisInfo.harmonyNotes} harm + {analysisInfo.bassNotes} bass
                </div>
              </div>
            </div>
            <div className="mt-4 bg-gray-800 rounded p-3">
              <div className="text-xs text-gray-500 mb-2">Progresión de acordes:</div>
              <div className="text-sm text-emerald-300 font-bold">
                {analysisInfo.chords?.join(' → ')}
              </div>
            </div>
          </section>
        )}

        {/* Download Section */}
        {exportResult && (
          <section className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">4. Archivos de Exportación</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => downloadFile(exportResult.midi, 'output.mid', 'audio/midi')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span>🎵</span> Download .mid
                <span className="text-xs opacity-70">({(exportResult.midi.length / 1024).toFixed(1)} KB)</span>
              </button>
              <button
                onClick={() => downloadFile(exportResult.musicxml, 'output.musicxml', 'application/xml')}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span>📄</span> Download .musicxml
                <span className="text-xs opacity-70">({(exportResult.musicxml.length / 1024).toFixed(1)} KB)</span>
              </button>
              <button
                onClick={() => downloadFile(exportResult.pdf, 'output.pdf', 'application/pdf')}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span>📋</span> Download .pdf
                <span className="text-xs opacity-70">({(exportResult.pdf.length / 1024).toFixed(1)} KB)</span>
              </button>
            </div>
          </section>
        )}

        {/* Engine Info */}
        <section className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-200">Motor — Módulos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-800 rounded p-3">
              <span className="text-emerald-400 font-bold">INGESTA</span>
              <p className="text-gray-400 mt-1">Parser MIDI binario → JSON interno. Extrae notas, tempo, métrica.</p>
            </div>
            <div className="bg-gray-800 rounded p-3">
              <span className="text-yellow-400 font-bold">CUANTIZACIÓN</span>
              <p className="text-gray-400 mt-1">Snap perfecto al grid. Sin tolerancia al error humano.</p>
            </div>
            <div className="bg-gray-800 rounded p-3">
              <span className="text-blue-400 font-bold">ARMONIZACIÓN</span>
              <p className="text-gray-400 mt-1">Key detection (Krumhansl). Genera acordes + bajo con tonal.js.</p>
            </div>
            <div className="bg-gray-800 rounded p-3">
              <span className="text-purple-400 font-bold">EXPORTACIÓN</span>
              <p className="text-gray-400 mt-1">MIDI binario, MusicXML 4.0, PDF con partitura simplificada.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
