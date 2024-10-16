// Stack Master Game with Matter.js

// Module aliases
const Engine = Matter.Engine,
      Render = Matter.Render,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Events = Matter.Events;

const engine = Engine.create();
const world = engine.world;
let render;

let base;
let stones = [];
let isGameOver = false;
let targetHeight = 400; // Target height to win

// Adjust gravity to slow down stones
engine.world.gravity.y = 0.2; // Adjust as needed for desired fall speed

// Stone colors
const stoneColors = ['#f39c12', '#e74c3c', '#8e44ad', '#3498db', '#2ecc71'];

// Controls and event listeners setup flags
let controlsSetup = false;
let collisionEventsSetup = false;
let winCheckSetup = false;
let mainLoopSetup = false;

// Keyboard controls
let keys = {};

// Stones that need to move with the base
let stonesToMove = new Set();

// Stone spawning variables
let spawnInterval = 2000; // Fixed spawn interval in milliseconds
let spawnTimer;

// Initialize the game
function init() {
  // Reset variables
  stones = [];
  stonesToMove.clear();
  isGameOver = false;
  document.querySelector('.game-message').style.display = 'none';

  // Clear the world
  World.clear(world);
  // Clear forces
  Engine.clear(engine);

  // Remove all bodies and constraints
  world.bodies = [];
  world.constraints = [];

  // Clear any existing timers
  if (spawnTimer) {
    clearTimeout(spawnTimer);
    spawnTimer = null;
  }

  // Create the base
  createBase();

  // Create boundaries
  createBoundaries();

  // If render not yet created, create it
  if (!render) {
    render = Render.create({
      canvas: document.getElementById('gameCanvas'),
      engine: engine,
      options: {
        width: 800,
        height: 600,
        wireframes: false,
        background: 'transparent',
      }
    });
    Render.run(render);
  }

  // Run the engine
  Engine.run(engine);

  // Spawn stones at intervals
  spawnStones();

  // Set up controls if not already set up
  if (!controlsSetup) {
    setupControls();
    controlsSetup = true;
  }

  // Set up collision events if not already set up
  if (!collisionEventsSetup) {
    setupCollisionEvents();
    collisionEventsSetup = true;
  }

  // Set up main game loop if not already set up
  if (!mainLoopSetup) {
    setupMainLoop();
    mainLoopSetup = true;
  }

  // Set up win condition check if not already set up
  if (!winCheckSetup) {
    checkForWin();
    winCheckSetup = true;
  }
}

// Create the movable base
function createBase() {
  base = Bodies.rectangle(400, 570, 120, 20, {
    isStatic: true, // Base is static
    label: 'base',
    render: {
      fillStyle: '#2c3e50',
    },
  });
  World.add(world, base);
}

// Create boundaries to prevent stones from falling off screen
function createBoundaries() {
  const ground = Bodies.rectangle(400, 610, 810, 60, { isStatic: true, label: 'ground' });
  const leftWall = Bodies.rectangle(-10, 300, 60, 600, { isStatic: true });
  const rightWall = Bodies.rectangle(810, 300, 60, 600, { isStatic: true });
  World.add(world, [ground, leftWall, rightWall]);
}

// Spawn stones periodically
function spawnStones() {
  // Clear any existing spawn timer
  if (spawnTimer) {
    clearTimeout(spawnTimer);
  }

  const spawn = () => {
    if (isGameOver) return;

    createStone();

    // Keep the spawn interval constant
    spawnTimer = setTimeout(spawn, spawnInterval);
  };

  spawn();
}

// Create a new stone
function createStone() {
  let stoneWidth = Math.floor(Math.random() * 60) + 40;
  let stoneHeight = 20;
  let xPosition = Math.random() * (800 - stoneWidth) + stoneWidth / 2;

  // Adjusted starting y position to be within the visible canvas
  let yPosition = 50; // Start stones at y = 50

  let stone = Bodies.rectangle(xPosition, yPosition, stoneWidth, stoneHeight, {
    restitution: 0, // No bouncing
    friction: 1, // Increase friction
    frictionStatic: 1,
    frictionAir: 0.02, // Reduced air friction
    label: 'stone',
    render: {
      fillStyle: stoneColors[Math.floor(Math.random() * stoneColors.length)],
    },
  });

  stones.push(stone);
  World.add(world, stone);
}

