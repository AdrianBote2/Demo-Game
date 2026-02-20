let scene, camera, renderer, ball, platformGroup, goalRing;
let px = 0, py = 5, pz = 5, vx = 0, vy = 0, vz = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let mass = 0.5, mu = 0.08, g = 9.81;
let floorMeshes = [], gameActive = false;

// Game State
let currentMode = 'sandbox'; 
let goalX = 5, goalZ = 5, score = 0, timeLeft = 10.0, stayTimer = 0;

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

    // --- PLATFORM GEOMETRY ---
    // Ground level quadrants (The safe spawn area)
    createBox(10, 1, 10, -5, -0.5, 5, matFlat); // Q3
    createBox(10, 1, 10, 5, -0.5, 5, matFlat);  // Q4

    // Sloped quadrants (30 degrees)
    // We increase the Y position so they meet the flat floor at the center line (Z=0)
    const slopeGeo = new THREE.BoxGeometry(10, 1, 12);
    
    const s1 = new THREE.Mesh(slopeGeo, matSlope);
    s1.position.set(-5, 2.5, -5.5); 
    s1.rotation.x = Math.PI / 6; // 30 degrees
    platformGroup.add(s1); 
    floorMeshes.push(s1);

    const s2 = new THREE.Mesh(slopeGeo, matSlope);
    s2.position.set(5, 2.5, -5.5); 
    s2.rotation.x = Math.PI / 6; 
    platformGroup.add(s2); 
    floorMeshes.push(s2);

    // Goal Ring
    goalRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.1, 16, 100), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    goalRing.rotation.x = Math.PI / 2;
    platformGroup.add(goalRing);
    goalRing.visible = (currentMode === 'challenge');
    spawnGoal();

    // The Ball
    ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 100 }));
    ball.castShadow = true;
    scene.add(ball);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 50, 10);
    light.castShadow = true;
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
    goalX = (Math.random() - 0.5) * 16;
    goalZ = (Math.random() - 0.5) * 16;
    // Raycast to find the correct height for the goal ring
    const ray = new THREE.Raycaster(new THREE.Vector3(goalX, 10, goalZ), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObjects(floorMeshes.concat(platformGroup.children));
    if (hit.length > 0) {
        goalRing.position.set(goalX, hit[0].point.y + 0.1, goalZ);
        // Match the rotation of the floor it's on
        goalRing.rotation.x = hit[0].object.rotation.x + (Math.PI / 2);
    }
}

function handleOrientation(e) {
    if (calibBeta === null) { calibBeta = e.beta; calibGamma = e.gamma; return; }
    
    // Correction for Portrait/Landscape
    let orientation = window.orientation || 0;
    if (orientation === 0) {
        tiltX = e.gamma - calibGamma;
        tiltY = e.beta - calibBeta;
    } else {
        tiltX = e.beta - calibBeta;
        tiltY = -(e.gamma - calibGamma);
    }
}

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    // 1. Rotate the whole world
    const radX = THREE.MathUtils.degToRad(Math.max(-30, Math.min(30, tiltX)) * 0.6);
    const radZ = THREE.MathUtils.degToRad(Math.max(-30, Math.min(30, tiltY)) * 0.6);
    platformGroup.rotation.z = -radX;
    platformGroup.rotation.x = radZ;

    // 2. Raycast to find the floor relative to the tilting world
    const raycaster = new THREE.Raycaster(new THREE.Vector3(px, py + 1, pz), new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObjects(floorMeshes.concat(platformGroup.children));

    if (intersects.length > 0) {
        const dist = intersects[0].distance;
        const groundY = intersects[0].point.y + 0.5;

        // If the ball is very close to the floor, stick it and apply tilt forces
        if (dist <= 1.1) {
            py = groundY;
            vy = 0;

            // Physics logic: Move based on the platform's tilt
            vx += (radX * g) * 0.018;
            vz -= (radZ * g) * 0.018;

            // Slope Physics: If on a ramp, add the local slope acceleration
            const surfaceRotation = intersects[0].object.rotation.x;
            if (surfaceRotation !== 0) {
                vz -= Math.sin(surfaceRotation) * g * 0.016;
            }

            vx *= (1 - mu);
            vz *= (1 - mu);
        } else {
            // Air physics (Gravity)
            vy -= g * 0.016;
            py += vy;
        }
    } else {
        // Falling off the edge
        vy -= g * 0.016;
        py += vy;
    }

    px += vx;
    pz += vz;

    // Boundary Check / Reset
    if (py < -15 || Math.abs(px) > 15 || Math.abs(pz) > 15) resetBall();

    ball.position.set(px, py, pz);

    // --- MODE LOGIC ---
    if (currentMode === 'challenge') {
        timeLeft -= 0.016;
        const dist = ball.position.distanceTo(goalRing.getWorldPosition(new THREE.Vector3()));
        if (dist < 1.3 && Math.abs(vx) < 0.1 && Math.abs(vz) < 0.1) {
            stayTimer += 0.016;
            goalRing.material.color.set(0x4ade80);
            if (stayTimer >= 2) { score++; timeLeft = 10.0; stayTimer = 0; spawnGoal(); }
        } else {
            stayTimer = 0;
            goalRing.material.color.set(0xfbbf24);
        }
        if (timeLeft <= 0) { gameActive = false; alert("Score: " + score); location.reload(); }
        document.getElementById('timer').innerText = Math.max(0, timeLeft).toFixed(1);
        document.getElementById('score').innerText = score;
    }

    document.getElementById('v-total').innerText = Math.sqrt(vx*vx + vz*vz).toFixed(2);
    renderer.render(scene, camera);
}

function resetBall() {
    px = 0; py = 5; pz = 5; // Spawn above the flat quadrants
    vx = 0; vy = 0; vz = 0;
}

// Start Listeners... (Rest remains same as previous version)

/* --- Start Listener --- */
document.getElementById('start-button').addEventListener('click', () => {
    mass = parseFloat(document.getElementById('mass-input').value) || 0.5;
    mu = parseFloat(document.getElementById('surface-input').value) || 0.05;
    g = parseFloat(document.getElementById('gravity-input').value) || 9.81;

    document.getElementById('ui').style.display = 'none';
    document.getElementById('hud').classList.remove('hidden');
    
    if(currentMode === 'challenge') {
        document.getElementById('game-stats').classList.remove('hidden');
    } else {
        document.getElementById('sandbox-controls').classList.remove('hidden');
    }

    // Permission check for iOS
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(res => { if (res === 'granted') initThree(); })
            .catch(err => console.error(err));
    } else {
        initThree();
    }
});

document.getElementById('toggle-hud').addEventListener('click', () => {
    document.getElementById('hud').classList.toggle('collapsed');
});

document.getElementById('reset-ball-btn').addEventListener('click', resetBall);