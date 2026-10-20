import type { ProjectData } from '../types';

export function exportToMusicXML(data: ProjectData): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
<part-list>`;

  data.tracks.forEach((t, i) => {
    xml += `<score-part id="P${i + 1}"><part-name>${t.name}</part-name></score-part>`;
  });

  xml += `</part-list>`;

  data.tracks.forEach((track, i) => {
    xml += `<part id="P${i + 1}"><measure number="1"><attributes><divisions>1</divisions></attributes>`;
    
    for (const note of track.notes) {
      const step = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'][note.pitch % 12];
      const octave = Math.floor(note.pitch / 12) - 1;
      const duration = Math.max(1, Math.round(note.duration * 4));
      xml += `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration></note>`;
    }

    xml += `</measure></part>`;
  });

  xml += `</score-partwise>`;
  return xml;
}
