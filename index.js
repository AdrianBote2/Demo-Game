const ball = document.getElementById('ball');
const startBtn = document.getElementById('start-button');
const ui = document.getElementById('ui');

let posX = 0; 
let velocityX = 0;
let calibration = null; 
const friction = 0.98;
const sensitivity = 0.1;

function update() {
    velocityX *= friction;
    posX += velocityX;

    // Define the boundaries of the white line (80% of screen)
    const lineWidth = window.innerWidth * 0.8;
    const limit = (lineWidth / 2); // Distance from center to edge of line

    // Boundary Logic: Keep ball on the line
    if (posX > limit) {
        posX = limit;
        velocityX *= -0.5; // Bounce back
    } else if (posX < -limit) {
        posX = -limit;
        velocityX *= -0.5; // Bounce back
    }

    ball.style.transform = `translateX(${posX}px)`;
    requestAnimationFrame(update);
}

function handleOrientation(event) {
    if (calibration === null) {
        calibration = event.gamma;
    }
    let tilt = event.gamma - calibration;
    velocityX += tilt * sensitivity;
}

startBtn.addEventListener('click', () => {
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
    window.addEventListener('deviceorientation', handleOrientation);
    update();
}