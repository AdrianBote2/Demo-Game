// --- Global State ---
let scene, camera, renderer, ball, platformGroup, pillar, goalRing, finishLine, checkLine;
let arrowG, arrowF, arrowN;
let px = 0, pz = 0, vx = 0, vz = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let mass = 0.5, mu = 0.15, g = 9.81;
let controlMethod = 'pc', currentMode = 'sandbox', gameActive = false;
let score = 0, timeLeft = 10.0, stayTimer = 0, raceTime = 0, laps = 0, hasCheckpoint = false;
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };

// --- Initialization ---
document.getElementById('choose-mobile').onclick = () => { controlMethod = 'mobile'; hideSelector(); };
document.getElementById('choose-pc').onclick = () => { controlMethod = 'pc'; hideSelector(); };
function hideSelector() { document.getElementById('device-selector').classList.add('hidden'); }
window.addEventListener('keydown', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

const modeButtons = ['sandbox', 'challenge', 'racing'];
modeButtons.forEach(mode => {
    document.getElementById(`mode-${mode}`).onclick = () => {
        currentMode = mode;
        modeButtons.forEach(m => document.getElementById(`mode-${m}`).classList.remove('active'));
        document.getElementById(`mode-${mode}`).classList.add('active');
    };
});

function initThree() {
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x020617);
    camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(22, 25, 22); camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    platformGroup = new THREE.Group(); scene.add(platformGroup);
    const base = new THREE.Mesh(new THREE.BoxGeometry(22, 1, 22), new THREE.MeshPhongMaterial({ color: 0x1e293b }));
    base.position.y = -0.5; base.receiveShadow = true;
    platformGroup.add(base);
    platformGroup.add(new THREE.GridHelper(22, 22, 0x4ade80, 0x1e293b));

    pillar = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 4, 32), new THREE.MeshPhongMaterial({ color: 0x334155 }));
    pillar.position.y = 2; pillar.castShadow = true; platformGroup.add(pillar);

    goalRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.1, 16, 100), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    goalRing.rotation.x = Math.PI/2; goalRing.position.y = 0.05; platformGroup.add(goalRing);

    finishLine = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.8), new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
    finishLine.rotation.x = -Math.PI/2; finishLine.position.set(0, 0.02, 6); platformGroup.add(finishLine);

    checkLine = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    checkLine.rotation.x = -Math.PI/2; checkLine.position.set(0, 0.02, -6); platformGroup.add(checkLine);

    ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 80 }));
    ball.castShadow = true; platformGroup.add(ball);

    arrowG = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0xef4444);
    arrowF = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x3b82f6);
    arrowN = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x4ade80);
    scene.add(arrowG, arrowF, arrowN, new THREE.AmbientLight(0xffffff, 0.5));
    
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(20, 40, 20); light.castShadow = true; scene.add(light);

    resetGame();
    if (controlMethod === 'mobile') window.addEventListener('deviceorientation', (e) => {
        if (calibBeta === null) { calibBeta = e.beta; calibGamma = e.gamma; return; }
        tiltX = e.gamma - calibGamma; tiltY = e.beta - calibBeta;
    });
    gameActive = true; animate();
}

