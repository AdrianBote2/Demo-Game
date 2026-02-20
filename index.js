const ball = document.getElementById('ball');
const startBtn = document.getElementById('start-button');
const ui = document.getElementById('ui');
const hud = document.getElementById('hud');

const vDisp = document.getElementById('v-total');
const aDisp = document.getElementById('a-total');
const txDisp = document.getElementById('tilt-x');
const tyDisp = document.getElementById('tilt-y');
const nfDisp = document.getElementById('normal-force');
const fDisp = document.getElementById('friction-val');

let g = 9.81;
let mass = 0.5;
let mu = 0.1; 
const baseSensitivity = 0.08;

let px = 0, py = 0, vx = 0, vy = 0, ax = 0, ay = 0;
let tiltX = 0, tiltY = 0;
let calibBeta = null, calibGamma = null;

function update() {
    // 1. Friction Calculation (Force of Friction = mu * m * g * cos(theta))
    const tiltMag = Math.sqrt(tiltX**2 + tiltY**2);
    const tiltRad = tiltMag * (Math.PI / 180);
    const normalForce = mass * g * Math.cos(tiltRad);
    
    // Convert friction into a deceleration factor
    // We use a simplified damping based on the user's mu input
    let damping = 1.0 - (mu * 0.5); 
    damping = Math.max(0.5, Math.min(damping, 1.0));

    vx *= damping;
    vy *= damping;
    
    px += vx;
    py += vy;

    const limitX = window.innerWidth / 2 - (ball.offsetWidth / 2);
    const limitY = window.innerHeight / 2 - (ball.offsetHeight / 2);

    let dAx = ax, dAy = ay;
    if (Math.abs(px) >= limitX) { px = Math.sign(px) * limitX; vx = 0; dAx = 0; }
    if (Math.abs(py) >= limitY) { py = Math.sign(py) * limitY; vy = 0; dAy = 0; }

    ball.style.transform = `translate(${px}px, ${py}px)`;

    vDisp.innerText = Math.sqrt(vx*vx + vy*vy).toFixed(2);
    aDisp.innerText = Math.sqrt(dAx*dAx + dAy*dAy).toFixed(2);
    txDisp.innerText = tiltX.toFixed(2);
    tyDisp.innerText = tiltY.toFixed(2);
    nfDisp.innerText = normalForce.toFixed(2);

    requestAnimationFrame(update);
}

function handleOrientation(event) {
    if (calibBeta === null) {
        calibBeta = event.beta;
        calibGamma = event.gamma;
        return;
    }
    tiltX = event.gamma - calibGamma;
    tiltY = event.beta - calibBeta;

    // F = ma -> a = F/m
    ax = (tiltX * baseSensitivity) / (mass + 0.5);
    ay = (tiltY * baseSensitivity) / (mass + 0.5);
    vx += ax;
    vy += ay;
}

startBtn.addEventListener('click', () => {
    // Collect typed values
    mass = parseFloat(document.getElementById('mass-input').value) || 0.5;
    mu = parseFloat(document.getElementById('surface-input').value) || 0.1;
    g = parseFloat(document.getElementById('gravity-input').value);
    
    fDisp.innerText = mu.toFixed(2);

    // Visual scale based on typed mass
    let size = 30 + (Math.min(mass, 10) * 8); 
    ball.style.width = size + 'px';
    ball.style.height = size + 'px';
    ball.style.margin = `-${size/2}px 0 0 -${size/2}px`;

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(s => { if(s==='granted') init(); });
    } else { init(); }
});

function init() {
    ui.style.display = 'none';
    hud.classList.remove('hidden');
    window.addEventListener('deviceorientation', handleOrientation);
    update();
}