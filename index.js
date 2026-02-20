const ball = document.getElementById('ball');
const startBtn = document.getElementById('start-button');
const ui = document.getElementById('ui');
const hud = document.getElementById('hud');
const targetZone = document.getElementById('target-zone');
const challengeBox = document.getElementById('challenge-box');
const holdTimerDisp = document.getElementById('hold-timer');
const objectiveText = document.getElementById('objective-text');

const vDisp = document.getElementById('v-total'), aDisp = document.getElementById('a-total');
const txDisp = document.getElementById('tilt-x'), tyDisp = document.getElementById('tilt-y');
const nfDisp = document.getElementById('normal-force'), fDisp = document.getElementById('friction-val');

// Physics Logic Constants
let g, mass, mu;
let px = 0, py = 0, vx = 0, vy = 0, ax = 0, ay = 0;
let tiltX = 0, tiltY = 0;
let calibBeta = null, calibGamma = null;

// Challenge State
let holdStartTime = null;
let challengeComplete = false;

function update() {
    // 1. Angle Calculation
    const radX = (tiltX * Math.PI) / 180;
    const radY = (tiltY * Math.PI) / 180;
    const totalTiltRad = Math.sqrt(radX**2 + radY**2);
    
    // 2. Realistic Physics Forces (F = m*g*sin(theta))
    const normalForce = mass * g * Math.cos(totalTiltRad);
    const fgX = mass * g * Math.sin(radX);
    const fgY = mass * g * Math.sin(radY);
    const maxFriction = mu * normalForce;

    // 3. Acceleration with Static/Kinetic Friction threshold
    if (Math.abs(fgX) > maxFriction) {
        ax = (fgX - (Math.sign(fgX) * maxFriction)) / mass;
    } else {
        ax = 0; vx *= 0.92; if (Math.abs(vx) < 0.05) vx = 0;
    }

    if (Math.abs(fgY) > maxFriction) {
        ay = (fgY - (Math.sign(fgY) * maxFriction)) / mass;
    } else {
        ay = 0; vy *= 0.92; if (Math.abs(vy) < 0.05) vy = 0;
    }

    // 4. Update Physics State
    vx += ax; vy += ay;
    px += vx; py += vy;

    // Boundary check
    const limX = window.innerWidth / 2 - 18;
    const limY = window.innerHeight / 2 - 18;
    if (Math.abs(px) >= limX) { px = Math.sign(px) * limX; vx = 0; ax = 0; }
    if (Math.abs(py) >= limY) { py = Math.sign(py) * limY; vy = 0; ay = 0; }

    // 5. Game Logic (Challenge Detection)
    const distance = Math.sqrt(px * px + py * py);
    const currentSpeed = Math.sqrt(vx * vx + vy * vy);

    if (distance < 40 && currentSpeed < 0.5 && !challengeComplete) {
        if (!holdStartTime) holdStartTime = Date.now();
        let elapsed = (Date.now() - holdStartTime) / 1000;
        holdTimerDisp.innerText = elapsed.toFixed(1);
        if (elapsed >= 3) {
            challengeComplete = true;
            objectiveText.innerHTML = "<b>STABLE</b>";
            challengeBox.style.borderColor = "#4ade80";
            challengeBox.style.color = "#4ade80";
        }
    } else if (!challengeComplete) {
        holdStartTime = null;
        holdTimerDisp.innerText = "0.0";
    }

    // 6. Final Render
    ball.style.transform = `translate(${px}px, ${py}px)`;
    vDisp.innerText = currentSpeed.toFixed(2);
    aDisp.innerText = Math.sqrt(ax*ax + ay*ay).toFixed(2);
    txDisp.innerText = Math.round(tiltX);
    tyDisp.innerText = Math.round(tiltY);
    nfDisp.innerText = Math.abs(normalForce).toFixed(2);

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
}

startBtn.addEventListener('click', () => {
    mass = parseFloat(document.getElementById('mass-input').value) || 0.5;
    mu = parseFloat(document.getElementById('surface-input').value) || 0.15;
    g = parseFloat(document.getElementById('gravity-input').value);
    fDisp.innerText = mu.toFixed(2);

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(s => { if(s === 'granted') init(); });
    } else { init(); }
});

function init() {
    ui.style.display = 'none';
    hud.classList.remove('hidden');
    challengeBox.classList.remove('hidden');
    targetZone.classList.remove('hidden');
    window.addEventListener('deviceorientation', handleOrientation);
    update();
}