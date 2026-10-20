import { Note, Scale } from 'tonal';
import type { ProjectData, TrackData, NoteEvent } from './types';
import { detectKey } from './harmonize';

/**
 * MOTOR DE POLIFONÍA 16 VOCES
 * Expansión algorítmica a 16 voces independientes con voice-leading espectral.
 */

export function generate16VoiceHarmony(inputData: ProjectData): ProjectData {
  const melodyTrack = inputData.tracks[0];
  if (!melodyTrack || melodyTrack.notes.length === 0) {
    return inputData;
  }

  const key = detectKey(melodyTrack.notes);
  const harmonyVoices = create16Voices(melodyTrack.notes, key);

  return {
    ...inputData,
    tracks: [
      { ...melodyTrack, name: '01_Melody', channel: 0 },
      ...harmonyVoices
    ]
  };
}

function create16Voices(melody: NoteEvent[], key: string): TrackData[] {
  const voices: TrackData[] = [];

  // Matriz de intervalos para 15 voces adicionales
  const intervalPatterns = [
    '3M', '5P', '7m', '9M', '11A', '13M',           // Voces 2-7
    '8P', '10M', '12P', '14m', '16M', '18A', '20M', // Voces 8-14
    '2M', '4P'                                        // Voces 15-16
  ];

  for (let v = 0; v < 15; v++) {
    const voiceNotes: NoteEvent[] = [];
    const interval = intervalPatterns[v];
    const trackId = v + 2;
    const channel = trackId % 16;

    for (const note of melody) {
      try {
        const noteName = Note.fromMidi(note.pitch);
        if (!noteName) {
          voiceNotes.push({
            ...note,
            id: `h_${trackId}_${note.id}`,
            track: trackId,
            channel
          });
          continue;
        }

        const transposed = Note.transpose(noteName, interval);
        if (!transposed) {
          voiceNotes.push({
            ...note,
            id: `h_${trackId}_${note.id}`,
            track: trackId,
            channel
          });
          continue;
        }

        let targetMidi = Note.midi(transposed);
        if (targetMidi === null || targetMidi === undefined) {
          targetMidi = note.pitch;
        }

        // Voice Leading: ajustar octava según el rango de la voz
        if (v < 6 && targetMidi < 48) targetMidi += 12;
        if (v >= 6 && v < 12) {
          if (targetMidi < 60) targetMidi += 12;
          if (targetMidi > 84) targetMidi -= 12;
        }
        if (v >= 12 && targetMidi < 72) targetMidi += 12;

        // Clamp al rango MIDI válido
        while (targetMidi > 127) targetMidi -= 12;
        while (targetMidi < 0) targetMidi += 12;

        // Dinámica escalonada
        const velocityScale = Math.max(40, note.velocity - (v * 4));

        voiceNotes.push({
          id: `h_${trackId}_${note.id}`,
          pitch: targetMidi,
          velocity: velocityScale,
          startTime: note.startTime,
          duration: note.duration,
          track: trackId,
          channel: channel
        });
      } catch (err) {
        console.error('[16V] Error processing note:', note, err);
        voiceNotes.push({
          ...note,
          id: `h_${trackId}_${note.id}`,
          track: trackId,
          channel
        });
      }
    }

    voices.push({
      id: trackId,
      name: `${String(trackId + 1).padStart(2, '0')}_Harmony_${interval}`,
      channel: channel,
      notes: voiceNotes
    });
  }

  return voices;
}
