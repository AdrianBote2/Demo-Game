let scene, camera, renderer, ball, arrowG, arrowF, arrowN;
let px = 0, pz = 0, vx = 0, vz = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let mass, mu, g;

function initThree() {
    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);

    // 2. Helicopter Camera (Look down from corner)
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(50, 50, 50);
    camera.lookAt(0, 0, 0);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // 4. Lab Grid & Floor
    const gridHelper = new THREE.GridHelper(40, 40, 0x334155, 0x1e293b);
    scene.add(gridHelper);

    // 5. The Sphere (True 3D Geometry)
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xef4444, 
        shininess: 80,
        specular: 0x444444 
    });
    ball = new THREE.Mesh(geometry, material);
    ball.position.y = 0.5; // Offset by radius to sit on grid
    ball.castShadow = true;
    scene.add(ball);

    // 6. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // 7. 3D Vector Helpers
    arrowG = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0xef4444);
    arrowF = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x3b82f6);
    arrowN = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x4ade80);
    scene.add(arrowG, arrowF, arrowN);

    window.addEventListener('deviceorientation', handleOrientation);
    animate();
}

function handleOrientation(e) {
    if (calibBeta === null) {
        calibBeta = e.beta;
        calibGamma = e.gamma;
        return;
    }
    // Mapping tilt to 3D axes
    tiltX = e.gamma - calibGamma;
    tiltY = e.beta - calibBeta;
}

function animate() {
    requestAnimationFrame(animate);

    // --- Physics Engine ---
    const radX = (tiltX * Math.PI) / 180;
    const radZ = (tiltY * Math.PI) / 180;

    // Fg = m * g * sin(theta)
    const fgX = mass * g * Math.sin(radX);
    const fgZ = mass * g * Math.sin(radZ);
    const normalForce = mass * g * Math.cos(Math.sqrt(radX**2 + radZ**2));
    const maxFriction = mu * normalForce;

    let nFX = 0, nFZ = 0;

    // Kinetic/Static Friction Threshold
    if (Math.abs(fgX) > maxFriction) {
        nFX = fgX - (Math.sign(fgX) * maxFriction);
        vx += (nFX / mass) * 0.016; // 16ms frame step
    } else {
        vx *= 0.95; // Surface damping
    }

    if (Math.abs(fgZ) > maxFriction) {
        nFZ = fgZ - (Math.sign(fgZ) * maxFriction);
        vz += (nFZ / mass) * 0.016;
    } else {
        vz *= 0.95;
    }

    // Update Position
    px += vx;
    pz += vz;

    // Boundaries
    if (Math.abs(px) > 19.5) { px = Math.sign(px) * 19.5; vx *= -0.5; }
    if (Math.abs(pz) > 19.5) { pz = Math.sign(pz) * 19.5; vz *= -0.5; }

    // --- Update 3D Visuals ---
    ball.position.set(px, 0.5, pz);
    
    // Physical rolling rotation
    ball.rotation.z -= vx;
    ball.rotation.x += vz;

    // Update Arrows
    updateArrow(arrowG, fgX, fgZ, 0.5); // Gravity
    updateArrow(arrowF, -vx * 10, -vz * 10, 0.55); // Friction
    updateArrow(arrowN, nFX, nFZ, 0.6); // Net Force

    // HUD Update
    document.getElementById('v-total').innerText = Math.sqrt(vx*vx + vz*vz).toFixed(2);
    document.getElementById('normal-force').innerText = normalForce.toFixed(2);

    renderer.render(scene, camera);
}

function updateArrow(arrow, forceX, forceZ, height) {
    const dir = new THREE.Vector3(forceX, 0, forceZ);
    const length = dir.length();
    if (length > 0.05) {
        arrow.setDirection(dir.normalize());
        arrow.setLength(length * 2, 0.4, 0.2); // Scaled for visibility
        arrow.position.set(px, height, pz);
        arrow.visible = true;
    } else {
        arrow.visible = false;
    }
}

document.getElementById('start-button').addEventListener('click', () => {
    mass = parseFloat(document.getElementById('mass-input').value) || 0.5;
    mu = parseFloat(document.getElementById('surface-input').value) || 0.15;
    g = parseFloat(document.getElementById('gravity-input').value);
    
    document.getElementById('ui').style.display = 'none';
    document.getElementById('hud').classList.remove('hidden');
    
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(res => {
            if (res === 'granted') initThree();
        });
    } else {
        initThree();
    }
});

// Handle Window Resize
window.addEventListener('resize', () => {
    if (!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});