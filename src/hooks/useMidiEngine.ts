import { useState } from 'react';
import { processMidi, ProcessedFiles } from '../services/api';
export function useMidiEngine() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [files, setFiles] = useState<ProcessedFiles | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runEngine = async (file: File) => {
    setStatus('processing'); setError(null); setFiles(null);
    try { setFiles(await processMidi(file)); setStatus('success'); } 
    catch (err: any) { setError(err.message); setStatus('error'); }
  };
  const reset = () => { setStatus('idle'); setFiles(null); setError(null); };
  return { status, files, error, runEngine, reset };
}
