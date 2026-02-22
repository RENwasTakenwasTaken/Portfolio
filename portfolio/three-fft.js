/* ── Three.js FFT Skills Visualization ──
   Glass-like 3D frequency spectrum peaks representing skill proficiency.
   Each skill is a peak at a different frequency, height = proficiency. */

(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  var renderer, scene, camera;
  var containerEl, canvasEl, labelsEl;
  var peaks = [];
  var noiseBars = [];
  var active = false;
  var entranceTriggered = false;
  var entranceStartTime = 0;
  var ENTRANCE_DURATION = 1200;

  var skills = [
    { name: 'Programming', detail: 'Python, C++, Embedded C', proficiency: 0.92 },
    { name: 'Embedded Linux', detail: 'Linux, SoC, systemctl', proficiency: 0.78 },
    { name: 'Embedded Systems', detail: '8051, STM32, ESP8266', proficiency: 0.78 },
    { name: 'Software & Tools', detail: 'Git, Linux, Claude Code', proficiency: 0.62 },
    { name: 'Electronics & PCB', detail: 'KiCAD, Circuits, Multisim', proficiency: 0.92 },
    { name: 'Web Dev', detail: 'HTML, CSS, JS, SQL', proficiency: 0.48 }
  ];

  var carrierColor = new THREE.Color(0x3b82d6);
  var modColor = new THREE.Color(0x2a5fad);
  var isDark = false;
  var axisLines = [];
  var axisTickLabels = [];
  var xAxisLabelEl = null;

  function init() {
    containerEl = document.getElementById('fftContainer');
    canvasEl = document.getElementById('fftCanvas');
    labelsEl = document.getElementById('fftLabels');
    if (!containerEl || !canvasEl) return;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 6, 14);
    camera.lookAt(0, 1.5, 0);

    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    var pointLight = new THREE.PointLight(carrierColor, 1.2, 20);
    pointLight.position.set(-3, 5, 3);
    scene.add(pointLight);

    // Procedural environment for glass refraction
    var pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    var envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x1a2a58);
    var envLight1 = new THREE.DirectionalLight(0x88bbff, 2);
    envLight1.position.set(1, 3, 2);
    envScene.add(envLight1);
    var envLight2 = new THREE.DirectionalLight(0x4466aa, 1);
    envLight2.position.set(-2, 1, -1);
    envScene.add(envLight2);
    var envTexture = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = envTexture;
    pmrem.dispose();

    var totalWidth = 16;
    var peakWidth = 0.9;
    var gap = (totalWidth - skills.length * peakWidth) / (skills.length - 1);
    var startX = -totalWidth / 2 + peakWidth / 2;

    for (var i = 0; i < skills.length; i++) {
      var skill = skills[i];
      var maxHeight = skill.proficiency * 5;
      var x = startX + i * (peakWidth + gap);

      var geo = new THREE.BoxGeometry(peakWidth, maxHeight, 1.0);
      geo.translate(0, maxHeight / 2, 0);

      var mat = createGlassMaterial(skill.proficiency);

      var peakMesh = new THREE.Mesh(geo, mat);
      peakMesh.position.set(x, 0, 0);
      peakMesh.scale.y = 0;
      scene.add(peakMesh);

      var edgeGeo = new THREE.EdgesGeometry(geo);
      var edgeMat = new THREE.LineBasicMaterial({
        color: carrierColor,
        transparent: true,
        opacity: 0.15
      });
      var edgeLine = new THREE.LineSegments(edgeGeo, edgeMat);
      edgeLine.position.copy(peakMesh.position);
      edgeLine.scale.y = 0;
      scene.add(edgeLine);

      var label = createLabel(skill, i);

      peaks.push({
        mesh: peakMesh,
        edge: edgeLine,
        material: mat,
        maxHeight: maxHeight,
        targetScale: 0,
        currentScale: 0,
        skill: skill,
        x: x,
        label: label,
        index: i,
        oscillationPhase: Math.random() * Math.PI * 2
      });
    }

    createNoiseFloor(startX, peakWidth, gap);
    createGridFloor();
    createAxes();

    resize();
    active = true;
  }

  function createGlassMaterial(proficiency) {
    var color = carrierColor.clone();
    color.lerp(modColor, 1 - proficiency);

    return new THREE.MeshPhysicalMaterial({
      color: color,
      metalness: 0.0,
      roughness: 0.08,
      transmission: 0.88,
      thickness: 1.5,
      ior: 1.45,
      transparent: true,
      opacity: 0.9,
      envMapIntensity: 0.8,
      clearcoat: 0.3,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  function createNoiseFloor(startX, peakWidth, gap) {
    var noiseColor = carrierColor.clone();
    noiseColor.multiplyScalar(0.5);

    for (var i = 0; i < skills.length - 1; i++) {
      var x = startX + i * (peakWidth + gap) + peakWidth / 2 + gap / 2;
      var barCount = Math.max(1, Math.floor(gap / 0.5));

      for (var j = 0; j < barCount; j++) {
        var bx = x + (j - barCount / 2) * 0.35;
        var h = 0.05 + Math.random() * 0.15;
        var geo = new THREE.BoxGeometry(0.15, h, 0.4);
        geo.translate(0, h / 2, 0);
        var mat = new THREE.MeshPhysicalMaterial({
          color: noiseColor,
          transparent: true,
          opacity: 0.25,
          roughness: 0.3,
          metalness: 0.0,
          depthWrite: false
        });
        var bar = new THREE.Mesh(geo, mat);
        bar.position.set(bx, 0, 0);
        scene.add(bar);
        noiseBars.push({ mesh: bar, baseHeight: h, phase: Math.random() * Math.PI * 2 });
      }
    }
  }

  function createGridFloor() {
    var gridGeo = new THREE.PlaneGeometry(18, 6, 18, 6);
    gridGeo.rotateX(-Math.PI / 2);
    var gridMat = new THREE.MeshBasicMaterial({
      color: carrierColor,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
      depthWrite: false
    });
    var grid = new THREE.Mesh(gridGeo, gridMat);
    grid.position.y = -0.01;
    scene.add(grid);
  }

  function createAxes() {
    var axMat = new THREE.LineBasicMaterial({
      color: carrierColor,
      transparent: true,
      opacity: 0.28,
      depthWrite: false
    });

    // Y-axis vertical line at left edge, slightly in front (z=0.6) for visibility
    var yPts = [ new THREE.Vector3(-9.2, 0, 0.6), new THREE.Vector3(-9.2, 5.2, 0.6) ];
    var yAxis = new THREE.Line(new THREE.BufferGeometry().setFromPoints(yPts), axMat.clone());
    scene.add(yAxis);
    axisLines.push(yAxis);

    // X-axis baseline
    var xPts = [ new THREE.Vector3(-9.2, 0, 0.6), new THREE.Vector3(9.2, 0, 0.6) ];
    var xAxis = new THREE.Line(new THREE.BufferGeometry().setFromPoints(xPts), axMat.clone());
    scene.add(xAxis);
    axisLines.push(xAxis);

    // Y-axis tick marks and projected HTML labels
    // Scale: maxHeight = proficiency * 5, max dB = 10 → 5 world units
    var ticksDb = [0, 3, 5, 7, 9];
    for (var i = 0; i < ticksDb.length; i++) {
      var db = ticksDb[i];
      var yPos = db * 5 / 10;    // 10 dB = 5 world units
      var tickPts = [
        new THREE.Vector3(-9.5, yPos, 0.6),
        new THREE.Vector3(-9.2, yPos, 0.6)
      ];
      var tick = new THREE.Line(new THREE.BufferGeometry().setFromPoints(tickPts), axMat.clone());
      scene.add(tick);
      axisLines.push(tick);

      if (labelsEl) {
        var el = document.createElement('span');
        el.className = 'fft-axis-tick';
        el.textContent = db + ' dB';
        labelsEl.appendChild(el);
        axisTickLabels.push({ el: el, worldPos: new THREE.Vector3(-9.5, yPos, 0.6) });
      }
    }

    // X-axis label in center-bottom
    if (labelsEl) {
      xAxisLabelEl = document.createElement('span');
      xAxisLabelEl.className = 'fft-axis-xlabel';
      xAxisLabelEl.innerHTML = 'Skill Domain &nbsp;<span style="font-size:1.1em">&#x2192;</span>';
      labelsEl.appendChild(xAxisLabelEl);
    }
  }

  function updateAxisLabels() {
    if (!containerEl) return;
    var rect = containerEl.getBoundingClientRect();

    for (var i = 0; i < axisTickLabels.length; i++) {
      var item = axisTickLabels[i];
      var p = item.worldPos.clone();
      p.project(camera);
      var px = (p.x * 0.5 + 0.5) * rect.width;
      var py = (-p.y * 0.5 + 0.5) * rect.height;
      item.el.style.transform = 'translate(-100%, -50%) translate(' + px.toFixed(1) + 'px, ' + py.toFixed(1) + 'px)';
    }

    // X-axis label: project midpoint of baseline
    if (xAxisLabelEl) {
      var xMid = new THREE.Vector3(0, -0.05, 0.6);
      xMid.project(camera);
      var xpx = (xMid.x * 0.5 + 0.5) * rect.width;
      var xpy = (-xMid.y * 0.5 + 0.5) * rect.height;
      xAxisLabelEl.style.transform = 'translate(-50%, 4px) translate(' + xpx.toFixed(1) + 'px, ' + xpy.toFixed(1) + 'px)';
    }
  }

  function createLabel(skill, index) {
    if (!labelsEl) return null;

    var label = document.createElement('div');
    label.className = 'fft-label';
    var db = (skill.proficiency * 10).toFixed(1);
    label.innerHTML = '<span class="fft-label__name">' + skill.name + '</span>' +
                      '<span class="fft-label__detail">' + skill.detail + '</span>' +
                      '<span class="fft-label__pct">' + db + ' dB</span>';
    labelsEl.appendChild(label);
    return label;
  }

  function resize() {
    if (!renderer || !containerEl) return;
    var rect = containerEl.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  function triggerEntrance(time) {
    if (entranceTriggered) return;
    entranceTriggered = true;
    entranceStartTime = time;

    for (var i = 0; i < peaks.length; i++) {
      peaks[i].targetScale = 1;
    }

    var hint = document.getElementById('fftHint');
    if (hint) hint.classList.add('hidden');
  }

  function render(time) {
    if (!active) return;

    var t = time * 0.001;

    for (var i = 0; i < peaks.length; i++) {
      var peak = peaks[i];

      if (entranceTriggered) {
        var elapsed = time - entranceStartTime;
        var delay = peak.index * 120;
        var peakProgress = Math.max(0, Math.min(1, (elapsed - delay) / 600));
        var eased = 1 - Math.pow(1 - peakProgress, 3);
        peak.currentScale = eased * peak.targetScale;
      }

      var oscillation = 1 + 0.02 * Math.sin(t * 1.5 + peak.oscillationPhase);
      var finalScale = peak.currentScale * oscillation;

      peak.mesh.scale.y = Math.max(0.001, finalScale);
      peak.edge.scale.y = Math.max(0.001, finalScale);

      updateLabelPosition(peak);
    }

    for (var j = 0; j < noiseBars.length; j++) {
      var bar = noiseBars[j];
      var noiseScale = 0.5 + 0.5 * Math.sin(t * 2 + bar.phase);
      bar.mesh.scale.y = noiseScale;
    }

    updateAxisLabels();
    renderer.render(scene, camera);
  }

  function updateLabelPosition(peak) {
    if (!peak.label || !containerEl) return;

    var topY = peak.maxHeight * peak.currentScale;
    var pos = new THREE.Vector3(peak.x, topY + 0.3, 0);
    pos.project(camera);

    var rect = containerEl.getBoundingClientRect();
    var x = (pos.x * 0.5 + 0.5) * rect.width;
    var y = (-pos.y * 0.5 + 0.5) * rect.height;

    peak.label.style.transform = 'translate(-50%, -100%) translate(' + x + 'px, ' + y + 'px)';
    peak.label.style.opacity = peak.currentScale > 0.3 ? String(Math.min(1, (peak.currentScale - 0.3) / 0.4)) : '0';
  }

  function updatePalette(carrier, modulation, dark) {
    carrierColor.set(carrier);
    modColor.set(modulation);
    isDark = dark;

    for (var i = 0; i < peaks.length; i++) {
      var p = peaks[i];
      var color = carrierColor.clone();
      color.lerp(modColor, 1 - p.skill.proficiency);
      p.material.color.copy(color);
      p.edge.material.color.copy(carrierColor);
    }

    for (var j = 0; j < axisLines.length; j++) {
      axisLines[j].material.color.copy(carrierColor);
    }
  }

  window.FFTSkills = {
    init: init,
    resize: resize,
    render: render,
    triggerEntrance: triggerEntrance,
    updatePalette: updatePalette
  };
})();
