/**
 * MÓDULO DE ARMONIZACIÓN (EL TURBO)
 * Detecta tonalidad, genera acordes y línea de bajo usando tonal.js
 */

import {
  type QuantizedMIDI,
  type HarmonizedMIDI,
  type HarmonicAnalysis,
  type KeyDetection,
  type ChordSegment,
  type BassNote,
  type QuantizedNote,
  MidiEngineError,
} from '../types';

// Importaciones de tonal.js (paquete unificado)
import { Note, Chord, Scale, Interval } from 'tonal';

// ============================================================
// CONFIGURACIÓN DE ARMONIZACIÓN
// ============================================================

export interface HarmonizationConfig {
  style: 'pop' | 'jazz' | 'classical' | 'minimal';
  bassOctave: number;       // Octava del bajo (2-4)
  chordDensity: number;     // Acordes por compás (1-4)
  useExtensions: boolean;   // Usar 7mas, 9nas, etc.
  voicingSpread: number;    // Separación entre notas del acorde (semitonos)
}

const DEFAULT_HARM_CONFIG: HarmonizationConfig = {
  style: 'pop',
  bassOctave: 3,
  chordDensity: 1,
  useExtensions: true,
  voicingSpread: 12,
};

// ============================================================
// PROGRESIONES POR ESTILO
// ============================================================

const STYLE_PROGRESSIONS: Record<string, string[][]> = {
  pop: [
    ['I', 'V', 'vi', 'IV'],
    ['I', 'IV', 'V', 'I'],
    ['vi', 'IV', 'I', 'V'],
    ['I', 'vi', 'IV', 'V'],
  ],
  jazz: [
    ['ii', 'V', 'I', 'vi'],
    ['I', 'vi', 'ii', 'V'],
    ['iii', 'VI', 'ii', 'V'],
    ['I', 'IV', 'vii', 'III'],
  ],
  classical: [
    ['I', 'IV', 'V', 'I'],
    ['I', 'vi', 'IV', 'V'],
    ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'],
  ],
  minimal: [
    ['I', 'IV'],
    ['I', 'V'],
    ['i', 'VII'],
  ],
};

// ============================================================
// CLASE PRINCIPAL
// ============================================================

export class Harmonizer {
  private config: HarmonizationConfig;

  constructor(config: Partial<HarmonizationConfig> = {}) {
    this.config = { ...DEFAULT_HARM_CONFIG, ...config };
  }

  /**
   * Armoniza un MIDI cuantizado: detecta tonalidad, genera acordes y bajo.
   */
  harmonize(midi: QuantizedMIDI): HarmonizedMIDI {
    if (midi.notes.length === 0) {
      throw new MidiEngineError(
        'No hay notas para armonizar.',
        'harmonization',
        'NO_NOTES'
      );
    }

    // Paso 1: Detectar tonalidad
    const key = this.detectKey(midi.notes, midi.ticksPerBeat);

    // Paso 2: Generar segmentos de acordes
    const chords = this.generateChordProgression(midi, key);

    // Paso 3: Generar línea de bajo
    const bassLine = this.generateBassLine(chords, midi);

    // Paso 4: Generar notas de armonía (voicings)
    const harmonyNotes = this.generateHarmonyVoicings(chords, midi);

    // Paso 5: Construir análisis armónico
    const harmonicAnalysis: HarmonicAnalysis = {
      key,
      chords,
      bassLine,
      melodyNotes: midi.notes as QuantizedNote[],
    };

    // Paso 6: Convertir a QuantizedNotes para bass y harmony
    const bassNotesQuantized = this.bassToQuantizedNotes(bassLine);

    return {
      ...midi,
      harmonicAnalysis,
      harmonyNotes: harmonyNotes,
      bassNotes: bassNotesQuantized,
    };
  }

  // ============================================================
  // DETECCIÓN DE TONALIDAD
  // ============================================================

