import { runQuantizeEngine } from '../engines/quantize-engine';
import { runHarmonizeEngine } from '../engines/harmonize-engine';
import { run16VEngine } from '../engines/16v-engine';

export interface ProcessedFiles {
  midi: Uint8Array;
  musicxml: string;
  pdf: Uint8Array;
}

export interface EngineResult {
  files: ProcessedFiles;
  projectData: any;
}

/**
 * Ejecuta el motor correspondiente localmente en el navegador.
 * En producción con Vercel, esto haría fetch a /api/engine-*
 */
export async function processWithEngine(
  file: File,
  engineType: 'quantize' | 'harmonize' | '16v'
): Promise<EngineResult> {
  console.log(`[Client] Processing with engine: ${engineType}`);
  console.log(`[Client] File: ${file.name}, size: ${file.size} bytes`);

  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // Validar header MIDI
  if (uint8.length < 4) {
    throw new Error('Archivo demasiado pequeño para ser un MIDI válido');
  }

  const header = String.fromCharCode(uint8[0], uint8[1], uint8[2], uint8[3]);
  if (header !== 'MThd') {
    throw new Error(`Archivo MIDI inválido. Header encontrado: "${header}" (esperado: "MThd")`);
  }

  console.log(`[Client] MIDI header validated: ${header}`);

  // Ejecutar el motor correspondiente
  let result;
  switch (engineType) {
    case 'quantize':
      console.log('[Client] Running Quantize Engine...');
      result = runQuantizeEngine(uint8);
      break;
    case 'harmonize':
      console.log('[Client] Running Harmonize Engine...');
      result = runHarmonizeEngine(uint8);
      break;
    case '16v':
      console.log('[Client] Running 16V Engine...');
      result = run16VEngine(uint8);
      break;
    default:
      throw new Error(`Motor desconocido: ${engineType}`);
  }

  console.log(`[Client] Engine completed successfully`);
  console.log(`[Client] Output tracks: ${result.projectData.tracks.length}`);

  return {
    files: {
      midi: result.midi,
      musicxml: result.musicxml,
      pdf: result.pdf,
    },
    projectData: result.projectData,
  };
}

/**
 * Health check - siempre retorna true en modo local
 */
export async function checkApiHealth(): Promise<boolean> {
  console.log('[Client] Health check: running in local mode');
  return true;
}
