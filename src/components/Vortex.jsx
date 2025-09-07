class CardVortex {
  constructor(card, options = {}) {
    this.card = card;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'vortex-canvas';
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.card.appendChild(this.canvas);

    const cssColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--hfv').trim() || '#00ff88';

    // Detect coarse pointer (touch-first devices)
    this.isCoarse = window.matchMedia('(pointer: coarse)').matches;

    // Config — mobile gets more particles, larger radius, faster spin
    this.color = options.color || cssColor;
    this.particleCountBase = options.particleCountBase ?? (this.isCoarse ? 120 : 64);
    this.particleJitter = options.particleJitter ?? 0.15; // ±15% count randomness per card
    this.particleSize = options.particleSize ?? (this.isCoarse ? [2, 6] : [1.6, 5]);
    this.maxRadius = options.maxRadius ?? (this.isCoarse ? 220 : 160);
    this.spiralOutSpeed = options.spiralOutSpeed ?? (this.isCoarse ? 300 : 220); // px/sec
    this.rotationSpeed = options.rotationSpeed ?? (this.isCoarse ? 2.0 : 1.6); // rev/sec
    this.fadeOutDuration = options.fadeOutDuration ?? (this.isCoarse ? 160 : 220); // ms
    this.trailAlpha = options.trailAlpha ?? 0.1; // lower -> longer trail
    this.glowAlpha = options.glowAlpha ?? 0.75;

    // State
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.active = false;
    this.fading = false;
    this.pointer = { x: 0, y: 0 };
    this.time = 0;
    this.radiusBase = 0;
    this._raf = null;
    this._lastTs = 0;

    // Build particle field (dozens of minis)
    this.particles = this.makeParticles();

    // Bind
    this.resize = this.resize.bind(this);
    this.onEnter = this.onEnter.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onLeave = this.onLeave.bind(this);
    this.loop = this.loop.bind(this);

    // Listeners
    this.card.addEventListener('pointerenter', this.onEnter, { passive: true });
    this.card.addEventListener('pointermove', this.onMove, { passive: true });
    this.card.addEventListener('pointerdown', this.onEnter, { passive: true });
    this.card.addEventListener('pointerleave', this.onLeave, { passive: true });
    this.card.addEventListener('pointercancel', this.onLeave, { passive: true });

    window.addEventListener('resize', this.resize, { passive: true });
    this.resize();
  }

  makeParticles() {
    const rect = this.card.getBoundingClientRect();
    // Density-aware bump: more area -> more particles, but capped
    const area = rect.width * rect.height;
    const densityBonus = Math.min(60, Math.floor(area / 6000)); // +1 per 6k px^2, cap +60
    const jitter = 1 + (Math.random() * 2 - 1) * this.particleJitter;
    const count = Math.max(24, Math.floor((this.particleCountBase + densityBonus) * jitter));

    const TWO_PI = Math.PI * 2;
    const arr = new Array(count).fill(0).map((_, i) => {
      const angleOffset = (TWO_PI / count) * i + Math.random() * 0.2; // slight irregularity
      const size = this.rand(this.particleSize[0], this.particleSize[1]);
      const radialNoise = this.rand(0.85, 1.15); // per-particle radius variance
      const speedNoise = this.rand(0.9, 1.1); // slight angular speed variance
      return { angleOffset, size, radialNoise, speedNoise, life: 1 };
    });
    return arr;
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this.resize);
    this.card.removeEventListener('pointerenter', this.onEnter);
    this.card.removeEventListener('pointermove', this.onMove);
    this.card.removeEventListener('pointerdown', this.onEnter);
    this.card.removeEventListener('pointerleave', this.onLeave);
    this.card.removeEventListener('pointercancel', this.onLeave);
    this.canvas.remove();
  }

  rand(min, max) { return Math.random() * (max - min) + min; }

  resize() {
    const rect = this.card.getBoundingClientRect();
    this.canvas.width = Math.ceil(rect.width * this.dpr);
    this.canvas.height = Math.ceil(rect.height * this.dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  onEnter(e) {
    const rect = this.card.getBoundingClientRect();
    this.pointer.x = e.clientX - rect.left;
    this.pointer.y = e.clientY - rect.top;

    this.active = true;
    this.fading = false;
    this.time = 0;
    this.radiusBase = 0;

    // Full refresh of particles for a thick “splash” on new card
    this.particles = this.makeParticles();
    for (const p of this.particles) p.life = 1;

    if (!this._raf) {
      this._lastTs = performance.now();
      this._raf = requestAnimationFrame(this.loop);
    }
  }

  onMove(e) {
    const rect = this.card.getBoundingClientRect();
    this.pointer.x = e.clientX - rect.left;
    this.pointer.y = e.clientY - rect.top;
    if (!this.active) this.onEnter(e);
  }

  onLeave() {
    this.fading = true;
    this.active = false;
  }

  loop(ts) {
    const dt = Math.min(0.032, (ts - this._lastTs) / 1000);
    this._lastTs = ts;

    const ctx = this.ctx;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    // Slight trail: draw a translucent rect to fade previous frame
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = this.trailAlpha;
    ctx.fillStyle = 'rgba(0,0,0,1)'; // relying on blend modes for glow; black trail works on dark UIs
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    if (this.active) {
      this.time += dt;
      this.radiusBase = Math.min(this.maxRadius, this.radiusBase + this.spiralOutSpeed * dt);
    } else if (this.fading) {
      const decay = dt / (this.fadeOutDuration / 1000);
      for (const p of this.particles) p.life = Math.max(0, p.life - decay);
      if (this.particles.every(p => p.life === 0)) {
        this.fading = false;
        cancelAnimationFrame(this._raf);
        this._raf = null;
        // final clear to remove residue
        ctx.clearRect(0, 0, w, h);
        return;
      }
    }

    // Draw particles in a dense rotating spiral
    const TWO_PI = Math.PI * 2;
    const angle = this.time * this.rotationSpeed * TWO_PI;

    for (const p of this.particles) {
      if (p.life <= 0) continue;

      // tighter inner ring + expanding outer spiral with noise
      const radius =
        (this.radiusBase * 0.3) +
        (this.radiusBase * 0.7) * (0.5 + 0.5 * Math.sin(angle * p.speedNoise + p.angleOffset * 2)) * p.radialNoise;

      const px = this.pointer.x + Math.cos(angle * p.speedNoise + p.angleOffset) * radius;
      const py = this.pointer.y + Math.sin(angle * p.speedNoise + p.angleOffset) * radius;

      const r = p.size;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
      grad.addColorStop(0, this.color);
      grad.addColorStop(0.35, this.color + 'b0'); // semi
      grad.addColorStop(1, 'transparent');

      ctx.globalAlpha = this.glowAlpha * p.life;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Keep animating
    this._raf = requestAnimationFrame(this.loop);
  }
}

// Attach to all .card and hand off as you move between cards
(function initVortexOnCards() {
  const cards = Array.from(document.querySelectorAll('.card'));
  if (!cards.length) return;

  const instances = new WeakMap();

  function ensure(card) {
    let inst = instances.get(card);
    if (!inst) {
      inst = new CardVortex(card);
      instances.set(card, inst);
    }
    return inst;
  }

  let currentCard = null;

  // Smooth transfer across cards
  document.addEventListener('pointermove', (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const nextCard = el && el.closest('.card');

    if (nextCard !== currentCard) {
      if (currentCard) instances.get(currentCard)?.onLeave();
      if (nextCard) ensure(nextCard).onEnter(e);
      currentCard = nextCard;
    } else if (currentCard) {
      ensure(currentCard).onMove(e);
    }
  }, true);

  // Touchstart: burst immediately
  document.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    ensure(card).onEnter(e);
    currentCard = card;
  }, { passive: true });

  const endAll = () => {
    if (currentCard) {
      instances.get(currentCard)?.onLeave();
      currentCard = null;
    }
  };
  document.addEventListener('pointerup', endAll, { passive: true });
  document.addEventListener('pointercancel', endAll, { passive: true });
  document.addEventListener('mouseleave', endAll, { passive: true });
})();
const Vortex = () => {
  return <div>Vortex Component</div>;
};

export default Vortex;
