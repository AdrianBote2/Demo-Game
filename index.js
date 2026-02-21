let scene, camera, renderer, ball, platformGroup, pillar, goalRing, finishLine, checkLine;
let arrowG, arrowF, arrowN;
let px = 0, pz = 0, vx = 0, vz = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let mass = 0.5, mu = 0.15, g = 9.81;

// Mini-game variables
let chart, targetSpeed = 2.5, matchTimerCount = 0;
let controlMethod = 'pc'; 
let currentMode = 'sandbox'; 
let gameActive = false;
let score = 0, timeLeft = 10.0, stayTimer = 0;
let raceTime = 0, laps = 0, hasCheckpoint = false;
let goalX = 5, goalZ = 5;

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };

// --- Logic ---
document.getElementById('choose-mobile').onclick = () => { controlMethod = 'mobile'; hideSelector(); };
document.getElementById('choose-pc').onclick = () => { controlMethod = 'pc'; hideSelector(); };

function hideSelector() {
    document.getElementById('device-selector').style.opacity = '0';
    setTimeout(() => document.getElementById('device-selector').classList.add('hidden'), 500);
}

window.addEventListener('keydown', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

function initGraph() {
    const ctx = document.getElementById('physicsChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(40).fill(''),
            datasets: [
                { label: 'V', borderColor: '#4ade80', data: Array(40).fill(0), borderWidth: 2, pointRadius: 0 },
                { label: 'A', borderColor: '#ef4444', data: Array(40).fill(0), borderWidth: 2, pointRadius: 0 },
                { label: 'Target', borderColor: '#fbbf24', data: Array(40).fill(2.5), borderWidth: 1, borderDash: [5, 5], pointRadius: 0 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, animation: false, scales: { y: { min: 0, max: 10, display: false }, x: { display: false } }, plugins: { legend: { display: false } } }
    });
}

function generateNewTarget() {
    targetSpeed = (Math.random() * 4 + 1);
    document.getElementById('target-val').innerText = targetSpeed.toFixed(2);
    chart.data.datasets[2].data.fill(targetSpeed);
}

function initThree() {
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x020617);
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(22, 25, 22); camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    platformGroup = new THREE.Group(); scene.add(platformGroup);
    const base = new THREE.Mesh(new THREE.BoxGeometry(22, 1, 22), new THREE.MeshPhongMaterial({ color: 0x1e293b }));
    base.position.y = -0.5; platformGroup.add(base);
    platformGroup.add(new THREE.GridHelper(22, 22, 0x4ade80, 0x1e293b));

    pillar = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 4, 32), new THREE.MeshPhongMaterial({ color: 0x334155 }));
    pillar.position.y = 2; platformGroup.add(pillar);

    goalRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.1, 16, 100), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    goalRing.rotation.x = Math.PI/2; platformGroup.add(goalRing);

    finishLine = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.8), new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
    finishLine.rotation.x = -Math.PI/2; finishLine.position.set(0, 0.02, 6); platformGroup.add(finishLine);

    checkLine = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    checkLine.rotation.x = -Math.PI/2; checkLine.position.set(0, 0.02, -6); platformGroup.add(checkLine);

    ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ color: 0xef4444 }));
    platformGroup.add(ball);

    arrowG = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0xef4444);
    arrowF = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x3b82f6);
    arrowN = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x4ade80);
    scene.add(arrowG, arrowF, arrowN, new THREE.AmbientLight(0xffffff, 0.5));
    
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(20, 40, 20); scene.add(light);

    initGraph(); resetGame();
    if (controlMethod === 'mobile') window.addEventListener('deviceorientation', (e) => {
        if (calibBeta === null) { calibBeta = e.beta; calibGamma = e.gamma; }
        tiltX = e.gamma - calibGamma; tiltY = e.beta - calibBeta;
    });
    gameActive = true; animate();
}

function resetGame() {
    px = 0; pz = 0; vx = 0; vz = 0; laps = 0; hasCheckpoint = false; raceTime = 0; score = 0; timeLeft = 10.0;
    pillar.visible = (currentMode === 'racing');
    finishLine.visible = checkLine.visible = (currentMode === 'racing');
    goalRing.visible = (currentMode === 'challenge');
    if (currentMode === 'challenge') spawnGoal();
    if (currentMode === 'sandbox') generateNewTarget();
}

