import './style.css'

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = Math.random() * 3 + 1;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.life = 1.0;
    this.decay = Math.random() * 0.02 + 0.01;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class GravityWell {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 120; // Increased
    this.strength = 1.2; // Increased from 0.5
    this.life = 1.0;
    this.decay = 0.02; // Faster decay
  }

  update() {
    this.life -= this.decay;
  }

  draw(ctx) {
    const opacity = this.life;
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * opacity);
    gradient.addColorStop(0, `rgba(0, 242, 255, ${opacity * 0.5})`);
    gradient.addColorStop(1, 'rgba(0, 242, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * opacity, 0, Math.PI * 2);
    ctx.fill();

    // Inner ring
    ctx.strokeStyle = `rgba(0, 242, 255, ${opacity})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

const LEVELS = [
  {
    name: "Sector 01: Initiation",
    start: { x: 100, y: 300 },
    goal: { x: 700, y: 300 },
    obstacles: [],
    energy: 100
  },
  {
    name: "Sector 02: Corridors",
    start: { x: 100, y: 100 },
    goal: { x: 700, y: 500 },
    obstacles: [
      { x: 300, y: 0, w: 50, h: 400 },
      { x: 500, y: 200, w: 50, h: 400 }
    ],
    energy: 120
  },
  {
    name: "Sector 03: The Gauntlet",
    start: { x: 50, y: 300 },
    goal: { x: 750, y: 300 },
    obstacles: [
      { x: 200, y: 200, w: 400, h: 20 },
      { x: 200, y: 380, w: 400, h: 20 },
      { x: 380, y: 220, w: 40, h: 160 }
    ],
    energy: 150
  }
];

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = 0;
    this.height = 0;

    this.orb = { x: 0, y: 0, vx: 0, vy: 0, radius: 8 };
    this.goal = { x: 0, y: 0, radius: 20 };
    this.wells = [];
    this.particles = [];
    this.obstacles = [];

    this.currentLevelIdx = 0;
    this.energy = 100;
    this.pulseCount = 0;
    this.state = 'START'; // START, PLAYING, WIN, OVER

    this.init();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.handlePointer(e));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handlePointer(e.touches[0]);
    });

    document.getElementById('startBtn').addEventListener('click', () => this.startGame());
    document.getElementById('nextBtn').addEventListener('click', () => this.nextLevel());
    document.getElementById('retryBtn').addEventListener('click', () => this.startGame());

    this.loop();
  }

  init() {
    // Load progress from local storage
    const saved = localStorage.getItem('neon_gravity_progress');
    if (saved) {
      this.currentLevelIdx = parseInt(saved) || 0;
    }
  }

  saveProgress() {
    localStorage.setItem('neon_gravity_progress', this.currentLevelIdx.toString());
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  startGame() {
    if (this.currentLevelIdx >= LEVELS.length) {
      this.currentLevelIdx = 0;
    }
    const level = LEVELS[this.currentLevelIdx];
    this.orb.x = level.start.x;
    this.orb.y = level.start.y;
    this.orb.vx = 0;
    this.orb.vy = 0;
    this.goal.x = level.goal.x;
    this.goal.y = level.goal.y;
    this.obstacles = level.obstacles;
    this.energy = level.energy;
    this.pulseCount = 0;
    this.wells = [];
    this.particles = [];

    this.state = 'PLAYING';
    this.hideScreens();
    this.updateUI();
  }

  hideScreens() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  }

  showScreen(id) {
    this.hideScreens();
    document.getElementById(id).classList.add('active');
  }

  handlePointer(e) {
    if (this.state !== 'PLAYING') return;
    if (this.energy <= 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.wells.push(new GravityWell(x, y));
    this.energy -= 10;
    this.pulseCount++;
    this.updateUI();

    // Flash effect
    this.particles.push(...Array(10).fill(0).map(() => new Particle(x, y, '#00f2ff')));
  }

  updateUI() {
    document.getElementById('energyVal').innerText = Math.max(0, Math.floor(this.energy));
    document.getElementById('pulseCount').innerText = this.pulseCount;
    document.getElementById('levelName').innerText = LEVELS[this.currentLevelIdx]?.name || "Final Frontier";

    if (this.energy < 30) {
      document.getElementById('energyVal').style.color = 'var(--danger)';
    } else {
      document.getElementById('energyVal').style.color = 'var(--primary-color)';
    }

    const best = localStorage.getItem(`neon_best_${this.currentLevelIdx}`);
    document.getElementById('bestPulses').innerText = best ? `Best: ${best}` : 'Best: --';
  }

  nextLevel() {
    this.currentLevelIdx++;
    if (this.currentLevelIdx < LEVELS.length) {
      this.saveProgress();
      this.startGame();
    } else {
      // Reached end? 
      this.currentLevelIdx = 0;
      this.saveProgress();
      this.startGame();
    }
  }

  checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.w &&
      rect1.x + rect1.r * 2 > rect2.x &&
      rect1.y < rect2.y + rect2.h &&
      rect1.y + rect1.r * 2 > rect2.y;
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }

  update() {
    if (this.state !== 'PLAYING') return;

    // Apply gravity
    this.wells.forEach(well => {
      const dx = well.x - this.orb.x;
      const dy = well.y - this.orb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < well.radius * 2) {
        const force = (well.strength * well.life) / (dist / 50 + 1);
        this.orb.vx += (dx / dist) * force;
        this.orb.vy += (dy / dist) * force;
      }
      well.update();
    });
    this.wells = this.wells.filter(w => w.life > 0);

    // Damping
    this.orb.vx *= 0.985;
    this.orb.vy *= 0.985;

    // Move
    this.orb.x += this.orb.vx;
    this.orb.y += this.orb.vy;

    // Boundary check
    if (this.orb.x < 0 || this.orb.x > this.width || this.orb.y < 0 || this.orb.y > this.height) {
      this.gameOver("Out of bounds");
    }

    // Goal check
    const distToGoal = Math.sqrt(Math.pow(this.goal.x - this.orb.x, 2) + Math.pow(this.goal.y - this.orb.y, 2));
    if (distToGoal < this.goal.radius + this.orb.radius) {
      this.win();
    }

    // Obstacle check
    this.obstacles.forEach(obs => {
      if (this.orb.x + this.orb.radius > obs.x &&
        this.orb.x - this.orb.radius < obs.x + obs.w &&
        this.orb.y + this.orb.radius > obs.y &&
        this.orb.y - this.orb.radius < obs.y + obs.h) {
        this.gameOver("Collision Detected");
      }
    });

    // Trail particles
    if (Math.abs(this.orb.vx) + Math.abs(this.orb.vy) > 0.5) {
      this.particles.push(new Particle(this.orb.x, this.orb.y, '#ff00e5'));
    }

    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => p.life > 0);

    // Energy logic
    if (this.energy <= 0 && Math.abs(this.orb.vx) < 0.1 && Math.abs(this.orb.vy) < 0.1) {
      this.gameOver("Energy Depleted");
    }
  }

  win() {
    this.state = 'WIN';
    document.getElementById('finalScore').innerText = this.pulseCount + (this.pulseCount === 1 ? " PULSE" : " PULSES");

    const best = localStorage.getItem(`neon_best_${this.currentLevelIdx}`);
    if (!best || this.pulseCount < parseInt(best)) {
      localStorage.setItem(`neon_best_${this.currentLevelIdx}`, this.pulseCount.toString());
    }

    this.showScreen('winScreen');
  }

  gameOver(reason) {
    this.state = 'OVER';
    document.getElementById('overReason').innerText = reason;
    this.showScreen('overScreen');
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, this.width, this.height);

    // Grid effect
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < this.width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
    }

    // Obstacles
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
    ctx.fillStyle = '#1a1a1a';
    ctx.strokeStyle = '#444';
    this.obstacles.forEach(obs => {
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
    });

    // Goal
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff00e5';
    ctx.fillStyle = '#ff00e5';
    ctx.beginPath();
    ctx.arc(this.goal.x, this.goal.y, this.goal.radius, 0, Math.PI * 2);
    ctx.fill();
    // Inner glow
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.goal.x, this.goal.y, this.goal.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Wells
    this.wells.forEach(well => well.draw(ctx));

    // Particles
    this.particles.forEach(p => p.draw(ctx));

    // Orb
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f2ff';
    ctx.fillStyle = '#00f2ff';
    ctx.beginPath();
    ctx.arc(this.orb.x, this.orb.y, this.orb.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }
}

new Game();
