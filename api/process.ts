import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ingestMidi } from '../src/engine/ingest';
import { quantizeProject } from '../src/engine/quantize';
import { harmonizeProject } from '../src/engine/harmonize';
import { exportToMidi } from '../src/engine/export/midi';
import { exportToMusicXML } from '../src/engine/export/xml';
import { exportToPdf } from '../src/engine/export/pdf';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const buffer = Buffer.from(req.body);
    if (!buffer || buffer.length === 0) return res.status(400).json({ error: 'Empty MIDI buffer' });

    let projectData = ingestMidi(buffer);
    projectData = quantizeProject(projectData, 16);
    projectData = harmonizeProject(projectData);

    const midiBuffer = exportToMidi(projectData);
    const xmlString = exportToMusicXML(projectData);
    const pdfBuffer = exportToPdf(projectData);

    return res.status(200).json({
      success: true,
      files: {
        midi: midiBuffer.toString('base64'),
        musicxml: Buffer.from(xmlString).toString('base64'),
        pdf: pdfBuffer.toString('base64')
      }
    });
  } catch (error: any) {
    console.error('[Engine Error]', error);
    return res.status(500).json({ error: 'Engine processing failed', details: error.message });
  }
}
