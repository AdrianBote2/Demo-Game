let scene, camera, renderer, ball, platformGroup, goalRing;
let arrowG, arrowF, arrowN;
let px = 0, pz = 0, vx = 0, vz = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let mass = 0.5, mu = 0.15, g = 9.81;

// Game State
let goalX = 5, goalZ = 5;
let score = 0;
let timeLeft = 10.0;
let stayTimer = 0; // Tracks the 3 seconds
let gameActive = false;

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

    const platformSize = 22;
    
    // Grid & Base
    const gridHelper = new THREE.GridHelper(platformSize, 22, 0x4ade80, 0x1e293b);
    platformGroup.add(gridHelper);

    const baseGeo = new THREE.BoxGeometry(platformSize, 1, platformSize);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x1e293b });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.5;
    base.receiveShadow = true;
    platformGroup.add(base);

    // GOAL RING (The Target)
    const ringGeo = new THREE.TorusGeometry(1.2, 0.1, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 }); // Yellow
    goalRing = new THREE.Mesh(ringGeo, ringMat);
    goalRing.rotation.x = Math.PI / 2; // Lay flat
    goalRing.position.y = 0.05; // Slightly above grid
    platformGroup.add(goalRing);
    spawnGoal();

    // The Ball
    const ballGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const ballMat = new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 80 });
    ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, 0.5, 0);
    ball.castShadow = true;
    platformGroup.add(ball);

    // Vectors & Lights
    arrowG = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0xef4444);
    arrowF = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x3b82f6);
    arrowN = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x4ade80);
    scene.add(arrowG, arrowF, arrowN, new THREE.AmbientLight(0xffffff, 0.5));

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(20, 40, 20);
    light.castShadow = true;
    scene.add(light);

    window.addEventListener('deviceorientation', handleOrientation);
    gameActive = true;
    animate();
}

function spawnGoal() {
    goalX = (Math.random() - 0.5) * 16;
    goalZ = (Math.random() - 0.5) * 16;
    goalRing.position.x = goalX;
    goalRing.position.z = goalZ;
    goalRing.material.color.set(0xfbbf24); // Reset to Yellow
}

function handleOrientation(e) {
    if (calibBeta === null) { calibBeta = e.beta; calibGamma = e.gamma; return; }
    tiltX = e.gamma - calibGamma;
    tiltY = e.beta - calibBeta;
}

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    // 1. TILT & PHYSICS
    const maxTilt = 25;
    const radX = THREE.MathUtils.degToRad(Math.max(-maxTilt, Math.min(maxTilt, tiltX)));
    const radZ = THREE.MathUtils.degToRad(Math.max(-maxTilt, Math.min(maxTilt, tiltY)));
    platformGroup.rotation.z = -radX;
    platformGroup.rotation.x = radZ;

    const fgX = mass * g * Math.sin(radX);
    const fgZ = mass * g * Math.sin(radZ);
    const normalForce = mass * g * Math.cos(Math.sqrt(radX**2 + radZ**2));
    const maxFriction = mu * normalForce;

    let nFX = (Math.abs(fgX) > maxFriction) ? fgX - (Math.sign(fgX) * maxFriction) : 0;
    let nFZ = (Math.abs(fgZ) > maxFriction) ? fgZ - (Math.sign(fgZ) * maxFriction) : 0;

    vx = (nFX === 0) ? vx * 0.92 : vx + (nFX / mass) * 0.016;
    vz = (nFZ === 0) ? vz * 0.92 : vz + (nFZ / mass) * 0.016;
    px += vx; pz += vz;

    const limit = 10.5;
    if (Math.abs(px) > limit) { px = Math.sign(px) * limit; vx *= -0.5; }
    if (Math.abs(pz) > limit) { pz = Math.sign(pz) * limit; vz *= -0.5; }

    ball.position.x = px;
    ball.position.z = pz;
    ball.rotation.z -= vx; ball.rotation.x += vz;

    // 2. GAME LOGIC (The Timer & Goal Check)
    timeLeft -= 0.016;
    const distToGoal = Math.sqrt((px - goalX)**2 + (pz - goalZ)**2);

    // If ball is inside the ring (1.2 units) and moving slowly
    if (distToGoal < 1.2 && Math.abs(vx) < 0.05 && Math.abs(vz) < 0.05) {
        stayTimer += 0.016;
        goalRing.material.color.set(0x4ade80); // Turn Green
        if (stayTimer >= 3) {
            score++;
            timeLeft = 10.0; // Reset timer
            stayTimer = 0;
            spawnGoal();
        }
    } else {
        stayTimer = 0;
        goalRing.material.color.set(0xfbbf24); // Back to Yellow
    }

    // End Game Condition
    if (timeLeft <= 0) {
        gameActive = false;
        alert("Game Over! Goals completed: " + score);
        location.reload();
    }

    // 3. UI & ARROWS
    const worldPos = new THREE.Vector3();
    ball.getWorldPosition(worldPos);
    updateArrow(arrowG, fgX, fgZ, worldPos, 0.5);
    updateArrow(arrowF, -vx * 10, -vz * 10, worldPos, 0.6);
    updateArrow(arrowN, nFX, nFZ, worldPos, 0.7);

    document.getElementById('timer').innerText = Math.max(0, timeLeft).toFixed(1);
    document.getElementById('score').innerText = score;
    document.getElementById('v-total').innerText = Math.sqrt(vx*vx + vz*vz).toFixed(2);
    document.getElementById('normal-force').innerText = normalForce.toFixed(2);

    renderer.render(scene, camera);
}

function updateArrow(arrow, fx, fz, pos, hOffset) {
    const dir = new THREE.Vector3(fx, 0, fz);
    if (dir.length() > 0.05) {
        arrow.setDirection(dir.normalize());
        arrow.setLength(dir.length() * 1.5, 0.3, 0.15);
        arrow.position.copy(pos);
        arrow.position.y += hOffset;
        arrow.visible = true;
    } else { arrow.visible = false; }
}

document.getElementById('start-button').addEventListener('click', () => {
    mass = parseFloat(document.getElementById('mass-input').value) || 0.5;
    mu = parseFloat(document.getElementById('surface-input').value) || 0.15;
    g = parseFloat(document.getElementById('gravity-input').value) || 9.81;
    document.getElementById('ui').style.display = 'none';
    document.getElementById('hud').classList.remove('hidden');
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(res => { if (res === 'granted') initThree(); });
    } else { initThree(); }
});