const ball = document.getElementById('ball');
const arrow = document.getElementById('vector-arrow');
const startBtn = document.getElementById('start-button');
const frictionSlider = document.getElementById('friction-slider');
const speedDisplay = document.getElementById('speed-val');
const angleDisplay = document.getElementById('angle-val');
const muDisplay = document.getElementById('mu-val');
const slipDisplay = document.getElementById('slip-val');

let mu = 0.10;
let velocity = 0;
let posX = 0;
let angleRad = 0;
let calibration = null;
const g = 9.8; 

// Handle Slider
frictionSlider.addEventListener('input', (e) => updateMu(e.target.value));

// Handle Material Presets
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const newMu = e.target.getAttribute('data-mu');
        frictionSlider.value = newMu;
        updateMu(newMu);
    });
});

function updateMu(val) {
    mu = parseFloat(val);
    muDisplay.innerText = mu.toFixed(2);
    // Calculate critical slip angle: theta = atan(mu)
    const slipAngleDeg = Math.atan(mu) * (180 / Math.PI);
    slipDisplay.innerText = slipAngleDeg.toFixed(1);
}

function update() {
    const sinT = Math.sin(angleRad);
    const cosT = Math.cos(angleRad);
    
    // 1. Force of Gravity (Down the slope)
    let acc = g * sinT;

    // 2. Force of Friction
    const frictionMax = mu * g * cosT;
    
    if (Math.abs(velocity) > 0.05) {
        // Kinetic Friction
        acc -= Math.sign(velocity) * frictionMax;
    } else if (Math.abs(g * sinT) > frictionMax) {
        // Overcoming Static Friction
        acc = g * sinT - (Math.sign(sinT) * frictionMax);
    } else {
        // Stuck due to friction
        acc = 0;
        velocity = 0;
    }

    velocity += acc * 0.15;
    posX += velocity;

    // Boundaries
    const limit = (window.innerWidth * 0.8) / 2 - 20;
    if (Math.abs(posX) > limit) {
        posX = Math.sign(posX) * limit;
        velocity *= -0.2; 
    }

    // Visual Updates
    ball.style.transform = `translateX(${posX}px)`;
    speedDisplay.innerText = Math.abs(velocity).toFixed(2);
    angleDisplay.innerText = (angleRad * (180/Math.PI)).toFixed(1);

    // Vector Arrow Visualization (Gravity component)
    const arrowSize = sinT * 100;
    arrow.style.height = `${Math.abs(arrowSize)}px`;
    arrow.style.transform = `rotate(${arrowSize > 0 ? -90 : 90}deg)`;

    requestAnimationFrame(update);
}

function handleOrientation(event) {
    if (calibration === null) calibration = event.gamma;
    angleRad = (event.gamma - calibration) * (Math.PI / 180);
}

startBtn.addEventListener('click', () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(s => { if(s==='granted') init(); });
    } else { init(); }
});

function init() {
    document.getElementById('ui').style.display = 'none';
    updateMu(mu);
    window.addEventListener('deviceorientation', handleOrientation);
    update();
}