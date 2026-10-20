/**
 * MÓDULO DE EXPORTACIÓN MUSICXML
 * Convierte el JSON procesado a MusicXML estándar.
 */

import {
  type HarmonizedMIDI,
  type QuantizedNote,
  type KeyDetection,
  MidiEngineError,
} from '../types';

// ============================================================
// CONSTANTES
// ============================================================

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ALTER_MAP: Record<string, number> = {
  'C': 0, 'C#': 1, 'D': 0, 'D#': 1, 'E': 0, 'F': 0,
  'F#': 1, 'G': 0, 'G#': 1, 'A': 0, 'A#': 1, 'B': 0,
};
const STEP_MAP: Record<string, string> = {
  'C': 'C', 'C#': 'C', 'D': 'D', 'D#': 'D', 'E': 'E',
  'F': 'F', 'F#': 'F', 'G': 'G', 'G#': 'G', 'A': 'A', 'A#': 'A', 'B': 'B',
};
const OCTAVE_OFFSET: Record<string, number> = {
  'C': 0, 'C#': 0, 'D': -1, 'D#': -1, 'E': -1, 'F': -1,
  'F#': -1, 'G': -2, 'G#': -2, 'A': -2, 'A#': -2, 'B': -2,
};

// ============================================================
// CLASE EXPORTADORA
// ============================================================

export class MusicXMLExporter {
  /**
   * Exporta el MIDI procesado como string MusicXML.
   */
  export(harmonized: HarmonizedMIDI): string {
    try {
      return this.buildMusicXML(harmonized);
    } catch (error) {
      throw new MidiEngineError(
        `Error al exportar MusicXML: ${(error as Error).message}`,
        'export',
        'MUSICXML_EXPORT_ERROR'
      );
    }
  }

  // ============================================================
  // CONSTRUCCIÓN DEL XML
  // ============================================================

  private buildMusicXML(harmonized: HarmonizedMIDI): string {
    const keyInfo = harmonized.harmonicAnalysis.key;

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work>
    <work-title>MIDI Engine Output</work-title>
  </work>
  <identification>
    <creator type="composer">MIDI Engine</creator>
    <encoding>
      <software>MIDI Engine v1.0</software>
      <encoding-date>${new Date().toISOString().split('T')[0]}</encoding-date>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Melody</part-name>
    </score-part>
    <score-part id="P2">
      <part-name>Harmony</part-name>
    </score-part>
    <score-part id="P3">
      <part-name>Bass</part-name>
    </score-part>
  </part-list>
  <part id="P1">
${this.buildPartMeasures(harmonized.notes.filter(n => n.track >= 0), harmonized, keyInfo)}
  </part>
  <part id="P2">
${this.buildPartMeasures(harmonized.harmonyNotes, harmonized, keyInfo)}
  </part>
  <part id="P3">
${this.buildPartMeasures(harmonized.bassNotes, harmonized, keyInfo)}
  </part>
</score-partwise>`;
  }

  private buildPartMeasures(
    notes: QuantizedNote[],
    harmonized: HarmonizedMIDI,
    keyInfo: KeyDetection
  ): string {
    const ticksPerBeat = harmonized.ticksPerBeat;
    const beatsPerMeasure = harmonized.timeSignature.numerator;
    const ticksPerMeasure = beatsPerMeasure * ticksPerBeat;
    const totalMeasures = Math.max(1, Math.ceil(harmonized.totalTicks / ticksPerMeasure));

    const measures: string[] = [];

    for (let m = 0; m < totalMeasures; m++) {
      const measureStart = m * ticksPerMeasure;
      const measureEnd = measureStart + ticksPerMeasure;
      const measureNotes = notes.filter(n =>
        n.startTime >= measureStart && n.startTime < measureEnd
      );

      const isFirst = m === 0;
      measures.push(this.buildMeasure(measureNotes, m + 1, harmonized, keyInfo, isFirst));
    }

    return measures.join('\n');
  }

  private buildMeasure(
    notes: QuantizedNote[],
    measureNumber: number,
    harmonized: HarmonizedMIDI,
    keyInfo: KeyDetection,
    isFirstMeasure: boolean
  ): string {
    let xml = `    <measure number="${measureNumber}">\n`;

    if (isFirstMeasure) {
      xml += this.buildAttributes(harmonized, keyInfo);
    }

    if (notes.length === 0) {
      const divisions = harmonized.ticksPerBeat;
      const wholeRestDuration = divisions * 4 * harmonized.timeSignature.numerator;
      xml += `      <note>\n`;
      xml += `        <rest/>\n`;
      xml += `        <duration>${wholeRestDuration}</duration>\n`;
      xml += `      </note>\n`;
    } else {
      for (const note of notes) {
        xml += this.buildNoteElement(note, harmonized);
      }
    }

    xml += `    </measure>\n`;
    return xml;
  }

  private buildAttributes(harmonized: HarmonizedMIDI, keyInfo: KeyDetection): string {
    const divisions = harmonized.ticksPerBeat;
    const fifths = this.keyToFifths(keyInfo.root, keyInfo.mode === 'major' ? 'major' : 'minor');
    const mode = keyInfo.mode === 'major' ? 'major' : 'minor';

    return `      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>${fifths}</fifths>
          <mode>${mode}</mode>
        </key>
        <time>
          <beats>${harmonized.timeSignature.numerator}</beats>
          <beat-type>${harmonized.timeSignature.denominator}</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>\n`;
  }

  private buildNoteElement(note: QuantizedNote, harmonized: HarmonizedMIDI): string {
    const duration = note.duration;
    const pitchClass = note.pitch % 12;
    const octave = Math.floor(note.pitch / 12) - 1;
    const noteName = NOTE_NAMES[pitchClass];
    const step = STEP_MAP[noteName];
    const alter = ALTER_MAP[noteName];
    const octaveAdj = OCTAVE_OFFSET[noteName];
    const noteType = this.durationToNoteType(duration, harmonized.ticksPerBeat);

    let xml = `      <note>\n`;
    xml += `        <pitch>\n`;
    xml += `          <step>${step}</step>\n`;
    if (alter !== 0) {
      xml += `          <alter>${alter}</alter>\n`;
    }
    xml += `          <octave>${octave + octaveAdj}</octave>\n`;
    xml += `        </pitch>\n`;
    xml += `        <duration>${duration}</duration>\n`;
    if (noteType) {
      xml += `        <type>${noteType}</type>\n`;
    }
    xml += `      </note>\n`;

    return xml;
  }

  private durationToNoteType(duration: number, divisions: number): string | null {
    const beats = duration / divisions;
    if (beats >= 4) return 'whole';
    if (beats >= 2) return 'half';
    if (beats >= 1) return 'quarter';
    if (beats >= 0.5) return 'eighth';
    if (beats >= 0.25) return '16th';
    if (beats >= 0.125) return '32nd';
    return '64th';
  }

  private keyToFifths(root: string, mode: 'major' | 'minor'): number {
    const majorFifths: Record<string, number> = {
      'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5,
      'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5, 'Gb': -6,
      'F#': 6, 'C#': 7,
    };

    if (mode === 'major') {
      return majorFifths[root] ?? 0;
    } else {
      return (majorFifths[root] ?? 0) - 3;
    }
  }
}
