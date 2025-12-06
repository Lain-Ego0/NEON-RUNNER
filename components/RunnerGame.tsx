import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Dino, Obstacle, Cloud, Particle } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRAVITY,
  INITIAL_GAME_SPEED,
  MAX_GAME_SPEED,
  SPEED_INCREMENT,
  DINO_WIDTH,
  DINO_HEIGHT,
  DINO_START_X,
  JUMP_STRENGTH,
  GROUND_HEIGHT,
  SPAWN_RATE_MIN,
  SPAWN_RATE_MAX,
  COLORS,
} from '../constants';

const RunnerGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // React State for UI overlays (Score, Menu)
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Mutable Game State (Refs for performance to avoid re-renders on every frame)
  const requestRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const gameSpeedRef = useRef<number>(INITIAL_GAME_SPEED);
  
  // Entities
  const dinoRef = useRef<Dino>({
    x: DINO_START_X,
    y: CANVAS_HEIGHT - GROUND_HEIGHT - DINO_HEIGHT,
    w: DINO_WIDTH,
    h: DINO_HEIGHT,
    dy: 0,
    jumpPower: JUMP_STRENGTH,
    grounded: true,
    color: COLORS.dino,
  });
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nextSpawnTimerRef = useRef<number>(0);

  // Sound placeholders (Visual only for now)
  
  // Initialization
  useEffect(() => {
    const saved = localStorage.getItem('neon-runner-highscore');
    if (saved) setHighScore(parseInt(saved, 10));
    
    // Initial Clouds
    for(let i=0; i<5; i++) {
        cloudsRef.current.push(createCloud(Math.random() * CANVAS_WIDTH));
    }

    // Handle Resize
    const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
            // Responsive canvas logic could go here, strictly sticking to aspect ratio
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const createCloud = (x: number): Cloud => ({
    x,
    y: Math.random() * (CANVAS_HEIGHT / 2),
    w: 60 + Math.random() * 40,
    speed: 0.5 + Math.random() * 0.5
  });

  const createParticles = (x: number, y: number, color: string, count: number = 5) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1.0,
        color
      });
    }
  };

  const spawnObstacle = () => {
    const typeChance = Math.random();
    let type: Obstacle['type'] = 'CACTUS_SMALL';
    let w = 30;
    let h = 50;
    let y = CANVAS_HEIGHT - GROUND_HEIGHT - h;

    if (typeChance > 0.8) {
        type = 'CACTUS_LARGE';
        w = 40; 
        h = 70;
        y = CANVAS_HEIGHT - GROUND_HEIGHT - h;
    } else if (typeChance > 0.95 && scoreRef.current > 500) {
        // Birds appear later
        type = 'BIRD';
        w = 40;
        h = 30;
        y = CANVAS_HEIGHT - GROUND_HEIGHT - 80 - (Math.random() * 50); 
    }

    obstaclesRef.current.push({
      x: CANVAS_WIDTH,
      y,
      w,
      h,
      id: Date.now() + Math.random(),
      type,
      speedOffset: 0
    });
  };

  const resetGame = () => {
    setGameState(GameState.PLAYING);
    setScore(0);
    scoreRef.current = 0;
    gameSpeedRef.current = INITIAL_GAME_SPEED;
    frameCountRef.current = 0;
    nextSpawnTimerRef.current = 0;
    obstaclesRef.current = [];
    particlesRef.current = [];
    
    dinoRef.current = {
      x: DINO_START_X,
      y: CANVAS_HEIGHT - GROUND_HEIGHT - DINO_HEIGHT,
      w: DINO_WIDTH,
      h: DINO_HEIGHT,
      dy: 0,
      jumpPower: JUMP_STRENGTH,
      grounded: true,
      color: COLORS.dino,
    };
    
    // Start Loop
    cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const handleJump = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    
    const dino = dinoRef.current;
    if (dino.grounded) {
      dino.dy = -dino.jumpPower;
      dino.grounded = false;
      createParticles(dino.x + dino.w / 2, dino.y + dino.h, COLORS.text, 3);
    }
  }, [gameState]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === GameState.PLAYING) {
          handleJump();
        } else {
            resetGame();
        }
      }
    };
    
    const handleTouch = (e: TouchEvent) => {
       // Prevent default to stop scrolling
       // e.preventDefault(); 
       if (gameState === GameState.PLAYING) {
          handleJump();
        } else if (gameState !== GameState.PLAYING) {
            resetGame();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Attach touch to canvas specifically to avoid global scroll issues
    const cvs = canvasRef.current;
    if (cvs) cvs.addEventListener('touchstart', handleTouch);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (cvs) cvs.removeEventListener('touchstart', handleTouch);
    };
  }, [gameState, handleJump]);


  // THE GAME LOOP
  const gameLoop = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // 1. Update Physics
    frameCountRef.current++;
    scoreRef.current += 0.1; // Score based on distance
    setScore(Math.floor(scoreRef.current));

    // Speed up
    if (gameSpeedRef.current < MAX_GAME_SPEED) {
        gameSpeedRef.current += SPEED_INCREMENT;
    }

    const dino = dinoRef.current;

    // Dino Gravity
    if (!dino.grounded) {
        dino.dy += GRAVITY;
    }

    dino.y += dino.dy;

    // Floor Collision
    if (dino.y + dino.h > CANVAS_HEIGHT - GROUND_HEIGHT) {
        dino.y = CANVAS_HEIGHT - GROUND_HEIGHT - dino.h;
        dino.dy = 0;
        dino.grounded = true;
    }

    // Clouds
    cloudsRef.current.forEach(c => {
        c.x -= c.speed;
        if (c.x + c.w < 0) {
            c.x = CANVAS_WIDTH;
            c.y = Math.random() * (CANVAS_HEIGHT / 2);
        }
    });

    // Obstacle Spawning
    nextSpawnTimerRef.current--;
    if (nextSpawnTimerRef.current <= 0) {
        spawnObstacle();
        const rate = SPAWN_RATE_MIN + Math.random() * (SPAWN_RATE_MAX - SPAWN_RATE_MIN);
        // As speed increases, spawn faster? Or just let speed handle difficulty?
        // Let's reduce spawn timer slightly as speed goes up
        const speedFactor = INITIAL_GAME_SPEED / gameSpeedRef.current;
        nextSpawnTimerRef.current = rate * speedFactor;
    }

    // Update Obstacles & Collision
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obs = obstaclesRef.current[i];
        obs.x -= gameSpeedRef.current;

        // Collision Detection (AABB with slight padding for fairness)
        const pad = 5;
        if (
            dino.x + pad < obs.x + obs.w - pad &&
            dino.x + dino.w - pad > obs.x + pad &&
            dino.y + pad < obs.y + obs.h - pad &&
            dino.y + dino.h - pad > obs.y + pad
        ) {
            // GAME OVER
            setGameState(GameState.GAME_OVER);
            const finalScore = Math.floor(scoreRef.current);
            const saved = localStorage.getItem('neon-runner-highscore');
            const currentHigh = saved ? parseInt(saved, 10) : 0;
            if (finalScore > currentHigh) {
                localStorage.setItem('neon-runner-highscore', finalScore.toString());
                setHighScore(finalScore);
            }
            createParticles(dino.x + dino.w/2, dino.y + dino.h/2, COLORS.dino, 20);
            cancelAnimationFrame(requestRef.current);
            // Draw one last frame to show collision
            draw(ctx); 
            return; 
        }

        // Cleanup
        if (obs.x + obs.w < 0) {
            obstaclesRef.current.splice(i, 1);
        }
    }

    // Update Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) particlesRef.current.splice(i, 1);
    }

    // 2. Draw
    draw(ctx);

    requestRef.current = requestAnimationFrame(gameLoop);
  }, []); // Dependencies should be empty or minimal for loop

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid Effect (Retro Synthwave)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.moveTo(x - (frameCountRef.current * gameSpeedRef.current * 0.5) % 40, CANVAS_HEIGHT - GROUND_HEIGHT);
        ctx.lineTo(x - 200 - (frameCountRef.current * gameSpeedRef.current * 0.5) % 40, CANVAS_HEIGHT);
    }
    ctx.stroke();

    // Ground Line
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT - GROUND_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_HEIGHT);
    ctx.stroke();

    // Clouds
    ctx.fillStyle = '#334155';
    cloudsRef.current.forEach(c => {
        ctx.fillRect(c.x, c.y, c.w, 20); // Simple block clouds
    });

    // Obstacles
    obstaclesRef.current.forEach(obs => {
        ctx.fillStyle = COLORS.obstacle;
        // Simple glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.obstacle;
        
        if (obs.type === 'BIRD') {
             ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
             // Wing
             ctx.fillStyle = '#fbcfe8';
             ctx.fillRect(obs.x + 10, obs.y - 10 + (Math.sin(frameCountRef.current * 0.2) * 5), 20, 10);
        } else {
            // Cactus shape (roughly)
            ctx.fillRect(obs.x + obs.w/3, obs.y, obs.w/3, obs.h); // Center stem
            ctx.fillRect(obs.x, obs.y + 10, obs.w/3, obs.h/2); // Left arm
            ctx.fillRect(obs.x + obs.w*0.66, obs.y + 5, obs.w/3, obs.h/2); // Right arm
        }
        ctx.shadowBlur = 0;
    });

    // Dino
    const dino = dinoRef.current;
    ctx.fillStyle = dino.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = dino.color;
    // Draw Dino Body
    ctx.fillRect(dino.x, dino.y, dino.w, dino.h);
    // Eye
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(dino.x + dino.w - 10, dino.y + 5, 5, 5);
    ctx.shadowBlur = 0;

    // Particles
    particlesRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, 4, 4);
        ctx.globalAlpha = 1.0;
    });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-4xl mx-auto border-4 border-slate-700 rounded-lg overflow-hidden shadow-2xl bg-slate-900 aspect-[2/1]"
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full block"
      />

      {/* HUD */}
      <div className="absolute top-4 right-4 flex flex-col items-end pointer-events-none font-mono">
        <div className="text-slate-400 text-sm">HI {highScore.toString().padStart(5, '0')}</div>
        <div className="text-white text-2xl font-bold tracking-widest">{score.toString().padStart(5, '0')}</div>
      </div>

      {/* Start Screen */}
      {gameState === GameState.START && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-4 tracking-tighter">
            NEON RUNNER
          </h1>
          <p className="text-slate-300 mb-8 font-mono animate-pulse">Press SPACE or TAP to Jump</p>
          <button 
            onClick={resetGame}
            className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-full transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.5)]"
          >
            START GAME
          </button>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10">
          <h2 className="text-4xl font-bold text-pink-500 mb-2">GAME OVER</h2>
          <div className="text-white text-xl mb-8 font-mono">Score: {score}</div>
          <button 
            onClick={resetGame}
            className="px-8 py-3 bg-pink-500 hover:bg-pink-400 text-white font-bold rounded-full transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(244,114,182,0.5)]"
          >
            TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );
};

export default RunnerGame;