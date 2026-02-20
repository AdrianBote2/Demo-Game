let scene, camera, renderer, ball, platformGroup;
let arrowG, arrowF;
let px = 0, py = 2, pz = 5, vx = 0, vy = 0, vz = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let mass = 0.5, mu = 0.05, g = 9.81;
let floorMeshes = [], gameActive = false;

/**
 * Initializes the 3D Environment and Level Geometry
 */
function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(30, 35, 30);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // platformGroup holds everything that tilts with the phone
    platformGroup = new THREE.Group();
    scene.add(platformGroup);

    const mat = new THREE.MeshPhongMaterial({ color: 0x1e293b });

    // --- LEVEL ARCHITECTURE ---
    // Lower Level: Starting Quadrants
    createBox(10, 1, 10, -5, -0.5, 5, mat); // Quadrant 3
    createBox(10, 1, 10, 5, -0.5, 5, mat);  // Quadrant 4

    // Upper Level: Elevated Quadrants
    createBox(10, 1, 10, -5, 4.5, -5, mat); // Quadrant 2
    createBox(10, 1, 10, 5, 4.5, -5, mat);  // Quadrant 1

    // The Bridge: Narrow connector between Q1 and Q2 (No Guard Rails)
    createBox(4, 0.5, 10, 0, 4.75, -5, new THREE.MeshPhongMaterial({color: 0x334155}));

    // The Ramp: Angled slope connecting Lower Q4 to Upper Q1
    const rampGeo = new THREE.BoxGeometry(10, 1, 14.5);
    const ramp = new THREE.Mesh(rampGeo, mat);
    ramp.position.set(5, 2, 0);
    // Trigonometry to set the specific angle of the slope
    ramp.rotation.x = -Math.atan(5/13); 
    platformGroup.add(ramp);
    floorMeshes.push(ramp);

    // The Ball
    ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 100 }));
    ball.castShadow = true;
    scene.add(ball); // Ball is in world-space, not platform-space

    // Physics Visualizers (Vectors)
    arrowG = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 0, 0xef4444);
    arrowF = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x3b82f6);
    scene.add(arrowG, arrowF);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 50, 10);
    light.castShadow = true;
    scene.add(light);

    window.addEventListener('deviceorientation', handleOrientation);
    gameActive = true;
    animate();
}

/**
 * Helper to create floor segments and add them to collision array
 */
function createBox(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    platformGroup.add(mesh);
    floorMeshes.push(mesh);
}

/**
 * Main Physics and Animation Loop
 */
function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    // 1. Calculate Platform Tilt from Device Input
    const radX = THREE.MathUtils.degToRad(tiltX * 0.6);
    const radZ = THREE.MathUtils.degToRad(tiltY * 0.6);
    platformGroup.rotation.z = -radX;
    platformGroup.rotation.x = radZ;

    // 2. Raycast to detect surface relative to platform rotation
    const rayOrigin = new THREE.Vector3(px, py, pz);
    const rayDirection = new THREE.Vector3(0, -1, 0);
    const raycaster = new THREE.Raycaster(rayOrigin, rayDirection);
    const intersects = raycaster.intersectObjects(floorMeshes);

    let onSurface = false;
    if (intersects.length > 0 && intersects[0].distance <= 0.6) {
        onSurface = true;
        // Snap ball to surface height and cancel vertical velocity
        py = intersects[0].point.y + 0.5; 
        vy = 0;

        // Apply Acceleration based on Tilt (F = ma)
        vx += (radX * g) * 0.02;
        vz -= (radZ * g) * 0.02;

        // Apply Rolling Friction (Damping)
        vx *= (1 - mu);
        vz *= (1 - mu);
    } else {
        // --- FREE FALL PHYSICS ---
        vy -= (g * 0.016); // Apply constant gravitational acceleration
        py += vy;
    }

    px += vx;
    pz += vz;

    // 3. Level Boundaries (Reset if ball falls into the void)
    if (py < -20) { resetBall(); }

    ball.position.set(px, py, pz);

    // 4. Update Telemetry UI
    document.getElementById('v-total').innerText = Math.sqrt(vx*vx + vz*vz).toFixed(2);
    document.getElementById('normal-force').innerText = onSurface ? (mass * g).toFixed(2) : "0.00";
    
    // 5. Update Force Vectors
    arrowG.position.set(px, py + 0.6, pz);
    arrowG.setLength(onSurface ? 1 : 2); // Gravity arrow "stretches" in free-fall
    
    renderer.render(scene, camera);
}

function handleOrientation(e) {
    if (calibBeta === null) { calibBeta = e.beta; calibGamma = e.gamma; return; }
    tiltX = (e.gamma - calibGamma);
    tiltY = (e.beta - calibBeta);
}

function resetBall() {
    px = 0; py = 2; pz = 5; 
    vx = 0; vy = 0; vz = 0;
}

/**
 * UI Event Listeners
 */
document.getElementById('start-button').addEventListener('click', () => {
    // Parse user lab settings
    mass = parseFloat(document.getElementById('mass-input').value) || 0.5;
    mu = parseFloat(document.getElementById('surface-input').value) || 0.05;
    g = parseFloat(document.getElementById('gravity-input').value) || 9.81;

    document.getElementById('ui').style.display = 'none';
    document.getElementById('hud').classList.remove('hidden');
    
    // Request permission for iOS Motion sensors
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(res => { 
            if (res === 'granted') initThree(); 
        });
    } else {
        initThree();
    }
});

document.getElementById('toggle-hud').addEventListener('click', () => {
    const hud = document.getElementById('hud');
    hud.classList.toggle('collapsed');
    document.getElementById('toggle-hud').innerText = hud.classList.contains('collapsed') ? '▶' : '▼';
});

document.getElementById('reset-ball-btn').addEventListener('click', resetBall);

// Handle window resizing
window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});