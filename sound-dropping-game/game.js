// Initialize Pixi.js application with anti-aliasing
const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    antialias: true // Enable anti-aliasing
});

// Add the canvas to the page
document.body.appendChild(app.view);

// Initialize Matter.js engine
const engine = Matter.Engine.create();
engine.world.gravity.y = 0.5; // Adjust gravity for a more realistic fall
const world = engine.world;

// Create a ball
const ball = Matter.Bodies.circle(window.innerWidth / 2, 100, 5, { restitution: 0.9 });
Matter.World.add(world, ball);

// Create graphics object for ball
const ballGraphics = new PIXI.Graphics();
ballGraphics.beginFill(0xFFFFFF); // White color for ball
ballGraphics.drawCircle(0, 0, ball.circleRadius);
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
Matter.Events.on(engine, 'collisionStart', (event) => {
    const pairs = event.pairs;
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        if ((pair.bodyA === ball && bodies.includes(pair.bodyB)) || (pair.bodyB === ball && bodies.includes(pair.bodyA))) {
            const surface = pair.bodyA === ball ? pair.bodyB : pair.bodyA;
            const steepness = Math.abs(surface.angle);
            const frequency = 200 + steepness * 1000; // Map steepness to frequency range
            playSound(frequency);
        }
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
        const surface = Matter.Bodies.rectangle(startPoint.x + dx / 2, startPoint.y + dy / 2, length, 5, { isStatic: true, angle });
        Matter.World.add(world, surface);
        
        const surfaceGraphics = new PIXI.Graphics();
        surfaceGraphics.beginFill(0xFFFFFF); // White color for surface
        surfaceGraphics.drawRect(-length / 2, -2.5, length, 5);
        surfaceGraphics.position.set(surface.position.x, surface.position.y);
        surfaceGraphics.rotation = surface.angle;
        app.stage.addChild(surfaceGraphics);
        
        bodies.push(surface);
        graphics.push(surfaceGraphics);
        
        startPoint = null;
        endPoint = null;
    } else {
        // Drop a ball at the click position
        const newBall = Matter.Bodies.circle(event.clientX, event.clientY, 5, { restitution: 0.9 });
        Matter.World.add(world, newBall);
        
        const newBallGraphics = new PIXI.Graphics();
        newBallGraphics.beginFill(0xFFFFFF); // White color for ball
        newBallGraphics.drawCircle(0, 0, newBall.circleRadius);
        app.stage.addChild(newBallGraphics);
        
        balls.push(newBall);
        bodies.push(newBall);
        graphics.push(newBallGraphics);
    }
    
    if (tempLineGraphics) {
        tempLineGraphics.clear();
        app.stage.removeChild(tempLineGraphics);
        tempLineGraphics = null;
    }
});

function update() {
    // Update positions of all bodies
    for (let i = 0; i < bodies.length; i++) {
        if (graphics[i]) {
            graphics[i].position.set(bodies[i].position.x, bodies[i].position.y);
            if (bodies[i].angle) {
                graphics[i].rotation = bodies[i].angle;
            }
        }
        
        // Reset ball position if it goes out of bounds
        if (balls.includes(bodies[i]) && (bodies[i].position.y > window.innerHeight || bodies[i].position.x < 0 || bodies[i].position.x > window.innerWidth)) {
            Matter.Body.setPosition(bodies[i], { x: window.innerWidth / 2, y: 100 });
            Matter.Body.setVelocity(bodies[i], { x: 0, y: 0 });
        }
    }
    
    Matter.Engine.update(engine, 16); // Update physics engine
    
    requestAnimationFrame(update);
}

update();