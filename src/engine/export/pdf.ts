import { jsPDF } from 'jspdf';
import type { ProjectData } from '../types';

export function exportToPdf(data: ProjectData): Uint8Array {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('MIDI ENGINE - 16 VOICES HARMONY', 10, 20);
  doc.setFontSize(10);
  doc.text(`Tempo: ${data.tempo} BPM | Time: ${data.timeSignature[0]}/${data.timeSignature[1]} | Tracks: ${data.tracks.length}`, 10, 30);
  
  doc.setFontSize(11);
  let y = 45;

  for (const track of data.tracks) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${track.name}: ${track.notes.length} notes`, 10, y);
    y += 8;
  }

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
