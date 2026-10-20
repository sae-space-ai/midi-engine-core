/**
 * API ROUTE: /api/process
 * Recibe un archivo MIDI, lo procesa por los 4 módulos y devuelve los 3 archivos.
 * 
 * Para Vercel Serverless Functions.
 * 
 * POST /api/process
 * Content-Type: multipart/form-data
 * Body: file (MIDI file)
 * 
 * Response: JSON con URLs de descarga o base64 de los archivos
 */

import { MidiPipeline } from '../../src/engine/pipeline';

// Para Vercel serverless, exportamos un handler
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    // Obtener el buffer del MIDI
    let buffer: Uint8Array;

    if (req.body instanceof Buffer) {
      buffer = new Uint8Array(req.body);
    } else if (typeof req.body === 'string') {
      // Base64 encoded
      const base64Data = req.body.replace(/^data:.*;base64,/, '');
      buffer = new Uint8Array(Buffer.from(base64Data, 'base64'));
    } else if (req.body?.file) {
      buffer = new Uint8Array(req.body.file);
    } else {
      return res.status(400).json({ error: 'No MIDI file provided.' });
    }

    if (buffer.length === 0) {
      return res.status(400).json({ error: 'Empty file provided.' });
    }

    // Verificar que sea un MIDI (magic bytes: MThd)
    if (buffer[0] !== 0x4D || buffer[1] !== 0x54 || buffer[2] !== 0x68 || buffer[3] !== 0x64) {
      return res.status(400).json({ error: 'Invalid MIDI file. Expected MThd header.' });
    }

    // Ejecutar pipeline
    const pipeline = new MidiPipeline({
      quantization: {
        gridDivision: 'sixteenth',
        strength: 1.0,
        removeOverlap: true,
      },
      harmonization: {
        style: 'pop',
        useExtensions: true,
      },
      export: {
        format: 'format1',
        includeOriginal: true,
        includeHarmony: true,
        includeBass: true,
        title: 'Processed MIDI',
      },
    });

    const result = await pipeline.process(buffer);

    // Convertir a base64 para respuesta JSON
    const midiBase64 = Buffer.from(result.midi).toString('base64');
    const musicxmlBase64 = Buffer.from(result.musicxml).toString('base64');
    const pdfBase64 = Buffer.from(result.pdf).toString('base64');

    // Obtener info del análisis
    const state = pipeline.getState();
    const keyInfo = state.harmonized?.harmonicAnalysis.key;

    return res.status(200).json({
      success: true,
      analysis: {
        key: keyInfo?.key || 'Unknown',
        confidence: keyInfo?.confidence || 0,
        tempo: state.harmonized?.tempo || 120,
        timeSignature: state.harmonized?.timeSignature,
        totalNotes: state.harmonized?.notes.length || 0,
        harmonyNotes: state.harmonized?.harmonyNotes.length || 0,
        bassNotes: state.harmonized?.bassNotes.length || 0,
        chords: state.harmonized?.harmonicAnalysis.chords.map(c => c.symbol) || [],
      },
      files: {
        midi: midiBase64,
        musicxml: musicxmlBase64,
        pdf: pdfBase64,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Pipeline error:', message);
    return res.status(500).json({ 
      success: false, 
      error: `Processing failed: ${message}` 
    });
  }
}
