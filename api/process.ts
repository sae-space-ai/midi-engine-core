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
    projectData = harmonizeProject(projectData); // Aquí ocurre la magia de las 16 voces

    return res.status(200).json({
      success: true,
      files: {
        midi: exportToMidi(projectData).toString('base64'),
        musicxml: Buffer.from(exportToMusicXML(projectData)).toString('base64'),
        pdf: exportToPdf(projectData).toString('base64')
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Engine failed', details: error.message });
  }
}
