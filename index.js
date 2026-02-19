const ball = document.getElementById('ball');
const startBtn = document.getElementById('start-button');
const ui = document.getElementById('ui');
const hud = document.getElementById('hud');

// HUD & Inputs
const vDisp = document.getElementById('v-total');
const aDisp = document.getElementById('a-total');
const txDisp = document.getElementById('tilt-x');
const tyDisp = document.getElementById('tilt-y');
const nfDisp = document.getElementById('normal-force');
const fDisp = document.getElementById('friction-val');

// Physics Setup Variables
let g = 9.81;
let mass = 0.5;
let mu = 0.97; // This acts as our "damping" coefficient in this simplified model
const sensitivity = 0.06;

// Physics State
let px = 0; let py = 0;
let vx = 0; let vy = 0;
let ax = 0; let ay = 0;
let tiltX = 0; let tiltY = 0;
let calibBeta = null; let calibGamma = null;

function update() {
    // Apply friction (damping)
    vx *= mu;
    vy *= mu;
    
    px += vx;
    py += vy;

    const limitX = window.innerWidth / 2 - 25;
    const limitY = window.innerHeight / 2 - 25;

    let displayAx = ax;
    let displayAy = ay;

    if (Math.abs(px) >= limitX) { px = Math.sign(px) * limitX; vx = 0; displayAx = 0; }
    if (Math.abs(py) >= limitY) { py = Math.sign(py) * limitY; vy = 0; displayAy = 0; }

    // Normal Force calculation
    const tiltMag = Math.sqrt(tiltX**2 + tiltY**2);
    const tiltRad = tiltMag * (Math.PI / 180);
    const normalForce = mass * g * Math.cos(tiltRad);

    ball.style.transform = `translate(${px}px, ${py}px)`;

    vDisp.innerText = Math.sqrt(vx*vx + vy*vy).toFixed(2);
    aDisp.innerText = Math.sqrt(displayAx*displayAx + displayAy*displayAy).toFixed(2);
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

    ax = tiltX * sensitivity;
    ay = tiltY * sensitivity;

    vx += ax;
    vy += ay;
}

startBtn.addEventListener('click', () => {
    // 1. Capture Form Values
    mass = parseFloat(document.getElementById('mass-input').value);
    g = parseFloat(document.getElementById('gravity-input').value);
    
    // We'll use the surface value to adjust our friction multiplier
    // A surface value of 0.05 (Ice) means mu should be near 1.0 (no slow down)
    // A surface value of 0.60 (Rubber) means mu should be lower (fast slow down)
    const surfaceVal = parseFloat(document.getElementById('surface-input').value);
    mu = 1.0 - (surfaceVal * 0.1); 
    fDisp.innerText = surfaceVal.toFixed(2);

    // 2. Request Permissions
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(s => { if(s==='granted') init(); });
    } else {
        init();
    }
});

function init() {
    ui.style.display = 'none';
    hud.classList.remove('hidden');
    window.addEventListener('deviceorientation', handleOrientation);
    update();
}