// Keyboard controls
function setupControls() {
  document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });
}

// Move the base and stones that need to move with it
function moveBaseAndStones() {
  let baseSpeed = 7; // Adjust the base movement speed
  let displacement = 0;

  if (keys['ArrowLeft'] && base.position.x > 60) {
    displacement = -baseSpeed;
  }
  if (keys['ArrowRight'] && base.position.x < 740) {
    displacement = baseSpeed;
  }

  if (displacement !== 0) {
    // Move the base
    Body.setPosition(base, { x: base.position.x + displacement, y: base.position.y });

    // Move stones that need to move with the base
    stonesToMove.forEach((stone) => {
      Body.setPosition(stone, { x: stone.position.x + displacement, y: stone.position.y });
    });
  }
}

// Update stonesToMove set recursively
function updateStonesToMove() {
  // Start with stones in contact with the base
  let stonesToCheck = [];

  stones.forEach((stone) => {
    if (!stone.isStatic && isInContactWith(stone, base)) {
      stonesToCheck.push(stone);
    }
  });

  stonesToMove.clear();

  while (stonesToCheck.length > 0) {
    let currentStone = stonesToCheck.pop();

    if (stonesToMove.has(currentStone)) continue;

    stonesToMove.add(currentStone);

    // Find stones that are resting on currentStone
    stones.forEach((otherStone) => {
      if (!otherStone.isStatic && isInContactWith(otherStone, currentStone)) {
        stonesToCheck.push(otherStone);
      }
    });
  }
}

// Helper function to check if two bodies are in contact
function isInContactWith(bodyA, bodyB) {
  const pairs = engine.pairs.list;
  for (let pair of pairs) {
    if ((pair.bodyA === bodyA && pair.bodyB === bodyB) ||
        (pair.bodyA === bodyB && pair.bodyB === bodyA)) {
      return true;
    }
  }
  return false;
}

// Collision events to check for game over condition
function setupCollisionEvents() {
  // When a stone comes to rest, make it static
  Events.on(engine, 'sleepStart', (event) => {
    event.source.bodies.forEach((body) => {
      if (body.label === 'stone' && !body.isStatic) {
        // Make the stone static
        Body.setStatic(body, true);
        // Remove from stonesToMove since it's now static
        stonesToMove.delete(body);
      }
    });
  });

  Events.on(engine, 'collisionStart', (event) => {
    const pairs = event.pairs;

    pairs.forEach((pair) => {
      const { bodyA, bodyB } = pair;

      // Check if any stone hits the ground (game over)
      if ((bodyA.label === 'stone' && bodyB.label === 'ground') ||
          (bodyB.label === 'stone' && bodyA.label === 'ground')) {
        gameOver('Game Over!');
      }
    });
  });
}

// Game over function
function gameOver(message) {
  isGameOver = true;
  document.querySelector('.game-message p').textContent = message;
  document.querySelector('.game-message').style.display = 'block';

  // Stop the engine
  engine.enabled = false;

  // Clear the spawn timer
  if (spawnTimer) {
    clearTimeout(spawnTimer);
    spawnTimer = null;
  }
}

// Retry button event
document.querySelector('.retry-button').addEventListener('click', () => {
  // Re-enable the engine
  engine.enabled = true;
  init();
});

// Start the game
init();

// Set up the main game loop
function setupMainLoop() {
  Events.on(engine, 'beforeUpdate', () => {
    if (isGameOver) return;
    updateStonesToMove();
    moveBaseAndStones();
  });
}

// Check for win condition
function checkForWin() {
  Events.on(engine, 'afterUpdate', () => {
    if (isGameOver) return;
    if (stones.length === 0) return; // Wait until at least one stone is present

    let highestPoint = Infinity;

    stones.forEach((stone) => {
      // Consider stones that are static (locked in place)
      if (stone.isStatic && stone.position.y < highestPoint) {
        highestPoint = stone.position.y - stone.bounds.min.y;
      }
    });

    if (highestPoint === Infinity) return;

    // Ensure stones have stacked sufficiently before checking win condition
    if (base.position.y - highestPoint >= targetHeight && highestPoint > 100) {
      gameOver('You Win!');
    }
  });
}
