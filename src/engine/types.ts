export interface NoteEvent {
  id: string;
  pitch: number;
  velocity: number;
  startTime: number;
  duration: number;
  track: number;
  channel: number;
}

export interface TrackData {
  id: number;
  name: string;
  channel: number;
  notes: NoteEvent[];
}

export interface ProjectData {
  tempo: number;
  timeSignature: [number, number];
  ticksPerBeat: number;
  tracks: TrackData[];
}
