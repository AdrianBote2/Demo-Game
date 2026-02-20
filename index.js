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
const nfDisp = document.getElementById('normal-force');

const arrowG = document.getElementById('v-gravity');
const arrowF = document.getElementById('v-friction');
const arrowN = document.getElementById('v-net');

let g, mass, mu;
let px = 0, py = 0, vx = 0, vy = 0, ax = 0, ay = 0;
let tiltX = 0, tiltY = 0;
let calibBeta = null, calibGamma = null;
let holdStartTime = null, challengeComplete = false;

function drawVectors(fgX, fgY, fX, fY, nFX, nFY) {
    const s = 8; // Vector visual scale
    arrowG.setAttribute('x2', 50 + (fgX * s));
    arrowG.setAttribute('y2', 50 + (fgY * s));
    
    // Friction points opposite to velocity
    const speed = Math.sqrt(vx*vx + vy*vy);
    if (speed > 0.1) {
        arrowF.setAttribute('x2', 50 - (vx * s * 3));
        arrowF.setAttribute('y2', 50 - (vy * s * 3));
    } else {
        arrowF.setAttribute('x2', 50); arrowF.setAttribute('y2', 50);
    }

    arrowN.setAttribute('x2', 50 + (nFX * s));
    arrowN.setAttribute('y2', 50 + (nFY * s));
}

function update() {
    const radX = (tiltX * Math.PI) / 180;
    const radY = (tiltY * Math.PI) / 180;
    const normalForce = mass * g * Math.cos(Math.sqrt(radX**2 + radY**2));
    const fgX = mass * g * Math.sin(radX);
    const fgY = mass * g * Math.sin(radY);
    const maxFriction = mu * normalForce;

    let nFX = 0, nFY = 0;

    // X Axis Physics
    if (Math.abs(fgX) > maxFriction) {
        nFX = fgX - (Math.sign(fgX) * maxFriction);
        ax = nFX / mass;
    } else {
        ax = 0; vx *= 0.92;
    }

    // Y Axis Physics
    if (Math.abs(fgY) > maxFriction) {
        nFY = fgY - (Math.sign(fgY) * maxFriction);
        ay = nFY / mass;
    } else {
        ay = 0; vy *= 0.92;
    }

    vx += ax; vy += ay;
    px += vx; py += vy;

    drawVectors(fgX, fgY, (fgX - nFX), (fgY - nFY), nFX, nFY);

    const limX = window.innerWidth / 2 - 18, limY = window.innerHeight / 2 - 18;
    if (Math.abs(px) >= limX) { px = Math.sign(px) * limX; vx = 0; }
    if (Math.abs(py) >= limY) { py = Math.sign(py) * limY; vy = 0; }

    const speed = Math.sqrt(vx*vx + vy*vy);
    if (Math.sqrt(px*px + py*py) < 40 && speed < 0.5 && !challengeComplete) {
        if (!holdStartTime) holdStartTime = Date.now();
        let elapsed = (Date.now() - holdStartTime) / 1000;
        holdTimerDisp.innerText = elapsed.toFixed(1);
        if (elapsed >= 3) { challengeComplete = true; objectiveText.innerHTML = "<b>STABLE</b>"; challengeBox.style.color = "#4ade80"; }
    } else if (!challengeComplete) { holdStartTime = null; holdTimerDisp.innerText = "0.0"; }

    ball.style.transform = `translate(${px}px, ${py}px)`;
    vDisp.innerText = speed.toFixed(2);
    aDisp.innerText = Math.sqrt(ax*ax + ay*ay).toFixed(2);
    nfDisp.innerText = Math.abs(normalForce).toFixed(2);

    requestAnimationFrame(update);
}

function handleOrientation(event) {
    if (calibBeta === null) { calibBeta = event.beta; calibGamma = event.gamma; return; }
    tiltX = event.gamma - calibGamma; tiltY = event.beta - calibBeta;
}

startBtn.addEventListener('click', () => {
    mass = parseFloat(document.getElementById('mass-input').value) || 0.5;
    mu = parseFloat(document.getElementById('surface-input').value) || 0.15;
    g = parseFloat(document.getElementById('gravity-input').value);
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(s => { if(s === 'granted') init(); });
    } else { init(); }
});

function init() {
    ui.style.display = 'none';
    hud.classList.remove('hidden'); challengeBox.classList.remove('hidden'); targetZone.classList.remove('hidden');
    window.addEventListener('deviceorientation', handleOrientation);
    update();
}