function resetGame() {
    px = 0; pz = 0; vx = 0; vz = 0; laps = 0; hasCheckpoint = false; raceTime = 0; score = 0; timeLeft = 10.0;
    ball.rotation.set(0,0,0);
    pillar.visible = finishLine.visible = checkLine.visible = (currentMode === 'racing');
    goalRing.visible = (currentMode === 'challenge');
    if (currentMode === 'challenge') { goalRing.position.set((Math.random()-0.5)*16, 0.05, (Math.random()-0.5)*16); }
}

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    mass = parseFloat(document.getElementById('live-mass').value) || 0.1;
    mu = parseFloat(document.getElementById('live-mu').value) || 0;
    g = parseFloat(document.getElementById('live-g').value) || 0;
    const radius = 0.5;

    if (controlMethod === 'pc') {
        const sens = 1.3, decay = 0.92;
        if (keys.ArrowLeft || keys.a) tiltX -= sens; if (keys.ArrowRight || keys.d) tiltX += sens;
        if (keys.ArrowUp || keys.w) tiltY -= sens; if (keys.ArrowDown || keys.s) tiltY += sens;
        if (!keys.ArrowLeft && !keys.ArrowRight && !keys.a && !keys.d) tiltX *= decay;
        if (!keys.ArrowUp && !keys.ArrowDown && !keys.w && !keys.s) tiltY *= decay;
    }

    const radX = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(tiltX, -25, 25));
    const radZ = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(tiltY, -25, 25));
    platformGroup.rotation.z = -radX; platformGroup.rotation.x = radZ;

    // Linear Equations
    const fgX = mass * g * Math.sin(radX), fgZ = mass * g * Math.sin(radZ);
    const norm = mass * g * Math.cos(Math.sqrt(radX**2 + radZ**2));
    const fMax = mu * norm;
    let nFX = (Math.abs(fgX) > fMax) ? fgX - (Math.sign(fgX) * fMax) : 0;
    let nFZ = (Math.abs(fgZ) > fMax) ? fgZ - (Math.sign(fgZ) * fMax) : 0;

    vx = (nFX === 0) ? vx * 0.96 : vx + (nFX / mass) * 0.016;
    vz = (nFZ === 0) ? vz * 0.96 : vz + (nFZ / mass) * 0.016;
    px += vx; pz += vz;

    // Boundaries
    if (currentMode === 'sandbox') {
        if (Math.abs(px) > 11) px = -Math.sign(px) * 11; if (Math.abs(pz) > 11) pz = -Math.sign(pz) * 11;
    } else {
        if (Math.abs(px) > 10.5) { px = Math.sign(px) * 10.5; vx *= -0.5; }
        if (Math.abs(pz) > 10.5) { pz = Math.sign(pz) * 10.5; vz *= -0.5; }
    }

    // Rotational & Orientation Math
    const omegaX = vz / radius; const omegaZ = -vx / radius;
    ball.rotation.x += omegaX; ball.rotation.z += omegaZ;
    ball.position.set(px, 0.5, pz);

    // Update Telemetry
    const speed = Math.sqrt(vx**2 + vz**2);
    document.getElementById('v-total').innerText = speed.toFixed(2);
    document.getElementById('a-total').innerText = (Math.sqrt(nFX**2+nFZ**2)/mass).toFixed(2);
    document.getElementById('w-total').innerText = Math.sqrt(omegaX**2+omegaZ**2).toFixed(2);
    document.getElementById('torque').innerText = (Math.sqrt(nFX**2+nFZ**2)*radius).toFixed(2);
    
    // Degrees Conversion (Normalized to 360)
    document.getElementById('rot-x').innerText = (THREE.MathUtils.radToDeg(ball.rotation.x) % 360).toFixed(0);
    document.getElementById('rot-y').innerText = (THREE.MathUtils.radToDeg(ball.rotation.y) % 360).toFixed(0);
    document.getElementById('rot-z').innerText = (THREE.MathUtils.radToDeg(ball.rotation.z) % 360).toFixed(0);

    const wPos = new THREE.Vector3(); ball.getWorldPosition(wPos);
    updateArrow(arrowG, fgX, fgZ, wPos, 0.5);
    updateArrow(arrowF, -vx * 15, -vz * 15, wPos, 0.6);
    updateArrow(arrowN, nFX, nFZ, wPos, 0.7);

    renderer.render(scene, camera);
}

function updateArrow(a, fx, fz, p, h) {
    const d = new THREE.Vector3(fx, 0, fz);
    if (d.length() > 0.05) {
        a.setDirection(d.normalize()); a.setLength(Math.min(d.length() * 1.5, 4.5), 0.3, 0.15);
        a.position.copy(p); a.position.y += h; a.visible = true;
    } else a.visible = false;
}

document.getElementById('start-button').onclick = () => {
    document.getElementById('ui').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('game-stats').classList.toggle('hidden', currentMode !== 'challenge');
    document.getElementById('racing-stats').classList.toggle('hidden', currentMode !== 'racing');
    initThree();
};
document.getElementById('reset-ball-btn').onclick = resetGame;
document.getElementById('toggle-hud').onclick = () => document.getElementById('hud').classList.toggle('collapsed');