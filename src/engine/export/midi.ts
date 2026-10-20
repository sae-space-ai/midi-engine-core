import { writeMidi } from 'midi-file';
import type { ProjectData } from '../types';

export function exportToMidi(data: ProjectData): Uint8Array {
  const ticksPerBeat = data.ticksPerBeat || 480;

  const tracks = data.tracks.map(track => {
    const events: any[] = [];
    const sortedNotes = [...track.notes].sort((a, b) => a.startTime - b.startTime);
    let lastTick = 0;

    for (const note of sortedNotes) {
      const startTick = Math.round(note.startTime * ticksPerBeat);
      const endTick = Math.round((note.startTime + note.duration) * ticksPerBeat);

      events.push({
        deltaTime: startTick - lastTick,
        type: 'noteOn',
        noteNumber: note.pitch,
        velocity: note.velocity,
        channel: track.channel
      });
      lastTick = startTick;

      events.push({
        deltaTime: endTick - startTick,
        type: 'noteOff',
        noteNumber: note.pitch,
        velocity: 0,
        channel: track.channel
      });
      lastTick = endTick;
    }

    // End of track
    events.push({ deltaTime: 0, type: 'endOfTrack' });
    return events;
  });

  const midiObj = {
    header: {
      format: 1,
      numTracks: tracks.length,
      ticksPerBeat
    },
    tracks
  };

  const bytes = writeMidi(midiObj as any);
  return new Uint8Array(bytes);
}
