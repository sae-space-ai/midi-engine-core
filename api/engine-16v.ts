import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ingestMidi } from '../src/engine/ingest';
import { quantizeProject } from '../src/engine/quantize';
import { generate16VoiceHarmony } from '../src/engine/harmonize-16v';
import { exportToMidi, exportToMusicXML, exportToPdf } from '../src/engine/export';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[16V] Request received:', req.method);
  console.log('[16V] Headers:', JSON.stringify(req.headers));
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let fileBuffer: Buffer | null = null;
    
    if (req.body && typeof req.body === 'object') {
      if (req.body.file) {
        fileBuffer = Buffer.from(req.body.file);
      } else if (req.body.data) {
        fileBuffer = Buffer.from(req.body.data);
      } else {
        fileBuffer = Buffer.from(JSON.stringify(req.body));
      }
    } else if (typeof req.body === 'string') {
      fileBuffer = Buffer.from(req.body, 'base64');
    } else if (Buffer.isBuffer(req.body)) {
      fileBuffer = req.body;
    }

    console.log('[16V] File buffer size:', fileBuffer?.length || 0);
    
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ 
        error: 'No file received', 
        details: 'El archivo MIDI no se recibió correctamente.' 
      });
    }

    const header = fileBuffer.slice(0, 4).toString('ascii');
    console.log('[16V] File header:', header);
    
    if (header !== 'MThd') {
      return res.status(400).json({ 
        error: 'Invalid MIDI file', 
        details: `El archivo no es un MIDI válido. Header encontrado: "${header}"` 
      });
    }

    console.log('[16V] Step 1: Ingesting...');
    let projectData = ingestMidi(fileBuffer);
    console.log('[16V] Tracks:', projectData.tracks.length);

    console.log('[16V] Step 2: Quantizing...');
    projectData = quantizeProject(projectData, 16);

    console.log('[16V] Step 3: Generating 16 voices...');
    projectData = generate16VoiceHarmony(projectData);
    console.log('[16V] Final tracks:', projectData.tracks.length);

    console.log('[16V] Step 4: Exporting...');
    const midiBuffer = exportToMidi(projectData);
    const xmlString = exportToMusicXML(projectData);
    const pdfBuffer = exportToPdf(projectData, 'Polifonía 16 Voces');

    console.log('[16V] Success! Sending response...');
    return res.status(200).json({
      success: true,
      toolName: '16-Voice Polyphony',
      files: {
        midi: midiBuffer.toString('base64'),
        musicxml: Buffer.from(xmlString).toString('base64'),
        pdf: pdfBuffer.toString('base64')
      }
    });

  } catch (error: any) {
    console.error('[16V ERROR]', error);
    console.error('[16V ERROR] Stack:', error.stack);
    return res.status(500).json({ 
      error: '16V Engine failed', 
      details: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
