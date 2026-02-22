const body = document.body;
const themeToggle = document.getElementById("themeToggle");
const scopeToggle = document.getElementById("scopeToggle");
const nav = document.querySelector(".nav");
const progressBar = document.getElementById("progressBar");
const signalCanvas = document.getElementById("signalCanvas");
const signalCtx = signalCanvas.getContext("2d", { alpha: true });
const heroCanvas = document.getElementById("heroCarrierCanvas");
const heroCtx = heroCanvas.getContext("2d", { alpha: true });
const previousSweepCanvas = document.createElement("canvas");
const previousSweepCtx = previousSweepCanvas.getContext("2d", { alpha: true });
const previousSweepCanvasLast = document.createElement("canvas");
const previousSweepCtxLast = previousSweepCanvasLast.getContext("2d", { alpha: true });
const fadeoutCanvas = document.createElement("canvas");
const fadeoutCtx = fadeoutCanvas.getContext("2d", { alpha: true });
const hero = document.getElementById("hero");
const parallaxLayers = document.querySelectorAll(".hero__layer");
const sections = Array.from(document.querySelectorAll(".node-section"));
const reactiveCards = Array.from(document.querySelectorAll(".signal-reactive"));
const navLinks = Array.from(document.querySelectorAll(".nav-link"));

const rfPulses = [];
const activatedSections = new Set(["hero"]);

const pointer = {
  x: window.innerWidth * 0.5,
  y: window.innerHeight * 0.5,
  vx: 0,
  vy: 0,
  speed: 0,
  lastX: window.innerWidth * 0.5,
  lastY: window.innerHeight * 0.5,
  lastT: performance.now(),
  smoothSpeed: 0
};

const state = {
  width: window.innerWidth,
  height: window.innerHeight,
  scrollY: window.scrollY,
  maxScroll: Math.max(1, document.documentElement.scrollHeight - window.innerHeight),
  progress: 0,
  scope: false,
  carrierColor: "#2a9df4",
  modulationColor: "#1d6fdc",
  glowCarrier: "rgba(42,157,244,0.35)",
  glowMod: "rgba(29,111,220,0.26)",
  cardCenters: [],
  mu: 0.7,
  beta: 5,
  sweepDuration: 15,
  lastSweepProgress: 0,
  ghostTransitionStart: 0,
  ghostTransitionDuration: 1200,
  ghostTransitionActive: false,
  fadeoutActive: false,
  fadeoutStart: 0,
  fadeoutDuration: 1800
};

function setTheme(theme) {
  const dark = theme === "dark";
  body.classList.toggle("dark", dark);
  body.classList.toggle("light", !dark);
  themeToggle.textContent = dark ? "Light" : "Dark";
  localStorage.setItem("theme", theme);
  updateSignalPalette();
}

function setScopeMode(enabled) {
  body.classList.toggle("oscilloscope", enabled);
  scopeToggle.classList.toggle("active", enabled);
  state.scope = enabled;
  localStorage.setItem("scope", enabled ? "1" : "0");
}


function updateSignalPalette() {
  const css = getComputedStyle(body);
  state.carrierColor = css.getPropertyValue("--carrier").trim();
  state.modulationColor = css.getPropertyValue("--modulation").trim();
  state.glowCarrier = css.getPropertyValue("--glow-carrier").trim();
  state.glowMod = css.getPropertyValue("--glow-mod").trim();

  const dark = body.classList.contains("dark");

  if (window.HeroThree) {
    window.HeroThree.updatePalette(state.carrierColor, state.modulationColor);
  }
  if (window.Dividers) {
    window.Dividers.updatePalette(state.carrierColor, state.modulationColor);
  }
  if (window.FFTSkills) {
    window.FFTSkills.updatePalette(state.carrierColor, state.modulationColor, dark);
  }
}

