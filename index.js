const ball = document.getElementById('ball');
const startBtn = document.getElementById('start-button');
const ui = document.getElementById('ui');

// Physics state
let x = 0; let y = 0;           
let vx = 0; let vy = 0;         

// Calibration offsets
let calibBeta = null;
let calibGamma = null;

const friction = 0.97;
const sensitivity = 0.05;

function update() {
    vx *= friction;
    vy *= friction;
    x += vx;
    y += vy;

    const limitX = window.innerWidth / 2 - 25;
    const limitY = window.innerHeight / 2 - 25;

    // Boundaries
    if (Math.abs(x) > limitX) { x = Math.sign(x) * limitX; vx *= -0.5; }
    if (Math.abs(y) > limitY) { y = Math.sign(y) * limitY; vy *= -0.5; }

    ball.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(update);
}

function handleOrientation(event) {
    // This is the "Fix"
    // If we haven't calibrated yet, set current position as 0,0
    if (calibBeta === null) {
        calibBeta = event.beta;
        calibGamma = event.gamma;
        return; // Skip the first frame
    }

    // Now subtract the calibration from the current tilt
    let tiltY = event.beta - calibBeta;
    let tiltX = event.gamma - calibGamma;

    // Apply to velocity
    vx += tiltX * sensitivity;
    vy += tiltY * sensitivity;
}

startBtn.addEventListener('click', () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(state => {
                if (state === 'granted') {
                    ui.style.display = 'none';
                    // The event listener is added here
                    window.addEventListener('deviceorientation', handleOrientation);
                    update();
                }
            })
    } else {
        ui.style.display = 'none';
        window.addEventListener('deviceorientation', handleOrientation);
        update();
    }
});