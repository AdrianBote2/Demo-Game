let scene, camera, renderer, ball, platformGroup, goalRing, finishLine, checkLine, pillar;
let arrowG, arrowF;
let px = 0, pz = 0, vx = 0, vz = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let mass = 0.5, mu = 0.15, g = 9.81;

// Engine State
let currentMode = 'sandbox'; 
let laps = 0, hasCheckpoint = false, gameActive = false;
let score = 0, timeLeft = 10.0, stayTimer = 0;
let raceTime = 0, bestTime = Infinity;
let goalX = 5, goalZ = 5;

// Mode UI Selection Logic
const modeBtns = ['sandbox', 'challenge', 'racing'];
modeBtns.forEach(m => {
    document.getElementById(`mode-${m}`).addEventListener('click', () => {
        currentMode = m;
        modeBtns.forEach(b => document.getElementById(`mode-${b}`).classList.remove('active'));
        document.getElementById(`mode-${m}`).classList.add('active');
        
        const desc = { 
            sandbox: "Free play! Explore inertia, friction, and gravity.", 
            challenge: "Target: Stay in the ring for 3s to reset the 10s timer!", 
            racing: "Laps: Pass Red Gate, then Green Gate (3 Laps total)" 
        };
        document.getElementById('mode-description').innerText = desc[m];
    });
});

function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(25, 30, 25);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    platformGroup = new THREE.Group();
    scene.add(platformGroup);

    // Platform Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(22, 1, 22), new THREE.MeshPhongMaterial({ color: 0x1e293b }));
    base.position.y = -0.5; base.receiveShadow = true;
    platformGroup.add(base);
    platformGroup.add(new THREE.GridHelper(22, 22, 0x4ade80, 0x1e293b));

    // Racing Objects: Radial Gates (pointing center to edge)
    pillar = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 4, 32), new THREE.MeshPhongMaterial({ color: 0x334155 }));
    pillar.position.y = 2; pillar.castShadow = true;
    platformGroup.add(pillar);

    // Finish Line (Green Gate at South)
    finishLine = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 8), new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(0, 0.02, 6.5); 
    platformGroup.add(finishLine);

    // Checkpoint Line (Red Gate at North)
    checkLine = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    checkLine.rotation.x = -Math.PI / 2;
    checkLine.position.set(0, 0.02, -6.5);
    platformGroup.add(checkLine);

    // Challenge Mode Object
    goalRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.1, 16, 100), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    goalRing.rotation.x = Math.PI / 2; goalRing.position.y = 0.05;
    platformGroup.add(goalRing);

    // Ball (Child of group for perfect tilt alignment)
    ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 80 }));
    ball.castShadow = true;
    platformGroup.add(ball);

    // Telemetry Arrows
    arrowG = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0xef4444);
    arrowF = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x3b82f6);
    scene.add(arrowG, arrowF, new THREE.AmbientLight(0xffffff, 0.5));
    
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(20, 40, 20); light.castShadow = true;
    scene.add(light);

    resetGame();
    window.addEventListener('deviceorientation', handleOrientation);
    gameActive = true;
    animate();
}

function resetGame() {
    // Racing starts ball at a side position, others at center
    px = (currentMode === 'racing') ? 6 : 0; 
    pz = 0; vx = 0; vz = 0;
    laps = 0; hasCheckpoint = false; raceTime = 0; stayTimer = 0; score = 0; timeLeft = 10.0;
    
    // Toggle Visibility
    pillar.visible = finishLine.visible = checkLine.visible = (currentMode === 'racing');
    goalRing.visible = (currentMode === 'challenge');
    checkLine.material.color.set(0xef4444);

    if (currentMode === 'challenge') spawnGoal();
    if (document.getElementById('lap-count')) document.getElementById('lap-count').innerText = "0";
}

function spawnGoal() {
    goalX = (Math.random() - 0.5) * 16;
    goalZ = (Math.random() - 0.5) * 16;
    goalRing.position.set(goalX, 0.05, goalZ);
}

