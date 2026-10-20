import { parseMidi } from 'midi-file';
import type { ProjectData, TrackData, NoteEvent } from './types';

export function ingestMidi(buffer: Uint8Array): ProjectData {
  const midi = parseMidi(buffer);
  const ticksPerBeat = midi.header?.ticksPerBeat || 480;
  const tracks: TrackData[] = [];
  let currentTrackId = 0;

  for (const track of midi.tracks) {
    const notes: NoteEvent[] = [];
    const activeNotes = new Map<number, { startTime: number; velocity: number }>();
    let currentTick = 0;

    for (const event of track) {
      currentTick += (event as any).deltaTime || 0;
      const timeInBeats = currentTick / ticksPerBeat;

      if ((event as any).type === 'noteOn' && (event as any).velocity > 0) {
        activeNotes.set((event as any).noteNumber, {
          startTime: timeInBeats,
          velocity: (event as any).velocity
        });
      } else if (
        (event as any).type === 'noteOff' ||
        ((event as any).type === 'noteOn' && (event as any).velocity === 0)
      ) {
        const active = activeNotes.get((event as any).noteNumber);
        if (active) {
          notes.push({
            id: `n_${currentTrackId}_${notes.length}`,
            pitch: (event as any).noteNumber,
            velocity: active.velocity,
            startTime: active.startTime,
            duration: timeInBeats - active.startTime,
            track: currentTrackId,
            channel: (event as any).channel || 0
          });
          activeNotes.delete((event as any).noteNumber);
        }
      }
    }

    if (notes.length > 0) {
      tracks.push({
        id: currentTrackId,
        name: `Track ${currentTrackId}`,
        channel: 0,
        notes
      });
      currentTrackId++;
    }
  }

  return { tempo: 120, timeSignature: [4, 4], ticksPerBeat, tracks };
}
