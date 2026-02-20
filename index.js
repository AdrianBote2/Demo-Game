let scene, camera, renderer, ball, platformGroup, goalRing, finishZone;
let arrowG, arrowF, arrowN;
let px = 0, pz = 0, vx = 0, vz = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let mass = 0.5, mu = 0.15, g = 9.81;

let currentMode = 'sandbox'; 
let goalX = 5, goalZ = 5, score = 0, timeLeft = 10.0, stayTimer = 0, gameActive = false;
let raceTime = 0, bestTime = Infinity;

// UI Selection Logic
const modeBtns = ['sandbox', 'challenge', 'racing'];
modeBtns.forEach(m => {
    document.getElementById(`mode-${m}`).addEventListener('click', () => {
        currentMode = m;
        modeBtns.forEach(btn => document.getElementById(`mode-${btn}`).classList.remove('active'));
        document.getElementById(`mode-${m}`).classList.add('active');
        const desc = {
            sandbox: "Free play! Explore inertia, friction, and gravity.",
            challenge: "Target: Stay in the ring for 3s to reset the clock!",
            racing: "Speed: Reach the Green Zone as fast as possible!"
        };
        document.getElementById('mode-description').innerText = desc[m];
    });
});

function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(25, 30, 25);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    platformGroup = new THREE.Group();
    scene.add(platformGroup);

    // Platform
    const base = new THREE.Mesh(new THREE.BoxGeometry(22, 1, 22), new THREE.MeshPhongMaterial({ color: 0x1e293b }));
    base.position.y = -0.5; base.receiveShadow = true;
    platformGroup.add(base);
    platformGroup.add(new THREE.GridHelper(22, 22, 0x4ade80, 0x1e293b));

    // Mode Objects
    goalRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.1, 16, 100), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    goalRing.rotation.x = Math.PI/2; goalRing.position.y = 0.05;
    platformGroup.add(goalRing);

    finishZone = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.5 }));
    finishZone.rotation.x = -Math.PI/2; finishZone.position.set(8, 0.01, -8);
    platformGroup.add(finishZone);

    // Ball
    ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 80 }));
    scene.add(ball); 

    // Telemetry
    arrowG = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0xef4444);
    arrowF = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x3b82f6);
    arrowN = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x4ade80);
    scene.add(arrowG, arrowF, arrowN);
    
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(20, 40, 20); light.castShadow = true;
    scene.add(light);

    resetState();
    window.addEventListener('deviceorientation', handleOrientation);
    gameActive = true;
    animate();
}

function resetState() {
    if (currentMode === 'racing') { px = -8; pz = 8; } 
    else { px = 0; pz = 0; }
    vx = 0; vz = 0; raceTime = 0; stayTimer = 0;
    goalRing.visible = (currentMode === 'challenge');
    finishZone.visible = (currentMode === 'racing');
    if (currentMode === 'challenge') spawnGoal();
}

function spawnGoal() {
    goalX = (Math.random() - 0.5) * 16;
    goalZ = (Math.random() - 0.5) * 16;
    goalRing.position.set(goalX, 0.05, goalZ);
}

