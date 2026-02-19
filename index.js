const ball = document.getElementById('ball');
const startBtn = document.getElementById('start-button');
const ui = document.getElementById('ui');

// Physics variables
let posX = 0; // Relative to center
let velocityX = 0;
let calibration = 0; // Stores the "zero" tilt angle
const friction = 0.97; // Air resistance / friction
const sensitivity = 0.08; // How fast it accelerates

function update() {
    // Apply velocity to position
    posX += velocityX;
    
    // Apply friction to velocity (gradual slow down)
    velocityX *= friction;

    // Boundary checks (Screen edges)
    const halfWidth = window.innerWidth / 2 - 25;
    if (Math.abs(posX) > halfWidth) {
        posX = posX > 0 ? halfWidth : -halfWidth;
        velocityX *= -0.4; // Bounce effect
    }

    // Move the ball visually
    ball.style.transform = `translateX(${posX}px)`;

    requestAnimationFrame(update);
}

function handleOrientation(event) {
    // gamma is the left-to-right tilt (-90 to 90)
    let currentTilt = event.gamma; 

    // Adjust tilt based on how the phone was held at start
    let tilt = currentTilt - calibration;

    // Kinematics: Add tilt to acceleration
    velocityX += tilt * sensitivity;
}

startBtn.addEventListener('click', () => {
    // 1. Request Permission (Required for iOS)
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(state => {
                if (state === 'granted') startMoving();
            })
            .catch(console.error);
    } else {
        startMoving();
    }
});

function startMoving() {
    // 2. Calibrate (Set current angle as 0)
    window.addEventListener('deviceorientation', (e) => {
        if (calibration === 0) calibration = e.gamma;
        handleOrientation(e);
    }, true);

    // 3. Start Game
    ui.style.display = 'none';
    update();
}