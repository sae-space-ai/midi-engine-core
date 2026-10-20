import React, { useRef } from 'react';
export function FileUploader({ onFileSelect, disabled }: { onFileSelect: (f: File) => void, disabled: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="upload-zone" onClick={() => !disabled && inputRef.current?.click()}>
      <input type="file" ref={inputRef} accept=".mid,.midi" onChange={e => e.target.files?.[0] && onFileSelect(e.target.files[0])} style={{ display: 'none' }} />
      <div className="upload-icon">⬆</div>
      <p>{disabled ? 'Procesando 16 Voces...' : 'Cargar archivo MIDI'}</p>
    </div>
  );
}
