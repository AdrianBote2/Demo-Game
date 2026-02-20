const ball = document.getElementById('ball');
const stage = document.getElementById('stage');
const startBtn = document.getElementById('start-button');
const ui = document.getElementById('ui');
const hud = document.getElementById('hud');
const challengeBox = document.getElementById('challenge-box');
const holdTimerDisp = document.getElementById('hold-timer');

const vDisp = document.getElementById('v-total'), aDisp = document.getElementById('a-total');
const nfDisp = document.getElementById('normal-force');
const arrowG = document.getElementById('v-gravity'), arrowF = document.getElementById('v-friction');
const arrowN = document.getElementById('v-net'), arrowRing = document.getElementById('v-normal-ring');

let g, mass, mu;
let px = 0, py = 0, vx = 0, vy = 0, ax = 0, ay = 0;
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;
let holdStartTime = null, challengeComplete = false;

function drawVectors(fgX, fgY, nFX, nFY, normalForce) {
    const s = 10; 
    // Gravity
    arrowG.setAttribute('x2', 50 + (fgX * s));
    arrowG.setAttribute('y2', 50 + (fgY * s));
    // Friction (opposes velocity)
    const speed = Math.sqrt(vx*vx + vy*vy);
    if (speed > 0.1) {
        arrowF.setAttribute('x2', 50 - (vx * s * 3));
        arrowF.setAttribute('y2', 50 - (vy * s * 3));
    } else {
        arrowF.setAttribute('x2', 50); arrowF.setAttribute('y2', 50);
    }
    // Net Force
    arrowN.setAttribute('x2', 50 + (nFX * s));
    arrowN.setAttribute('y2', 50 + (nFY * s));
    // Normal Force Ring (Z-axis)
    const ringScale = (normalForce / (mass * g)) * 15;
    arrowRing.setAttribute('r', 10 + ringScale);
    arrowRing.setAttribute('stroke-width', 1 + (ringScale / 5));
}

function update() {
    // 1. Visual Tilt
    stage.style.transform = `rotateX(${-tiltY}deg) rotateY(${tiltX}deg)`;

    // 2. Physics Math
    const radX = (tiltX * Math.PI) / 180;
    const radY = (tiltY * Math.PI) / 180;
    const normalForce = mass * g * Math.cos(Math.sqrt(radX**2 + radY**2));
    const fgX = mass * g * Math.sin(radX);
    const fgY = mass * g * Math.sin(radY);
    const maxFriction = mu * normalForce;

    let nFX = 0, nFY = 0;
    if (Math.abs(fgX) > maxFriction) {
        nFX = fgX - (Math.sign(fgX) * maxFriction);
        ax = nFX / mass;
    } else { ax = 0; vx *= 0.9; }

    if (Math.abs(fgY) > maxFriction) {
        nFY = fgY - (Math.sign(fgY) * maxFriction);
        ay = nFY / mass;
    } else { ay = 0; vy *= 0.9; }

    vx += ax; vy += ay;
    px += vx; py += vy;

    // Boundaries (Centered at 1000,1000 on a 2000px stage)
    const limit = 900; 
    if (Math.abs(px) > limit) { px = Math.sign(px) * limit; vx = 0; }
    if (Math.abs(py) > limit) { py = Math.sign(py) * limit; vy = 0; }

    // 3. Render Ball
    ball.style.transform = `translate3d(${px - 20}px, ${py - 20}px, 20px)`;
    
    // 4. Vector Drawing
    drawVectors(fgX, fgY, nFX, nFY, normalForce);

    // 5. Challenge
    const speed = Math.sqrt(vx*vx + vy*vy);
    if (Math.sqrt(px*px + py*py) < 50 && speed < 0.3 && !challengeComplete) {
        if (!holdStartTime) holdStartTime = Date.now();
        let elapsed = (Date.now() - holdStartTime) / 1000;
        holdTimerDisp.innerText = elapsed.toFixed(1);
        if (elapsed >= 3) { challengeComplete = true; document.getElementById('objective-text').innerText = "STABLE"; }
    } else if (!challengeComplete) { holdStartTime = null; holdTimerDisp.innerText = "0.0"; }

    // 6. HUD
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
    hud.classList.remove('hidden'); challengeBox.classList.remove('hidden'); 
    document.getElementById('target-zone').classList.remove('hidden');
    window.addEventListener('deviceorientation', handleOrientation);
    update();
}