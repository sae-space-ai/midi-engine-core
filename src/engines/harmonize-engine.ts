import { ingestMidi } from '../engine/ingest';
import { quantizeProject } from '../engine/quantize';
import { harmonizeProject } from '../engine/harmonize';
import { exportToMidi } from '../engine/export/midi';
import { exportToMusicXML } from '../engine/export/xml';
import { exportToPdf } from '../engine/export/pdf';
import type { ProjectData } from '../engine/types';

export interface EngineResult {
  midi: Uint8Array;
  musicxml: string;
  pdf: Uint8Array;
  projectData: ProjectData;
}

/**
 * MOTOR 2: ARMONIZADOR
 * Generación de bajo y acordes funcionales basados en la tonalidad detectada.
 */
export function runHarmonizeEngine(fileBuffer: Uint8Array): EngineResult {
  console.log('[Harmonize Engine] Starting...');
  
  let projectData = ingestMidi(fileBuffer);
  console.log('[Harmonize Engine] Ingested tracks:', projectData.tracks.length);
  
  projectData = quantizeProject(projectData, 16);
  console.log('[Harmonize Engine] Quantized');
  
  projectData = harmonizeProject(projectData);
  console.log('[Harmonize Engine] Harmonized, tracks:', projectData.tracks.length);
  
  const midi = exportToMidi(projectData);
  const musicxml = exportToMusicXML(projectData);
  const pdf = exportToPdf(projectData, 'Armonización Básica');
  
  console.log('[Harmonize Engine] Complete');
  
  return { midi, musicxml, pdf, projectData };
}
