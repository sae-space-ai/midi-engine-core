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
    console.log('[Engine] Starting processing for file:', file.name, 'size:', file.size);
    setStatus('processing');
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      // Leer archivo como ArrayBuffer
      console.log('[Engine] Reading file...');
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      console.log('[Engine] File read, bytes:', uint8.length);
      setProgress(10);

      // Verificar magic bytes MIDI (MThd)
      if (uint8.length < 4) {
        throw new Error('Archivo demasiado pequeño para ser un MIDI válido');
      }
      
      const header = String.fromCharCode(uint8[0], uint8[1], uint8[2], uint8[3]);
      console.log('[Engine] File header:', header);
      
      if (header !== 'MThd') {
        throw new Error(`Archivo MIDI inválido. Header encontrado: "${header}" (esperado: "MThd")`);
      }

      // STAGE 1: Ingesta
      console.log('[Engine] Stage 1: Ingesting MIDI...');
      let projectData = ingestMidi(uint8);
      console.log('[Engine] Ingested tracks:', projectData.tracks.length);
      setProgress(30);

      if (projectData.tracks.length === 0) {
        throw new Error('El archivo MIDI no contiene notas válidas');
      }

      // STAGE 2: Cuantización
      console.log('[Engine] Stage 2: Quantizing...');
      projectData = quantizeProject(projectData, 16);
      console.log('[Engine] Quantized notes in track 0:', projectData.tracks[0]?.notes.length || 0);
      setProgress(50);

      // STAGE 3: Armonización (16 voces)
      console.log('[Engine] Stage 3: Harmonizing (16 voices)...');
      projectData = harmonizeProject(projectData);
      console.log('[Engine] Total tracks after harmonization:', projectData.tracks.length);
      setProgress(75);

      // STAGE 4: Exportación
      console.log('[Engine] Stage 4: Exporting formats...');
      
      console.log('[Engine] Exporting MIDI...');
      const midi = exportToMidi(projectData);
      console.log('[Engine] MIDI exported, size:', midi.length);
      
      console.log('[Engine] Exporting MusicXML...');
      const musicxml = exportToMusicXML(projectData);
      console.log('[Engine] MusicXML exported, length:', musicxml.length);
      
      console.log('[Engine] Exporting PDF...');
      const pdf = exportToPdf(projectData);
      console.log('[Engine] PDF exported, size:', pdf.length);
      
      setProgress(100);

      const engineResult: EngineResult = {
        files: { midi, musicxml, pdf },
        projectData
      };

      setResult(engineResult);
      setStatus('success');
      console.log('[Engine] Processing completed successfully');
      
    } catch (err) {
      // Manejo robusto de errores
      let errorMessage = 'Error desconocido';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        console.error('[Engine] Error:', err.message);
        console.error('[Engine] Stack:', err.stack);
      } else if (typeof err === 'string') {
        errorMessage = err;
        console.error('[Engine] Error (string):', err);
      } else if (err && typeof err === 'object') {
        errorMessage = JSON.stringify(err);
        console.error('[Engine] Error (object):', err);
      } else {
        console.error('[Engine] Error (unknown):', err);
      }
      
      setError(errorMessage);
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    console.log('[Engine] Resetting');
    setStatus('idle');
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  return { status, result, error, progress, runEngine, reset };
}
