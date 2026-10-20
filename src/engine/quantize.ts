import { ProjectData, NoteEvent } from './types';

export function quantizeProject(data: ProjectData, division: 4 | 8 | 16 | 32 = 16): ProjectData {
  const gridStep = 1 / division;
  return { 
    ...data, 
    tracks: data.tracks.map(track => ({ ...track, notes: quantizeNotes(track.notes, gridStep) }))
  };
}

function quantizeNotes(notes: NoteEvent[], gridStep: number): NoteEvent[] {
  const snapped = notes.map(note => ({
    ...note,
    startTime: Math.round(note.startTime / gridStep) * gridStep,
    duration: Math.max(gridStep, Math.round(note.duration / gridStep) * gridStep)
  }));
  const resolved: NoteEvent[] = [];
  const pitchTimelines: Map<number, { end: number }[]> = new Map();
  for (const note of snapped) {
    const timeline = pitchTimelines.get(note.pitch) || [];
    const noteEnd = note.startTime + note.duration;
    const overlap = timeline.find(t => note.startTime < t.end);
    if (overlap) note.duration = Math.max(gridStep, overlap.end - note.startTime); 
    const cleanTimeline = timeline.filter(t => t.end <= note.startTime);
    cleanTimeline.push({ end: noteEnd });
    pitchTimelines.set(note.pitch, cleanTimeline);
    resolved.push(note);
  }
  return resolved.sort((a, b) => a.startTime - b.startTime);
}
