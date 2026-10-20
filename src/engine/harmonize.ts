import { Note, Scale } from 'tonal';
import type { ProjectData, TrackData, NoteEvent } from './types';

/**
 * MOTOR DE ARMONIZACIÓN BÁSICA
 * Genera bajo y acordes funcionales basados en la tonalidad detectada.
 */

export function detectKey(notes: NoteEvent[]): string {
  try {
    const noteNames: string[] = [];
    
    for (const note of notes) {
      if (Math.abs(note.startTime - Math.round(note.startTime)) < 0.01) {
        const name = Note.fromMidi(note.pitch);
        if (name && name !== '') {
          noteNames.push(name);
        }
      }
    }

    if (noteNames.length === 0) {
      for (const note of notes.slice(0, 50)) {
        const name = Note.fromMidi(note.pitch);
        if (name && name !== '') {
          noteNames.push(name);
        }
      }
    }

    if (noteNames.length === 0) {
      return 'C major';
    }

    const detected = Scale.detect(noteNames, { match: 'fit' });
    if (detected && detected.length > 0) {
      return detected[0];
    }

    return 'C major';
  } catch (err) {
    console.error('[Harmonize] Key detection error:', err);
    return 'C major';
  }
}

export function harmonizeProject(inputData: ProjectData): ProjectData {
  const melodyTrack = inputData.tracks[0];
  if (!melodyTrack || melodyTrack.notes.length === 0) {
    return inputData;
  }

  const key = detectKey(melodyTrack.notes);
  const bassTrack = generateBassline(melodyTrack.notes, key);
  const chordTrack = generateChords(melodyTrack.notes, key);

  return {
    ...inputData,
    tracks: [
      { ...melodyTrack, name: '01_Melody', channel: 0 },
      { id: 99, name: '02_Bass', channel: 1, notes: bassTrack },
      { id: 98, name: '03_Chords', channel: 2, notes: chordTrack }
    ]
  };
}

function generateBassline(melody: NoteEvent[], key: string): NoteEvent[] {
  const bassNotes: NoteEvent[] = [];
  const scaleDegrees = [1, 4, 5, 6];
  const scaleNotes = Scale.get(key).notes;
  
  const maxTime = melody.length > 0 ? Math.max(...melody.map(n => n.startTime + n.duration)) : 16;
  
  for (let beat = 0; beat < maxTime; beat += 4) {
    const degree = scaleDegrees[(beat / 4) % scaleDegrees.length];
    const noteName = scaleNotes[degree - 1] || 'C';
    const midiVal = Note.midi(noteName + '2');
    const rootNote = midiVal !== null ? midiVal : 36;
    
    bassNotes.push({
      id: `bass_${beat}`,
      pitch: rootNote,
      velocity: 100,
      startTime: beat,
      duration: 1,
      track: 99,
      channel: 1
    });
  }
  
  return bassNotes;
}

function generateChords(melody: NoteEvent[], key: string): NoteEvent[] {
  const chordNotes: NoteEvent[] = [];
  const scale = Scale.get(key);
  const scaleNotes = scale.notes;
  
  const chordProgression = [
    { degree: 0, type: 'major' },
    { degree: 3, type: 'major' },
    { degree: 4, type: 'major' },
    { degree: 0, type: 'major' }
  ];
  
  const maxTime = melody.length > 0 ? Math.max(...melody.map(n => n.startTime + n.duration)) : 16;
  
  for (let beat = 0; beat < maxTime; beat += 4) {
    const chord = chordProgression[(beat / 4) % chordProgression.length];
    const rootNote = scaleNotes[chord.degree] || 'C';
    const rootMidi = Note.midi(rootNote + '4');
    
    if (rootMidi !== null) {
      // Tríada: raíz, tercera, quinta
      const third = chord.type === 'major' ? rootMidi + 4 : rootMidi + 3;
      const fifth = rootMidi + 7;
      
      [rootMidi, third, fifth].forEach((pitch, idx) => {
        chordNotes.push({
          id: `chord_${beat}_${idx}`,
          pitch,
          velocity: 80,
          startTime: beat,
          duration: 2,
          track: 98,
          channel: 2
        });
      });
    }
  }
  
  return chordNotes;
}
