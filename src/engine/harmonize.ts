import { Note, Scale } from 'tonal';
import type { ProjectData, TrackData, NoteEvent } from './types';

export function harmonizeProject(inputData: ProjectData): ProjectData {
  const melodyTrack = inputData.tracks[0];
  if (!melodyTrack || melodyTrack.notes.length === 0) {
    console.warn('[Harmonize] No melody track or empty, skipping');
    return inputData;
  }

  console.log('[Harmonize] Starting with', melodyTrack.notes.length, 'melody notes');

  const key = detectKey(melodyTrack.notes);
  console.log('[Harmonize] Detected key:', key);

  const harmonyVoices = generate16VoiceHarmony(melodyTrack.notes, key);
  console.log('[Harmonize] Generated', harmonyVoices.length, 'harmony voices');

  return {
    ...inputData,
    tracks: [
      { ...melodyTrack, name: '01_Melody', channel: 0 },
      ...harmonyVoices
    ]
  };
}

function detectKey(notes: NoteEvent[]): string {
  try {
    // Convertir notas MIDI a nombres de nota (ej: "C4", "D#3")
    const noteNames: string[] = [];
    
    for (const note of notes) {
      // Usar solo notas en tiempos fuertes (múltiplos de 1 beat)
      if (Math.abs(note.startTime - Math.round(note.startTime)) < 0.01) {
        const name = Note.fromMidi(note.pitch);
        if (name && name !== '') {
          noteNames.push(name);
        }
      }
    }

    // Si no hay notas en tiempos fuertes, usar todas
    if (noteNames.length === 0) {
      for (const note of notes.slice(0, 50)) {
        const name = Note.fromMidi(note.pitch);
        if (name && name !== '') {
          noteNames.push(name);
        }
      }
    }

    if (noteNames.length === 0) {
      console.warn('[Harmonize] No valid note names for key detection');
      return 'C major';
    }

    console.log('[Harmonize] Notes for key detection:', noteNames.slice(0, 10));

    // Scale.detect espera un array de strings de notas
    const detected = Scale.detect(noteNames, { match: 'fit' });
    console.log('[Harmonize] Scale detection results:', detected);

    if (detected && detected.length > 0) {
      return detected[0];
    }

    return 'C major';
  } catch (err) {
    console.error('[Harmonize] Key detection error:', err);
    return 'C major';
  }
}

// MOTOR DE 16 VOCES
function generate16VoiceHarmony(melody: NoteEvent[], key: string): TrackData[] {
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
        // Convertir MIDI a nombre de nota (ej: 60 → "C4")
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

        // Transponer la nota por el intervalo
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

        // Convertir de vuelta a MIDI
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
        console.error('[Harmonize] Error processing note:', note, err);
        // Fallback: usar la nota original
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
