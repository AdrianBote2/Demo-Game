let scene, camera, renderer, ball, platformGroup;
let arrowG, arrowF, arrowN;
let px = 0, pz = 0, vx = 0, vz = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let mass = 0.5, mu = 0.15, g = 9.81;

function initThree() {
    // 1. Scene & Helicopter Camera
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(35, 40, 35); 
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // 2. THE PLATFORM (The Parent)
    platformGroup = new THREE.Group();
    scene.add(platformGroup);

    const platformSize = 22;
    
    // Grid (Visual markers)
    const gridHelper = new THREE.GridHelper(platformSize, 22, 0x4ade80, 0x1e293b);
    platformGroup.add(gridHelper);

    // Solid Base (Shifted so top face is at Local Y=0)
    const baseGeo = new THREE.BoxGeometry(platformSize, 1, platformSize);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x1e293b });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.5; 
    base.receiveShadow = true;
    platformGroup.add(base);

    // 3. THE BALL (The Child)
    const ballGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const ballMat = new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 80 });
    ball = new THREE.Mesh(ballGeo, ballMat);
    
    // Positioned exactly on top (Local Y = 0.5 radius)
    ball.position.set(0, 0.5, 0); 
    ball.castShadow = true;
    platformGroup.add(ball); // Crucial: Added to group, not scene

    // 4. VECTORS (Global scene for true orientation)
    arrowG = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0xef4444);
    arrowF = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x3b82f6);
    arrowN = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x4ade80);
    scene.add(arrowG, arrowF, arrowN);

    // 5. LIGHTING
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(20, 40, 20);
    light.castShadow = true;
    scene.add(light);

    window.addEventListener('deviceorientation', handleOrientation);
    animate();
}

function handleOrientation(e) {
    if (calibBeta === null) { calibBeta = e.beta; calibGamma = e.gamma; return; }
    tiltX = e.gamma - calibGamma;
    tiltY = e.beta - calibBeta;
}

function animate() {
    requestAnimationFrame(animate);

    // --- 1. TILT THE PLATFORM ---
    const maxTilt = 25;
    const radX = THREE.MathUtils.degToRad(Math.max(-maxTilt, Math.min(maxTilt, tiltX)));
    const radZ = THREE.MathUtils.degToRad(Math.max(-maxTilt, Math.min(maxTilt, tiltY)));

    platformGroup.rotation.z = -radX;
    platformGroup.rotation.x = radZ;

    // --- 2. CALCULATE FORCES ---
    // Component of gravity acting down the slope: F = mg * sin(theta)
    const fgX = mass * g * Math.sin(radX);
    const fgZ = mass * g * Math.sin(radZ);
    const normalForce = mass * g * Math.cos(Math.sqrt(radX**2 + radZ**2));
    const maxFriction = mu * normalForce;

    // Net Force calculation
    let nFX = (Math.abs(fgX) > maxFriction) ? fgX - (Math.sign(fgX) * maxFriction) : 0;
    let nFZ = (Math.abs(fgZ) > maxFriction) ? fgZ - (Math.sign(fgZ) * maxFriction) : 0;

    // Acceleration (a = F/m) -> Velocity integration
    vx = (nFX === 0) ? vx * 0.92 : vx + (nFX / mass) * 0.016;
    vz = (nFZ === 0) ? vz * 0.92 : vz + (nFZ / mass) * 0.016;

    px += vx; pz += vz;

    // --- 3. BOUNDARIES ---
    const limit = 10.5; // (22/2) - 0.5 radius
    if (Math.abs(px) > limit) { px = Math.sign(px) * limit; vx *= -0.5; }
    if (Math.abs(pz) > limit) { pz = Math.sign(pz) * limit; vz *= -0.5; }

    // --- 4. UPDATE VISUALS ---
    ball.position.x = px;
    ball.position.z = pz;
    ball.position.y = 0.5; // Always stays 0.5 units above the tilted surface
    
    // Rotate the ball mesh to simulate rolling
    ball.rotation.z -= vx; 
    ball.rotation.x += vz;

    // Update Arrows (Convert local ball position to world space)
    const worldPos = new THREE.Vector3();
    ball.getWorldPosition(worldPos);

    updateArrow(arrowG, fgX, fgZ, worldPos, 0.5);
    updateArrow(arrowF, -vx * 10, -vz * 10, worldPos, 0.6);
    updateArrow(arrowN, nFX, nFZ, worldPos, 0.7);

    // Update HUD
    document.getElementById('v-total').innerText = Math.sqrt(vx*vx + vz*vz).toFixed(2);
    document.getElementById('normal-force').innerText = normalForce.toFixed(2);

    renderer.render(scene, camera);
}

function updateArrow(arrow, fx, fz, pos, hOffset) {
    const dir = new THREE.Vector3(fx, 0, fz);
    const len = dir.length();
    if (len > 0.05) {
        arrow.setDirection(dir.normalize());
        arrow.setLength(len * 1.5, 0.3, 0.15);
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
        DeviceOrientationEvent.requestPermission().then(res => { 
            if (res === 'granted') initThree(); 
        });
    } else { initThree(); }
});

window.addEventListener('resize', () => {
    if (!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});