function handleOrientation(e) {
    if (calibBeta === null) { calibBeta = e.beta; calibGamma = e.gamma; return; }
    tiltX = e.gamma - calibGamma; tiltY = e.beta - calibBeta;
}

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    // Orientation to Rotation
    const radX = THREE.MathUtils.degToRad(Math.max(-25, Math.min(25, tiltX)));
    const radZ = THREE.MathUtils.degToRad(Math.max(-25, Math.min(25, tiltY)));
    platformGroup.rotation.z = -radX;
    platformGroup.rotation.x = radZ;

    // Physics Engine (Local Coordinates)
    const fgX = mass * g * Math.sin(radX), fgZ = mass * g * Math.sin(radZ);
    const normalForce = mass * g * Math.cos(Math.sqrt(radX**2 + radZ**2));
    const maxFriction = mu * normalForce;

    // Apply Friction vs Gravity
    let nFX = (Math.abs(fgX) > maxFriction) ? fgX - (Math.sign(fgX) * maxFriction) : 0;
    let nFZ = (Math.abs(fgZ) > maxFriction) ? fgZ - (Math.sign(fgZ) * maxFriction) : 0;

    vx = (nFX === 0) ? vx * 0.92 : vx + (nFX / mass) * 0.016;
    vz = (nFZ === 0) ? vz * 0.92 : vz + (nFZ / mass) * 0.016;
    px += vx; pz += vz;

    // Wall Boundaries
    if (Math.abs(px) > 10.5) { px = Math.sign(px) * 10.5; vx *= -0.5; }
    if (Math.abs(pz) > 10.5) { pz = Math.sign(pz) * 10.5; vz *= -0.5; }

    // Racing: Pillar Collision & Lap Logic
    if (currentMode === 'racing') {
        const d = Math.sqrt(px*px + pz*pz);
        if (d < 3.5) { 
            const a = Math.atan2(pz, px); 
            px = Math.cos(a) * 3.5; pz = Math.sin(a) * 3.5;
            vx *= -0.3; vz *= -0.3;
        }
        
        raceTime += 0.016;
        document.getElementById('race-timer').innerText = raceTime.toFixed(1);
        
        // CHECKPOINT GATE (Z near -6.5)
        if (pz < -5.5 && pz > -7.5 && Math.abs(px) < 0.6 && !hasCheckpoint) {
            hasCheckpoint = true; 
            checkLine.material.color.set(0x4ade80);
        }
        // FINISH GATE (Z near +6.5)
        if (pz > 5.5 && pz < 7.5 && Math.abs(px) < 0.6 && hasCheckpoint) {
            laps++;
            hasCheckpoint = false;
            checkLine.material.color.set(0xef4444);
            document.getElementById('lap-count').innerText = laps;
            if (laps >= 3) { alert("Race Complete! Time: " + raceTime.toFixed(2)); resetGame(); }
        }
    }

    // Challenge: Goal Logic
    if (currentMode === 'challenge') {
        timeLeft -= 0.016;
        if (Math.sqrt((px-goalX)**2 + (pz-goalZ)**2) < 1.2 && Math.abs(vx) < 0.05) {
            stayTimer += 0.016; goalRing.material.color.set(0x4ade80);
            if (stayTimer >= 3) { score++; timeLeft = 10.0; stayTimer = 0; spawnGoal(); }
        } else { stayTimer = 0; goalRing.material.color.set(0xfbbf24); }
        document.getElementById('timer').innerText = Math.max(0, timeLeft).toFixed(1);
        document.getElementById('score').innerText = score;
        if (timeLeft <= 0) { gameActive = false; alert("Time Up! Score: " + score); location.reload(); }
    }

    // Update Visuals
    ball.position.set(px, 0.5, pz);
    ball.rotation.z -= vx; ball.rotation.x += vz;

    // Telemetry Arrows
    const wPos = new THREE.Vector3(); ball.getWorldPosition(wPos);
    updateArrow(arrowG, fgX, fgZ, wPos, 0.5);
    updateArrow(arrowF, -vx * 10, -vz * 10, wPos, 0.6);

    document.getElementById('v-total').innerText = Math.sqrt(vx*vx + vz*vz).toFixed(2);
    document.getElementById('normal-force').innerText = normalForce.toFixed(2);
    renderer.render(scene, camera);
}

function updateArrow(a, fx, fz, p, h) {
    const d = new THREE.Vector3(fx, 0, fz);
    if (d.length() > 0.05) {
        a.setDirection(d.normalize()); a.setLength(d.length() * 1.5, 0.3, 0.15);
        a.position.copy(p); a.position.y += h; a.visible = true;
    } else a.visible = false;
}

// UI Event Handlers
document.getElementById('start-button').addEventListener('click', () => {
    mass = parseFloat(document.getElementById('mass-input').value) || 0.5;
    mu = parseFloat(document.getElementById('surface-input').value) || 0.15;
    g = parseFloat(document.getElementById('gravity-input').value) || 9.81;
    
    document.getElementById('ui').style.display = 'none';
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('game-stats').classList.toggle('hidden', currentMode !== 'challenge');
    document.getElementById('racing-stats').classList.toggle('hidden', currentMode !== 'racing');
    document.getElementById('sandbox-controls').classList.toggle('hidden', currentMode !== 'sandbox');

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(res => { if (res === 'granted') initThree(); });
    } else { initThree(); }
});

document.getElementById('toggle-hud').addEventListener('click', () => document.getElementById('hud').classList.toggle('collapsed'));
document.getElementById('reset-ball-btn').addEventListener('click', resetGame);