function resizeCanvases() {
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  signalCanvas.width = Math.floor(state.width * window.devicePixelRatio);
  signalCanvas.height = Math.floor(state.height * window.devicePixelRatio);
  signalCanvas.style.width = `${state.width}px`;
  signalCanvas.style.height = `${state.height}px`;
  signalCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

  const heroRect = hero.getBoundingClientRect();
  heroCanvas.width = Math.floor(heroRect.width * window.devicePixelRatio);
  heroCanvas.height = Math.floor(heroRect.height * window.devicePixelRatio);
  heroCanvas.style.width = `${heroRect.width}px`;
  heroCanvas.style.height = `${heroRect.height}px`;
  heroCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  previousSweepCanvas.width = heroCanvas.width;
  previousSweepCanvas.height = heroCanvas.height;
  previousSweepCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  previousSweepCanvasLast.width = heroCanvas.width;
  previousSweepCanvasLast.height = heroCanvas.height;
  previousSweepCtxLast.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  fadeoutCanvas.width = heroCanvas.width;
  fadeoutCanvas.height = heroCanvas.height;
  fadeoutCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

  if (window.HeroThree) window.HeroThree.resize();
  if (window.Dividers) window.Dividers.resize();
  if (window.FFTSkills) window.FFTSkills.resize();
  if (window.CardTilt) window.CardTilt.refreshRects();

  updateCardCenters();
  state.maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
}

function updateCardCenters() {
  state.cardCenters = reactiveCards.map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      el,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  });
}

function addNavWave(link) {
  const wave = document.createElement("span");
  wave.className = "nav-wave";
  wave.innerHTML = '<svg viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true"><path d=""></path></svg>';
  link.appendChild(wave);
}

navLinks.forEach((link) => {
  addNavWave(link);
  link.addEventListener("mouseenter", () => {
    link.classList.remove("signal-release");
    link.classList.add("signal-hover");
  });
  link.addEventListener("mouseleave", () => {
    link.classList.remove("signal-hover");
    link.classList.add("signal-release");
    setTimeout(() => link.classList.remove("signal-release"), 250);
  });
});

