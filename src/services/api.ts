export interface ProcessedFiles { midi: string; musicxml: string; pdf: string; }
export async function processMidi(file: File): Promise<ProcessedFiles> {
  const response = await fetch('/api/process', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file });
  if (!response.ok) throw new Error((await response.json()).details || 'Engine failed');
  const data = await response.json();
  if (!data.success) throw new Error('Unsuccessful status');
  return data.files;
}
