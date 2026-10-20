/**
 * TIPOS BASE DEL MOTOR DE PROCESAMIENTO MIDI
 * Estructura de datos interna canónica (JSON)
 */

// ============================================================
// MÓDULO DE INGESTA - Tipos de entrada
// ============================================================

export interface RawNote {
  pitch: number;        // MIDI note number (0-127)
  velocity: number;     // 0-127
  startTime: number;    // En ticks (unidades de tiempo del MIDI)
  duration: number;     // En ticks
  track: number;        // Track index del MIDI original
  channel: number;      // Canal MIDI (0-15)
}

export interface IngestedMIDI {
  format: number;           // MIDI format (0, 1, 2)
  ticksPerBeat: number;     // PPQN (pulses per quarter note)
  tempo: number;            // BPM (por defecto 120)
  timeSignature: TimeSignature;
  notes: RawNote[];
  totalTicks: number;
  trackNames: string[];
}

export interface TimeSignature {
  numerator: number;    // beats per measure
  denominator: number;  // note value (4 = quarter note)
}

// ============================================================
// MÓDULO DE CUANTIZACIÓN - Tipos de grid
// ============================================================

export type GridDivision = 
  | 'whole'       // 1/1
  | 'half'        // 1/2
  | 'quarter'     // 1/4
  | 'eighth'      // 1/8
  | 'sixteenth'   // 1/16
  | 'thirtysecond' // 1/32
  | 'sixtyfourth'; // 1/64

export interface QuantizationConfig {
  gridDivision: GridDivision;
  strength: number;       // 0.0 - 1.0 (1.0 = snap total)
  removeOverlap: boolean;
  minimumDuration: number; // ticks mínimos para una nota
}

export interface QuantizedNote extends RawNote {
  startTime: number;      // Ahora es múltiplo exacto del grid
  duration: number;       // Ahora es múltiplo exacto del grid
  originalStartTime: number;
  originalDuration: number;
  quantizationError: number; // desviación en ticks
}

export interface QuantizedMIDI extends Omit<IngestedMIDI, 'notes'> {
  notes: QuantizedNote[];
  gridDivision: GridDivision;
  gridTickSize: number;   // Tamaño del grid en ticks
}

// ============================================================
// MÓDULO DE ARMONIZACIÓN - Tipos de análisis
// ============================================================

export interface KeyDetection {
  key: string;            // ej: "C", "Dm", "F#m"
  scale: string;          // ej: "major", "minor"
  root: string;           // ej: "C", "D", "F#"
  confidence: number;     // 0.0 - 1.0
  mode: 'major' | 'minor' | 'dorian' | 'mixolydian' | 'other';
}

export interface HarmonicAnalysis {
  key: KeyDetection;
  chords: ChordSegment[];
  bassLine: BassNote[];
  melodyNotes: QuantizedNote[];
}

export interface ChordSegment {
  startTime: number;      // ticks
  duration: number;       // ticks
  symbol: string;         // ej: "Cmaj7", "Am7", "Dm7"
  root: string;
  notes: number[];        // MIDI pitches del acorde
  scaleDegree: number;    // grado en la escala (I, II, III...)
  function: 'tonic' | 'subdominant' | 'dominant' | 'passing';
}

export interface BassNote {
  startTime: number;
  duration: number;
  pitch: number;          // MIDI pitch
  root: string;           // nota del bajo como nombre
}

export interface HarmonizedMIDI extends QuantizedMIDI {
  harmonicAnalysis: HarmonicAnalysis;
  harmonyNotes: QuantizedNote[];  // Notas de acompañamiento
  bassNotes: QuantizedNote[];     // Línea de bajo
}

// ============================================================
// MÓDULO DE EXPORTACIÓN - Tipos de salida
// ============================================================

export interface ExportResult {
  midi: Uint8Array;
  musicxml: string;
  pdf: Uint8Array;
}

export interface ExportConfig {
  format: 'format0' | 'format1';
  includeOriginal: boolean;
  includeHarmony: boolean;
  includeBass: boolean;
  title: string;
  composer: string;
}

// ============================================================
// PIPELINE - Estado global
// ============================================================

export interface PipelineState {
  stage: 'idle' | 'ingesting' | 'quantizing' | 'harmonizing' | 'exporting' | 'complete' | 'error';
  progress: number;       // 0.0 - 1.0
  error?: string;
  ingested?: IngestedMIDI;
  quantized?: QuantizedMIDI;
  harmonized?: HarmonizedMIDI;
  exportResult?: ExportResult;
}

// ============================================================
// ERRORES
// ============================================================

export class MidiEngineError extends Error {
  constructor(
    message: string,
    public readonly module: 'ingestion' | 'quantization' | 'harmonization' | 'export',
    public readonly code: string
  ) {
    super(message);
    this.name = 'MidiEngineError';
  }
}
