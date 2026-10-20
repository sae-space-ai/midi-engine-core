/**
 * MÓDULO DE INGESTA Y PARSING MIDI
 * Lee un buffer binario MIDI y lo convierte a la estructura JSON interna.
 */

import { parseMidi, type MidiData, type MidiEvent } from 'midi-file';
import { 
  type IngestedMIDI, 
  type RawNote, 
  type TimeSignature,
  MidiEngineError 
} from '../types';

// ============================================================
// CONSTANTES
// ============================================================

const DEFAULT_TEMPO = 120;
const DEFAULT_TIME_SIGNATURE: TimeSignature = { numerator: 4, denominator: 4 };
const DEFAULT_TICKS_PER_BEAT = 480;

// ============================================================
// INTERFAZ PÚBLICA
// ============================================================

export class MidiParser {
  /**
   * Parsea un buffer MIDI y retorna la estructura interna JSON.
   */
  static parse(buffer: ArrayBuffer | Uint8Array): IngestedMIDI {
    try {
      const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
      const midiData = parseMidi(uint8);
      
      if (!midiData || !midiData.tracks || midiData.tracks.length === 0) {
        throw new MidiEngineError(
          'El archivo MIDI no contiene tracks válidos.',
          'ingestion',
          'EMPTY_MIDI'
        );
      }

      const ticksPerBeat = midiData.header?.ticksPerBeat ?? DEFAULT_TICKS_PER_BEAT;
      const format = midiData.header?.format ?? 1;
      
      // Extraer tempo y time signature de los eventos meta
      const tempo = this.extractTempo(midiData);
      const timeSignature = this.extractTimeSignature(midiData);
      const trackNames = this.extractTrackNames(midiData);
      
      // Extraer notas de todos los tracks
      const notes = this.extractNotes(midiData, ticksPerBeat);
      
      // Calcular total de ticks
      const totalTicks = this.calculateTotalTicks(notes);

      return {
        format,
        ticksPerBeat,
        tempo,
        timeSignature,
        notes,
        totalTicks,
        trackNames,
      };
    } catch (error) {
      if (error instanceof MidiEngineError) throw error;
      throw new MidiEngineError(
        `Error al parsear el archivo MIDI: ${(error as Error).message}`,
        'ingestion',
        'PARSE_ERROR'
      );
    }
  }

  // ============================================================
  // MÉTODOS PRIVADOS
  // ============================================================

  /**
   * Extrae el tempo (BPM) de los eventos meta del MIDI.
   * Busca el primer evento de tempo; si no hay, usa 120 BPM.
   */
  private static extractTempo(midiData: MidiData): number {
    for (const track of midiData.tracks) {
      for (const event of track) {
        if (event.type === 'setTempo' && 'microsecondsPerBeat' in event) {
          const usPerBeat = (event as any).microsecondsPerBeat;
          return Math.round(60000000 / usPerBeat);
        }
      }
    }
    return DEFAULT_TEMPO;
  }

  /**
   * Extrae la métrica (time signature) del MIDI.
   */
  private static extractTimeSignature(midiData: MidiData): TimeSignature {
    for (const track of midiData.tracks) {
      for (const event of track) {
        if (event.type === 'timeSignature') {
          const tsEvent = event as any;
          return {
            numerator: tsEvent.numerator ?? 4,
            denominator: Math.pow(2, tsEvent.denominator ?? 2),
          };
        }
      }
    }
    return DEFAULT_TIME_SIGNATURE;
  }

  /**
   * Extrae los nombres de los tracks.
   */
  private static extractTrackNames(midiData: MidiData): string[] {
    return midiData.tracks.map((track, index) => {
      for (const event of track) {
        if (event.type === 'trackName') {
          return (event as any).text ?? `Track ${index}`;
        }
      }
      return `Track ${index}`;
    });
  }

  /**
   * Extrae todas las notas (noteOn/noteOff) de todos los tracks.
   * Convierte pares noteOn/noteOff en notas con startTime y duration.
   */
  private static extractNotes(midiData: MidiData, ticksPerBeat: number): RawNote[] {
    const notes: RawNote[] = [];

    midiData.tracks.forEach((track, trackIndex) => {
      // Mapa de notas activas: key = "channel_pitch"
      const activeNotes = new Map<string, { startTime: number; velocity: number }>();
      let absoluteTime = 0;

      for (const event of track) {
        absoluteTime += event.deltaTime ?? 0;

        if (event.type === 'noteOn' && 'noteNumber' in event) {
          const noteEvent = event as any;
          const pitch = noteEvent.noteNumber;
          const velocity = noteEvent.velocity;
          const channel = noteEvent.channel ?? 0;

          if (velocity === 0) {
            // noteOn con velocity 0 = noteOff
            this.closeNote(activeNotes, notes, channel, pitch, absoluteTime, trackIndex);
          } else {
            // Abrir nueva nota
            const key = `${channel}_${pitch}`;
            activeNotes.set(key, { startTime: absoluteTime, velocity });
          }
        } else if (event.type === 'noteOff' && 'noteNumber' in event) {
          const noteEvent = event as any;
          const pitch = noteEvent.noteNumber;
          const channel = noteEvent.channel ?? 0;
          this.closeNote(activeNotes, notes, channel, pitch, absoluteTime, trackIndex);
        }
      }

      // Cerrar notas que nunca tuvieron noteOff (usar el último tiempo como fin)
      for (const [key, noteData] of activeNotes.entries()) {
        const [channel, pitchStr] = key.split('_');
        notes.push({
          pitch: parseInt(pitchStr),
          velocity: noteData.velocity,
          startTime: noteData.startTime,
          duration: Math.max(absoluteTime - noteData.startTime, ticksPerBeat / 16),
          track: trackIndex,
          channel: parseInt(channel),
        });
      }
    });

    // Ordenar por startTime
    notes.sort((a, b) => a.startTime - b.startTime);
    return notes;
  }

  /**
   * Cierra una nota activa y la agrega al array de notas.
   */
  private static closeNote(
    activeNotes: Map<string, { startTime: number; velocity: number }>,
    notes: RawNote[],
    channel: number,
    pitch: number,
    endTime: number,
    trackIndex: number
  ): void {
    const key = `${channel}_${pitch}`;
    const noteData = activeNotes.get(key);
    if (noteData) {
      const duration = endTime - noteData.startTime;
      if (duration > 0) {
        notes.push({
          pitch,
          velocity: noteData.velocity,
          startTime: noteData.startTime,
          duration,
          track: trackIndex,
          channel,
        });
      }
      activeNotes.delete(key);
    }
  }

  /**
   * Calcula el tick total (final de la última nota).
   */
  private static calculateTotalTicks(notes: RawNote[]): number {
    if (notes.length === 0) return 0;
    return Math.max(...notes.map(n => n.startTime + n.duration));
  }
}

// ============================================================
// VALIDACIÓN
// ============================================================

export function validateIngestedMIDI(midi: IngestedMIDI): boolean {
  if (midi.notes.length === 0) {
    throw new MidiEngineError(
      'El MIDI no contiene notas válidas.',
      'ingestion',
      'NO_NOTES'
    );
  }
  if (midi.ticksPerBeat <= 0) {
    throw new MidiEngineError(
      'Ticks per beat inválido.',
      'ingestion',
      'INVALID_PPQN'
    );
  }
  return true;
}
