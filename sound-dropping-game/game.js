// Initialize Pixi.js application
const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
});

// Add the canvas to the page
document.body.appendChild(app.view);

// Initialize Matter.js engine
const engine = Matter.Engine.create();
engine.world.gravity.y = 0.5; // Adjust gravity for a more realistic fall
const world = engine.world;

// Create a ball
const ball = Matter.Bodies.circle(window.innerWidth / 2, 100, 20, { restitution: 0.9 });
Matter.World.add(world, ball);

// Create a text object to display debug information
const debugText = new PIXI.Text(`Debug Info`, {
    fontSize: 24,
    fill: 0xFFFFFF,
});
app.stage.addChild(debugText);

// Create graphics object for ball
const ballGraphics = new PIXI.Graphics();
ballGraphics.beginFill(0xFF0000); // Red color for ball
ballGraphics.drawCircle(0, 0, ball.circleRadius);
app.stage.addChild(ballGraphics);

// Arrays to store created bodies and their graphics
const bodies = [ball];
const graphics = [ballGraphics];

// Variables to track user input
let isDragging = false;
let startPoint = null;
let endPoint = null;

app.view.addEventListener('mousedown', (event) => {
    isDragging = true;
    startPoint = { x: event.clientX, y: event.clientY };
});

app.view.addEventListener('mousemove', (event) => {
    if (isDragging) {
        endPoint = { x: event.clientX, y: event.clientY };
    }
});

app.view.addEventListener('mouseup', (event) => {
    isDragging = false;
    endPoint = { x: event.clientX, y: event.clientY };
    if (startPoint && endPoint) {
        // Create a surface (wall) between startPoint and endPoint
        const surface = Matter.Bodies.rectangle((startPoint.x + endPoint.x) / 2, (startPoint.y + endPoint.y) / 2, 
            Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)), 20, 
            { isStatic: true, angle: Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x) });
        Matter.World.add(world, surface);
        
        const surfaceGraphics = new PIXI.Graphics();
        surfaceGraphics.beginFill(0xFFFFFF); // White color for surface
        surfaceGraphics.drawRect(- (surface.bounds.max.x - surface.bounds.min.x) / 2, -10, surface.bounds.max.x - surface.bounds.min.x, 20);
        surfaceGraphics.position.set(surface.position.x, surface.position.y);
        surfaceGraphics.rotation = surface.angle;
        app.stage.addChild(surfaceGraphics);
        
        bodies.push(surface);
        graphics.push(surfaceGraphics);
        
        startPoint = null;
        endPoint = null;
    } else {
        // Drop a ball at the click position
        const newBall = Matter.Bodies.circle(event.clientX, event.clientY, 20, { restitution: 0.9 });
        Matter.World.add(world, newBall);
        
        const newBallGraphics = new PIXI.Graphics();
        newBallGraphics.beginFill(0xFF0000); // Red color for ball
        newBallGraphics.drawCircle(0, 0, newBall.circleRadius);
        app.stage.addChild(newBallGraphics);
        
        bodies.push(newBall);
        graphics.push(newBallGraphics);
    }
});

function update() {
    debugText.text = `Ball position: ${ball.position.x.toFixed(2)}, ${ball.position.y.toFixed(2)}`;
    
    // Update positions of all bodies
    for (let i = 0; i < bodies.length; i++) {
        if (graphics[i]) {
            graphics[i].position.set(bodies[i].position.x, bodies[i].position.y);
            if (bodies[i].angle) {
                graphics[i].rotation = bodies[i].angle;
            }
        }
        
        // Reset ball position if it goes out of bounds
        if (bodies[i] === ball && (bodies[i].position.y > window.innerHeight || bodies[i].position.x < 0 || bodies[i].position.x > window.innerWidth)) {
            Matter.Body.setPosition(bodies[i], { x: window.innerWidth / 2, y: 100 });
            Matter.Body.setVelocity(bodies[i], { x: 0, y: 0 });
        }
    }
    
    Matter.Engine.update(engine, 16); // Update physics engine
    
    requestAnimationFrame(update);
}

update();