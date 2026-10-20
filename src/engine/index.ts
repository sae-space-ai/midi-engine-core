/**
 * MIDI ENGINE — Índice principal
 * 
 * Este es el punto de entrada del motor.
 * Exporta todos los módulos y tipos necesarios para el procesamiento MIDI.
 * 
 * ARQUITECTURA:
 * ┌─────────────────────────────────────────────────────┐
 * │                    PIPELINE                          │
 * │                                                     │
 * │  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
 * │  │ INGESTA  │→│ CUANTIZACIÓN │→│ ARMONIZACIÓN │  │
 * │  │ (Parser) │  │  (Quantizer) │  │ (Harmonizer) │  │
 * │  └──────────┘  └──────────────┘  └──────────────┘  │
 * │        │                                  │         │
 * │        └──────────┬───────────────────────┘         │
 * │                   ↓                                 │
 * │           ┌──────────────┐                          │
 * │           │  EXPORTACIÓN │                          │
 * │           │  .mid/.xml/.pdf│                         │
 * │           └──────────────┘                          │
 * └─────────────────────────────────────────────────────┘
 */

// Pipeline principal
export { MidiPipeline } from './pipeline';
export type { PipelineConfig } from './pipeline';

// Módulos individuales (para uso granular)
export { MidiParser, validateIngestedMIDI } from './ingestion/parser';
export { Quantizer } from './quantization/quantizer';
export { Harmonizer } from './harmonization/harmonizer';
export type { HarmonizationConfig } from './harmonization/harmonizer';
export { MidiExporter } from './export/midi-exporter';
export { MusicXMLExporter } from './export/musicxml-exporter';
export { PDFExporter } from './export/pdf-exporter';

// Tipos
export type {
  RawNote,
  IngestedMIDI,
  TimeSignature,
  GridDivision,
  QuantizationConfig,
  QuantizedNote,
  QuantizedMIDI,
  KeyDetection,
  HarmonicAnalysis,
  ChordSegment,
  BassNote,
  HarmonizedMIDI,
  ExportResult,
  ExportConfig,
  PipelineState,
} from './types';

export { MidiEngineError } from './types';
