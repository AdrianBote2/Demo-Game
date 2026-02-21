// --- Core Scene & Variables ---
let scene, camera, renderer, ball, platformGroup, pillar, goalRing, finishLine, checkLine;
let arrowG, arrowF, arrowN;
let px = 0, pz = 0, vx = 0, vz = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let mass = 0.5, mu = 0.15, g = 9.81;

let controlMethod = 'pc'; 
let currentMode = 'sandbox'; 
let gameActive = false;
let score = 0, timeLeft = 10.0, stayTimer = 0;
let raceTime = 0, laps = 0, hasCheckpoint = false;
let goalX = 5, goalZ = 5;

const targetVelocity = 2.50; 
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };

// --- UI Interaction ---
document.getElementById('choose-mobile').onclick = () => { controlMethod = 'mobile'; hideSelector(); };
document.getElementById('choose-pc').onclick = () => { controlMethod = 'pc'; hideSelector(); };

function hideSelector() { document.getElementById('device-selector').classList.add('hidden'); }

window.addEventListener('keydown', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

function updateKeyboardTilt() {
    const sens = 1.3, decay = 0.92;
    if (keys.ArrowLeft || keys.a) tiltX -= sens;
    if (keys.ArrowRight || keys.d) tiltX += sens;
    if (keys.ArrowUp || keys.w) tiltY -= sens;
    if (keys.ArrowDown || keys.s) tiltY += sens;
    if (!keys.ArrowLeft && !keys.ArrowRight && !keys.a && !keys.d) tiltX *= decay;
    if (!keys.ArrowUp && !keys.ArrowDown && !keys.w && !keys.s) tiltY *= decay;
    tiltX = THREE.MathUtils.clamp(tiltX, -25, 25);
    tiltY = THREE.MathUtils.clamp(tiltY, -25, 25);
}

// Mode Selection Logic
const modeButtons = ['sandbox', 'challenge', 'racing'];
modeButtons.forEach(mode => {
    document.getElementById(`mode-${mode}`).onclick = () => {
        currentMode = mode;
        modeButtons.forEach(m => document.getElementById(`mode-${m}`).classList.remove('active'));
        document.getElementById(`mode-${mode}`).classList.add('active');
        const descs = { 
            sandbox: "Endless Road: Match 2.50 m/s!", 
            challenge: "Stay in ring 3s to reset 10s timer!", 
            racing: "Pass Red Checkpoint, then Green Finish!" 
        };
        document.getElementById('mode-description').innerText = descs[mode];
    };
});

// --- Three.js Setup ---
function initThree() {
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x020617);
    camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(22, 25, 22); camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    platformGroup = new THREE.Group(); scene.add(platformGroup);

    // Platform Construction
    const base = new THREE.Mesh(new THREE.BoxGeometry(22, 1, 22), new THREE.MeshPhongMaterial({ color: 0x1e293b }));
    base.position.y = -0.5; base.receiveShadow = true;
    platformGroup.add(base);
    platformGroup.add(new THREE.GridHelper(22, 22, 0x4ade80, 0x1e293b));

    // Props
    pillar = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 4, 32), new THREE.MeshPhongMaterial({ color: 0x334155 }));
    pillar.position.y = 2; pillar.castShadow = true;
    platformGroup.add(pillar);

    goalRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.1, 16, 100), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    goalRing.rotation.x = Math.PI/2; goalRing.position.y = 0.05;
    platformGroup.add(goalRing);

    finishLine = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.8), new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
    finishLine.rotation.x = -Math.PI/2; finishLine.position.set(0, 0.02, 6);
    platformGroup.add(finishLine);

    checkLine = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    checkLine.rotation.x = -Math.PI/2; checkLine.position.set(0, 0.02, -6);
    platformGroup.add(checkLine);

    ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 80 }));
    ball.castShadow = true; platformGroup.add(ball);

    // Tracers
    arrowG = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0xef4444);
    arrowF = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x3b82f6);
    arrowN = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x4ade80);
    scene.add(arrowG, arrowF, arrowN, new THREE.AmbientLight(0xffffff, 0.5));
    
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(20, 40, 20); light.castShadow = true;
    scene.add(light);

    resetGame();
    if (controlMethod === 'mobile') window.addEventListener('deviceorientation', (e) => {
        if (calibBeta === null) { calibBeta = e.beta; calibGamma = e.gamma; return; }
        tiltX = e.gamma - calibGamma; tiltY = e.beta - calibBeta;
    });
    gameActive = true; animate();
}

// --- Logic Loops ---
function spawnGoal() {
    goalX = (Math.random() - 0.5) * 16; goalZ = (Math.random() - 0.5) * 16;
    goalRing.position.set(goalX, 0.05, goalZ);
}