// ── Mobile nav toggle ──
const navToggle = document.getElementById("navToggle");
if (navToggle) {
  navToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("nav--open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("nav--open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

function updateNavWaves(time) {
  const t = time * 0.001;
  navLinks.forEach((link) => {
    const path = link.querySelector("path");
    if (!path) {
      return;
    }

    const active = link.classList.contains("signal-hover") || link.classList.contains("signal-release");
    if (!active) {
      path.setAttribute("d", "");
      return;
    }

    const stable = pointer.smoothSpeed < 42;
    const release = link.classList.contains("signal-release");
    const amp = release ? 3.2 : stable ? 0.9 : 2.5;
    const freq = stable ? 0.26 : 0.4;
    const jitter = release ? 0.24 : stable ? 0.08 : 0.2;
    let d = "M0 10";

    for (let x = 0; x <= 100; x += 4) {
      const y = 10 + amp * Math.sin(x * freq + t * 6 + Math.sin(t * 2 + x * 0.08) * jitter);
      d += ` L${x.toFixed(2)} ${y.toFixed(2)}`;
    }

    path.setAttribute("d", d);
  });
}

function spawnSectionPulse(section) {
  const rect = section.getBoundingClientRect();
  const x = rect.left + rect.width * 0.5;
  rfPulses.push({
    x,
    yDoc: window.scrollY + rect.top + 70,
    born: performance.now(),
    life: 1150
  });

  if (rfPulses.length > 26) {
    rfPulses.shift();
  }
}

function activateSection(section) {
  const id = section.id;
  if (activatedSections.has(id)) {
    return;
  }

  activatedSections.add(id);
  section.classList.add("signal-arrived");

  const revealItems = section.querySelectorAll(".animate-on-signal");
  revealItems.forEach((item, index) => {
    setTimeout(() => {
      item.classList.add("visible");
    }, index * 70);
  });

  spawnSectionPulse(section);

  // Trigger FFT entrance when skills section activates
  if (id === 'skills' && window.FFTSkills) {
    window.FFTSkills.triggerEntrance(performance.now());
  }
}

function drawRfPulses(now) {
  signalCtx.save();
  signalCtx.globalCompositeOperation = "lighter";

  for (let i = rfPulses.length - 1; i >= 0; i -= 1) {
    const pulse = rfPulses[i];
    const age = now - pulse.born;
    if (age >= pulse.life) {
      rfPulses.splice(i, 1);
      continue;
    }

    const n = age / pulse.life;
    const y = pulse.yDoc - state.scrollY;
    if (y < -140 || y > state.height + 140) {
      continue;
    }

    for (let ring = 0; ring < 3; ring += 1) {
      const ringN = Math.max(0, n - ring * 0.18);
      if (ringN <= 0 || ringN >= 1) {
        continue;
      }
      const r = 24 + ringN * 140;
      const alpha = (1 - ringN) * (0.26 - ring * 0.04) * (state.scope ? 1.15 : 1);
      signalCtx.beginPath();
      signalCtx.arc(pulse.x, y, r, 0, Math.PI * 2);
      signalCtx.strokeStyle = ring % 2 === 0 ? hexToRgba(state.carrierColor, alpha) : hexToRgba(state.modulationColor, alpha * 0.9);
      signalCtx.lineWidth = 1.4 - ring * 0.2;
      signalCtx.shadowBlur = 8;
      signalCtx.shadowColor = ring % 2 === 0 ? state.glowCarrier : state.glowMod;
      signalCtx.stroke();
    }
  }

  signalCtx.restore();
}

function drawHeroCarrier(time) {
  const width = heroCanvas.width / window.devicePixelRatio;
  const height = heroCanvas.height / window.devicePixelRatio;

  const elapsedSeconds = time * 0.001;
  const fm = 0.2;
  const fc = 4 / 1.5;
  const mu = state.mu;
  const beta = state.beta;
  const sweepProgress = (elapsedSeconds % state.sweepDuration) / state.sweepDuration;
  const sweepX = sweepProgress * width;
  const wrapped = sweepProgress < state.lastSweepProgress;
  state.lastSweepProgress = sweepProgress;
  const bandHeight = height * 0.2;
  const modulatingAmplitude = bandHeight * 0.3;
  const carrierAmplitude = bandHeight * 0.4;
  const amAmplitude = bandHeight * 0.4;
  const fmAmplitude = bandHeight * 0.4;
  const rowH = height / 5;
  const rows = [
    { label: "m(t)", y: rowH * 1, color: state.modulationColor, alpha: 0.45, width: 2.5, amp: modulatingAmplitude },
    { label: "c(t)", y: rowH * 2, color: state.carrierColor, alpha: 0.5, width: 1.5, amp: carrierAmplitude },
    { label: "AM", y: rowH * 3, color: state.carrierColor, alpha: 0.5, width: 2.5, amp: amAmplitude },
    { label: "FM", y: rowH * 4, color: state.modulationColor, alpha: 0.5, width: 2.5, amp: fmAmplitude }
  ];

  const drawGrid = (ctx) => {
    ctx.save();
    ctx.strokeStyle = hexToRgba(state.carrierColor, state.scope ? 0.2 : 0.12);
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= width; gx += width / 10) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    for (let gy = 0; gy <= height; gy += height / 8) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawWaveforms = (ctx, limitX, showText) => {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.font = "11px Chakra Petch, sans-serif";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = 0;

    rows.forEach((row, rowIndex) => {
      ctx.beginPath();
      for (let x = 0; x <= limitX; x += 2) {
        const tau = (x / width) * state.sweepDuration;
        const m = Math.sin(2 * Math.PI * fm * tau);
        const c = Math.sin(2 * Math.PI * fc * tau);
        const am = (1 + mu * m) * c;
        const fmWave = Math.sin(2 * Math.PI * fc * tau + beta * Math.sin(2 * Math.PI * fm * tau));
        let sample = 0;

        if (rowIndex === 0) {
          sample = m;
        } else if (rowIndex === 1) {
          sample = c;
        } else if (rowIndex === 2) {
          sample = am * 0.5;
        } else {
          sample = fmWave;
        }

        const y = row.y + row.amp * sample;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle = hexToRgba(row.color, row.alpha);
      ctx.lineWidth = row.width;
      ctx.stroke();

      if (rowIndex === 2) {
        ctx.beginPath();
        for (let x = 0; x <= limitX; x += 3) {
          const tau = (x / width) * state.sweepDuration;
          const env = row.amp * (1 + mu * Math.sin(2 * Math.PI * fm * tau)) * 0.5;
          const y = row.y - env;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.strokeStyle = hexToRgba(state.modulationColor, 0.3);
        ctx.lineWidth = 1.1;
        ctx.stroke();

        ctx.beginPath();
        for (let x = 0; x <= limitX; x += 3) {
          const tau = (x / width) * state.sweepDuration;
          const env = row.amp * (1 + mu * Math.sin(2 * Math.PI * fm * tau)) * 0.5;
          const y = row.y + env;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      if (showText) {
        ctx.fillStyle = "rgba(180, 210, 255, 0.7)";
        ctx.fillText(row.label, 8, row.y - row.amp - 6);
      }
    });

    if (showText) {
      ctx.save();
      ctx.font = "13px monospace";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(180, 210, 255, 0.7)";
      ctx.fillText(`mu = ${mu.toFixed(2)}`, width - 140, rows[2].y - 12);
      ctx.fillText(`beta = ${beta.toFixed(2)}`, width - 140, rows[3].y - 12);
      ctx.restore();
    }
    ctx.restore();
  };

  if (wrapped) {
    fadeoutCtx.clearRect(0, 0, width, height);
    fadeoutCtx.drawImage(heroCanvas, 0, 0, width, height);
    state.fadeoutActive = true;
    state.fadeoutStart = time;

    previousSweepCtx.clearRect(0, 0, width, height);
    drawGrid(previousSweepCtx);
    drawWaveforms(previousSweepCtx, width, false);
  }

  heroCtx.clearRect(0, 0, width, height);

  const baseGhostAlpha = 0.3;

  if (state.fadeoutActive) {
    const elapsed = time - state.fadeoutStart;
    const t = Math.min(1, elapsed / state.fadeoutDuration);
    const eased = 1 - (1 - t) * (1 - t);
    const fadeAlpha = 1.0 - eased * (1.0 - baseGhostAlpha * 0.5);
    heroCtx.save();
    heroCtx.globalAlpha = fadeAlpha;
    heroCtx.drawImage(fadeoutCanvas, 0, 0, width, height);
    heroCtx.restore();
    if (t >= 1) {
      state.fadeoutActive = false;
    }
  } else if (previousSweepCanvas.width > 0) {
    heroCtx.save();
    heroCtx.globalAlpha = baseGhostAlpha;
    heroCtx.drawImage(previousSweepCanvas, 0, 0, width, height);
    heroCtx.restore();
  }

  drawGrid(heroCtx);
  drawWaveforms(heroCtx, sweepX, true);

  heroCtx.beginPath();
  heroCtx.moveTo(sweepX, 0);
  heroCtx.lineTo(sweepX, height);
  heroCtx.strokeStyle = "rgba(140, 190, 255, 0.72)";
  heroCtx.lineWidth = 1.2;
  heroCtx.shadowBlur = 6;
  heroCtx.shadowColor = "rgba(140, 190, 255, 0.45)";
  heroCtx.stroke();
  heroCtx.shadowBlur = 0;
}

function updateScrollState() {
  state.scrollY = window.scrollY;
  state.maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  state.progress = Math.min(1, Math.max(0, state.scrollY / state.maxScroll));
  updateCardCenters();

  progressBar.style.width = `${state.progress * 100}%`;
  nav.classList.toggle("nav--scrolled", state.scrollY > 40);

  sections.forEach((section) => {
    if (activatedSections.has(section.id)) {
      return;
    }

    const sectionRect = section.getBoundingClientRect();
    if (sectionRect.top < state.height * 0.78) {
      activateSection(section);
    }
  });

  parallaxLayers.forEach((layer) => {
    const speed = Number(layer.dataset.speed || 0);
    layer.style.transform = `translateY(${state.scrollY * speed}px)`;
  });

  // Update Tx/Rx divider scroll progress
  if (window.Dividers) {
    window.Dividers.updateScroll(state.scrollY, state.height);
  }
  if (window.CardTilt) window.CardTilt.refreshRects();
}

function hexToRgba(color, alpha) {
  if (color.startsWith("rgba") || color.startsWith("rgb")) {
    const match = color.match(/[\d.]+/g);
    if (match && match.length >= 3) {
      return `rgba(${match[0]},${match[1]},${match[2]},${alpha})`;
    }
    return color;
  }

  const cleaned = color.replace("#", "").trim();
  if (cleaned.length !== 6) {
    return `rgba(58,134,255,${alpha})`;
  }

  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function animationFrame(time) {
  // Signal overlay canvas
  signalCtx.clearRect(0, 0, state.width, state.height);

  // EM ripples (replaces FM bursts)
  if (window.EmRipples) {
    window.EmRipples.draw(signalCtx, time, state.carrierColor, state.glowCarrier, state.cardCenters);
  }

  // RF section pulses
  drawRfPulses(time);

  // Nav link wave underlines
  updateNavWaves(time);

  // Hero: 2D waveforms
  drawHeroCarrier(time);

  // About section: 3D AM surface
  if (window.HeroThree && window.HeroThree.isActive()) {
    window.HeroThree.render(time);
  }

  // Tx/Rx particle dividers
  if (window.Dividers) {
    window.Dividers.draw(time);
  }

  // FFT skills visualization
  if (window.FFTSkills) {
    window.FFTSkills.render(time);
  }

  // Card magnetic tilt
  if (window.CardTilt) {
    window.CardTilt.update();
  }

  requestAnimationFrame(animationFrame);
}

window.addEventListener("mousemove", (event) => {
  const now = performance.now();
  const dt = Math.max(16, now - pointer.lastT);
  const dx = event.clientX - pointer.lastX;
  const dy = event.clientY - pointer.lastY;

  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.vx = dx / dt;
  pointer.vy = dy / dt;
  pointer.speed = Math.hypot(dx, dy) / dt;
  pointer.smoothSpeed = pointer.smoothSpeed * 0.85 + pointer.speed * 0.15;

  // EM ripples — speed-scaled intensity
  if (window.EmRipples) {
    window.EmRipples.spawn(pointer.x, pointer.y, pointer.speed);
  }

  // About section 3D pointer reactivity
  if (window.HeroThree) {
    window.HeroThree.updatePointer(
      pointer.x / state.width,
      pointer.y / state.height
    );
  }

  pointer.lastX = event.clientX;
  pointer.lastY = event.clientY;
  pointer.lastT = now;
});

window.addEventListener("touchmove", (event) => {
  const touch = event.touches[0];
  if (!touch) return;
  if (window.HeroThree) {
    window.HeroThree.updatePointer(
      touch.clientX / state.width,
      touch.clientY / state.height
    );
  }
}, { passive: true });

window.addEventListener("scroll", () => {
  updateScrollState();
});

window.addEventListener("resize", () => {
  resizeCanvases();
  updateScrollState();
});

themeToggle.addEventListener("click", () => {
  const nextTheme = body.classList.contains("dark") ? "light" : "dark";
  setTheme(nextTheme);
});

scopeToggle.addEventListener("click", () => {
  setScopeMode(!state.scope);
});


window.initPortfolio = function () {
  setTheme(localStorage.getItem("theme") || "light");
  setScopeMode(localStorage.getItem("scope") === "1");
  sections[0].classList.add("signal-arrived");
  sections[0].querySelectorAll(".animate-on-signal").forEach((el) => el.classList.add("visible"));
  updateSignalPalette();

  // Initialize new modules
  if (window.HeroThree) window.HeroThree.init();
  if (window.CardTilt) window.CardTilt.init();
  if (window.Dividers) window.Dividers.init();
  if (window.FFTSkills) window.FFTSkills.init();

  resizeCanvases();
  updateScrollState();
  requestAnimationFrame(animationFrame);
};

// If no loader present, init immediately
if (!document.body.classList.contains("signal-loading")) {
  window.initPortfolio();
}
