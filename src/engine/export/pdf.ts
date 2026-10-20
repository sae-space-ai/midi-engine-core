import { jsPDF } from 'jspdf';
import { ProjectData } from '../types';
export function exportToPdf(data: ProjectData): Buffer {
  const doc = new jsPDF();
  doc.setFontSize(18); doc.text('MIDI ENGINE - 16 VOICES HARMONY', 10, 20);
  doc.setFontSize(12); let y = 40;
  for (const track of data.tracks) {
    doc.text(`${track.name}: ${track.notes.length} notes`, 10, y); y += 10;
    if (y > 280) { doc.addPage(); y = 20; }
  }
  return Buffer.from(doc.output('arraybuffer'));
}
