import { ingestMidi } from '../engine/ingest';
import { quantizeProject } from '../engine/quantize';
import { generate16VoiceHarmony } from '../engine/harmonize-16v';
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
 * MOTOR 3: POLIFONÍA 16V
 * Expansión algorítmica a 16 voces independientes con voice-leading espectral.
 */
export function run16VEngine(fileBuffer: Uint8Array): EngineResult {
  console.log('[16V Engine] Starting...');
  
  let projectData = ingestMidi(fileBuffer);
  console.log('[16V Engine] Ingested tracks:', projectData.tracks.length);
  
  projectData = quantizeProject(projectData, 16);
  console.log('[16V Engine] Quantized');
  
  projectData = generate16VoiceHarmony(projectData);
  console.log('[16V Engine] Generated 16 voices, tracks:', projectData.tracks.length);
  
  const midi = exportToMidi(projectData);
  const musicxml = exportToMusicXML(projectData);
  const pdf = exportToPdf(projectData, 'Polifonía 16 Voces');
  
  console.log('[16V Engine] Complete');
  
  return { midi, musicxml, pdf, projectData };
}
