import { writeMidi } from 'midi-file';
import { ProjectData } from '../types';

export function exportToMidi(data: ProjectData): Buffer {
  const tracks = data.tracks.map(track => {
    const events: any[] = [];
    const sortedNotes = [...track.notes].sort((a, b) => a.startTime - b.startTime);
    let lastTick = 0;
    for (const note of sortedNotes) {
      const startTick = Math.round(note.startTime * 480);
      const endTick = Math.round((note.startTime + note.duration) * 480);
      events.push({ deltaTime: startTick - lastTick, type: 'noteOn', noteNumber: note.pitch, velocity: note.velocity, channel: track.channel });
      lastTick = startTick;
      events.push({ deltaTime: endTick - startTick, type: 'noteOff', noteNumber: note.pitch, velocity: 0, channel: track.channel });
      lastTick = endTick;
    }
    return events;
  });
  return Buffer.from(writeMidi({ header: { format: 1, numTracks: tracks.length, ticksPerBeat: 480 }, tracks } as any));
}
