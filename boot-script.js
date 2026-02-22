/* ============================================
   ArCh Boot — Boot Sequence & Interactivity
   ============================================ */

(function () {
  'use strict';

  // ── Boot log lines ──
  const bootLines = [
    { text: '', delay: 300 },
    { text: '╔══════════════════════════════════════╗', delay: 40 },
    { text: '║         ArCh  SYSTEM  BIOS           ║', delay: 40 },
    { text: '║         v1.0.25  [ARM Cortex]         ║', delay: 40 },
    { text: '╚══════════════════════════════════════╝', delay: 200 },
    { text: '', delay: 100 },
    { text: '[BOOT]  Power-On Reset detected', delay: 80 },
    { text: '[CLK ]  Configuring HSE oscillator... 8MHz', delay: 60 },
    { text: '[CLK ]  PLL multiplier set: x9', delay: 50 },
    { text: '[CLK ]  SYSCLK = 72MHz                          [ OK ]', delay: 120 },
    { text: '', delay: 60 },
    { text: '[MEM ]  Initializing SRAM... 20KB', delay: 50 },
    { text: '[MEM ]  Flash: 128KB verified                   [ OK ]', delay: 100 },
    { text: '[MEM ]  Stack pointer set: 0x20005000', delay: 60 },
    { text: '', delay: 80 },
    { text: '[GPIO]  Configuring Port A... output mode', delay: 50 },
    { text: '[GPIO]  Configuring Port B... alt function', delay: 50 },
    { text: '[GPIO]  Pin mapping complete                    [ OK ]', delay: 100 },
    { text: '', delay: 60 },
    { text: '[UART]  USART1 initialized — 115200 baud', delay: 60 },
    { text: '[SPI ]  SPI1 master mode, CPOL=0, CPHA=0', delay: 50 },
    { text: '[I2C ]  I2C1 slave address configured', delay: 50 },
    { text: '[TMR ]  TIM2 PWM output on PA0                  [ OK ]', delay: 100 },
    { text: '', delay: 80 },
    { text: '[NVIC]  Interrupt vector table relocated', delay: 50 },
    { text: '[NVIC]  Priority grouping: 4 bits pre-emption', delay: 60 },
    { text: '[WDG ]  Independent watchdog disabled', delay: 40 },
    { text: '', delay: 100 },
    { text: '[LINK]  Portfolio interface ........ mounted', delay: 70 },
    { text: '[LINK]  GitHub peripheral .......... detected', delay: 70 },
    { text: '[LINK]  LinkedIn bus ............... active', delay: 70 },
    { text: '[LINK]  UART_TX (Email) ........... ready', delay: 70 },
    { text: '', delay: 120 },
    { text: '[SYS ]  All peripherals initialized', delay: 80 },
    { text: '[SYS ]  Entering main() ...', delay: 300 },
    { text: '', delay: 100 },
    { text: '  ┌─────────────────────────────────┐', delay: 40 },
    { text: '  │   ArCh — Embedded Engineer       │', delay: 40 },
    { text: '  │   Systems. Signals. Software.    │', delay: 40 },
    { text: '  └─────────────────────────────────┘', delay: 400 },
    { text: '', delay: 200 },
    { text: '[RDY ]  System online. Welcome.', delay: 500 },
  ];

  // ── DOM refs ──
  const bootScreen = document.getElementById('boot-screen');
  const bootLog = document.getElementById('boot-log');
  const bootCursor = document.getElementById('boot-cursor');
  const mainContent = document.getElementById('main-content');
  const mcuChip = document.getElementById('mcu-chip');
  const traceSvg = document.getElementById('trace-svg');
  const tagline = document.getElementById('tagline');
  const statusRegister = document.getElementById('status-register');
  const peripherals = document.querySelectorAll('.peripheral');

  // Track if boot already finished (prevent double-fire)
  let bootFinished = false;

  // ── Boot sequence ──
  let bootIndex = 0;
  let bootTimer = null;

  function typeBootLine() {
    if (bootIndex >= bootLines.length) {
      finishBoot();
      return;
    }

    const line = bootLines[bootIndex];
    bootIndex++;

    if (line.text === '') {
      bootLog.textContent += '\n';
    } else {
      bootLog.textContent += line.text + '\n';
    }

    bootScreen.scrollTop = bootScreen.scrollHeight;
    bootTimer = setTimeout(typeBootLine, line.delay);
  }

  function finishBoot() {
    if (bootFinished) return;
    bootFinished = true;

    clearTimeout(bootTimer);
    bootCursor.style.display = 'none';

    setTimeout(() => {
      bootScreen.classList.add('hidden');
      mainContent.classList.add('visible');

      // Stagger the power-on sequence
      setTimeout(() => powerOnMCU(), 400);
      setTimeout(() => drawAndPowerTraces(), 800);
      setTimeout(() => powerOnPeripherals(), 1400);
      setTimeout(() => {
        tagline.classList.add('visible');
        statusRegister.classList.add('visible');
      }, 2200);
    }, 600);
  }

  // ── Power on MCU ──
  function powerOnMCU() {
    mcuChip.classList.add('powered');
  }

  // ── Trace routing ──
  // Connects MCU edges to peripheral edges with right-angle PCB-style traces.
  //
  // Peripheral positions are computed from their CSS values directly,
  // so traces are immune to scale() transforms during animation.
  //
  // CSS positions (mirrored here):
  //   portfolio: top:14%, left:50%, translate:-50% 0  → connects to MCU top
  //   github:    top:50%, right:8%, translate:0 -50%  → connects to MCU right
  //   linkedin:  bottom:14%, left:50%, translate:-50% 0 → connects to MCU bottom
  //   email:     top:50%, left:8%, translate:0 -50%   → connects to MCU left

  function getMcuEdge(side) {
    // MCU has no transforms, so getBoundingClientRect is accurate
    const r = mcuChip.getBoundingClientRect();
    switch (side) {
      case 'top':    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top) };
      case 'bottom': return { x: Math.round(r.left + r.width / 2), y: Math.round(r.bottom) };
      case 'left':   return { x: Math.round(r.left),  y: Math.round(r.top + r.height / 2) };
      case 'right':  return { x: Math.round(r.right), y: Math.round(r.top + r.height / 2) };
    }
  }

  function getPeripheralEdge(id, side) {
    const el = document.getElementById(id);
    if (!el) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = el.offsetWidth;
    const h = el.offsetHeight;

    // Read the actual computed CSS values (handles media query overrides)
    const cs = getComputedStyle(el);

    switch (id) {
      case 'p-portfolio': { // top:X%, left:50% → bottom edge center
        const top = parseFloat(cs.top); // resolved to px
        return { x: Math.round(vw / 2), y: Math.round(top + h) };
      }
      case 'p-linkedin': { // bottom:X%, left:50% → top edge center
        const bottom = parseFloat(cs.bottom); // resolved to px
        return { x: Math.round(vw / 2), y: Math.round(vh - bottom - h) };
      }
      case 'p-github': { // top:50%, right:X% → left edge center
        const right = parseFloat(cs.right); // resolved to px
        return { x: Math.round(vw - right - w), y: Math.round(vh / 2) };
      }
      case 'p-email': { // top:50%, left:X% → right edge center
        const left = parseFloat(cs.left); // resolved to px
        return { x: Math.round(left + w), y: Math.round(vh / 2) };
      }
    }
  }

  const traceConfig = [
    { id: 'p-portfolio', mcuSide: 'top'    },
    { id: 'p-github',    mcuSide: 'right'  },
    { id: 'p-linkedin',  mcuSide: 'bottom' },
    { id: 'p-email',     mcuSide: 'left'   },
  ];

  function buildTrace(mcuPt, pPt, mcuSide) {
    const GAP = 20;
    const mx = mcuPt.x, my = mcuPt.y;
    const px = pPt.x,   py = pPt.y;

    // Vertical lines need a tiny X offset (0.5px) so the bounding box
    // has non-zero width — otherwise the SVG filter region collapses
    // and the stroke doesn't render.
    switch (mcuSide) {
      case 'top':
        return `M ${mx} ${my} L ${mx + 0.5} ${py}`;
      case 'bottom':
        return `M ${mx} ${my} L ${mx + 0.5} ${py}`;
      case 'left': {
        const bend = mx - GAP;
        return `M ${mx} ${my} L ${bend} ${my} L ${bend} ${py} L ${px} ${py}`;
      }
      case 'right': {
        const bend = mx + GAP;
        return `M ${mx} ${my} L ${bend} ${my} L ${bend} ${py} L ${px} ${py}`;
      }
    }
  }

  function clearTraces() {
    // Remove all paths but keep the <defs> filter
    const paths = traceSvg.querySelectorAll('path');
    paths.forEach(p => p.remove());
  }

  function drawAndPowerTraces() {
    clearTraces();

    // Sync SVG viewBox to viewport
    traceSvg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);

    traceConfig.forEach((cfg, i) => {
      const mcuPt = getMcuEdge(cfg.mcuSide);
      const pPt = getPeripheralEdge(cfg.id, cfg.mcuSide);
      if (!pPt) return;
      const d = buildTrace(mcuPt, pPt, cfg.mcuSide);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.classList.add('trace-line');
      traceSvg.appendChild(path);

      // Dash animation: set dash length to path length, then animate offset to 0
      const len = path.getTotalLength();
      if (len > 0) {
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        setTimeout(() => {
          path.style.transition = 'stroke-dashoffset 0.6s ease, stroke 0.6s ease';
          path.style.strokeDashoffset = '0';
          path.classList.add('powered');
        }, i * 200 + 50);
      } else {
        // Fallback: just show it solid
        path.classList.add('powered');
      }
    });
  }

  // ── Power on peripherals with stagger ──
  function powerOnPeripherals() {
    peripherals.forEach((p, i) => {
      setTimeout(() => {
        p.classList.add('powered');
      }, i * 250);
    });
  }

  // ── Redraw traces on resize ──
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (mainContent.classList.contains('visible')) {
        clearTraces();
        traceSvg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);

        traceConfig.forEach((cfg) => {
          const mcuPt = getMcuEdge(cfg.mcuSide);
          const pPt = getPeripheralEdge(cfg.id, cfg.mcuSide);
          if (!pPt) return;
          const d = buildTrace(mcuPt, pPt, cfg.mcuSide);
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', d);
          path.classList.add('trace-line', 'powered');
          traceSvg.appendChild(path);
        });
      }
    }, 100);
  });

  // ── Skip boot on click/key ──
  function skipBoot() {
    if (bootFinished) return;

    clearTimeout(bootTimer);

    // Dump remaining lines instantly
    while (bootIndex < bootLines.length) {
      const line = bootLines[bootIndex];
      if (line.text === '') {
        bootLog.textContent += '\n';
      } else {
        bootLog.textContent += line.text + '\n';
      }
      bootIndex++;
    }

    finishBoot();
  }

  bootScreen.addEventListener('click', skipBoot);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      skipBoot();
    }
  });

  // ── Start boot ──
  typeBootLine();

})();
