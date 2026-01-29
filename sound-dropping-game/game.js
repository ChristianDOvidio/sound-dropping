// Initialize Pixi.js application with anti-aliasing
const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    antialias: true // Enable anti-aliasing
});

// Add the canvas to the page
document.body.appendChild(app.view);

// Initialize Planck.js world
// Using ES module import syntax for Planck.js
import * as planc from 'planck';
const world = planc.World({ x: 0, y: 9.8 });

// Create a ball
const ball = world.createDynamicBody(planc.Vec2(window.innerWidth / 2, 100));
ball.createFixture(planc.Circle(5), { restitution: 0.9, density: 1 });
ball.setAwake(true); // Ensure the body is awake

// Create graphics object for ball
const ballGraphics = new PIXI.Graphics();
ballGraphics.beginFill(0xFFFFFF); // White color for ball
ballGraphics.drawCircle(0, 0, 5); // Use the radius directly
app.stage.addChild(ballGraphics);

// Arrays to store created bodies and their graphics
const balls = [ball];
const bodies = [ball];
const graphics = [ballGraphics];

// Variables to track user input
let isDragging = false;
let startPoint = null;
let endPoint = null;
let tempLineGraphics = null;

// Audio context for sound generation
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    oscillator.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1); // Stop after 0.1 seconds
}

// Collision detection
world.on('begin-contact', (contact) => {
    const fixtureA = contact.getFixtureA();
    const fixtureB = contact.getFixtureB();
    const bodyA = fixtureA.getBody();
    const bodyB = fixtureB.getBody();

    if ((bodyA === ball && bodies.includes(bodyB)) || (bodyB === ball && bodies.includes(bodyA))) {
        const surface = bodyA === ball ? bodyB : bodyA;
        // Planck.js bodies don't have an angle property like Matter.js
        // We'll need to calculate steepness differently
        const frequency = 200 + 1000; // Placeholder frequency
        playSound(frequency);
    }
});

app.view.addEventListener('mousedown', (event) => {
    isDragging = true;
    startPoint = { x: event.clientX, y: event.clientY };
});

app.view.addEventListener('mousemove', (event) => {
    if (isDragging) {
        endPoint = { x: event.clientX, y: event.clientY };
        if (!tempLineGraphics) {
            tempLineGraphics = new PIXI.Graphics();
            app.stage.addChild(tempLineGraphics);
        }
        tempLineGraphics.clear();
        tempLineGraphics.lineStyle(4, 0xFFFFFF);
        tempLineGraphics.moveTo(startPoint.x, startPoint.y);
        tempLineGraphics.lineTo(endPoint.x, endPoint.y);
    }
});

app.view.addEventListener('mouseup', (event) => {
    isDragging = false;
    endPoint = { x: event.clientX, y: event.clientY };
    if (startPoint && endPoint) {
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Create a surface (wall) between startPoint and endPoint
        const surfaceBody = world.createBody({
            type: 'static',
            position: planc.Vec2(startPoint.x + dx / 2, startPoint.y + dy / 2),
            angle: angle
        });
        surfaceBody.createFixture(planc.Edge(planc.Vec2(-length / 2, 0), planc.Vec2(length / 2, 0)));

        const surfaceGraphics = new PIXI.Graphics();
        surfaceGraphics.beginFill(0xFFFFFF); // White color for surface
        surfaceGraphics.drawRect(-length / 2, -2.5, length, 5);
        surfaceGraphics.position.set(surfaceBody.getPosition().x, surfaceBody.getPosition().y);
        surfaceGraphics.rotation = surfaceBody.getAngle();
        app.stage.addChild(surfaceGraphics);

        bodies.push(surfaceBody);
        graphics.push(surfaceGraphics);

        startPoint = null;
        endPoint = null;
    }

    if (tempLineGraphics) {
        tempLineGraphics.clear();
        app.stage.removeChild(tempLineGraphics);
        tempLineGraphics = null;
    }
});

// Update function
function update() {
    world.step(1 / 60);

    // Update positions of all bodies
    for (let i = 0; i < bodies.length; i++) {
        if (graphics[i]) {
            const pos = bodies[i].getPosition();
            graphics[i].position.set(pos.x, pos.y);
            graphics[i].rotation = bodies[i].getAngle();
        }

        // Reset ball position if it goes out of bounds
        if (balls.includes(bodies[i]) && (bodies[i].getPosition().y > window.innerHeight || bodies[i].getPosition().x < 0 || bodies[i].getPosition().x > window.innerWidth)) {
            bodies[i].setPosition(planc.Vec2(window.innerWidth / 2, 100));
            bodies[i].setLinearVelocity(planc.Vec2(0, 0));
        }
    }

    requestAnimationFrame(update);
}

update();

update();