function handleOrientation(e) {
    if (calibBeta === null) { calibBeta = e.beta; calibGamma = e.gamma; return; }
    let orient = window.orientation || 0;
    if (orient === 0) { tiltX = e.gamma - calibGamma; tiltY = e.beta - calibBeta; }
    else if (orient === 90) { tiltX = e.beta - calibBeta; tiltY = -(e.gamma - calibGamma); }
    else { tiltX = -(e.beta - calibBeta); tiltY = e.gamma - calibGamma; }
}

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    const radX = THREE.MathUtils.degToRad(Math.max(-25, Math.min(25, tiltX)));
    const radZ = THREE.MathUtils.degToRad(Math.max(-25, Math.min(25, tiltY)));
    platformGroup.rotation.z = -radX;
    platformGroup.rotation.x = radZ;

    // Physics
    const fgX = mass * g * Math.sin(radX);
    const fgZ = mass * g * Math.sin(radZ);
    const normalForce = mass * g * Math.cos(Math.sqrt(radX**2 + radZ**2));
    const maxFriction = mu * normalForce;

    let nFX = (Math.abs(fgX) > maxFriction) ? fgX - (Math.sign(fgX) * maxFriction) : 0;
    let nFZ = (Math.abs(fgZ) > maxFriction) ? fgZ - (Math.sign(fgZ) * maxFriction) : 0;

    vx = (nFX === 0) ? vx * 0.92 : vx + (nFX / mass) * 0.016;
    vz = (nFZ === 0) ? vz * 0.92 : vz + (nFZ / mass) * 0.016;
    px += vx; pz += vz;

    if (Math.abs(px) > 10.5) { px = Math.sign(px)*10.5; vx *= -0.5; }
    if (Math.abs(pz) > 10.5) { pz = Math.sign(pz)*10.5; vz *= -0.5; }

    ball.position.set(px, 0.5, pz);
    ball.rotation.z -= vx; ball.rotation.x += vz;

    // Mode Updates
    if (currentMode === 'challenge') {
        timeLeft -= 0.016;
        const dist = Math.sqrt((px - goalX)**2 + (pz - goalZ)**2);
        if (dist < 1.2 && Math.abs(vx) < 0.05) {
            stayTimer += 0.016;
            goalRing.material.color.set(0x4ade80);
            if (stayTimer >= 3) { score++; timeLeft = 10.0; stayTimer = 0; spawnGoal(); }
        } else { stayTimer = 0; goalRing.material.color.set(0xfbbf24); }
        document.getElementById('timer').innerText = Math.max(0, timeLeft).toFixed(1);
        if (timeLeft <= 0) { gameActive = false; alert("Score: " + score); location.reload(); }
    } else if (currentMode === 'racing') {
        raceTime += 0.016;
        document.getElementById('race-timer').innerText = raceTime.toFixed(1);
        if (px > 6 && pz < -6) { // Finish zone check
            if (raceTime < bestTime) { 
                bestTime = raceTime; 
                document.getElementById('best-time').innerText = bestTime.toFixed(1);
            }
            alert("Finish! Time: " + raceTime.toFixed(2));
            resetState();
        }
    }

    updateArrow(arrowG, fgX, fgZ, ball.position, 0.6);
    updateArrow(arrowF, -vx*10, -vz*10, ball.position, 0.7);
    updateArrow(arrowN, nFX, nFZ, ball.position, 0.8);

    document.getElementById('v-total').innerText = Math.sqrt(vx*vx + vz*vz).toFixed(2);
    document.getElementById('normal-force').innerText = normalForce.toFixed(2);
    renderer.render(scene, camera);
}

function updateArrow(a, fx, fz, p, h) {
    const d = new THREE.Vector3(fx, 0, fz);
    if (d.length() > 0.05) {
        a.setDirection(d.normalize()); a.setLength(d.length()*1.5, 0.3, 0.15);
        a.position.copy(p); a.position.y += h; a.visible = true;
    } else a.visible = false;
}

document.getElementById('start-button').addEventListener('click', () => {
    mass = parseFloat(document.getElementById('mass-input').value);
    mu = parseFloat(document.getElementById('surface-input').value);
    g = parseFloat(document.getElementById('gravity-input').value);
    document.getElementById('ui').style.display = 'none';
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('game-stats').classList.toggle('hidden', currentMode !== 'challenge');
    document.getElementById('racing-stats').classList.toggle('hidden', currentMode !== 'racing');
    document.getElementById('sandbox-controls').classList.toggle('hidden', currentMode !== 'sandbox');

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(res => { if (res === 'granted') initThree(); });
    } else initThree();
});

document.getElementById('toggle-hud').addEventListener('click', () => {
    document.getElementById('hud').classList.toggle('collapsed');
});

document.getElementById('reset-ball-btn').addEventListener('click', resetState);