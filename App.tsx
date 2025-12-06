import React from 'react';
import RunnerGame from './components/RunnerGame';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl mb-4 flex justify-between items-center">
         <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
            <span className="text-slate-400 font-mono text-sm uppercase tracking-wider">System: Online</span>
         </div>
         <div className="text-slate-500 font-mono text-xs">v1.0.0 | WebGL Ready</div>
      </div>
      
      <RunnerGame />
      
      <div className="mt-8 text-center max-w-md">
        <p className="text-slate-500 text-sm">
          Obstacles accelerate over time. Use <span className="text-cyan-400 font-bold">[SPACE]</span> or <span className="text-cyan-400 font-bold">[UP ARROW]</span> to jump.
          Mobile users can tap the screen.
        </p>
        <p className="text-slate-600 text-xs mt-4">
            Note: This web application can be packaged into an .exe using tools like Electron or Tauri.
        </p>
      </div>
    </div>
  );
};

export default App;