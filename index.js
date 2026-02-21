/* --- GLOBAL DATA & STATE: ALL FEATURES PRESERVED --- */
let scene, camera, renderer, ball, platformGroup, pillar, goalRing, finishLine, checkLine;
let arrowG, arrowF, arrowN; // Physics Vectors
let px = 0, pz = 0, vx = 0, vz = 0; // Position & Velocity
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;

// Physics Variables - Linked to Live HUD
let mass = 0.5, mu = 0.15, g = 9.81;

// Analytics & Mini-game Variables
let chart;
let targetSpeed = 2.50;
let matchTimerCount = 0;
let ghostLineData = Array(40).fill(2.50);

// State Management for Modes
let controlMethod = 'pc'; 
let currentMode = 'sandbox'; 
let gameActive = false;

// Mode Specific Logic Variables
let score = 0;
let timeLeft = 10.0;
let stayTimer = 0;
let raceTime = 0;
let laps = 0;
let hasCheckpoint = false;
let goalX = 5, goalZ = 5;

const velocityTolerance = 0.20;
const keys = { 
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, 
    w: false, a: false, s: false, d: false 
};

/* --- INITIALIZATION & INPUT LISTENERS --- */
document.getElementById('choose-mobile').onclick = () => { controlMethod = 'mobile'; hideSelector(); };
document.getElementById('choose-pc').onclick = () => { controlMethod = 'pc'; hideSelector(); };

function hideSelector() {
    document.getElementById('device-selector').style.opacity = '0';
    setTimeout(() => document.getElementById('device-selector').classList.add('hidden'), 500);
}

// Keyboard Listeners for PC Mode
window.addEventListener('keydown', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

function updateKeyboardTilt() {
    const sensitivity = 1.3;
    const returnSpeed = 0.90;
    if (keys.ArrowLeft || keys.a) tiltX -= sensitivity;
    if (keys.ArrowRight || keys.d) tiltX += sensitivity;
    if (keys.ArrowUp || keys.w) tiltY -= sensitivity;
    if (keys.ArrowDown || keys.s) tiltY += sensitivity;
    
    // Smooth return to zero
    if (!keys.ArrowLeft && !keys.ArrowRight && !keys.a && !keys.d) tiltX *= returnSpeed;
    if (!keys.ArrowUp && !keys.ArrowDown && !keys.w && !keys.s) tiltY *= returnSpeed;
    
    tiltX = THREE.MathUtils.clamp(tiltX, -25, 25);
    tiltY = THREE.MathUtils.clamp(tiltY, -25, 25);
}

/* --- GRAPHING ENGINE --- */
function initGraph() {
    const ctx = document.getElementById('physicsChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(40).fill(''),
            datasets: [
                { label: 'Speed', borderColor: '#4ade80', data: Array(40).fill(0), borderWidth: 2, pointRadius: 0 },
                { label: 'Accel', borderColor: '#ef4444', data: Array(40).fill(0), borderWidth: 2, pointRadius: 0 },
                { label: 'Target', borderColor: '#fbbf24', data: ghostLineData, borderWidth: 1, borderDash: [5, 5], pointRadius: 0 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            scales: { 
                y: { min: 0, max: 10, grid: { color: '#334155' }, ticks: { display: false } },
                x: { display: false } 
            },
            plugins: { legend: { display: false } }
        }
    });
}

function generateNewSandboxTarget() {
    targetSpeed = (Math.random() * 4 + 1); // Random target 1.0 to 5.0
    const targetDisplay = document.getElementById('target-val');
    if(targetDisplay) targetDisplay.innerText = targetSpeed.toFixed(2);
    
    ghostLineData.fill(targetSpeed);
    if(chart) chart.data.datasets[2].data = [...ghostLineData];
}

/* --- THREE.JS SCENE SETUP --- */
function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(22, 25, 22);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    platformGroup = new THREE.Group();
    scene.add(platformGroup);

    // Platform Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(22, 1, 22), new THREE.MeshPhongMaterial({ color: 0x1e293b }));
    base.position.y = -0.5;
    base.receiveShadow = true;
    platformGroup.add(base);
    platformGroup.add(new THREE.GridHelper(22, 22, 0x4ade80, 0x1e293b));

    // Obstacles & Mode Assets
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

    // The Ball
    ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 80 }));
    ball.castShadow = true;
    platformGroup.add(ball);

    // Physics Visualizers
    arrowG = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0xef4444);
    arrowF = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x3b82f6);
    arrowN = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x4ade80);
    scene.add(arrowG, arrowF, arrowN);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(20, 40, 20);
    light.castShadow = true;
    scene.add(light);

    initGraph();
    resetGame();

    if (controlMethod === 'mobile') {
        window.addEventListener('deviceorientation', handleOrientation);
    }

    gameActive = true;
    animate();
}

