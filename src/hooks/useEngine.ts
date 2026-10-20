import { useState, useCallback } from 'react';
import type { EngineResult } from '../engines/quantize-engine';

export type EngineType = 'quantize' | 'harmonize' | '16v';

export function useEngine(engineType: EngineType) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<EngineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runEngine = useCallback(async (file: File) => {
    console.log(`[${engineType}] Starting engine for file:`, file.name);
    setStatus('processing');
    setError(null);
    setResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // Validar header MIDI
      if (uint8.length < 4) {
        throw new Error('Archivo demasiado pequeño');
      }
      
      const header = String.fromCharCode(uint8[0], uint8[1], uint8[2], uint8[3]);
      if (header !== 'MThd') {
        throw new Error(`Archivo MIDI inválido. Header: "${header}"`);
      }

      // Importar dinámicamente el motor correspondiente
      let engineResult: EngineResult;
      
      switch (engineType) {
        case 'quantize':
          const { runQuantizeEngine } = await import('../engines/quantize-engine');
          engineResult = runQuantizeEngine(uint8);
          break;
        case 'harmonize':
          const { runHarmonizeEngine } = await import('../engines/harmonize-engine');
          engineResult = runHarmonizeEngine(uint8);
          break;
        case '16v':
          const { run16VEngine } = await import('../engines/16v-engine');
          engineResult = run16VEngine(uint8);
          break;
        default:
          throw new Error(`Motor desconocido: ${engineType}`);
      }

      setResult(engineResult);
      setStatus('success');
      console.log(`[${engineType}] Complete`);
      
    } catch (err) {
      let errorMessage = 'Error desconocido';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        console.error(`[${engineType}] Error:`, err.message);
        console.error(`[${engineType}] Stack:`, err.stack);
      } else {
        console.error(`[${engineType}] Error:`, err);
      }
      
      setError(errorMessage);
      setStatus('error');
    }
  }, [engineType]);

  const reset = useCallback(() => {
    console.log(`[${engineType}] Resetting`);
    setStatus('idle');
    setResult(null);
    setError(null);
  }, [engineType]);

  return { status, result, error, runEngine, reset };
}
