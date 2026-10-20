# MIDI Toolbox Suite

Sistema modular de procesamiento MIDI con 3 motores independientes.

## 🎯 Arquitectura

### Modo Local (Navegador)
Los 3 motores se ejecutan 100% en el navegador usando WebAssembly y JavaScript:
- **Motor 1 - Cuantizador**: Alinea notas a rejilla de 1/16
- **Motor 2 - Armonizador**: Genera bajo y acordes funcionales
- **Motor 3 - Polifonía 16V**: Expande a 16 voces con voice-leading

### Modo Producción (Vercel)
Para despliegue en Vercel, los motores se ejecutan como Serverless Functions:
- `/api/engine-quantize` - Cuantizador
- `/api/engine-harmonize` - Armonizador
- `/api/engine-16v` - Polifonía 16V
- `/api/health` - Health check

## 🚀 Uso

### Desarrollo Local
```bash
npm install
npm run dev
```

Abre http://localhost:5173

### Despliegue en Vercel
```bash
npm run build
vercel deploy
```

## 📁 Estructura

```
midi-toolbox-suite/
├── api/                          # Serverless Functions (Vercel)
│   ├── health.ts
│   ├── engine-quantize.ts
│   ├── engine-harmonize.ts
│   └── engine-16v.ts
├── src/
│   ├── engine/                   # Lógica de procesamiento
│   │   ├── ingest.ts            # Parser MIDI
│   │   ├── quantize.ts          # Cuantización
│   │   ├── harmonize.ts         # Armonización básica
│   │   ├── harmonize-16v.ts     # Polifonía 16 voces
│   │   └── export/              # Exportadores
│   ├── engines/                  # Wrappers de motores
│   │   ├── quantize-engine.ts
│   │   ├── harmonize-engine.ts
│   │   └── 16v-engine.ts
│   ├── components/
│   │   └── EngineCard.tsx       # Tarjeta reutilizable
│   ├── hooks/
│   │   └── useEngine.ts         # Hook de motor
│   └── services/
│       ├── api.ts               # Cliente API (local/remote)
│       └── fileUtils.ts         # Utilidades de archivos
└── App.tsx                       # Dashboard principal
```

## 🔧 Configuración

### Para usar con Vercel (producción)
Edita `src/services/api.ts` y descomenta la sección de fetch:

```typescript
// Descomenta esto para Vercel
const response = await fetch(`/api/engine-${engineType}`, {
  method: 'POST',
  body: formData,
});
```

### Para modo local (navegador)
El código actual ya está configurado para ejecutar los motores localmente.

## 📊 Características

- ✅ 3 motores completamente independientes
- ✅ Procesamiento en paralelo
- ✅ Code-splitting automático
- ✅ Validación de archivos MIDI
- ✅ Exportación a .mid, .musicxml, .pdf
- ✅ Logging detallado para debugging
- ✅ Manejo robusto de errores

## 🐛 Debugging

Abre la consola del navegador (F12) para ver logs detallados:
- `[Client]` - Logs del cliente
- `[Hook]` - Logs del hook
- `[Card]` - Logs de la tarjeta
- `[Quantize Engine]` - Logs del motor 1
- `[Harmonize Engine]` - Logs del motor 2
- `[16V Engine]` - Logs del motor 3

## 📝 Notas

- Los archivos en `api/` son referencia para Vercel, no se ejecutan en modo local
- El procesamiento local es más rápido (sin latencia de red)
- Para archivos grandes (>10MB), considera usar Vercel
- Todos los motores usan la misma base de código (DRY)
