let scene, camera, renderer, ball, platformGroup, goalRing;
let px = 0, py = 0.5, pz = 5, vx = 0, vy = 0, vz = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let mass = 0.5, mu = 0.05, g = 9.81;
let floorMeshes = [], gameActive = false;

// Game State
let currentMode = 'sandbox'; 
let goalX = 5, goalZ = 5, score = 0, timeLeft = 10.0, stayTimer = 0;

/* --- UI Logic --- */
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

/* --- Core Engine --- */
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

    // --- LEVEL DESIGN ---
    // Ground level quadrants (Flat)
    createBox(10, 1, 10, -5, -0.5, 5, matFlat); 
    createBox(10, 1, 10, 5, -0.5, 5, matFlat);

    // Sloped quadrants (Fixed 30 degrees)
    const slopeGeo = new THREE.BoxGeometry(10, 1, 12);
    const s1 = new THREE.Mesh(slopeGeo, matSlope);
    s1.position.set(-5, 2, -5); 
    s1.rotation.x = Math.PI / 6; // 30 degrees
    platformGroup.add(s1); 
    floorMeshes.push(s1);

    const s2 = new THREE.Mesh(slopeGeo, matSlope);
    s2.position.set(5, 2, -5); 
    s2.rotation.x = Math.PI / 6; 
    platformGroup.add(s2); 
    floorMeshes.push(s2);

    // Challenge Goal Ring
    goalRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.1, 16, 100), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    goalRing.rotation.x = Math.PI / 2;
    platformGroup.add(goalRing);
    goalRing.visible = (currentMode === 'challenge');
    spawnGoal();

    // The Ball
    ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 100 }));
    ball.castShadow = true;
    scene.add(ball);

    // Lights
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
    // Elevate the goal if it spawns on the slopes
    const goalY = (goalZ < 0) ? 2.1 : 0.05;
    goalRing.position.set(goalX, goalY, goalZ);
}

function handleOrientation(e) {
    if (calibBeta === null) {
        calibBeta = e.beta;
        calibGamma = e.gamma;
        return;
    }

    // --- CORRECTION FOR PHONE DIRECTION ---
    let orientation = window.orientation || 0;

    if (orientation === 0) { // Portrait
        tiltX = e.gamma - calibGamma;
        tiltY = e.beta - calibBeta;
    } else if (orientation === 90) { // Landscape Left
        tiltX = e.beta - calibBeta;
        tiltY = -(e.gamma - calibGamma);
    } else if (orientation === -90) { // Landscape Right
        tiltX = -(e.beta - calibBeta);
        tiltY = e.gamma - calibGamma;
    }
}

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    // Smooth tilt application
    const radX = THREE.MathUtils.degToRad(Math.max(-30, Math.min(30, tiltX)) * 0.6);
    const radZ = THREE.MathUtils.degToRad(Math.max(-30, Math.min(30, tiltY)) * 0.6);
    
    platformGroup.rotation.z = -radX;
    platformGroup.rotation.x = radZ;

    // Physics: Raycast Down to detect if on flat or slope
    const raycaster = new THREE.Raycaster(new THREE.Vector3(px, py + 1, pz), new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObjects(floorMeshes);

    if (intersects.length > 0 && intersects[0].distance <= 1.1) {
        py = intersects[0].point.y + 0.5;
        vy = 0;

        // Acceleration from tilt
        vx += (radX * g) * 0.02;
        vz -= (radZ * g) * 0.02;

        // Apply Friction
        vx *= (1 - mu);
        vz *= (1 - mu);
    } else {
        // Falling Physics
        vy -= g * 0.016;
        py += vy;
        if (py < -15) resetBall();
    }

    px += vx;
    pz += vz;
    ball.position.set(px, py, pz);

    // --- CHALLENGE MODE LOGIC ---
    if (currentMode === 'challenge') {
        timeLeft -= 0.016;
        const worldGoalPos = new THREE.Vector3();
        goalRing.getWorldPosition(worldGoalPos);
        const dist = ball.position.distanceTo(worldGoalPos);
        
        if (dist < 1.3 && Math.abs(vx) < 0.08 && Math.abs(vz) < 0.08) {
            stayTimer += 0.016;
            goalRing.material.color.set(0x4ade80);
            if (stayTimer >= 3) {
                score++;
                timeLeft = 10.0;
                stayTimer = 0;
                spawnGoal();
            }
        } else {
            stayTimer = 0;
            goalRing.material.color.set(0xfbbf24);
        }

        if (timeLeft <= 0) {
            gameActive = false;
            alert("Game Over! Your Score: " + score);
            location.reload();
        }
        document.getElementById('timer').innerText = Math.max(0, timeLeft).toFixed(1);
        document.getElementById('score').innerText = score;
    }

    // UI Updates
    document.getElementById('v-total').innerText = Math.sqrt(vx*vx + vz*vz).toFixed(2);
    renderer.render(scene, camera);
}

function resetBall() {
    px = 0; py = 2; pz = 5; 
    vx = 0; vy = 0; vz = 0;
}

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