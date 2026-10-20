import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ingestMidi } from '../src/engine/ingest';
import { quantizeProject } from '../src/engine/quantize';
import { harmonizeProject } from '../src/engine/harmonize';
import { exportToMidi } from '../src/engine/export/midi';
import { exportToMusicXML } from '../src/engine/export/xml';
import { exportToPdf } from '../src/engine/export/pdf';

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (!buffer || buffer.length === 0 || buffer.slice(0, 4).toString('ascii') !== 'MThd') {
      return res.status(400).json({ error: 'Invalid or empty MIDI file' });
    }

    let projectData = ingestMidi(buffer);
    projectData = quantizeProject(projectData, 16);
    projectData = harmonizeProject(projectData);

    const midiBuffer = exportToMidi(projectData);
    const xmlString = exportToMusicXML(projectData);
    const pdfBuffer = exportToPdf(projectData, 'Armonización Básica');

    return res.status(200).json({
      success: true,
      toolName: 'Harmonizer',
      files: {
        midi: Buffer.from(midiBuffer).toString('base64'),
        musicxml: Buffer.from(xmlString).toString('base64'),
        pdf: Buffer.from(pdfBuffer).toString('base64')
      }
    });
  } catch (error: any) {
    console.error('[Harmonize Engine Error]', error);
    return res.status(500).json({ 
      error: 'Harmonize Engine failed', 
      details: error.message 
    });
  }
}
