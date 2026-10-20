/**
 * PIPELINE PRINCIPAL DEL MOTOR
 * Orquesta los 4 módulos: Ingesta → Cuantización → Armonización → Exportación
 */

import { MidiParser, validateIngestedMIDI } from './ingestion/parser';
import { Quantizer } from './quantization/quantizer';
import { Harmonizer, type HarmonizationConfig } from './harmonization/harmonizer';
import { MidiExporter } from './export/midi-exporter';
import { MusicXMLExporter } from './export/musicxml-exporter';
import { PDFExporter } from './export/pdf-exporter';
import {
  type PipelineState,
  type QuantizationConfig,
  type ExportConfig,
  type IngestedMIDI,
  type QuantizedMIDI,
  type HarmonizedMIDI,
  type ExportResult,
  MidiEngineError,
} from './types';

// ============================================================
// CONFIGURACIÓN DEL PIPELINE
// ============================================================

export interface PipelineConfig {
  quantization: Partial<QuantizationConfig>;
  harmonization: Partial<HarmonizationConfig>;
  export: Partial<ExportConfig>;
}

const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  quantization: {
    gridDivision: 'sixteenth',
    strength: 1.0,
    removeOverlap: true,
    minimumDuration: 1,
  },
  harmonization: {
    style: 'pop',
    bassOctave: 3,
    chordDensity: 1,
    useExtensions: true,
    voicingSpread: 12,
  },
  export: {
    format: 'format1',
    includeOriginal: true,
    includeHarmony: true,
    includeBass: true,
    title: 'MIDI Engine Output',
    composer: 'MIDI Engine',
  },
};

// ============================================================
// CLASE PIPELINE
// ============================================================

export class MidiPipeline {
  private config: PipelineConfig;
  private state: PipelineState;
  private onStateChange?: (state: PipelineState) => void;

  constructor(config: Partial<PipelineConfig> = {}, onStateChange?: (state: PipelineState) => void) {
    this.config = {
      quantization: { ...DEFAULT_PIPELINE_CONFIG.quantization, ...config.quantization },
      harmonization: { ...DEFAULT_PIPELINE_CONFIG.harmonization, ...config.harmonization },
      export: { ...DEFAULT_PIPELINE_CONFIG.export, ...config.export },
    };
    this.state = { stage: 'idle', progress: 0 };
    this.onStateChange = onStateChange;
  }

  /**
   * Ejecuta el pipeline completo: ingesta → cuantización → armonización → exportación.
   */
  async process(buffer: ArrayBuffer | Uint8Array): Promise<ExportResult> {
    try {
      // ============================================
      // STAGE 1: INGESTA
      // ============================================
      this.updateState({ stage: 'ingesting', progress: 0.1 });
      
      const ingested = MidiParser.parse(buffer);
      validateIngestedMIDI(ingested);
      this.state.ingested = ingested;
      
      this.updateState({ stage: 'ingesting', progress: 0.25 });

      // ============================================
      // STAGE 2: CUANTIZACIÓN
      // ============================================
      this.updateState({ stage: 'quantizing', progress: 0.35 });
      
      const quantizer = new Quantizer(this.config.quantization);
      const quantized = quantizer.quantize(ingested);
      this.state.quantized = quantized;
      
      this.updateState({ stage: 'quantizing', progress: 0.5 });

      // ============================================
      // STAGE 3: ARMONIZACIÓN
      // ============================================
      this.updateState({ stage: 'harmonizing', progress: 0.6 });
      
      const harmonizer = new Harmonizer(this.config.harmonization);
      const harmonized = harmonizer.harmonize(quantized);
      this.state.harmonized = harmonized;
      
      this.updateState({ stage: 'harmonizing', progress: 0.75 });

      // ============================================
      // STAGE 4: EXPORTACIÓN
      // ============================================
      this.updateState({ stage: 'exporting', progress: 0.8 });
      
      const midiExporter = new MidiExporter(this.config.export);
      const midiBuffer = midiExporter.export(harmonized);
      
      this.updateState({ stage: 'exporting', progress: 0.88 });
      
      const musicxmlExporter = new MusicXMLExporter();
      const musicxmlString = musicxmlExporter.export(harmonized);
      
      this.updateState({ stage: 'exporting', progress: 0.94 });
      
      const pdfExporter = new PDFExporter();
      const pdfBuffer = pdfExporter.export(harmonized);
      
      const exportResult: ExportResult = {
        midi: midiBuffer,
        musicxml: musicxmlString,
        pdf: pdfBuffer,
      };
      
      this.state.exportResult = exportResult;
      this.updateState({ stage: 'complete', progress: 1.0 });

      return exportResult;
    } catch (error) {
      const message = error instanceof MidiEngineError 
        ? `[${error.module}] ${error.message}` 
        : (error as Error).message;
      
      this.updateState({ 
        stage: 'error', 
        progress: 0, 
        error: message 
      });
      
      throw error;
    }
  }

  // ============================================================
  // MÉTODOS PÚBLICOS DE CONSULTA
  // ============================================================

  getState(): PipelineState {
    return { ...this.state };
  }

  getIngested(): IngestedMIDI | undefined {
    return this.state.ingested;
  }

  getQuantized(): QuantizedMIDI | undefined {
    return this.state.quantized;
  }

  getHarmonized(): HarmonizedMIDI | undefined {
    return this.state.harmonized;
  }

  getExportResult(): ExportResult | undefined {
    return this.state.exportResult;
  }

  reset(): void {
    this.state = { stage: 'idle', progress: 0 };
    this.notifyStateChange();
  }

  // ============================================================
  // MÉTODOS PRIVADOS
  // ============================================================

  private updateState(partial: Partial<PipelineState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }
}

// ============================================================
// EXPORTS CONVENIENTES
// ============================================================

export { MidiParser } from './ingestion/parser';
export { Quantizer } from './quantization/quantizer';
export { Harmonizer } from './harmonization/harmonizer';
export { MidiExporter } from './export/midi-exporter';
export { MusicXMLExporter } from './export/musicxml-exporter';
export { PDFExporter } from './export/pdf-exporter';
export * from './types';
