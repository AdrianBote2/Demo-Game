const ball = document.getElementById('ball');
const startBtn = document.getElementById('start-button');
const ui = document.getElementById('ui');
const hud = document.getElementById('hud');

// HUD Display Elements
const vDisp = document.getElementById('v-total');
const aDisp = document.getElementById('a-total');
const txDisp = document.getElementById('tilt-x');
const tyDisp = document.getElementById('tilt-y');
const nfDisp = document.getElementById('normal-force');

// Physics Constants
const g = 9.81;       // Earth gravity
const mass = 0.5;    // kg
const friction = 0.97;
const sensitivity = 0.06;

// Physics State
let px = 0; let py = 0;
let vx = 0; let vy = 0;
let ax = 0; let ay = 0;
let tiltX = 0; let tiltY = 0;

// Sensor Calibration
let calibBeta = null;
let calibGamma = null;

function update() {
    // Apply Friction
    vx *= friction;
    vy *= friction;

    // Integrate Velocity to Position
    px += vx;
    py += vy;

    // Boundaries
    const limitX = window.innerWidth / 2 - 25;
    const limitY = window.innerHeight / 2 - 25;

    // Logic: If ball hits wall, acceleration and velocity for that axis becomes zero (Normal Force equilibrium)
    let displayAx = ax;
    let displayAy = ay;

    if (Math.abs(px) >= limitX) {
        px = Math.sign(px) * limitX;
        vx = 0;
        displayAx = 0;
    }
    if (Math.abs(py) >= limitY) {
        py = Math.sign(py) * limitY;
        vy = 0;
        displayAy = 0;
    }

    // Normal Force: Fn = m * g * cos(theta)
    const tiltMagnitude = Math.sqrt(tiltX**2 + tiltY**2);
    const tiltRad = tiltMagnitude * (Math.PI / 180);
    const normalForce = mass * g * Math.cos(tiltRad);

    // Apply Visuals
    ball.style.transform = `translate(${px}px, ${py}px)`;

    // Calculate Resultants for HUD
    const totalV = Math.sqrt(vx*vx + vy*vy);
    const totalA = Math.sqrt(displayAx*displayAx + displayAy*displayAy);

    // Update HUD
    vDisp.innerText = totalV.toFixed(2);
    aDisp.innerText = totalA.toFixed(2);
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

    // Dynamic Tilt (Current - Calibrated Zero)
    tiltX = event.gamma - calibGamma;
    tiltY = event.beta - calibBeta;

    // Acceleration = change in tilt * sensitivity
    ax = tiltX * sensitivity;
    ay = tiltY * sensitivity;

    vx += ax;
    vy += ay;
}

startBtn.addEventListener('click', () => {
    // iOS 13+ Permission Request
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(state => {
                if (state === 'granted') init();
            })
            .catch(console.error);
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