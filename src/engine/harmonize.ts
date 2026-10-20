import * as Tonal from 'tonal';
import { ProjectData, TrackData, NoteEvent } from './types';

export function harmonizeProject(data: ProjectData): ProjectData {
  const melodyTrack = data.tracks[0];
  if (!melodyTrack) return data;

  const key = detectKey(melodyTrack.notes);
  const bassTrack = generateBassline(melodyTrack.notes, key);
  const chordTrack = generateChords(melodyTrack.notes, key);

  return {
    ...data,
    tracks: [
      melodyTrack,
      { id: 99, name: 'Bass', channel: 1, notes: bassTrack },
      { id: 98, name: 'Chords', channel: 2, notes: chordTrack }
    ]
  };
}

function detectKey(notes: NoteEvent[]): string {
  const strongBeats = notes.filter(n => n.startTime % 4 === 0).map(n => Tonal.Note.pitchClass(Tonal.Note.fromMidi(n.pitch)));
  const detected = Tonal.Scale.detect(strongBeats);
  const scale = (detected && detected.length > 0) ? detected[0] : 'C major';
  return scale;
}

function generateBassline(melody: NoteEvent[], key: string): NoteEvent[] {
  const bassNotes: NoteEvent[] = [];
  const scaleDegrees = [1, 4, 5, 6];
  const scaleNotes = Tonal.Scale.get(key).notes;
  for (let beat = 0; beat < 16; beat += 4) {
    const degree = scaleDegrees[(beat / 4) % scaleDegrees.length];
    const noteName = scaleNotes[degree - 1] || 'C';
    const midiVal = Tonal.Note.midi(noteName + '2');
    const rootNote = midiVal !== null ? midiVal : 36;
    bassNotes.push({
      id: `bass_${beat}`, pitch: rootNote, velocity: 100,
      startTime: beat, duration: 1, track: 99, channel: 1
    });
  }
  return bassNotes;
}

function generateChords(_melody: NoteEvent[], _key: string): NoteEvent[] {
  return []; // Lógica de acordes pendiente de expansión
}
