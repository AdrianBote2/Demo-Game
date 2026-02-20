let scene, camera, renderer, ball, arrowG, arrowF, arrowN;
let px = 0, pz = 0, vx = 0, vz = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let mass = 0.5, mu = 0.15, g = 9.81;

/**
 * Initialize the Three.js Environment
 */
function initThree() {
    // 1. Scene & Helicopter Camera Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);

    // Zoomed out Helicopter perspective
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(45, 50, 45); 
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // 2. THE PLATFORM (18 x 18)
    const platformSize = 20;
    
    // The Visual Grid (18 units wide, 18 divisions)
    const gridHelper = new THREE.GridHelper(platformSize, 18, 0x4ade80, 0x1e293b);
    gridHelper.position.y = 0.01; // Offset to prevent Z-fighting with the base
    scene.add(gridHelper);

    // The Physical Base (Provides visual depth for Helicopter view)
    const baseGeo = new THREE.BoxGeometry(platformSize, 1, platformSize);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x1e293b });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.5; // Top surface aligns with Y=0
    base.receiveShadow = true;
    scene.add(base);

    // 3. The 3D Sphere (The Lab Subject)
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xef4444, 
        shininess: 80,
        specular: 0x444444 
    });
    ball = new THREE.Mesh(geometry, material);
    ball.position.y = 0.5; // Radius is 0.5, so Y=0.5 puts it on the floor
    ball.castShadow = true;
    scene.add(ball);

    // 4. Lighting (Sunlight for shadows)
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // 5. 3D Vector Helpers (Physics Visualization)
    arrowG = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0xef4444);
    arrowF = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x3b82f6);
    arrowN = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x4ade80);
    scene.add(arrowG, arrowF, arrowN);

    window.addEventListener('deviceorientation', handleOrientation);
    animate();
}

/**
 * Handle Sensor Input & Calibration
 */
function handleOrientation(e) {
    if (calibBeta === null) { 
        calibBeta = e.beta; 
        calibGamma = e.gamma; 
        return; 
    }
    // Map phone tilt to the 3D plane
    tiltX = e.gamma - calibGamma;
    tiltY = e.beta - calibBeta;
}

/**
 * Core Physics & Animation Loop
 */
function animate() {
    requestAnimationFrame(animate);

    // Convert tilt to Radians for Trigonometry
    const radX = (tiltX * Math.PI) / 180;
    const radZ = (tiltY * Math.PI) / 180;

    // Resolve Gravitational Components
    const fgX = mass * g * Math.sin(radX);
    const fgZ = mass * g * Math.sin(radZ);
    const normalForce = mass * g * Math.cos(Math.sqrt(radX**2 + radZ**2));
    const maxFriction = mu * normalForce;

    // Apply Newton's Second Law (F = ma) with Friction
    let nFX = (Math.abs(fgX) > maxFriction) ? fgX - (Math.sign(fgX) * maxFriction) : 0;
    let nFZ = (Math.abs(fgZ) > maxFriction) ? fgZ - (Math.sign(fgZ) * maxFriction) : 0;

    // Integration (0.016 approximates 60fps)
    vx = (nFX === 0) ? vx * 0.95 : vx + (nFX / mass) * 0.016;
    vz = (nFZ === 0) ? vz * 0.95 : vz + (nFZ / mass) * 0.016;

    px += vx; 
    pz += vz;

    // BOUNDARY PHYSICS (Platform is 18 wide: -9 to +9)
    // 9.0 - 0.5 (ball radius) = 8.5 limit
    const limit = 8.5; 
    if (Math.abs(px) > limit) { 
        px = Math.sign(px) * limit; 
        vx *= -0.4; // Bounce damping
    }
    if (Math.abs(pz) > limit) { 
        pz = Math.sign(pz) * limit; 
        vz *= -0.4; 
    }

    // Update 3D Visuals
    ball.position.set(px, 0.5, pz);
    
    // Physical rolling effect: Rotation = distance / radius
    ball.rotation.z -= vx; 
    ball.rotation.x += vz;

    // Update Visualization Arrows
    updateArrow(arrowG, fgX, fgZ, 0.6);   // Gravity (Lowest)
    updateArrow(arrowF, -vx * 10, -vz * 10, 0.65); // Friction (Mid)
    updateArrow(arrowN, nFX, nFZ, 0.7);   // Net Force (Top)

    // Update HUD
    document.getElementById('v-total').innerText = Math.sqrt(vx*vx + vz*vz).toFixed(2);
    document.getElementById('normal-force').innerText = normalForce.toFixed(2);

    renderer.render(scene, camera);
}

/**
 * Scalable Arrow Helper Updater
 */
function updateArrow(arrow, forceX, forceZ, height) {
    const dir = new THREE.Vector3(forceX, 0, forceZ);
    const length = dir.length();
    if (length > 0.05) {
        arrow.setDirection(dir.normalize());
        arrow.setLength(length * 1.5, 0.3, 0.15); // Length, HeadLength, HeadWidth
        arrow.position.set(px, height, pz);
        arrow.visible = true;
    } else { 
        arrow.visible = false; 
    }
}

/**
 * Start Event Listener
 */
document.getElementById('start-button').addEventListener('click', () => {
    // Capture user inputs from UI
    mass = parseFloat(document.getElementById('mass-input').value) || 0.5;
    mu = parseFloat(document.getElementById('surface-input').value) || 0.15;
    g = parseFloat(document.getElementById('gravity-input').value) || 9.81;

    document.getElementById('ui').style.display = 'none';
    document.getElementById('hud').classList.remove('hidden');

    // Request iOS/Android permission for motion sensors
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(res => { 
            if (res === 'granted') initThree(); 
        });
    } else { 
        initThree(); 
    }
});

// Window Resize Handler
window.addEventListener('resize', () => {
    if (!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});