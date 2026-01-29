import * as planc from 'planck';

// Initialize Pixi.js application with anti-aliasing
const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    antialias: true
});

// Add the canvas to the page
document.body.appendChild(app.view);

// Get the gravity slider element
const gravitySlider = document.getElementById('gravity-slider');
let gravityValue = parseFloat(gravitySlider.value);

// Get the respawn rate slider element
const respawnSlider = document.getElementById('respawn-slider');
let respawnRate = parseFloat(respawnSlider.value);

// Initialize Planck.js world with initial gravity
const world = planc.World({ x: 0, y: gravityValue });

// Add event listener to update gravity when slider changes
gravitySlider.addEventListener('input', (event) => {
    gravityValue = parseFloat(event.target.value);
    world.setGravity({ x: 0, y: gravityValue });
});

// Add event listener to update respawn rate when slider changes
respawnSlider.addEventListener('input', (event) => {
    respawnRate = parseFloat(event.target.value);
});

// Create a ball
let ball = world.createDynamicBody(planc.Vec2(window.innerWidth / 2, 100));
const ballFixture = ball.createFixture(planc.Circle(5), { restitution: 0.9, density: 1 });
ball.setAwake(true); // Ensure the body is awake

// Set collision category and mask for balls
const BALL_CATEGORY = 0x0002;
const BALL_MASK = 0x0001; // Collide with surfaces (category 0x0001)
ballFixture.setFilterData({
  categoryBits: BALL_CATEGORY,
  maskBits: BALL_MASK,
});

// Create graphics object for ball
const ballGraphics = new PIXI.Graphics();
ballGraphics.beginFill(0xFFFFFF); // White color for ball
ballGraphics.drawCircle(0, 0, 5); // Use the radius directly
app.stage.addChild(ballGraphics);

// Arrays to store created bodies and their graphics
const balls = [ball];
const bodies = [ball];
const graphics = [ballGraphics];
const surfaces = [];

// Variables to track user input
let isDragging = false;
let startPoint = null;
let endPoint = null;
let tempLineGraphics = null;

// Create spawn circle graphics
const spawnCircleGraphics = new PIXI.Graphics();
spawnCircleGraphics.lineStyle(2, 0xD3D3D3); // Light grey color for spawn circle
spawnCircleGraphics.drawCircle(0, 0, 5); // Same diameter as the balls
spawnCircleGraphics.position.set(window.innerWidth / 2, 100); // Initial position
app.stage.addChild(spawnCircleGraphics);

// Variables to track spawn circle dragging
let isSpawnCircleDragging = false;

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

    // Check if one body is a ball and the other is a surface (not a ball)
    if ((balls.includes(bodyA) && !balls.includes(bodyB)) || (!balls.includes(bodyA) && balls.includes(bodyB))) {
        const surface = balls.includes(bodyA) ? bodyB : bodyA;
        const surfaceAngle = surface.getAngle();
        const steepness = Math.abs(Math.sin(surfaceAngle));
        const frequency = 200 + (steepness * 1000);
        playSound(frequency);
    }
});

// Check if mousedown is on the spawn circle
app.view.addEventListener('mousedown', (event) => {
    const mousePosition = { x: event.clientX, y: event.clientY };
    const distanceToSpawnCircle = Math.sqrt(
        Math.pow(mousePosition.x - spawnCircleGraphics.position.x, 2) +
        Math.pow(mousePosition.y - spawnCircleGraphics.position.y, 2)
    );
    if (distanceToSpawnCircle <= 5) { // Radius of spawn circle
        isSpawnCircleDragging = true;
    } else {
        // Check if clicking on an existing surface
        let clickedSurfaceIndex = null;
        for (let i = 1; i < bodies.length; i++) { // Start from 1 to skip the ball
            const body = bodies[i];
            const surfaceGraphics = graphics[i];
            if (body.getType() === 'static') { // Check if it's a surface
                const surfacePos = body.getPosition();
                const surfaceAngle = body.getAngle();
const surfaceHalfLength = surfaceGraphics.width / 2;

                // Calculate world coordinates of surface endpoints
                const endpoint1 = {
                    x: surfacePos.x + Math.cos(surfaceAngle) * surfaceHalfLength - Math.sin(surfaceAngle) * 2.5,
                    y: surfacePos.y + Math.sin(surfaceAngle) * surfaceHalfLength + Math.cos(surfaceAngle) * 2.5
                };
                const endpoint2 = {
                    x: surfacePos.x + Math.cos(surfaceAngle) * -surfaceHalfLength - Math.sin(surfaceAngle) * 2.5,
                    y: surfacePos.y + Math.sin(surfaceAngle) * -surfaceHalfLength + Math.cos(surfaceAngle) * 2.5
                };

                // Check if mouse is close to the surface
                const distance = distanceToLineSegment(mousePosition, endpoint1, endpoint2);
                if (distance < 5) { // Consider it a click if within 5 pixels
                    clickedSurfaceIndex = i;
                    break;
                }
            }
        }

        if (clickedSurfaceIndex !== null) {
            // Remove the surface
            const body = bodies[clickedSurfaceIndex];
            world.destroyBody(body);
            app.stage.removeChild(graphics[clickedSurfaceIndex]);

            // Remove from all relevant arrays
            const indexInSurfaces = surfaces.indexOf(body);
            if (indexInSurfaces !== -1) {
                surfaces.splice(indexInSurfaces, 1);
            }
            bodies.splice(clickedSurfaceIndex, 1);
            graphics.splice(clickedSurfaceIndex, 1);
        } else {
            isDragging = true;
            startPoint = mousePosition;
        }
    }
});

