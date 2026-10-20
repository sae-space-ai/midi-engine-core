import { jsPDF } from 'jspdf';
import type { ProjectData } from '../types';

export function exportToPdf(inputData: ProjectData, title: string = 'MIDI Engine Output'): Uint8Array {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(title, 10, 20);
  doc.setFontSize(10);
  doc.text(`Tempo: ${inputData.tempo} BPM | Time: ${inputData.timeSignature[0]}/${inputData.timeSignature[1]} | Tracks: ${inputData.tracks.length}`, 10, 30);
  
  doc.setFontSize(11);
  let y = 45;

  for (const track of inputData.tracks) {
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
