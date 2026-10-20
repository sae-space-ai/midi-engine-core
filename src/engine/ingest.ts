import { parseMidi, MidiData } from 'midi-file';
import { ProjectData, TrackData, NoteEvent } from './types';

export function ingestMidi(buffer: Buffer): ProjectData {
  const midi: MidiData = parseMidi(buffer);
  const ticksPerBeat = midi.header.ticksPerBeat || 480;
  const tracks: TrackData[] = [];
  let currentTrackId = 0;

  for (const track of midi.tracks) {
    const notes: NoteEvent[] = [];
    const activeNotes: Map<number, { startTime: number; velocity: number }> = new Map();
    let currentTick = 0;

    for (const event of track) {
      currentTick += event.deltaTime;
      const timeInBeats = currentTick / ticksPerBeat;
      if (event.type === 'noteOn' && event.velocity > 0) {
        activeNotes.set(event.noteNumber, { startTime: timeInBeats, velocity: event.velocity });
      } else if (event.type === 'noteOff' || (event.type === 'noteOn' && event.velocity === 0)) {
        const active = activeNotes.get(event.noteNumber);
        if (active) {
          notes.push({
            id: `n_${currentTrackId}_${notes.length}`, pitch: event.noteNumber,
            velocity: active.velocity, startTime: active.startTime,
            duration: timeInBeats - active.startTime, track: currentTrackId, channel: event.channel || 0
          });
          activeNotes.delete(event.noteNumber);
        }
      }
    }
    if (notes.length > 0) {
      tracks.push({ id: currentTrackId, name: `Track ${currentTrackId}`, channel: 0, notes });
      currentTrackId++;
    }
  }
  return { tempo: 120, timeSignature: [4, 4], tracks };
}
