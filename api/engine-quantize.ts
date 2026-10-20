import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ingestMidi } from '../src/engine/ingest';
import { quantizeProject } from '../src/engine/quantize';
import { exportToMidi, exportToMusicXML, exportToPdf } from '../src/engine/export';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Quantize] Request received:', req.method);
  console.log('[Quantize] Headers:', JSON.stringify(req.headers));
  console.log('[Quantize] Body type:', typeof req.body);
  
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

    console.log('[Quantize] File buffer size:', fileBuffer?.length || 0);
    
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ 
        error: 'No file received', 
        details: 'El archivo MIDI no se recibió correctamente. Verifica el formato de envío.' 
      });
    }

    const header = fileBuffer.slice(0, 4).toString('ascii');
    console.log('[Quantize] File header:', header);
    
    if (header !== 'MThd') {
      return res.status(400).json({ 
        error: 'Invalid MIDI file', 
        details: `El archivo no es un MIDI válido. Header encontrado: "${header}"` 
      });
    }

    console.log('[Quantize] Step 1: Ingesting...');
    let projectData = ingestMidi(fileBuffer);
    console.log('[Quantize] Tracks:', projectData.tracks.length);

    console.log('[Quantize] Step 2: Quantizing...');
    projectData = quantizeProject(projectData, 16);
    console.log('[Quantize] Quantized notes:', projectData.tracks[0]?.notes.length || 0);

    console.log('[Quantize] Step 3: Exporting...');
    const midiBuffer = exportToMidi(projectData);
    const xmlString = exportToMusicXML(projectData);
    const pdfBuffer = exportToPdf(projectData, 'Cuantización Perfecta');

    console.log('[Quantize] Success! Sending response...');
    return res.status(200).json({
      success: true,
      toolName: 'Quantizer',
      files: {
        midi: midiBuffer.toString('base64'),
        musicxml: Buffer.from(xmlString).toString('base64'),
        pdf: pdfBuffer.toString('base64')
      }
    });

  } catch (error: any) {
    console.error('[Quantize ERROR]', error);
    console.error('[Quantize ERROR] Stack:', error.stack);
    return res.status(500).json({ 
      error: 'Quantize Engine failed', 
      details: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
