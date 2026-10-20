import { useState } from 'react';
import { processWithEngine, EngineResult } from '../services/api';

export type EngineType = 'quantize' | 'harmonize' | '16v';

export function useEngine(engineType: EngineType) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<EngineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runEngine = async (file: File) => {
    console.log(`[Hook] Starting engine: ${engineType}`);
    setStatus('processing');
    setError(null);
    setResult(null);

    try {
      const engineResult = await processWithEngine(file, engineType);
      setResult(engineResult);
      setStatus('success');
      console.log(`[Hook] Engine ${engineType} completed successfully`);
    } catch (err: any) {
      console.error(`[Hook] Engine ${engineType} failed:`, err);
      setError(err.message || 'Error desconocido');
      setStatus('error');
    }
  };

  const reset = () => {
    console.log(`[Hook] Resetting engine: ${engineType}`);
    setStatus('idle');
    setResult(null);
    setError(null);
  };

  return { status, result, error, runEngine, reset };
}