  private detectKey(notes: QuantizedNote[], _ticksPerBeat: number): KeyDetection {
    // Recopilar pitch classes con duración ponderada
    const pcDurations = new Array(12).fill(0);
    let totalDuration = 0;

    for (const note of notes) {
      const pc = note.pitch % 12;
      const weight = note.duration * (note.velocity / 127);
      pcDurations[pc] += weight;
      totalDuration += weight;
    }

    if (totalDuration === 0) {
      throw new MidiEngineError(
        'No se pudo detectar tonalidad: notas sin duración.',
        'harmonization',
        'KEY_DETECTION_FAILED'
      );
    }

    // Normalizar
    const pcProfile = pcDurations.map(d => d / totalDuration);

    // Perfiles de Krumhansl-Kessler
    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

    const normalizeProfile = (p: number[]): number[] => {
      const sum = p.reduce((a: number, b: number) => a + b, 0);
      return p.map(v => v / sum);
    };

    const majorNorm = normalizeProfile(majorProfile);
    const minorNorm = normalizeProfile(minorProfile);

    let bestCorrelation = -Infinity;
    let bestKey = 'C';
    let bestMode: 'major' | 'minor' = 'major';

    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    for (let shift = 0; shift < 12; shift++) {
      const rotatedMajor = this.rotateArray(majorNorm, shift);
      const rotatedMinor = this.rotateArray(minorNorm, shift);

      const corrMajor = this.pearsonCorrelation(pcProfile, rotatedMajor);
      const corrMinor = this.pearsonCorrelation(pcProfile, rotatedMinor);

      if (corrMajor > bestCorrelation) {
        bestCorrelation = corrMajor;
        bestKey = noteNames[shift];
        bestMode = 'major';
      }
      if (corrMinor > bestCorrelation) {
        bestCorrelation = corrMinor;
        bestKey = noteNames[shift];
        bestMode = 'minor';
      }
    }

    const confidence = Math.min(1, Math.max(0, (bestCorrelation + 1) / 2));
    const scale = bestMode === 'major' ? 'major' : 'minor';

    return {
      key: bestKey + (bestMode === 'minor' ? 'm' : ''),
      scale,
      root: bestKey,
      confidence,
      mode: bestMode === 'major' ? 'major' : 'minor',
    };
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const meanX = x.reduce((a: number, b: number) => a + b, 0) / n;
    const meanY = y.reduce((a: number, b: number) => a + b, 0) / n;

    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : num / den;
  }

  private rotateArray(arr: number[], shift: number): number[] {
    const n = arr.length;
    return arr.map((_: number, i: number) => arr[(i - shift + n * 100) % n]);
  }

  // ============================================================
  // GENERACIÓN DE PROGRESIÓN DE ACORDES
  // ============================================================

  private generateChordProgression(midi: QuantizedMIDI, key: KeyDetection): ChordSegment[] {
    const beatsPerMeasure = midi.timeSignature.numerator;
    const ticksPerBeat = midi.ticksPerBeat;
    const ticksPerMeasure = beatsPerMeasure * ticksPerBeat;

    // Seleccionar progresión según estilo
    const progressions = STYLE_PROGRESSIONS[this.config.style];
    const progression = progressions[Math.floor(Math.random() * progressions.length)];

    // Obtener notas de la escala
    const scaleName = key.mode === 'major' ? 'major' : 'minor';
    const scaleData = Scale.get(`${key.root} ${scaleName}`);
    const scaleNotes = scaleData.notes;

    // Mapear grados romanos a acordes
    const degreeToChord = (degree: string): { root: string; symbol: string; scaleDegree: number } => {
      const degreeMap: Record<string, { index: number; quality: string }> = {
        'I': { index: 0, quality: 'maj7' },
        'ii': { index: 1, quality: 'm7' },
        'iii': { index: 2, quality: 'm7' },
        'IV': { index: 3, quality: 'maj7' },
        'V': { index: 4, quality: '7' },
        'vi': { index: 5, quality: 'm7' },
        'vii': { index: 6, quality: 'm7b5' },
        'i': { index: 0, quality: 'm7' },
        'ii°': { index: 1, quality: 'm7b5' },
        'III': { index: 2, quality: 'maj7' },
        'iv': { index: 3, quality: 'm7' },
        'v': { index: 4, quality: 'm7' },
        'VI': { index: 5, quality: 'maj7' },
        'VII': { index: 6, quality: '7' },
      };

      const mapping = degreeMap[degree] || degreeMap['I'];
      const rootNote = scaleNotes[mapping.index] || key.root;
      const quality = this.config.useExtensions 
        ? mapping.quality 
        : mapping.quality.replace('7', '').replace('b5', '');
      
      return {
        root: rootNote,
        symbol: `${rootNote}${quality}`,
        scaleDegree: mapping.index + 1,
      };
    };

    // Generar segmentos de acordes
    const chords: ChordSegment[] = [];
    let currentTick = 0;
    let progIndex = 0;

    while (currentTick < midi.totalTicks) {
      const degree = progression[progIndex % progression.length];
      const chordInfo = degreeToChord(degree);
      const chordDuration = ticksPerMeasure;

      const chordNotes = this.getChordVoicing(chordInfo.root, chordInfo.symbol);
      const harmonicFunction = this.getHarmonicFunction(chordInfo.scaleDegree, key.mode as 'major' | 'minor');

      chords.push({
        startTime: currentTick,
        duration: chordDuration,
        symbol: chordInfo.symbol,
        root: chordInfo.root,
        notes: chordNotes,
        scaleDegree: chordInfo.scaleDegree,
        function: harmonicFunction,
      });

      currentTick += chordDuration;
      progIndex++;
    }

    return chords;
  }

  private getChordVoicing(root: string, symbol: string): number[] {
    try {
      const chord = Chord.get(symbol);
      if (!chord.notes || chord.notes.length === 0) {
        return this.buildFallbackChord(root);
      }

      // chord.notes ya contiene las notas completas con el tonic
      const basePitches = chord.notes.map((noteName: string) => {
        const midiNote = Note.midi(noteName + '4');
        return midiNote ?? 60;
      });

      return basePitches.sort((a: number, b: number) => a - b);
    } catch {
      return this.buildFallbackChord(root);
    }
  }

