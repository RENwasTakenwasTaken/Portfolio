/* ── Three.js 3D Signal Topology Hero ──
   A 3D surface mesh with vertex displacement driven by AM/FM modulation.
   Pointer-reactive camera that follows cursor position. */

(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  var renderer, scene, camera, mesh, wireframe;
  var heroEl, canvasEl;
  var active = false;
  var disposed = false;

  var targetAzimuth = 0;
  var targetElevation = 0;
  var currentAzimuth = 0;
  var currentElevation = 0;
  var baseDistance = 9.2;
  var basePhi = Math.PI * 0.28;
  var baseTheta = 0;

  var carrierR = 0.23, carrierG = 0.51, carrierB = 0.84;
  var modR = 0.17, modG = 0.37, modB = 0.68;

  var vertexShader = [
    'uniform float uTime;',
    'uniform float uMu;',
    'uniform float uBeta;',
    'varying float vDisplacement;',
    'varying vec2 vUv;',
    '',
    'void main() {',
    '  vUv = uv;',
    '  float x = position.x;',
    '  float z = position.z;',
    '',
    '  float PI2 = 6.28318;',
    '',
    '  // Simple AM: modulating signal shapes the carrier envelope',
    '  float fm = 0.22;',
    '  float fc = 1.8;',
    '  float tau = (x + 8.0) / 16.0 * 8.0;',
    '  float zPhase = (z + 5.0) / 10.0 * 1.4;',
    '',
    '  float modulator = sin(PI2 * fm * tau + uTime * 0.9);',
    '  float envelope = 1.0 + uMu * modulator;',
    '  float carrier = sin(PI2 * fc * tau + zPhase + uTime * 2.2);',
    '  float am = envelope * carrier;',
    '',
    '  // Soft taper at edges',
    '  float fade = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);',
    '  fade *= smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);',
    '',
    '  float displacement = am * 0.65 * fade;',
    '',
    '  vDisplacement = displacement;',
    '  vec3 newPos = position;',
    '  newPos.y = displacement;',
    '',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);',
    '}'
  ].join('\n');

  var fragmentShader = [
    'uniform vec3 uCarrierColor;',
    'uniform vec3 uModColor;',
    'uniform float uTime;',
    'varying float vDisplacement;',
    'varying vec2 vUv;',
    '',
    'void main() {',
    '  float t = (vDisplacement + 1.5) / 3.0;',
    '  t = clamp(t, 0.0, 1.0);',
    '',
    '  vec3 low = uModColor * 0.4;',
    '  vec3 mid = uCarrierColor;',
    '  vec3 high = uCarrierColor + vec3(0.2, 0.3, 0.4);',
    '',
    '  vec3 color;',
    '  if (t < 0.5) {',
    '    color = mix(low, mid, t * 2.0);',
    '  } else {',
    '    color = mix(mid, high, (t - 0.5) * 2.0);',
    '  }',
    '',
    '  float alpha = 0.35 + t * 0.35;',
    '  alpha += 0.05 * sin(uTime + vUv.x * 10.0);',
    '',
    '  gl_FragColor = vec4(color, alpha);',
    '}'
  ].join('\n');

  var wireFragmentShader = [
    'uniform vec3 uCarrierColor;',
    'varying float vDisplacement;',
    '',
    'void main() {',
    '  float t = (vDisplacement + 1.5) / 3.0;',
    '  t = clamp(t, 0.0, 1.0);',
    '  float alpha = 0.08 + t * 0.18;',
    '  gl_FragColor = vec4(uCarrierColor, alpha);',
    '}'
  ].join('\n');

  function init() {
    heroEl = document.getElementById('about');
    canvasEl = document.getElementById('aboutThreeCanvas');
    if (!heroEl || !canvasEl) return;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);

    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    var geo = new THREE.PlaneGeometry(16, 10, 280, 180);
    geo.rotateX(-Math.PI / 2);

    var mat = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMu: { value: 0.55 },
        uBeta: { value: 5.0 },
        uCarrierColor: { value: new THREE.Vector3(carrierR, carrierG, carrierB) },
        uModColor: { value: new THREE.Vector3(modR, modG, modB) }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    var wireGeo = new THREE.PlaneGeometry(16, 10, 40, 40);
    wireGeo.rotateX(-Math.PI / 2);

    var wireMat = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: wireFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMu: { value: 0.55 },
        uBeta: { value: 5.0 },
        uCarrierColor: { value: new THREE.Vector3(carrierR, carrierG, carrierB) },
        uModColor: { value: new THREE.Vector3(modR, modG, modB) }
      },
      transparent: true,
      wireframe: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    wireframe = new THREE.Mesh(wireGeo, wireMat);
    scene.add(wireframe);

    resize();
    active = true;
  }

  function resize() {
    if (!renderer || !heroEl) return;
    var rect = heroEl.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  function updatePointer(normalizedX, normalizedY) {
    targetAzimuth = (normalizedX - 0.5) * 0.52;
    targetElevation = (normalizedY - 0.5) * 0.28;
  }

  function render(time) {
    if (!active || disposed) return;

    var t = time * 0.001;

    mesh.material.uniforms.uTime.value = t;
    wireframe.material.uniforms.uTime.value = t;

    currentAzimuth += (targetAzimuth - currentAzimuth) * 0.04;
    currentElevation += (targetElevation - currentElevation) * 0.04;

    var phi = basePhi + currentElevation;
    var theta = baseTheta + currentAzimuth;

    camera.position.x = baseDistance * Math.sin(phi) * Math.sin(theta);
    camera.position.y = baseDistance * Math.cos(phi);
    camera.position.z = baseDistance * Math.sin(phi) * Math.cos(theta);
    camera.lookAt(0, -0.6, 0.8);

    renderer.render(scene, camera);
  }

  function updatePalette(carrier, modulation) {
    var cc = parseColor(carrier);
    var mc = parseColor(modulation);
    carrierR = cc[0]; carrierG = cc[1]; carrierB = cc[2];
    modR = mc[0]; modG = mc[1]; modB = mc[2];

    if (mesh) {
      mesh.material.uniforms.uCarrierColor.value.set(carrierR, carrierG, carrierB);
      mesh.material.uniforms.uModColor.value.set(modR, modG, modB);
    }
    if (wireframe) {
      wireframe.material.uniforms.uCarrierColor.value.set(carrierR, carrierG, carrierB);
    }
  }

  function parseColor(color) {
    if (color.startsWith('rgb')) {
      var match = color.match(/[\d.]+/g);
      if (match && match.length >= 3) {
        return [parseFloat(match[0]) / 255, parseFloat(match[1]) / 255, parseFloat(match[2]) / 255];
      }
    }
    var hex = color.replace('#', '').trim();
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255
      ];
    }
    return [0.23, 0.51, 0.84];
  }

  function setVisible(visible) {
    if (canvasEl) {
      canvasEl.style.display = visible ? '' : 'none';
    }
    active = visible;
  }

  function isActive() {
    return active;
  }

  function dispose() {
    disposed = true;
    active = false;
    if (renderer) renderer.dispose();
    if (mesh) { mesh.geometry.dispose(); mesh.material.dispose(); }
    if (wireframe) { wireframe.geometry.dispose(); wireframe.material.dispose(); }
  }

  window.HeroThree = {
    init: init,
    resize: resize,
    render: render,
    updatePointer: updatePointer,
    updatePalette: updatePalette,
    setVisible: setVisible,
    isActive: isActive,
    dispose: dispose
  };
})();
