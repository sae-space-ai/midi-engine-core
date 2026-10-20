import { ingestMidi } from '../engine/ingest';
import { quantizeProject } from '../engine/quantize';
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
 * MOTOR 1: CUANTIZADOR
 * Alineación matemática perfecta a rejilla de 1/16.
 */
export function runQuantizeEngine(fileBuffer: Uint8Array): EngineResult {
  console.log('[Quantize Engine] Starting...');
  
  let projectData = ingestMidi(fileBuffer);
  console.log('[Quantize Engine] Ingested tracks:', projectData.tracks.length);
  
  projectData = quantizeProject(projectData, 16);
  console.log('[Quantize Engine] Quantized');
  
  const midi = exportToMidi(projectData);
  const musicxml = exportToMusicXML(projectData);
  const pdf = exportToPdf(projectData, 'Cuantización Perfecta');
  
  console.log('[Quantize Engine] Complete');
  
  return { midi, musicxml, pdf, projectData };
}