  private buildFallbackChord(root: string): number[] {
    const rootMidi = Note.midi(root + '4') ?? 60;
    return [rootMidi, rootMidi + 4, rootMidi + 7];
  }

  private getHarmonicFunction(degree: number, mode: 'major' | 'minor'): ChordSegment['function'] {
    if (mode === 'major') {
      if ([1, 3, 6].includes(degree)) return 'tonic';
      if ([2, 4].includes(degree)) return 'subdominant';
      if ([5, 7].includes(degree)) return 'dominant';
    } else {
      if ([1, 3, 6].includes(degree)) return 'tonic';
      if ([4, 2].includes(degree)) return 'subdominant';
      if ([5, 7].includes(degree)) return 'dominant';
    }
    return 'passing';
  }

  // ============================================================
  // GENERACIÓN DE LÍNEA DE BAJO
  // ============================================================

  private generateBassLine(chords: ChordSegment[], midi: QuantizedMIDI): BassNote[] {
    const bassNotes: BassNote[] = [];
    const ticksPerBeat = midi.ticksPerBeat;

    for (const chord of chords) {
      const rootMidi = Note.midi(`${chord.root}${this.config.bassOctave}`) ?? 48;
      const fifthMidi = (Note.midi(Note.transpose(`${chord.root}${this.config.bassOctave}`, 'P5')) ?? rootMidi + 7);

      const beatsInChord = chord.duration / ticksPerBeat;

      // Beat 1: raíz
      bassNotes.push({
        startTime: chord.startTime,
        duration: ticksPerBeat,
        pitch: rootMidi,
        root: chord.root,
      });

      // Beat 3: quinta
      if (beatsInChord >= 3) {
        bassNotes.push({
          startTime: chord.startTime + (2 * ticksPerBeat),
          duration: ticksPerBeat,
          pitch: fifthMidi,
          root: Note.enharmonic(Note.transpose(chord.root, 'P5')) ?? chord.root,
        });
      }

      // Beat 4: octava
      if (beatsInChord >= 4) {
        bassNotes.push({
          startTime: chord.startTime + (3 * ticksPerBeat),
          duration: Math.floor(ticksPerBeat / 2),
          pitch: rootMidi + 12,
          root: chord.root,
        });
      }
    }

    return bassNotes;
  }

  // ============================================================
  // GENERACIÓN DE VOICINGS DE ARMONÍA
  // ============================================================

  private generateHarmonyVoicings(chords: ChordSegment[], midi: QuantizedMIDI): QuantizedNote[] {
    const harmonyNotes: QuantizedNote[] = [];
    const ticksPerBeat = midi.ticksPerBeat;

    for (const chord of chords) {
      const pattern = this.getRhythmPattern(ticksPerBeat, midi.timeSignature.numerator);

      for (const beat of pattern) {
        for (const chordPitch of chord.notes) {
          let pitch = chordPitch;
          while (pitch < 60) pitch += 12;
          while (pitch > 76) pitch -= 12;

          harmonyNotes.push({
            pitch,
            velocity: 70 + Math.floor(Math.random() * 20),
            startTime: chord.startTime + beat.offset,
            duration: beat.duration,
            track: -1,
            channel: 0,
            originalStartTime: chord.startTime + beat.offset,
            originalDuration: beat.duration,
            quantizationError: 0,
          });
        }
      }
    }

    return harmonyNotes;
  }

  private getRhythmPattern(ticksPerBeat: number, beatsPerMeasure: number): Array<{ offset: number; duration: number }> {
    const patterns: Record<string, Array<{ offset: number; duration: number }>> = {
      pop: [
        { offset: 0, duration: ticksPerBeat },
        { offset: 2 * ticksPerBeat, duration: ticksPerBeat },
      ],
      jazz: [
        { offset: 0, duration: Math.floor(ticksPerBeat * 1.5) },
        { offset: 2 * ticksPerBeat, duration: Math.floor(ticksPerBeat * 1.5) },
      ],
      classical: [
        { offset: 0, duration: ticksPerBeat * beatsPerMeasure },
      ],
      minimal: [
        { offset: 0, duration: ticksPerBeat * beatsPerMeasure },
      ],
    };

    return patterns[this.config.style] || patterns.pop;
  }

  // ============================================================
  // UTILIDADES DE CONVERSIÓN
  // ============================================================

  private bassToQuantizedNotes(bassLine: BassNote[]): QuantizedNote[] {
    return bassLine.map(bn => ({
      pitch: bn.pitch,
      velocity: 85,
      startTime: bn.startTime,
      duration: bn.duration,
      track: -2,
      channel: 0,
      originalStartTime: bn.startTime,
      originalDuration: bn.duration,
      quantizationError: 0,
    }));
  }
}
