let scene, camera, renderer, ball, platformGroup;
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
            labels: Array(30).fill(''),
            datasets: [
                { label: 'V', borderColor: '#4ade80', data: Array(30).fill(0), borderWidth: 2, pointRadius: 0 },
                { label: 'A', borderColor: '#ef4444', data: Array(30).fill(0), borderWidth: 2, pointRadius: 0 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { 
                y: { display: true, grid: { color: '#1e293b' }, ticks: { display: false } },
                x: { display: false }
            },
            plugins: { legend: { display: true, labels: { color: 'white', font: { size: 10 }, boxWidth: 8 } } }
        }
    });
}

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

    ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ color: 0xef4444 }));
    ball.position.y = 0.5; platformGroup.add(ball);
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10); scene.add(light);

    initGraph();
    animate();
}

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    mass = parseFloat(document.getElementById('live-mass').value) || 0.5;
    mu = parseFloat(document.getElementById('live-mu').value) || 0.15;

    // Movement Logic
    const sens = 1.1, decay = 0.94;
    if (keys.a || keys.ArrowLeft) tiltX -= sens; if (keys.d || keys.ArrowRight) tiltX += sens;
    if (keys.w || keys.ArrowUp) tiltY -= sens; if (keys.s || keys.ArrowDown) tiltY += sens;
    if (!keys.a && !keys.d && !keys.ArrowLeft && !keys.ArrowRight) tiltX *= decay;
    if (!keys.w && !keys.s && !keys.ArrowUp && !keys.ArrowDown) tiltY *= decay;
    
    tiltX = THREE.MathUtils.clamp(tiltX, -25, 25);
    tiltY = THREE.MathUtils.clamp(tiltY, -25, 25);

    platformGroup.rotation.z = -THREE.MathUtils.degToRad(tiltX);
    platformGroup.rotation.x = THREE.MathUtils.degToRad(tiltY);

    // Physics
    const accelX = g * Math.sin(THREE.MathUtils.degToRad(tiltX));
    const accelZ = g * Math.sin(THREE.MathUtils.degToRad(tiltY));
    const aTotal = Math.sqrt(accelX**2 + accelZ**2);

    vx += (accelX * 0.016); vz += (accelZ * 0.016);
    vx *= (1 - mu * 0.1); vz *= (1 - mu * 0.1);
    px += vx; pz += vz;

    // Wrap around logic for Sandbox
    if (Math.abs(px) > 11) px = -Math.sign(px) * 11;
    if (Math.abs(pz) > 11) pz = -Math.sign(pz) * 11;

    ball.position.set(px, 0.5, pz);
    ball.rotation.x += vz / 0.5; ball.rotation.z -= vx / 0.5;

    // Update Data
    const vTotal = Math.sqrt(vx**2 + vz**2);
    document.getElementById('v-total').innerText = vTotal.toFixed(2);
    document.getElementById('a-total').innerText = aTotal.toFixed(2);
    document.getElementById('rot-x').innerText = (THREE.MathUtils.radToDeg(ball.rotation.x) % 360).toFixed(0);
    document.getElementById('rot-z').innerText = (THREE.MathUtils.radToDeg(ball.rotation.z) % 360).toFixed(0);

    chart.data.datasets[0].data.push(vTotal); chart.data.datasets[0].data.shift();
    chart.data.datasets[1].data.push(aTotal); chart.data.datasets[1].data.shift();
    chart.update('none');

    renderer.render(scene, camera);
}

window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

document.getElementById('start-button').onclick = () => {
    document.getElementById('ui').classList.add('hidden');
    document.getElementById('hud-left').classList.remove('hidden');
    document.getElementById('hud-right').classList.remove('hidden');
    gameActive = true;
    initThree();
};

document.getElementById('reset-ball-btn').onclick = () => { px = 0; pz = 0; vx = 0; vz = 0; };
document.getElementById('choose-pc').onclick = () => document.getElementById('device-selector').classList.add('hidden');
document.getElementById('choose-mobile').onclick = () => document.getElementById('device-selector').classList.add('hidden');