// Function to calculate distance from a point to a line segment
function distanceToLineSegment(point, lineStart, lineEnd) {
    const lineLengthSquared = Math.pow(lineEnd.x - lineStart.x, 2) + Math.pow(lineEnd.y - lineStart.y, 2);
    if (lineLengthSquared === 0) return Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2));

    let t = ((point.x - lineStart.x) * (lineEnd.x - lineStart.x) + (point.y - lineStart.y) * (lineEnd.y - lineStart.y)) / lineLengthSquared;
    t = Math.max(0, Math.min(1, t));
    const nearestPointOnLine = {
        x: lineStart.x + t * (lineEnd.x - lineStart.x),
        y: lineStart.y + t * (lineEnd.y - lineStart.y)
    };
    return Math.sqrt(Math.pow(point.x - nearestPointOnLine.x, 2) + Math.pow(point.y - nearestPointOnLine.y, 2));
}

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
    if (isSpawnCircleDragging) {
        spawnCircleGraphics.position.set(event.clientX, event.clientY);
    }
});

app.view.addEventListener('mouseup', (event) => {
    isDragging = false;
    isSpawnCircleDragging = false;
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

        surfaces.push(surfaceBody);
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

// Update function remains the same
function update() {
    world.step(1 / 60);

    // Update positions of all bodies
    for (let i = 0; i < bodies.length; i++) {
        if (graphics[i]) {
            const pos = bodies[i].getPosition();
            graphics[i].position.set(pos.x, pos.y);
            graphics[i].rotation = bodies[i].getAngle();
        }

        // Remove ball when it leaves screen
        if (balls.includes(bodies[i]) && (bodies[i].getPosition().y > window.innerHeight || bodies[i].getPosition().x < 0 || bodies[i].getPosition().x > window.innerWidth)) {
            world.destroyBody(bodies[i]);
            app.stage.removeChild(graphics[i]);
            balls.splice(i, 1);
            bodies.splice(i, 1);
            graphics.splice(i, 1);
        }
    }
    requestAnimationFrame(update);
}

update();

// Additional logic for respawning balls at intervals based on respawnRate
let lastSpawnTime = Date.now();
function spawnBall() {
    const currentTime = Date.now();
    if (currentTime - lastSpawnTime >= (1 / respawnRate) * 1000) {
        lastSpawnTime = currentTime;

        // Create a new ball
        const spawnPosition = spawnCircleGraphics.position;
        const newBall = world.createDynamicBody(planc.Vec2(spawnPosition.x, spawnPosition.y));
        const newBallFixture = newBall.createFixture(planc.Circle(5), { restitution: 0.9, density: 1 });
        newBall.setAwake(true);

        // Set collision category and mask for new balls
        newBallFixture.setFilterData({
          categoryBits: BALL_CATEGORY,
          maskBits: BALL_MASK,
        });

        const newBallGraphics = new PIXI.Graphics();
        newBallGraphics.beginFill(0xFFFFFF); // White color for ball
        newBallGraphics.drawCircle(0, 0, 5);
        app.stage.addChild(newBallGraphics);

        balls.push(newBall);
        bodies.push(newBall);
        graphics.push(newBallGraphics);
    }
    requestAnimationFrame(spawnBall);
}

spawnBall();
