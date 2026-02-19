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
let mu = 0.97; 
const sensitivity = 0.06;

let px = 0, py = 0, vx = 0, vy = 0, ax = 0, ay = 0;
let tiltX = 0, tiltY = 0;
let calibBeta = null, calibGamma = null;

function update() {
    vx *= mu;
    vy *= mu;
    px += vx;
    py += vy;

    const limitX = window.innerWidth / 2 - 25;
    const limitY = window.innerHeight / 2 - 25;

    let displayAx = ax, displayAy = ay;

    if (Math.abs(px) >= limitX) { px = Math.sign(px) * limitX; vx = 0; displayAx = 0; }
    if (Math.abs(py) >= limitY) { py = Math.sign(py) * limitY; vy = 0; displayAy = 0; }

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
    // Collect dropdown values
    mass = parseFloat(document.getElementById('mass-input').value);
    g = parseFloat(document.getElementById('gravity-input').value);
    const surfaceVal = parseFloat(document.getElementById('surface-input').value);
    
    // Friction mapping (higher surface friction = lower velocity retention)
    mu = 1.0 - (surfaceVal * 0.1); 
    fDisp.innerText = surfaceVal.toFixed(2);

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