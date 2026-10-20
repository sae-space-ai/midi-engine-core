import { ProjectData } from '../types';

export function exportToMusicXML(data: ProjectData): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Melody</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>`;

  if (data.tracks[0]) {
    for (const note of data.tracks[0].notes) {
      const step = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'][note.pitch % 12];
      const octave = Math.floor(note.pitch / 12) - 1;
      const duration = Math.round(note.duration * 4);
      xml += `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration></note>`;
    }
  }
  xml += `</measure></part></score-partwise>`;
  return xml;
}
