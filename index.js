let scene, camera, renderer, ball, platformGroup, arrowN;
let px = 0, pz = 0, vx = 0, vz = 0, tiltX = 0, tiltY = 0;
let mass = 0.5, mu = 0.15, g = 9.81, gameActive = false;
let chart;
const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

// --- Graph Setup ---
function initGraph() {
    const ctx = document.getElementById('physicsChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(40).fill(''),
            datasets: [
                { label: 'V (m/s)', borderColor: '#4ade80', data: Array(40).fill(0), borderWidth: 2, pointRadius: 0, tension: 0.4 },
                { label: 'A (m/s²)', borderColor: '#ef4444', data: Array(40).fill(0), borderWidth: 2, pointRadius: 0, tension: 0.4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { 
                y: { beginAtZero: true, grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 9 } } },
                x: { display: false }
            },
            plugins: { legend: { labels: { color: 'white', font: { size: 10 }, boxWidth: 10 } } }
        }
    });
}

// --- Screenshot Logic ---
document.getElementById('screenshot-btn').onclick = () => {
    html2canvas(document.getElementById('hud')).then(canvas => {
        const link = document.createElement('a');
        link.download = 'lab-data-report.png';
        link.href = canvas.toDataURL();
        link.click();
    });
};

// --- Physics & Engine ---
function initThree() {
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x020617);
    camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(20, 22, 20); camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    platformGroup = new THREE.Group(); scene.add(platformGroup);
    const base = new THREE.Mesh(new THREE.BoxGeometry(22, 1, 22), new THREE.MeshPhongMaterial({ color: 0x1e293b }));
    platformGroup.add(base);
    platformGroup.add(new THREE.GridHelper(22, 22, 0x4ade80, 0x1e293b));

    ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 100 }));
    ball.position.y = 0.5; platformGroup.add(ball);

    arrowN = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x4ade80);
    scene.add(arrowN, new THREE.AmbientLight(0xffffff, 0.8));
    
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10); scene.add(light);

    initGraph();
    animate();
}

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    // Sync UI
    mass = parseFloat(document.getElementById('live-mass').value) || 0.5;
    mu = parseFloat(document.getElementById('live-mu').value) || 0.15;

    // Keyboard Input
    const sens = 1.1, decay = 0.94;
    if (keys.a || keys.ArrowLeft) tiltX -= sens; if (keys.d || keys.ArrowRight) tiltX += sens;
    if (keys.w || keys.ArrowUp) tiltY -= sens; if (keys.s || keys.ArrowDown) tiltY += sens;
    if (!keys.a && !keys.d && !keys.ArrowLeft && !keys.ArrowRight) tiltX *= decay;
    if (!keys.w && !keys.s && !keys.ArrowUp && !keys.ArrowDown) tiltY *= decay;
    tiltX = THREE.MathUtils.clamp(tiltX, -25, 25);
    tiltY = THREE.MathUtils.clamp(tiltY, -25, 25);

    const radX = THREE.MathUtils.degToRad(tiltX);
    const radZ = THREE.MathUtils.degToRad(tiltY);
    platformGroup.rotation.z = -radX; platformGroup.rotation.x = radZ;

    // Physics Engine
    const accelX = g * Math.sin(radX);
    const accelZ = g * Math.sin(radZ);
    const aTotal = Math.sqrt(accelX**2 + accelZ**2);

    vx += (accelX * 0.016);
    vz += (accelZ * 0.016);
    vx *= (1 - mu * 0.1); vz *= (1 - mu * 0.1); // Dynamic friction
    px += vx; pz += vz;

    // Boundaries
    if (Math.abs(px) > 10.5) { px = Math.sign(px) * 10.5; vx *= -0.5; }
    if (Math.abs(pz) > 10.5) { pz = Math.sign(pz) * 10.5; vz *= -0.5; }

    ball.position.set(px, 0.5, pz);
    ball.rotation.x += vz / 0.5; ball.rotation.z -= vx / 0.5;

    // Telemetry Update
    const vTotal = Math.sqrt(vx**2 + vz**2);
    document.getElementById('v-total').innerText = vTotal.toFixed(2);
    document.getElementById('a-total').innerText = aTotal.toFixed(2);
    document.getElementById('rot-x').innerText = (THREE.MathUtils.radToDeg(ball.rotation.x) % 360).toFixed(0);
    document.getElementById('rot-z').innerText = (THREE.MathUtils.radToDeg(ball.rotation.z) % 360).toFixed(0);

    // Update Chart
    chart.data.datasets[0].data.push(vTotal); chart.data.datasets[0].data.shift();
    chart.data.datasets[1].data.push(aTotal); chart.data.datasets[1].data.shift();
    chart.update('none');

    // Net Force Arrow
    const fVec = new THREE.Vector3(accelX, 0, accelZ);
    if (fVec.length() > 0.1) {
        arrowN.setDirection(fVec.normalize());
        arrowN.setLength(fVec.length() * 0.5, 0.4, 0.2);
        arrowN.position.set(px, 1.2, pz); arrowN.visible = true;
    } else arrowN.visible = false;

    renderer.render(scene, camera);
}

// --- Events ---
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

document.getElementById('start-button').onclick = () => {
    document.getElementById('ui').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    gameActive = true;
    initThree();
};

document.getElementById('reset-ball-btn').onclick = () => { px = 0; pz = 0; vx = 0; vz = 0; ball.rotation.set(0,0,0); };
document.getElementById('choose-pc').onclick = () => document.getElementById('device-selector').classList.add('hidden');
document.getElementById('choose-mobile').onclick = () => document.getElementById('device-selector').classList.add('hidden');