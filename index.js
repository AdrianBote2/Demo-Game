// Constants
const g = 9.81; 
const frameRate = 1/60; // Assuming 60fps for time (t)

// Physics Variables
let mu = 0.1;   // Coefficient of Friction
let mass = 1.0; // Mass in kg
let vx = 0; let vy = 0;
let posX = 0; let posY = 0;
let calibBeta = null; let calibGamma = null;
let tiltX = 0; let tiltY = 0;

// Update variables from UI
document.getElementById('mu-input').addEventListener('input', (e) => {
    mu = parseFloat(e.target.value);
    document.getElementById('mu-val').innerText = mu;
});

function update() {
    // Convert tilt angles to Radians for Math.sin/cos
    const radX = tiltX * (Math.PI / 180);
    const radY = tiltY * (Math.PI / 180);

    // 1. Calculate Gravity components (a = g * sin(theta))
    let ax = g * Math.sin(radX);
    let ay = g * Math.sin(radY);

    // 2. Calculate Friction (f = mu * g * cos(theta))
    // Friction opposes the direction of current velocity
    const frictionForceX = mu * g * Math.cos(radX);
    const frictionForceY = mu * g * Math.cos(radY);

    // Apply friction to X
    if (Math.abs(vx) > 0.01) {
        ax -= Math.sign(vx) * frictionForceX;
    } else if (Math.abs(g * Math.sin(radX)) < frictionForceX) {
        ax = 0; vx = 0; // Static friction holds it still
    }

    // Apply friction to Y
    if (Math.abs(vy) > 0.01) {
        ay -= Math.sign(vy) * frictionForceY;
    } else if (Math.abs(g * Math.sin(radY)) < frictionForceY) {
        ay = 0; vy = 0; 
    }

    // 3. Update Velocity (v = v0 + a*t)
    vx += ax * frameRate;
    vy += ay * frameRate;

    // 4. Update Position (scaled for screen pixels)
    posX += vx * 10; 
    posY += vy * 10;

    // Boundary Logic
    const limitX = window.innerWidth / 2 - 25;
    const limitY = window.innerHeight / 2 - 25;
    if (Math.abs(posX) > limitX) { posX = Math.sign(posX) * limitX; vx *= -0.3; }
    if (Math.abs(posY) > limitY) { posY = Math.sign(posY) * limitY; vy *= -0.3; }

    // UI Updates
    ball.style.transform = `translate(${posX}px, ${posY}px)`;
    document.getElementById('vx-display').innerText = vx.toFixed(2);
    document.getElementById('vy-display').innerText = vy.toFixed(2);

    requestAnimationFrame(update);
}

function handleOrientation(event) {
    if (calibBeta === null) {
        calibBeta = event.beta;
        calibGamma = event.gamma;
    }
    tiltX = event.gamma - calibGamma;
    tiltY = event.beta - calibBeta;
}