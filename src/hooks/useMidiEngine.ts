import { useState, useCallback } from 'react';
import { ingestMidi } from '../engine/ingest';
import { quantizeProject } from '../engine/quantize';
import { harmonizeProject } from '../engine/harmonize';
import { exportToMidi } from '../engine/export/midi';
import { exportToMusicXML } from '../engine/export/xml';
import { exportToPdf } from '../engine/export/pdf';
import type { ProjectData } from '../engine/types';

export interface ProcessedFiles {
  midi: Uint8Array;
  musicxml: string;
  pdf: Uint8Array;
}

export interface EngineResult {
  files: ProcessedFiles;
  projectData: ProjectData;
}

export function useMidiEngine() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<EngineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const runEngine = useCallback(async (file: File) => {
    setStatus('processing');
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      // Leer archivo como ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      setProgress(10);

      // Verificar magic bytes MIDI (MThd)
      if (uint8[0] !== 0x4D || uint8[1] !== 0x54 || uint8[2] !== 0x68 || uint8[3] !== 0x64) {
        throw new Error('Archivo MIDI inválido. Se esperaba header MThd.');
      }

      // STAGE 1: Ingesta
      let projectData = ingestMidi(uint8);
      setProgress(30);

      if (projectData.tracks.length === 0) {
        throw new Error('El archivo MIDI no contiene notas válidas.');
      }

      // STAGE 2: Cuantización
      projectData = quantizeProject(projectData, 16);
      setProgress(50);

      // STAGE 3: Armonización (16 voces)
      projectData = harmonizeProject(projectData);
      setProgress(75);

      // STAGE 4: Exportación
      const midi = exportToMidi(projectData);
      const musicxml = exportToMusicXML(projectData);
      const pdf = exportToPdf(projectData);
      setProgress(100);

      setResult({
        files: { midi, musicxml, pdf },
        projectData
      });
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  return { status, result, error, progress, runEngine, reset };
}
