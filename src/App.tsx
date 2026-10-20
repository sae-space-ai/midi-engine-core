import { EngineCard } from './components/EngineCard';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>MIDI TOOLBOX <span>SUITE</span></h1>
        <p>Hangar de Motores Independientes</p>
      </header>
      
      <main className="dashboard-grid">
        <EngineCard 
          title="01. CUANTIZADOR" 
          description="Alineación matemática perfecta a rejilla de 1/16. Cero error humano."
          engineType="quantize"
          accentColor="#00ff9d"
        />
        
        <EngineCard 
          title="02. ARMONIZADOR" 
          description="Generación de bajo y acordes funcionales basados en la tonalidad detectada."
          engineType="harmonize"
          accentColor="#00d4ff"
        />
        
        <EngineCard 
          title="03. POLIFONÍA 16V" 
          description="Expansión algorítmica a 16 voces independientes con voice-leading espectral."
          engineType="16v"
          accentColor="#ffaa00"
        />
      </main>

      <footer className="app-footer">
        <p>MIDI Toolbox Suite v1.0 | 3 Motores Independientes</p>
        <p className="footer-note">Cada herramienta procesa tu MIDI de forma aislada</p>
      </footer>
    </div>
  );
}

export default App;
