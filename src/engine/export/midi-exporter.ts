/**
 * MÓDULO DE EXPORTACIÓN MIDI
 * Reconstruye un buffer binario MIDI estándar desde el JSON procesado.
 */

import { writeMidi } from 'midi-file';
import {
  type HarmonizedMIDI,
  type QuantizedNote,
  type ExportConfig,
  MidiEngineError,
} from '../types';

// ============================================================
// CONFIGURACIÓN POR DEFECTO
// ============================================================

const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  format: 'format1',
  includeOriginal: true,
  includeHarmony: true,
  includeBass: true,
  title: 'MIDI Engine Output',
  composer: 'MIDI Engine',
};

// ============================================================
// CLASE EXPORTADORA
// ============================================================

export class MidiExporter {
  private config: ExportConfig;

  constructor(config: Partial<ExportConfig> = {}) {
    this.config = { ...DEFAULT_EXPORT_CONFIG, ...config };
  }

  /**
   * Exporta el MIDI procesado como buffer binario Uint8Array.
   */
  export(harmonized: HarmonizedMIDI): Uint8Array {
    try {
      const midiData = this.buildMidiData(harmonized);
      const buffer = writeMidi(midiData as any);
      return new Uint8Array(buffer);
    } catch (error) {
      throw new MidiEngineError(
        `Error al exportar MIDI: ${(error as Error).message}`,
        'export',
        'MIDI_EXPORT_ERROR'
      );
    }
  }

  // ============================================================
  // CONSTRUCCIÓN DEL MIDI
  // ============================================================

  private buildMidiData(harmonized: HarmonizedMIDI): any {
    const tracks: any[][] = [];

    // Track 0: Tempo y Time Signature (meta track)
    tracks.push(this.buildMetaTrack(harmonized));

    // Track 1: Melodía original
    if (this.config.includeOriginal) {
      const melodyNotes = harmonized.notes.filter(n => n.track >= 0);
      tracks.push(this.buildNoteTrack(melodyNotes, 0));
    }

    // Track 2: Armonía
    if (this.config.includeHarmony && harmonized.harmonyNotes.length > 0) {
      tracks.push(this.buildNoteTrack(harmonized.harmonyNotes, 1));
    }

    // Track 3: Bajo
    if (this.config.includeBass && harmonized.bassNotes.length > 0) {
      tracks.push(this.buildNoteTrack(harmonized.bassNotes, 2));
    }

    return {
      header: {
        format: this.config.format === 'format0' ? 0 : 1,
        numTracks: tracks.length,
        ticksPerBeat: harmonized.ticksPerBeat,
      },
      tracks,
    };
  }

  private buildMetaTrack(harmonized: HarmonizedMIDI): any[] {
    const events: any[] = [];
    const microsecondsPerBeat = Math.round(60000000 / harmonized.tempo);

    events.push({
      deltaTime: 0,
      type: 'setTempo',
      microsecondsPerBeat,
    });

    events.push({
      deltaTime: 0,
      type: 'timeSignature',
      numerator: harmonized.timeSignature.numerator,
      denominator: Math.log2(harmonized.timeSignature.denominator),
      metronome: 24,
      thirtyseconds: 8,
    });

    events.push({
      deltaTime: 0,
      type: 'trackName',
      text: this.config.title,
    });

    events.push({
      deltaTime: harmonized.totalTicks,
      type: 'endOfTrack',
    });

    return events;
  }

  private buildNoteTrack(notes: QuantizedNote[], trackChannel: number): any[] {
    const events: any[] = [];

    const trackNames = ['Melody', 'Harmony', 'Bass'];
    events.push({
      deltaTime: 0,
      type: 'trackName',
      text: trackNames[trackChannel] || `Track ${trackChannel}`,
    });

    const programs = [0, 0, 33];
    events.push({
      deltaTime: 0,
      type: 'programChange',
      channel: trackChannel,
      programNumber: programs[trackChannel] || 0,
    });

    // Generar eventos de nota ordenados por tiempo
    const noteEvents: Array<{ time: number; event: any }> = [];

    for (const note of notes) {
      noteEvents.push({
        time: note.startTime,
        event: {
          deltaTime: 0,
          type: 'noteOn',
          channel: trackChannel,
          noteNumber: note.pitch,
          velocity: note.velocity,
        },
      });

      noteEvents.push({
        time: note.startTime + note.duration,
        event: {
          deltaTime: 0,
          type: 'noteOff',
          channel: trackChannel,
          noteNumber: note.pitch,
          velocity: 0,
        },
      });
    }

    // Ordenar por tiempo
    noteEvents.sort((a, b) => a.time - b.time);

    // Convertir a deltaTimes
    let lastTime = 0;
    for (const ne of noteEvents) {
      ne.event.deltaTime = ne.time - lastTime;
      lastTime = ne.time;
      events.push(ne.event);
    }

    events.push({
      deltaTime: 0,
      type: 'endOfTrack',
    });

    return events;
  }
}