function resetGame() {
    px = 0; pz = 0; vx = 0; vz = 0; laps = 0; hasCheckpoint = false; raceTime = 0; stayTimer = 0; score = 0; timeLeft = 10.0;
    pillar.visible = (currentMode === 'racing');
    finishLine.visible = checkLine.visible = (currentMode === 'racing');
    goalRing.visible = (currentMode === 'challenge');
    checkLine.material.color.set(0xef4444);
    if (currentMode === 'challenge') spawnGoal();
}

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    // --- LIVE READ: Constants pull from HUD every frame ---
    mass = parseFloat(document.getElementById('live-mass').value) || 0.1;
    mu = parseFloat(document.getElementById('live-mu').value) || 0;
    g = parseFloat(document.getElementById('live-g').value) || 0;

    if (controlMethod === 'pc') updateKeyboardTilt();

    const radX = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(tiltX, -25, 25));
    const radZ = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(tiltY, -25, 25));
    platformGroup.rotation.z = -radX; platformGroup.rotation.x = radZ;

    // Physics Engine
    const fgX = mass * g * Math.sin(radX), fgZ = mass * g * Math.sin(radZ);
    const norm = mass * g * Math.cos(Math.sqrt(radX**2 + radZ**2));
    const fMax = mu * norm;

    let nFX = (Math.abs(fgX) > fMax) ? fgX - (Math.sign(fgX) * fMax) : 0;
    let nFZ = (Math.abs(fgZ) > fMax) ? fgZ - (Math.sign(fgZ) * fMax) : 0;

    const damping = (mu <= 0) ? 1.0 : 0.94;
    vx = (nFX === 0) ? vx * damping : vx + (nFX / mass) * 0.016;
    vz = (nFZ === 0) ? vz * damping : vz + (nFZ / mass) * 0.016;
    px += vx; pz += vz;

    // Boundaries Logic
    if (currentMode === 'sandbox') {
        if (Math.abs(px) > 11) px = -Math.sign(px) * 11;
        if (Math.abs(pz) > 11) pz = -Math.sign(pz) * 11;
    } else {
        if (Math.abs(px) > 10.5) { px = Math.sign(px) * 10.5; vx *= -0.5; }
        if (Math.abs(pz) > 10.5) { pz = Math.sign(pz) * 10.5; vz *= -0.5; }
        if (pillar.visible && Math.sqrt(px*px + pz*pz) < 3.5) {
            let angle = Math.atan2(pz, px); px = Math.cos(angle) * 3.5; pz = Math.sin(angle) * 3.5; vx *= -0.3; vz *= -0.3;
        }
    }

    ball.position.set(px, 0.5, pz);
    ball.rotation.z -= vx; ball.rotation.x += vz;

    // HUD & Glow Feedback
    const speed = Math.sqrt(vx*vx + vz*vz);
    const accelVal = Math.sqrt(nFX**2 + nFZ**2) / mass;
    document.getElementById('v-total').innerText = speed.toFixed(2);
    document.getElementById('a-total').innerText = accelVal.toFixed(2);
    document.getElementById('normal-force').innerText = norm.toFixed(2);
    document.getElementById('friction-force').innerText = fMax.toFixed(2);

    // Glow Triggers
    document.getElementById('a-total').className = (accelVal > 1.5) ? 'high-force-green' : '';
    document.getElementById('friction-force').className = (fMax > 0.8) ? 'high-force-blue' : '';

    // Mode-Specific Logic
    if (currentMode === 'challenge') {
        timeLeft -= 0.016;
        const d = Math.sqrt((px - goalX)**2 + (pz - goalZ)**2);
        if (d < 1.2 && speed < 0.2) {
            stayTimer += 0.016;
            if (stayTimer >= 3) { score++; timeLeft = 10.0; stayTimer = 0; spawnGoal(); }
        } else stayTimer = 0;
        document.getElementById('timer').innerText = Math.max(0, timeLeft).toFixed(1);
        document.getElementById('score').innerText = score;
    } else if (currentMode === 'racing') {
        raceTime += 0.016;
        document.getElementById('race-timer').innerText = raceTime.toFixed(1);
        if (pz < -5.8 && pz > -6.2 && !hasCheckpoint) { hasCheckpoint = true; checkLine.material.color.set(0x4ade80); }
        if (pz > 5.8 && pz < 6.2 && hasCheckpoint) {
            laps++; hasCheckpoint = false; checkLine.material.color.set(0xef4444);
            document.getElementById('lap-count').innerText = laps;
        }
    }

    // Update Vector Visuals
    const wPos = new THREE.Vector3(); ball.getWorldPosition(wPos);
    updateArrow(arrowG, fgX, fgZ, wPos, 0.5); // Gravity Component
    updateArrow(arrowF, -vx * 15, -vz * 15, wPos, 0.6); // Friction Counter-force
    updateArrow(arrowN, nFX, nFZ, wPos, 0.7); // Net Resultant Force

    renderer.render(scene, camera);
}

function updateArrow(a, fx, fz, p, h) {
    const d = new THREE.Vector3(fx, 0, fz);
    const len = d.length();
    if (len > 0.05) {
        a.setDirection(d.normalize());
        a.setLength(Math.min(len * 1.5, 4.5), 0.3, 0.15);
        a.position.copy(p); a.position.y += h; a.visible = true;
    } else a.visible = false;
}

document.getElementById('start-button').onclick = () => {
    document.getElementById('ui').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('game-stats').classList.toggle('hidden', currentMode !== 'challenge');
    document.getElementById('racing-stats').classList.toggle('hidden', currentMode !== 'racing');
    document.getElementById('sandbox-controls').classList.toggle('hidden', currentMode !== 'sandbox');
    initThree();
};

document.getElementById('reset-ball-btn').onclick = resetGame;
document.getElementById('toggle-hud').onclick = () => document.getElementById('hud').classList.toggle('collapsed');