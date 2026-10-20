/**
 * MÓDULO DE CUANTIZACIÓN PERFECTA (EL CHASIS)
 * Mapea cada nota a la rejilla temporal más cercana con precisión matemática exacta.
 */

import {
  type QuantizedMIDI,
  type QuantizedNote,
  type QuantizationConfig,
  type IngestedMIDI,
  type GridDivision,
  MidiEngineError,
} from '../types';

// ============================================================
// CONSTANTES DE GRID
// ============================================================

const GRID_DIVISIONS: Record<GridDivision, number> = {
  whole: 4,        // 4 beats = 1 redonda
  half: 2,         // 2 beats = 1 blanca
  quarter: 1,      // 1 beat = 1 negra
  eighth: 0.5,     // 1/2 beat = 1 corchea
  sixteenth: 0.25, // 1/4 beat = 1 semicorchea
  thirtysecond: 0.125,  // 1/8 beat
  sixtyfourth: 0.0625,  // 1/16 beat
};

// ============================================================
// CONFIGURACIÓN POR DEFECTO
// ============================================================

const DEFAULT_CONFIG: QuantizationConfig = {
  gridDivision: 'sixteenth',
  strength: 1.0,
  removeOverlap: true,
  minimumDuration: 1,
};

// ============================================================
// CLASE PRINCIPAL
// ============================================================

export class Quantizer {
  private config: QuantizationConfig;
  private gridTickSize: number;

  constructor(config: Partial<QuantizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.gridTickSize = 0; // Se calcula en quantize()
  }

  /**
   * Cuantiza completamente un MIDI ingestado.
   * Retorna un QuantizedMIDI con todas las notas alineadas al grid.
   */
  quantize(midi: IngestedMIDI): QuantizedMIDI {
    // Calcular tamaño del grid en ticks
    this.gridTickSize = this.calculateGridTickSize(midi.ticksPerBeat);

    if (this.gridTickSize <= 0) {
      throw new MidiEngineError(
        `Grid tick size inválido: ${this.gridTickSize}`,
        'quantization',
        'INVALID_GRID'
      );
    }

    // Cuantizar cada nota
    let quantizedNotes = midi.notes.map(note => this.quantizeNote(note));

    // Eliminar superposiciones si está configurado
    if (this.config.removeOverlap) {
      quantizedNotes = this.removeOverlaps(quantizedNotes);
    }

    // Filtrar notas con duración menor al mínimo
    quantizedNotes = quantizedNotes.filter(
      n => n.duration >= this.config.minimumDuration
    );

    // Validar resultado
    this.validateQuantization(quantizedNotes);

    return {
      ...midi,
      notes: quantizedNotes,
      gridDivision: this.config.gridDivision,
      gridTickSize: this.gridTickSize,
    };
  }

  // ============================================================
  // MÉTODOS PRIVADOS
  // ============================================================

  /**
   * Calcula el tamaño del grid en ticks basado en la subdivisión.
   */
  private calculateGridTickSize(ticksPerBeat: number): number {
    const beatsPerDivision = GRID_DIVISIONS[this.config.gridDivision];
    return Math.round(ticksPerBeat * beatsPerDivision);
  }

  /**
   * Cuantiza una nota individual: mapea startTime y duration al grid.
   */
  private quantizeNote(note: { pitch: number; velocity: number; startTime: number; duration: number; track: number; channel: number }): QuantizedNote {
    const originalStartTime = note.startTime;
    const originalDuration = note.duration;

    // SNAP del startTime al múltiplo más cercano del grid
    const snappedStart = this.snapToGrid(note.startTime);

    // SNAP de la duration al múltiplo más cercano del grid
    let snappedDuration = this.snapToGrid(note.duration);

    // Asegurar que la duración sea al menos 1 grid unit
    if (snappedDuration < this.gridTickSize) {
      snappedDuration = this.gridTickSize;
    }

    // Calcular error de cuantización
    const quantizationError = Math.abs(snappedStart - originalStartTime);

    return {
      ...note,
      startTime: snappedStart,
      duration: snappedDuration,
      originalStartTime,
      originalDuration,
      quantizationError,
    };
  }

  /**
   * Algoritmo de SNAP: redondea un valor al múltiplo más cercano del grid.
   */
  private snapToGrid(value: number): number {
    const grid = this.gridTickSize;
    const strength = this.config.strength;

    // Múltiplo más cercano del grid
    const nearestMultiple = Math.round(value / grid) * grid;

    // Aplicar fuerza de cuantización
    // strength=1.0 -> snap total, strength=0.5 -> mitad del camino
    const snapped = Math.round(value + (nearestMultiple - value) * strength);

    // Asegurar que sea no-negativo
    return Math.max(0, snapped);
  }

  /**
   * Elimina superposiciones de notas en el mismo canal.
   * Si dos notas se superpan, trunca la primera para que termine cuando empieza la segunda.
   */
  private removeOverlaps(notes: QuantizedNote[]): QuantizedNote[] {
    // Agrupar por canal
    const byChannel = new Map<number, QuantizedNote[]>();
    for (const note of notes) {
      const channel = note.channel;
      if (!byChannel.has(channel)) {
        byChannel.set(channel, []);
      }
      byChannel.get(channel)!.push(note);
    }

    const result: QuantizedNote[] = [];

    for (const [, channelNotes] of byChannel.entries()) {
      // Ordenar por startTime
      channelNotes.sort((a, b) => a.startTime - b.startTime || a.pitch - b.pitch);

      for (let i = 0; i < channelNotes.length; i++) {
        const current = { ...channelNotes[i] };

        // Verificar superposición con la siguiente nota del mismo pitch y canal
        for (let j = i + 1; j < channelNotes.length; j++) {
          const next = channelNotes[j];
          if (next.pitch === current.pitch && next.channel === current.channel) {
            const currentEnd = current.startTime + current.duration;
            if (currentEnd > next.startTime) {
              // Truncar la nota actual
              current.duration = Math.max(
                this.gridTickSize,
                next.startTime - current.startTime
              );
            }
            break; // Solo verificar la siguiente nota del mismo pitch
          }
        }

        result.push(current);
      }
    }

    // Re-ordenar globalmente
    result.sort((a, b) => a.startTime - b.startTime);
    return result;
  }

  /**
   * Valida que la cuantización sea perfecta (todos los valores en el grid).
   */
  private validateQuantization(notes: QuantizedNote[]): void {
    const grid = this.gridTickSize;

    for (const note of notes) {
      if (note.startTime % grid !== 0) {
        throw new MidiEngineError(
          `Nota en pitch ${note.pitch} no está cuantizada correctamente. ` +
          `startTime=${note.startTime}, grid=${grid}`,
          'quantization',
          'VALIDATION_FAILED'
        );
      }
      if (note.duration % grid !== 0 && note.duration !== grid) {
        // Permitir duración = 1 grid unit como mínimo
        throw new MidiEngineError(
          `Duración de nota en pitch ${note.pitch} no es múltiplo del grid. ` +
          `duration=${note.duration}, grid=${grid}`,
          'quantization',
          'DURATION_VALIDATION_FAILED'
        );
      }
    }
  }

  // ============================================================
  // GETTERS
  // ============================================================

  getGridTickSize(): number {
    return this.gridTickSize;
  }

  getConfig(): QuantizationConfig {
    return { ...this.config };
  }
}
