const ball = document.getElementById('ball');
const startBtn = document.getElementById('start-button');
const ui = document.getElementById('ui');

// Physics state
let x = 0; let y = 0;           // Position
let vx = 0; let vy = 0;         // Velocity
let ax = 0; let ay = 0;         // Acceleration

let calibBeta = null;
let calibGamma = null;

const friction = 0.97;
const sensitivity = 0.05;

function update() {
    // Apply acceleration to velocity
    vx += ax;
    vy += ay;

    // Apply friction
    vx *= friction;
    vy *= friction;

    // Apply velocity to position
    x += vx;
    y += vy;

    // Screen boundaries (Bounce logic)
    const limitX = window.innerWidth / 2 - 25;
    const limitY = window.innerHeight / 2 - 25;

    if (Math.abs(x) > limitX) {
        x = Math.sign(x) * limitX;
        vx *= -0.5;
    }
    if (Math.abs(y) > limitY) {
        y = Math.sign(y) * limitY;
        vy *= -0.5;
    }

    // Update ball position
    ball.style.transform = `translate(${x}px, ${y}px)`;

    requestAnimationFrame(update);
}

function handleOrientation(event) {
    if (calibBeta === null) {
        calibBeta = event.beta;
        calibGamma = event.gamma;
    }

    // Beta: front-to-back tilt [-180, 180]
    // Gamma: left-to-right tilt [-90, 90]
    let tiltY = event.beta - calibBeta;
    let tiltX = event.gamma - calibGamma;

    ax = tiltX * sensitivity;
    ay = tiltY * sensitivity;
}

startBtn.addEventListener('click', () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(state => { if (state === 'granted') init(); })
            .catch(console.error);
    } else {
        init();
    }
});

function init() {
    ui.style.display = 'none';
    window.addEventListener('deviceorientation', handleOrientation);
    update();
}