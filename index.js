const ball = document.getElementById('ball');
const startBtn = document.getElementById('start-button');
const ui = document.getElementById('ui');

// Physics variables
let posX = window.innerWidth / 2;
let velocityX = 0;
const friction = 0.98; // Slows the ball down slightly
const speedMultiplier = 0.05; 

function update() {
    // Apply velocity to position
    posX += velocityX;

    // Apply friction
    velocityX *= friction;

    // Boundary checks (Bounce off walls)
    if (posX < 0) {
        posX = 0;
        velocityX *= -0.5; // Bounce effect
    }
    if (posX > window.innerWidth - 50) {
        posX = window.innerWidth - 50;
        velocityX *= -0.5; // Bounce effect
    }

    // Update the visual position
    ball.style.transform = `translateX(${posX}px) translateY(${window.innerHeight / 2}px)`;

    requestAnimationFrame(update);
}

function handleOrientation(event) {
    // gamma is the left-to-right tilt in degrees [-90, 90]
    let tilt = event.gamma; 

    // Kinematics: Acceleration based on tilt
    velocityX += tilt * speedMultiplier;
}

startBtn.addEventListener('click', () => {
    // Request permission for iOS 13+
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(state => {
                if (state === 'granted') {
                    initGame();
                }
            })
            .catch(e => console.error(e));
    } else {
        // Android or older iOS
        initGame();
    }
});

function initGame() {
    ui.style.display = 'none';
    window.addEventListener('deviceorientation', handleOrientation);
    update(); // Start the physics loop
}