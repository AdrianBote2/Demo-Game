let scene, camera, renderer, ball, platformGroup, goalRing;
let px = 0, py = 0.5, pz = 5, vx = 0, vy = 0, vz = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let mass = 0.5, mu = 0.05, g = 9.81;
let floorMeshes = [], gameActive = false;

// Game State
let currentMode = 'sandbox'; 
let goalX = 5, goalZ = 5, score = 0, timeLeft = 10.0, stayTimer = 0;

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

    const matFlat = new THREE.MeshPhongMaterial({ color: 0x1e293b });
    const matSlope = new THREE.MeshPhongMaterial({ color: 0x334155 });

    // --- GEOMETRY ---
    // Ground level quadrants
    createBox(10, 1, 10, -5, -0.5, 5, matFlat); 
    createBox(10, 1, 10, 5, -0.5, 5, matFlat);

    // Sloped quadrants (30 degrees)
    const slopeGeo = new THREE.BoxGeometry(10, 1, 12);
    const s1 = new THREE.Mesh(slopeGeo, matSlope);
    s1.position.set(-5, 2, -5); s1.rotation.x = Math.PI / 6; // 30 deg
    platformGroup.add(s1); floorMeshes.push(s1);

    const s2 = new THREE.Mesh(slopeGeo, matSlope);
    s2.position.set(5, 2, -5); s2.rotation.x = Math.PI / 6; 
    platformGroup.add(s2); floorMeshes.push(s2);

    // Goal Ring
    goalRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.1, 16, 100), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    goalRing.rotation.x = Math.PI / 2;
    platformGroup.add(goalRing);
    goalRing.visible = (currentMode === 'challenge');
    spawnGoal();

    // Ball
    ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ color: 0xef4444 }));
    ball.castShadow = true;
    scene.add(ball);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 50, 10); light.castShadow = true;
    scene.add(light);

    window.addEventListener('deviceorientation', handleOrientation);
    gameActive = true;
    animate();
}

function createBox(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    platformGroup.add(mesh);
    floorMeshes.push(mesh);
}

function spawnGoal() {
    // Challenge is harder on the slopes!
    goalX = (Math.random() - 0.5) * 16;
    goalZ = (Math.random() - 0.5) * 16;
    goalRing.position.set(goalX, (goalZ < 0 ? 2 : 0.05), goalZ);
}

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    const radX = THREE.MathUtils.degToRad(tiltX * 0.6);
    const radZ = THREE.MathUtils.degToRad(tiltY * 0.6);
    platformGroup.rotation.z = -radX;
    platformGroup.rotation.x = radZ;

    const raycaster = new THREE.Raycaster(new THREE.Vector3(px, py, pz), new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObjects(floorMeshes);

    if (intersects.length > 0 && intersects[0].distance <= 0.6) {
        py = intersects[0].point.y + 0.5;
        vy = 0;
        vx += (radX * g) * 0.02;
        vz -= (radZ * g) * 0.02;
        vx *= (1 - mu);
        vz *= (1 - mu);
    } else {
        vy -= g * 0.016;
        py += vy;
        if (py < -15) resetBall();
    }

    px += vx; pz += vz;
    ball.position.set(px, py, pz);

    // CHALLENGE LOGIC
    if (currentMode === 'challenge') {
        timeLeft -= 0.016;
        // Check distance to goal in 3D
        const dist = ball.position.distanceTo(goalRing.getWorldPosition(new THREE.Vector3()));
        
        if (dist < 1.3 && Math.abs(vx) < 0.05 && Math.abs(vz) < 0.05) {
            stayTimer += 0.016;
            goalRing.material.color.set(0x4ade80);
            if (stayTimer >= 3) { score++; timeLeft = 10.0; stayTimer = 0; spawnGoal(); }
        } else { 
            stayTimer = 0; goalRing.material.color.set(0xfbbf24); 
        }

        if (timeLeft <= 0) { gameActive = false; alert("Time Up! Score: " + score); location.reload(); }
        document.getElementById('timer').innerText = Math.max(0, timeLeft).toFixed(1);
        document.getElementById('score').innerText = score;
    }

    document.getElementById('v-total').innerText = Math.sqrt(vx*vx + vz*vz).toFixed(2);
    renderer.render(scene, camera);
}

function handleOrientation(e) {
    if (calibBeta === null) { calibBeta = e.beta; calibGamma = e.gamma; return; }
    tiltX = e.gamma - calibGamma; tiltY = e.beta - calibBeta;
}

function resetBall() {
    px = 0; py = 2; pz = 5; vx = 0; vy = 0; vz = 0;
}

document.getElementById('start-button').addEventListener('click', () => {
    mass = parseFloat(document.getElementById('mass-input').value) || 0.5;
    mu = parseFloat(document.getElementById('surface-input').value) || 0.05;
    g = parseFloat(document.getElementById('gravity-input').value) || 9.81;

    document.getElementById('ui').style.display = 'none';
    document.getElementById('hud').classList.remove('hidden');
    
    if(currentMode === 'challenge') document.getElementById('game-stats').classList.remove('hidden');
    else document.getElementById('sandbox-controls').classList.remove('hidden');

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(res => { if (res === 'granted') initThree(); });
    } else { initThree(); }
});

document.getElementById('toggle-hud').addEventListener('click', () => {
    document.getElementById('hud').classList.toggle('collapsed');
});

document.getElementById('reset-ball-btn').addEventListener('click', resetBall);