function handleOrientation(e) {
    if (calibBeta === null) { calibBeta = e.beta; calibGamma = e.gamma; return; }
    tiltX = e.gamma - calibGamma;
    tiltY = e.beta - calibBeta;
}

function spawnGoal() {
    goalX = (Math.random() - 0.5) * 16;
    goalZ = (Math.random() - 0.5) * 16;
    goalRing.position.set(goalX, 0.05, goalZ);
}

function resetGame() {
    px = 0; pz = 0; vx = 0; vz = 0;
    laps = 0; hasCheckpoint = false; raceTime = 0;
    score = 0; timeLeft = 10.0; stayTimer = 0; matchTimerCount = 0;
    
    ball.rotation.set(0, 0, 0);
    pillar.visible = (currentMode === 'racing');
    finishLine.visible = checkLine.visible = (currentMode === 'racing');
    goalRing.visible = (currentMode === 'challenge');
    checkLine.material.color.set(0xef4444);
    
    if (currentMode === 'challenge') spawnGoal();
    if (currentMode === 'sandbox') generateNewSandboxTarget();
}

/* --- THE MASTER ANIMATION LOOP (FULL LOGIC) --- */
function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    if (controlMethod === 'pc') updateKeyboardTilt();

    // LIVE PHYSICS UPDATES FROM HUD-LEFT
    mass = parseFloat(document.getElementById('live-mass')?.value || 0.5);
    mu = parseFloat(document.getElementById('live-mu')?.value || 0.15);
    g = parseFloat(document.getElementById('live-g')?.value || 9.81);

    // PLATFORM ROTATION
    const radX = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(tiltX, -25, 25));
    const radZ = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(tiltY, -25, 25));
    platformGroup.rotation.z = -radX;
    platformGroup.rotation.x = radZ;

    // PHYSICS CALCULATIONS
    const fgX = mass * g * Math.sin(radX);
    const fgZ = mass * g * Math.sin(radZ);
    const norm = mass * g * Math.cos(Math.sqrt(radX**2 + radZ**2));
    const fMax = mu * norm;

    let nFX = (Math.abs(fgX) > fMax) ? fgX - (Math.sign(fgX) * fMax) : 0;
    let nFZ = (Math.abs(fgZ) > fMax) ? fgZ - (Math.sign(fgZ) * fMax) : 0;

    // Apply Acceleration and Friction Decay
    vx = (nFX === 0) ? vx * 0.92 : vx + (nFX / mass) * 0.016;
    vz = (nFZ === 0) ? vz * 0.92 : vz + (nFZ / mass) * 0.016;
    px += vx; pz += vz;

    // BOUNDARY & COLLISION LOGIC (FULL)
    if (currentMode === 'sandbox') {
        if (Math.abs(px) > 11) px = -Math.sign(px) * 11;
        if (Math.abs(pz) > 11) pz = -Math.sign(pz) * 11;
    } else {
        // Wall Bounce
        if (Math.abs(px) > 10.5) { px = Math.sign(px) * 10.5; vx *= -0.5; }
        if (Math.abs(pz) > 10.5) { pz = Math.sign(pz) * 10.5; vz *= -0.5; }
        
        // Pillar Collision (Hard Obstacle)
        if (pillar.visible) {
            const dist = Math.sqrt(px*px + pz*pz);
            if (dist < 3.5) {
                let angle = Math.atan2(pz, px);
                px = Math.cos(angle) * 3.5;
                pz = Math.sin(angle) * 3.5;
                vx *= -0.3; vz *= -0.3;
            }
        }
    }

    // UPDATE BALL VISUALS
    ball.position.set(px, 0.5, pz);
    ball.rotation.z -= vx / 0.5;
    ball.rotation.x += vz / 0.5;

    const speed = Math.sqrt(vx*vx + vz*vz);
    const accel = Math.sqrt(nFX**2 + nFZ**2) / mass;

    // UPDATE ANALYTICS HUD
    document.getElementById('v-total').innerText = speed.toFixed(2);
    document.getElementById('a-total').innerText = accel.toFixed(2);
    document.getElementById('rot-x').innerText = (THREE.MathUtils.radToDeg(ball.rotation.x) % 360).toFixed(0);
    document.getElementById('rot-z').innerText = (THREE.MathUtils.radToDeg(ball.rotation.z) % 360).toFixed(0);

    /* --- MODE SPECIFIC ENGINE LOGIC --- */

    // 1. SANDBOX MINI-GAME
    if (currentMode === 'sandbox') {
        const diff = Math.abs(speed - targetSpeed);
        if (diff < velocityTolerance) {
            matchTimerCount += 0.016;
            document.getElementById('v-total').style.color = "#4ade80";
        } else {
            matchTimerCount = Math.max(0, matchTimerCount - 0.01);
            document.getElementById('v-total').style.color = "var(--accent-cyan)";
        }
        document.getElementById('match-progress').style.width = (matchTimerCount / 3 * 100) + "%";
        if (matchTimerCount >= 3) { matchTimerCount = 0; generateNewSandboxTarget(); score++; }
    } 
    
    // 2. CHALLENGE MODE LOGIC (Stay in ring)
    else if (currentMode === 'challenge') {
        timeLeft -= 0.016;
        const distToGoal = Math.sqrt((px - goalX)**2 + (pz - goalZ)**2);
        if (distToGoal < 1.2 && speed < 0.2) {
            stayTimer += 0.016;
            if (stayTimer >= 3) { score++; timeLeft = 10.0; stayTimer = 0; spawnGoal(); }
        } else { stayTimer = 0; }
        
        document.getElementById('timer').innerText = Math.max(0, timeLeft).toFixed(1);
        document.getElementById('score').innerText = score;
        
        if (timeLeft <= 0) {
            gameActive = false;
            alert("TIME EXPIRED! Final Score: " + score);
            location.reload();
        }
    } 
    
    // 3. RACING MODE LOGIC (Checkpoints & Laps)
    else if (currentMode === 'racing') {
        raceTime += 0.016;
        document.getElementById('race-timer').innerText = raceTime.toFixed(1);
        
        // Checkpoint (Red Line)
        if (pz < -5.5 && pz > -6.5 && !hasCheckpoint) {
            hasCheckpoint = true;
            checkLine.material.color.set(0x4ade80);
        }
        
        // Finish Line (Green Line)
        if (pz > 5.5 && pz < 6.5 && hasCheckpoint) {
            laps++;
            hasCheckpoint = false;
            checkLine.material.color.set(0xef4444);
            document.getElementById('lap-count').innerText = laps;
            if (laps >= 3) {
                gameActive = false;
                alert(`RACE COMPLETE! Final Time: ${raceTime.toFixed(2)}s`);
                resetGame();
            }
        }
    }

    // UPDATE GRAPH
    if (chart) {
        chart.data.datasets[0].data.push(speed); chart.data.datasets[0].data.shift();
        chart.data.datasets[1].data.push(accel); chart.data.datasets[1].data.shift();
        chart.update('none');
    }

    // UPDATE VECTOR ARROWS
    const wPos = new THREE.Vector3(); ball.getWorldPosition(wPos);
    updateArrow(arrowG, fgX, fgZ, wPos, 0.5); // Gravity
    updateArrow(arrowF, -vx * 10, -vz * 10, wPos, 0.6); // Friction
    updateArrow(arrowN, nFX, nFZ, wPos, 0.7); // Net Force

    renderer.render(scene, camera);
}

