let scene, camera, renderer, ball, platformGroup, goalRing;
let arrowG, arrowF, arrowN;
let px = 0, pz = 0, vx = 0, vz = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let mass = 0.5, mu = 0.15, g = 9.81;

// Engine State
let currentMode = 'sandbox'; 
let goalX = 5, goalZ = 5, score = 0, timeLeft = 10.0, stayTimer = 0, gameActive = false;

// UI Selection Logic
document.getElementById('mode-sandbox').addEventListener('click', () => {
    currentMode = 'sandbox';
    document.getElementById('mode-sandbox').classList.add('active');
    document.getElementById('mode-challenge').classList.remove('active');
    document.getElementById('mode-description').innerText = "Free play! Explore inertia, friction, and gravity without limits.";
});

document.getElementById('mode-challenge').addEventListener('click', () => {
    currentMode = 'challenge';
    document.getElementById('mode-challenge').classList.add('active');
    document.getElementById('mode-sandbox').classList.remove('active');
    document.getElementById('mode-description').innerText = "Challenge: Stay in the ring for 3s to reset the 10s timer!";
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

    platformGroup.add(new THREE.GridHelper(22, 22, 0x4ade80, 0x1e293b));
    const base = new THREE.Mesh(new THREE.BoxGeometry(22, 1, 22), new THREE.MeshPhongMaterial({ color: 0x1e293b }));
    base.position.y = -0.5; base.receiveShadow = true;
    platformGroup.add(base);

    goalRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.1, 16, 100), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    goalRing.rotation.x = Math.PI / 2; goalRing.position.y = 0.05;
    platformGroup.add(goalRing);
    goalRing.visible = (currentMode === 'challenge');
    spawnGoal();

    ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 80 }));
    ball.position.set(0, 0.5, 0); ball.castShadow = true;
    platformGroup.add(ball);

    arrowG = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0xef4444);
    arrowF = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x3b82f6);
    arrowN = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x4ade80);
    scene.add(arrowG, arrowF, arrowN, new THREE.AmbientLight(0xffffff, 0.5));
    
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(20, 40, 20); light.castShadow = true;
    scene.add(light);

    window.addEventListener('deviceorientation', handleOrientation);
    gameActive = true;
    animate();
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

    const radX = THREE.MathUtils.degToRad(Math.max(-25, Math.min(25, tiltX)));
    const radZ = THREE.MathUtils.degToRad(Math.max(-25, Math.min(25, tiltY)));
    platformGroup.rotation.z = -radX;
    platformGroup.rotation.x = radZ;

    const fgX = mass * g * Math.sin(radX), fgZ = mass * g * Math.sin(radZ);
    const normalForce = mass * g * Math.cos(Math.sqrt(radX**2 + radZ**2));
    const maxFriction = mu * normalForce;

    let nFX = (Math.abs(fgX) > maxFriction) ? fgX - (Math.sign(fgX) * maxFriction) : 0;
    let nFZ = (Math.abs(fgZ) > maxFriction) ? fgZ - (Math.sign(fgZ) * maxFriction) : 0;

    vx = (nFX === 0) ? vx * 0.92 : vx + (nFX / mass) * 0.016;
    vz = (nFZ === 0) ? vz * 0.92 : vz + (nFZ / mass) * 0.016;
    px += vx; pz += vz;

    if (Math.abs(px) > 10.5) { px = Math.sign(px) * 10.5; vx *= -0.5; }
    if (Math.abs(pz) > 10.5) { pz = Math.sign(pz) * 10.5; vz *= -0.5; }

    ball.position.set(px, 0.5, pz);
    ball.rotation.z -= vx; ball.rotation.x += vz;

    // Mode Specific Updates
    if (currentMode === 'challenge') {
        timeLeft -= 0.016;
        const dist = Math.sqrt((px - goalX)**2 + (pz - goalZ)**2);
        if (dist < 1.2 && Math.abs(vx) < 0.05 && Math.abs(vz) < 0.05) {
            stayTimer += 0.016;
            goalRing.material.color.set(0x4ade80);
            if (stayTimer >= 3) { score++; timeLeft = 10.0; stayTimer = 0; spawnGoal(); }
        } else { stayTimer = 0; goalRing.material.color.set(0xfbbf24); }

        if (timeLeft <= 0) { gameActive = false; alert("Challenge Finished! Score: " + score); location.reload(); }
        document.getElementById('timer').innerText = Math.max(0, timeLeft).toFixed(1);
        document.getElementById('score').innerText = score;
    }

    const wPos = new THREE.Vector3(); ball.getWorldPosition(wPos);
    updateArrow(arrowG, fgX, fgZ, wPos, 0.5);
    updateArrow(arrowF, -vx * 10, -vz * 10, wPos, 0.6);
    updateArrow(arrowN, nFX, nFZ, wPos, 0.7);

    document.getElementById('v-total').innerText = Math.sqrt(vx*vx + vz*vz).toFixed(2);
    document.getElementById('normal-force').innerText = normalForce.toFixed(2);
    renderer.render(scene, camera);
}

function updateArrow(a, fx, fz, p, h) {
    const d = new THREE.Vector3(fx, 0, fz);
    if (d.length() > 0.05) {
        a.setDirection(d.normalize()); a.setLength(d.length() * 1.5, 0.3, 0.15);
        a.position.copy(p); a.position.y += h; a.visible = true;
    } else { a.visible = false; }
}

// Control Event Listeners
document.getElementById('start-button').addEventListener('click', () => {
    mass = parseFloat(document.getElementById('mass-input').value) || 0.5;
    mu = parseFloat(document.getElementById('surface-input').value) || 0.15;
    g = parseFloat(document.getElementById('gravity-input').value) || 9.81;
    document.getElementById('ui').style.display = 'none';
    document.getElementById('hud').classList.remove('hidden');
    
    if(currentMode === 'sandbox') {
        document.getElementById('game-stats').classList.add('hidden');
        document.getElementById('sandbox-controls').classList.remove('hidden');
    }

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(res => { if (res === 'granted') initThree(); });
    } else { initThree(); }
});

document.getElementById('toggle-hud').addEventListener('click', () => {
    const hud = document.getElementById('hud');
    hud.classList.toggle('collapsed');
    document.getElementById('toggle-hud').innerText = hud.classList.contains('collapsed') ? '▶' : '▼';
});

document.getElementById('reset-ball-btn').addEventListener('click', () => {
    px = 0; pz = 0; vx = 0; vz = 0;
});