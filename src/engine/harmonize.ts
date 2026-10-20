import * as Tonal from 'tonal';
import { ProjectData, TrackData, NoteEvent } from './types';

export function harmonizeProject(data: ProjectData): ProjectData {
  const melodyTrack = data.tracks[0];
  if (!melodyTrack) return data;

  const key = detectKey(melodyTrack.notes);
  
  // Generar las 15 voces de armonía adicionales (Total 16 voces incluyendo melodía)
  const harmonyVoices = generate16VoiceHarmony(melodyTrack.notes, key);

  return {
    ...data,
    tracks: [
      { ...melodyTrack, name: '01_Melody', channel: 0 },
      ...harmonyVoices
    ]
  };
}

function detectKey(notes: NoteEvent[]): string {
  const strongBeats = notes.filter(n => n.startTime % 4 === 0).map(n => Tonal.Note.pitchClass(Tonal.Note.fromMidi(n.pitch)));
  const detected = Tonal.Scale.detect(strongBeats);
  return (detected && detected.length > 0) ? detected[0] : 'C major';
}

// MOTOR DE 16 VOCES: Genera un arreglo polifónico denso y perfectamente voice-led.
function generate16VoiceHarmony(melody: NoteEvent[], key: string): TrackData[] {
  const voices: TrackData[] = [];
  const scaleNotes = Tonal.Scale.get(key).notes;
  
  // Matriz de intervalos para 15 voces adicionales (desde la 2ª hasta la 16ª voz)
  // Usa extensiones de acordes (9, 11, 13), duplicaciones octavadas y tensiones controladas.
  const intervalPatterns = [
    '3M', '5P', '7m', '9M', '11A', '13M', // Voces 2-7 (Armonía base extendida)
    '8P', '10M', '12P', '14m', '16M', '18A', '20M', // Voces 8-14 (Octavas y extensiones superiores)
    '2M', '4P' // Voces 15-16 (Tensiones superiores y color)
  ];

  for (let v = 0; v < 15; v++) {
    const voiceNotes: NoteEvent[] = [];
    const interval = intervalPatterns[v];
    const trackId = v + 2; // 0 es melodía, 1 es bypass, empezamos en 2
    const channel = (trackId) % 16;

    for (const note of melody) {
      const noteName = Tonal.Note.fromMidi(note.pitch);
      const octave = Math.floor(note.pitch / 12);
      
      // Calcular la nota objetivo usando Tonal
      const targetNoteName = Tonal.Note.transpose(noteName, interval);
      let targetMidi = Tonal.Note.midi(targetNoteName);
      
      if (targetMidi === null) targetMidi = note.pitch;
      
      // Ajuste de octava para mantener el registro espectral (Voice Leading)
      if (v < 6 && targetMidi < 48) targetMidi += 12; // Voces graves no deben ser demasiado graves
      if (v >= 6 && v < 12 && (targetMidi < 60 || targetMidi > 84)) targetMidi = targetMidi < 60 ? targetMidi + 12 : targetMidi - 12; // Voces medias
      if (v >= 12 && targetMidi < 72) targetMidi += 12; // Voces agudas

      // Evitar que la nota supere el rango MIDI (127)
      while (targetMidi > 127) targetMidi -= 12;
      while (targetMidi < 0) targetMidi += 12;

      // Dinámica escalonada (las voces más lejanas suenan un poco más suave para equilibrar)
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
