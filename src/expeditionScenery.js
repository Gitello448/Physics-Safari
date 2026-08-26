// Animated savanna backdrop for the Expedition/curriculum screens: drifting
// clouds, swaying acacia trees, and the odd distant animal crossing the
// horizon. Purely decorative — sits behind the DOM question/chapter panels
// on its own canvas and animates only while the expedition overlay is open.

function hash(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export class ExpeditionScenery {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.viewW = 0;
    this.viewH = 0;
    this.t = 0;
    this.running = false;
    this._raf = null;

    this.clouds = Array.from({ length: 6 }, (_, i) => ({
      xFrac: hash(i * 3.1) ,
      yFrac: 0.06 + hash(i * 7.7) * 0.28,
      scale: 0.6 + hash(i * 5.3) * 1.1,
      speed: 6 + hash(i * 2.1) * 10, // px/sec at scale 1
      seed: i,
    }));

    this.trees = [
      { xFrac: 0.16, scale: 1.15, seed: 1 },
      { xFrac: 0.38, scale: 0.55, seed: 2 },
      { xFrac: 0.74, scale: 1.3, seed: 3 },
      { xFrac: 0.90, scale: 0.6, seed: 4 },
    ];

    this.bushes = [
      { xFrac: 0.58, scale: 1 },
      { xFrac: 0.28, scale: 0.7 },
    ];

    this.birds = [];
    this.birdSpawnTimer = 2000 + Math.random() * 3000;

    this.grazer = null; // an occasional distant animal silhouette
    this.grazerSpawnTimer = 4000 + Math.random() * 4000;

    this.onResize = this.resize.bind(this);
    window.addEventListener('resize', this.onResize);
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.parentElement?.clientWidth || window.innerWidth;
    const h = this.canvas.parentElement?.clientHeight || window.innerHeight;
    this.viewW = w;
    this.viewH = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    let last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(64, now - last);
      last = now;
      this.update(dt);
      this.render();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  update(dt) {
    this.t += dt;
    const dtSec = dt / 1000;

    for (const c of this.clouds) {
      c.xFrac += (c.speed * dtSec) / this.viewW;
      if (c.xFrac > 1.15) c.xFrac = -0.15;
    }

    this.birdSpawnTimer -= dt;
    if (this.birdSpawnTimer <= 0) {
      this.birdSpawnTimer = 6000 + Math.random() * 8000;
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.birds.push({
        x: dir > 0 ? -20 : this.viewW + 20,
        y: this.viewH * (0.12 + Math.random() * 0.15),
        dir, speed: 30 + Math.random() * 20, phase: Math.random() * 10,
      });
    }
    for (const b of this.birds) b.x += b.dir * b.speed * dtSec;
    this.birds = this.birds.filter((b) => b.x > -40 && b.x < this.viewW + 40);

    this.grazerSpawnTimer -= dt;
    if (!this.grazer && this.grazerSpawnTimer <= 0) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.grazer = {
        x: dir > 0 ? -30 : this.viewW + 30,
        dir, speed: 9 + Math.random() * 6,
        yFrac: 0.62 + Math.random() * 0.06,
        legPhase: 0,
      };
    }
    if (this.grazer) {
      this.grazer.x += this.grazer.dir * this.grazer.speed * dtSec;
      this.grazer.legPhase += dt;
      if (this.grazer.x < -40 || this.grazer.x > this.viewW + 40) {
        this.grazer = null;
        this.grazerSpawnTimer = 10000 + Math.random() * 12000;
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.viewW, h = this.viewH;
    const horizon = h * 0.62;

    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#2f8fdb');
    sky.addColorStop(0.6, '#6bb6ea');
    sky.addColorStop(1, '#bfe0f2');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon + 1);

    for (const c of this.clouds) this.drawCloud(c);

    for (const b of this.birds) this.drawBird(b);

    // distant hills
    ctx.fillStyle = 'rgba(90,110,130,0.35)';
    this.drawHillRange(horizon, 0.55, 42, 1);
    ctx.fillStyle = 'rgba(70,90,110,0.3)';
    this.drawHillRange(horizon, 0.8, 60, 2);

    const ground = ctx.createLinearGradient(0, horizon, 0, h);
    ground.addColorStop(0, '#c9a94f');
    ground.addColorStop(1, '#a9862f');
    ctx.fillStyle = ground;
    ctx.fillRect(0, horizon, w, h - horizon);

    this.drawGrassTexture(horizon, h, w);
    this.drawPath(horizon, h, w);

    for (const bu of this.bushes) this.drawBush(bu, horizon, h);
    if (this.grazer) this.drawGrazer(this.grazer, horizon, h);
    for (const tr of this.trees) this.drawTree(tr, horizon, h);
  }

  drawHillRange(horizon, baseFrac, amp, seed) {
    const ctx = this.ctx, w = this.viewW;
    const baseY = horizon * baseFrac + horizon * (1 - baseFrac);
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const x = (w * i) / steps;
      const y = horizon - amp * (0.4 + 0.6 * hash(i * 1.7 + seed * 13));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, horizon);
    ctx.closePath();
    ctx.fill();
  }

  drawCloud(c) {
    const ctx = this.ctx;
    const cx = c.xFrac * this.viewW;
    const cy = c.yFrac * this.viewH;
    const s = c.scale * 26;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    const puffs = [[-1.4, 0.1, 1], [-0.6, -0.3, 1.2], [0.3, -0.35, 1.3], [1.1, -0.05, 1.05], [1.7, 0.15, 0.8], [-0.1, 0.25, 1.4]];
    for (const [dx, dy, r] of puffs) {
      ctx.beginPath();
      ctx.ellipse(cx + dx * s, cy + dy * s, r * s * 0.65, r * s * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(160,190,215,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.32, s * 1.7, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBird(b) {
    const ctx = this.ctx;
    const flap = Math.sin(this.t / 90 + b.phase) * 4;
    ctx.strokeStyle = 'rgba(40,40,40,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(b.x - 6, b.y + flap);
    ctx.lineTo(b.x, b.y - 3);
    ctx.lineTo(b.x + 6, b.y + flap);
    ctx.stroke();
  }

  drawGrassTexture(horizon, h, w) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(90,65,20,0.18)';
    const rows = 14;
    for (let r = 0; r < rows; r++) {
      const y = horizon + ((h - horizon) * r) / rows;
      const count = Math.floor(w / 26);
      for (let i = 0; i < count; i++) {
        const x = ((w / count) * i + (r % 2) * 12 + hash(i * 3 + r * 11) * 10) % w;
        ctx.fillRect(x, y + hash(i + r) * 6, 2, 6);
      }
    }
  }

  drawPath(horizon, h, w) {
    const ctx = this.ctx;
    const cx = w * 0.46;
    ctx.fillStyle = '#c9915a';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.03, horizon);
    ctx.quadraticCurveTo(cx + w * 0.08, horizon + (h - horizon) * 0.45, cx - w * 0.06, h);
    ctx.lineTo(cx + w * 0.12, h);
    ctx.quadraticCurveTo(cx + w * 0.22, horizon + (h - horizon) * 0.45, cx + w * 0.05, horizon);
    ctx.closePath();
    ctx.fill();
  }

  drawBush(b, horizon, h) {
    const ctx = this.ctx;
    const x = b.xFrac * this.viewW;
    const y = horizon + (h - horizon) * 0.22;
    const s = 26 * b.scale;
    const sway = Math.sin(this.t / 700 + b.xFrac * 10) * 1.5;
    ctx.fillStyle = '#3f6b28';
    for (const [dx, dy, r] of [[-0.4, 0.1, 0.42], [0.35, 0.05, 0.4], [0, -0.15, 0.46]]) {
      ctx.beginPath();
      ctx.ellipse(x + dx * s + sway, y + dy * s, r * s, r * s * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawTree(tr, horizon, h) {
    const ctx = this.ctx;
    const x = tr.xFrac * this.viewW;
    const groundY = horizon + (h - horizon) * 0.3;
    const s = 70 * tr.scale;
    const sway = Math.sin(this.t / 1400 + tr.seed * 2) * 0.035;

    ctx.save();
    ctx.translate(x, groundY);

    // trunk
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(-s * 0.035, -s * 0.55, s * 0.07, s * 0.55);
    ctx.strokeStyle = '#5a3a1e';
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.lineTo(-s * 0.18, -s * 0.72);
    ctx.moveTo(0, -s * 0.55);
    ctx.lineTo(s * 0.2, -s * 0.75);
    ctx.stroke();

    // swaying canopy (flat acacia umbrella shape)
    ctx.translate(0, -s * 0.78);
    ctx.rotate(sway);
    ctx.fillStyle = '#4a7a2e';
    const lobes = [[-0.55, 0.02, 0.4], [-0.15, -0.12, 0.46], [0.3, -0.06, 0.42], [0.62, 0.04, 0.34], [0.02, 0.14, 0.5]];
    for (const [dx, dy, r] of lobes) {
      ctx.beginPath();
      ctx.ellipse(dx * s, dy * s, r * s, r * s * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#5c9438';
    for (const [dx, dy, r] of [[-0.3, -0.1, 0.26], [0.35, -0.14, 0.24], [0.05, 0.0, 0.3]]) {
      ctx.beginPath();
      ctx.ellipse(dx * s, dy * s, r * s, r * s * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawGrazer(g, horizon, h) {
    const ctx = this.ctx;
    const y = horizon + (h - horizon) * g.yFrac;
    const s = 16;
    const legSwing = Math.sin(g.legPhase / 160) * 3;
    ctx.save();
    ctx.translate(g.x, y);
    ctx.scale(g.dir, 1);
    ctx.fillStyle = 'rgba(35,30,20,0.55)';
    ctx.fillRect(-s * 0.4, -s * 0.35, s * 0.8, s * 0.32);
    ctx.fillRect(s * 0.28, -s * 0.55, s * 0.18, s * 0.3);
    ctx.fillRect(-s * 0.32 + legSwing * 0.1, -s * 0.05, s * 0.09, s * 0.35);
    ctx.fillRect(s * 0.1 - legSwing * 0.1, -s * 0.05, s * 0.09, s * 0.35);
    ctx.restore();
  }
}
