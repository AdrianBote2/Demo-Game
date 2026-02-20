let scene, camera, renderer, ball, platformGroup;
let arrowG, arrowF, arrowN;
let px = 0, pz = 0, vx = 0, vz = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let mass = 0.5, mu = 0.15, g = 9.81;

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

    // 1. CREATE THE TILT GROUP (Monkey Ball Style)
    platformGroup = new THREE.Group();
    scene.add(platformGroup);

    const platformSize = 22;
    
    // Grid
    const gridHelper = new THREE.GridHelper(platformSize, 22, 0x4ade80, 0x1e293b);
    gridHelper.position.y = 0.01; 
    platformGroup.add(gridHelper);

    // Physical Base
    const baseGeo = new THREE.BoxGeometry(platformSize, 1, platformSize);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x1e293b });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.5; 
    base.receiveShadow = true;
    platformGroup.add(base);

    // 2. The Ball (Stays in the Scene, not the group, so it can roll on top)
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 80 });
    ball = new THREE.Mesh(geometry, material);
    ball.position.y = 0.5; 
    ball.castShadow = true;
    scene.add(ball);

    // 3. Vectors (Attached to the ball)
    arrowG = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0xef4444);
    arrowF = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x3b82f6);
    arrowN = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x4ade80);
    scene.add(arrowG, arrowF, arrowN);

    // 4. Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(15, 40, 15);
    sunLight.castShadow = true;
    scene.add(sunLight);

    window.addEventListener('deviceorientation', handleOrientation);
    animate();
}

function handleOrientation(e) {
    if (calibBeta === null) { calibBeta = e.beta; calibGamma = e.gamma; return; }
    tiltX = (e.gamma - calibGamma);
    tiltY = (e.beta - calibBeta);
}

function animate() {
    requestAnimationFrame(animate);

    // 1. VISUAL TILT (The Monkey Ball Effect)
    // We tilt the group. We cap it at 30 degrees for lab stability.
    const maxTilt = 30;
    const clampedTiltX = Math.max(-maxTilt, Math.min(maxTilt, tiltX));
    const clampedTiltY = Math.max(-maxTilt, Math.min(maxTilt, tiltY));

    // Platform rotates based on phone tilt
    platformGroup.rotation.z = -clampedTiltX * Math.PI / 180;
    platformGroup.rotation.x = clampedTiltY * Math.PI / 180;

    // 2. PHYSICS MATH
    const radX = platformGroup.rotation.z; // Use group rotation for math
    const radZ = platformGroup.rotation.x;

    // Fg component is sin(theta) * m * g
    const fgX = -mass * g * Math.sin(radX);
    const fgZ = mass * g * Math.sin(radZ);
    const normalForce = mass * g * Math.cos(Math.sqrt(radX**2 + radZ**2));
    const maxFriction = mu * normalForce;

    let nFX = (Math.abs(fgX) > maxFriction) ? fgX - (Math.sign(fgX) * maxFriction) : 0;
    let nFZ = (Math.abs(fgZ) > maxFriction) ? fgZ - (Math.sign(fgZ) * maxFriction) : 0;

    vx = (nFX === 0) ? vx * 0.95 : vx + (nFX / mass) * 0.016;
    vz = (nFZ === 0) ? vz * 0.95 : vz + (nFZ / mass) * 0.016;

    px += vx; 
    pz += vz;

    // 3. BOUNDARY & HEIGHT
    const limit = 10.5; 
    if (Math.abs(px) > limit) { px = Math.sign(px) * limit; vx *= -0.4; }
    if (Math.abs(pz) > limit) { pz = Math.sign(pz) * limit; vz *= -0.4; }

    // Ball height must match the tilt! 
    // y = px * tan(tilt) + pz * tan(tilt)
    const heightOffset = (px * Math.tan(-radX)) + (pz * Math.tan(radZ));
    ball.position.set(px, 0.5 + heightOffset, pz);
    
    // Rolling rotation
    ball.rotation.z -= vx; 
    ball.rotation.x += vz;

    // 4. VECTORS & HUD
    updateArrow(arrowG, fgX, fgZ, 0.6 + heightOffset);
    updateArrow(arrowF, -vx * 10, -vz * 10, 0.65 + heightOffset);
    updateArrow(arrowN, nFX, nFZ, 0.7 + heightOffset);

    document.getElementById('v-total').innerText = Math.sqrt(vx*vx + vz*vz).toFixed(2);
    document.getElementById('normal-force').innerText = normalForce.toFixed(2);

    renderer.render(scene, camera);
}

function updateArrow(arrow, forceX, forceZ, height) {
    const dir = new THREE.Vector3(forceX, 0, forceZ);
    const length = dir.length();
    if (length > 0.05) {
        arrow.setDirection(dir.normalize());
        arrow.setLength(length * 1.5, 0.3, 0.15); 
        arrow.position.set(px, height, pz);
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

window.addEventListener('resize', () => {
    if (!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});