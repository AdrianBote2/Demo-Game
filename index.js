const ball = document.getElementById('ball');
const startBtn = document.getElementById('start-button');
const ui = document.getElementById('ui');
const hud = document.getElementById('hud');
const vDisplay = document.getElementById('v-total');
const aDisplay = document.getElementById('a-total');

// Physics state
let x = 0; let y = 0;           
let vx = 0; let vy = 0;
let ax = 0; let ay = 0;

// Calibration offsets
let calibBeta = null;
let calibGamma = null;

const friction = 0.97;
const sensitivity = 0.05;

function update() {
    // Apply friction
    vx *= friction;
    vy *= friction;
    
    // Apply velocity to position
    x += vx;
    y += vy;

    const limitX = window.innerWidth / 2 - 25;
    const limitY = window.innerHeight / 2 - 25;

    // Boundaries
    if (Math.abs(x) > limitX) { x = Math.sign(x) * limitX; vx *= -0.5; }
    if (Math.abs(y) > limitY) { y = Math.sign(y) * limitY; vy *= -0.5; }

    // Update Ball Visuals
    ball.style.transform = `translate(${x}px, ${y}px)`;

    // Calculate Totals for HUD (Resultant Vectors)
    let totalV = Math.sqrt(vx*vx + vy*vy);
    let totalA = Math.sqrt(ax*ax + ay*ay);

    vDisplay.innerText = totalV.toFixed(2);
    aDisplay.innerText = totalA.toFixed(2);

    requestAnimationFrame(update);
}

function handleOrientation(event) {
    if (calibBeta === null) {
        calibBeta = event.beta;
        calibGamma = event.gamma;
        return;
    }

    // Capture acceleration based on tilt
    ax = (event.gamma - calibGamma) * sensitivity;
    ay = (event.beta - calibBeta) * sensitivity;

    // Apply to velocity
    vx += ax;
    vy += ay;
}

startBtn.addEventListener('click', () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(state => {
                if (state === 'granted') {
                    initGame();
                }
            })
    } else {
        initGame();
    }
});

function initGame() {
    ui.style.display = 'none';
    hud.classList.remove('hidden');
    window.addEventListener('deviceorientation', handleOrientation);
    update();
}