function spawnGoal() { goalX = (Math.random()-0.5)*16; goalZ = (Math.random()-0.5)*16; goalRing.position.set(goalX, 0.05, goalZ); }

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    // KEYBOARD TILT (Preserved)
    if (controlMethod === 'pc') {
        if (keys.ArrowLeft || keys.a) tiltX -= 1.2;
        if (keys.ArrowRight || keys.d) tiltX += 1.2;
        if (keys.ArrowUp || keys.w) tiltY -= 1.2;
        if (keys.ArrowDown || keys.s) tiltY += 1.2;
        tiltX *= 0.92; tiltY *= 0.92;
    }

    // LIVE PHYSICS UPDATE (New Feature, No Deletions)
    mass = parseFloat(document.getElementById('live-mass').value) || 0.5;
    mu = parseFloat(document.getElementById('live-mu').value) || 0.15;
    g = parseFloat(document.getElementById('live-g').value) || 9.81;

    const radX = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(tiltX, -25, 25));
    const radZ = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(tiltY, -25, 25));
    platformGroup.rotation.z = -radX; platformGroup.rotation.x = radZ;

    const fgX = mass * g * Math.sin(radX), fgZ = mass * g * Math.sin(radZ);
    const norm = mass * g * Math.cos(Math.sqrt(radX**2 + radZ**2)), fMax = mu * norm;

    let nFX = (Math.abs(fgX) > fMax) ? fgX - (Math.sign(fgX) * fMax) : 0;
    let nFZ = (Math.abs(fgZ) > fMax) ? fgZ - (Math.sign(fgZ) * fMax) : 0;

    vx = (nFX === 0) ? vx * 0.92 : vx + (nFX / mass) * 0.016;
    vz = (nFZ === 0) ? vz * 0.92 : vz + (nFZ / mass) * 0.016;
    px += vx; pz += vz;

    // Boundaries (Preserved)
    if (currentMode === 'sandbox') {
        if (Math.abs(px) > 11) px = -Math.sign(px) * 11;
        if (Math.abs(pz) > 11) pz = -Math.sign(pz) * 11;
    } else {
        if (Math.abs(px) > 10.5) { px = Math.sign(px)*10.5; vx *= -0.5; }
        if (Math.abs(pz) > 10.5) { pz = Math.sign(pz)*10.5; vz *= -0.5; }
    }

    ball.position.set(px, 0.5, pz);
    ball.rotation.z -= vx / 0.5; ball.rotation.x += vz / 0.5;

    const speed = Math.sqrt(vx*vx + vz*vz);
    const accel = Math.sqrt(nFX**2 + nFZ**2) / mass;

    document.getElementById('v-total').innerText = speed.toFixed(2);
    document.getElementById('a-total').innerText = accel.toFixed(2);
    document.getElementById('rot-x').innerText = (THREE.MathUtils.radToDeg(ball.rotation.x)%360).toFixed(0);
    document.getElementById('rot-z').innerText = (THREE.MathUtils.radToDeg(ball.rotation.z)%360).toFixed(0);

    // Sandbox Mini-game (New)
    if (currentMode === 'sandbox') {
        if (Math.abs(speed - targetSpeed) < 0.2) {
            matchTimerCount += 0.016;
            if (matchTimerCount >= 3) { matchTimerCount = 0; generateNewTarget(); }
        } else { matchTimerCount = Math.max(0, matchTimerCount - 0.01); }
        document.getElementById('match-progress').style.width = (matchTimerCount / 3 * 100) + "%";
    }

    if (chart) {
        chart.data.datasets[0].data.push(speed); chart.data.datasets[0].data.shift();
        chart.data.datasets[1].data.push(accel); chart.data.datasets[1].data.shift();
        chart.update('none');
    }

    renderer.render(scene, camera);
}

const modeButtons = ['sandbox', 'challenge', 'racing'];
modeButtons.forEach(mode => {
    document.getElementById(`mode-${mode}`).onclick = () => {
        currentMode = mode;
        modeButtons.forEach(m => document.getElementById(`mode-${m}`).classList.remove('active'));
        document.getElementById(`mode-${mode}`).classList.add('active');
    };
});

document.getElementById('start-button').onclick = () => {
    document.getElementById('ui').classList.add('hidden');
    document.getElementById('hud-left').classList.remove('hidden');
    document.getElementById('hud-right').classList.remove('hidden');
    if(currentMode === 'sandbox') document.getElementById('match-hud').classList.remove('hidden');
    initThree();
};

document.getElementById('reset-ball-btn').onclick = resetGame;