function updateArrow(arrow, fx, fz, pos, height) {
    const dir = new THREE.Vector3(fx, 0, fz);
    const len = dir.length();
    if (len > 0.05) {
        arrow.setDirection(dir.normalize());
        arrow.setLength(len * 1.5, 0.3, 0.15);
        arrow.position.copy(pos);
        arrow.position.y += height;
        arrow.visible = true;
    } else { arrow.visible = false; }
}

/* --- UI CONTROLS --- */
const modeButtons = ['sandbox', 'challenge', 'racing'];
modeButtons.forEach(mode => {
    document.getElementById(`mode-${mode}`).onclick = () => {
        currentMode = mode;
        modeButtons.forEach(m => document.getElementById(`mode-${m}`).classList.remove('active'));
        document.getElementById(`mode-${mode}`).classList.add('active');
        
        const descriptions = {
            sandbox: "🛠 Free Play: Match the Yellow Target graph for 3s!",
            challenge: "🎯 Survival: Stay in the ring to survive the timer!",
            racing: "🏎 Circuit: Pass the Red gate then the Green gate 3 times!"
        };
        document.getElementById('mode-description').innerText = descriptions[mode];
    };
});

document.getElementById('start-button').onclick = () => {
    document.getElementById('ui').classList.add('hidden');
    document.getElementById('hud-left').classList.remove('hidden');
    document.getElementById('hud-right').classList.remove('hidden');
    
    if (currentMode === 'sandbox') document.getElementById('match-hud').classList.remove('hidden');
    
    document.getElementById('game-stats').classList.toggle('hidden', currentMode !== 'challenge');
    document.getElementById('racing-stats').classList.toggle('hidden', currentMode !== 'racing');

    if (controlMethod === 'mobile' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(res => { if (res === 'granted') initThree(); });
    } else { initThree(); }
};

document.getElementById('reset-ball-btn').onclick = resetGame;

window.addEventListener('resize', () => {
    if (!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});