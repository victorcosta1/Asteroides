import kaboom from "kaboom";

let score = 0;

kaboom({
  scale: 1.5
});

loadRoot("sprites/");
loadSprite("space", "space.jpg");
loadSprite("rocket1", "rocket1.png");
loadSprite("rocket2", "rocket2.png");
loadSprite("rocket3", "rocket3.png");
loadSprite("rocket4", "rocket4.png");
loadSprite("ship", "ship.png");
loadSprite("bullet", "bullet.png");
loadSprite("asteroid", "asteroid.png");
loadSprite("asteroid_small1", "asteroid_small1.png");
loadSprite("asteroid_small2", "asteroid_small2.png");
loadSprite("asteroid_small3", "asteroid_small3.png");
loadSprite("asteroid_small4", "asteroid_small4.png");

loadRoot("sounds/");
loadSound("rocket_thrust", "rocket_thrust.wav");
loadSound("laser", "laser.wav");
loadSound("explosion", "explosion.mp3");
loadSound("Steamtech-Mayhem_Looping","Steamtech-Mayhem_Looping.mp3");

function pointAt(distance, angle) {
  let radians = -1*deg2rad(angle);
  return vec2(distance * Math.cos(radians), -distance * Math.sin(radians));
}

function asteroidSpawnPoint() {
    
     return choose([rand(vec2(0), vec2(width(), 0)),
             rand(vec2(0), vec2(0, height())),
             rand(vec2(0, height()), vec2(width(), height())),
             rand(vec2(width(), 0), vec2(width(), height()))]);
}

scene("main", ()=> {
  layers([
    "bg",
    "obj",
    "ui",
  ], "obj");
  
  // Background
add([
    sprite("space"),
    layer("bg")
]);

  // UI
ui = add([
    layer("ui")
  
]);
  ui.on("draw", () => {
  drawText({
    text: "Score: " + score,
    size: 14,
    font: "sink",
    pos: vec2(8, 24)
  })

     // lives (new code below)
  drawText({
    text: "Lives: ",
    size: 12,
    font: "sink",
    pos: vec2(8),
  });
  for (let x = 64; x < 64 + (16 * player.lives); x += 16) {
    drawSprite({
      sprite: "ship",
      pos: vec2(x, 12),
      angle: -90,
      origin: "center",
      scale: 0.5
    });
  }
});

  // The ship
const player = add([
    sprite("ship"),
    pos(160, 120),
    rotate(0),
    origin("center"),
    solid(),
    area(),
    "player",
    "mobile",
    "wraps",
    {
        turn_speed: 4.58,
        speed: 0,
        max_thrust: 48,
        acceleration: 3,
        deceleration: 5,
        lives: 3,
        can_shoot: true,
        laser_cooldown: 0.5,
        invulnerable: false,
        invulnerablity_time: 3,
        animation_frame: 0,
        thrusting: false
    }
]);

// Movement keys
onKeyDown("left", () => {
    player.angle -= player.turn_speed;
});

  onKeyDown("right", () => {
    player.angle += player.turn_speed;
});

  onKeyDown("up", () => {
    player.speed = Math.min(player.speed+player.acceleration, player.max_thrust);
    play("rocket_thrust", {
        volume: 0.03,
        speed: 2.0,
    });
});

onKeyDown("down", () => {
    player.speed = Math.max(player.speed-player.deceleration, -player.max_thrust);
    play("rocket_thrust", {
        volume: 0.03,
        speed: 2.0,
    });
});

// Movement
onUpdate("mobile", (e) => {
  e.move(pointAt(e.speed, e.angle));
});
  
  // Wrap around the screen
onUpdate("wraps", (e) => {
    if (e.pos.x > width()) {
        e.pos.x = 0;
    }
    if (e.pos.x < 0) {
        e.pos.x = width();
    }
    if (e.pos.y > height()) {
        e.pos.y = 0;
    }
    if (e.pos.y < 0) {
        e.pos.y = height();
    }
});



  // Animate rocket
const thrust_animation = ["rocket1", "rocket2", "rocket3", "rocket4"];

// rocket animation helpers
onKeyPress("up", () => {
    player.thrusting = true;
    player.animation_frame = 0;
});
onKeyRelease("up", () => {
    player.thrusting = false;
});

// draw current rocket animation frame
onDraw("player", (p) => {
  if (player.thrusting) {
    // draw current frame
    drawSprite( {
    sprite: thrust_animation[p.animation_frame],
    // use a fixed position because it's going to be relative to the current player's coordinate system
    pos: vec2(-p.width / 2, 0),
    origin: "center",
});
  }
});

let move_delay = 0.1;
let timer = 0;

  // loop rocket animation
onUpdate(() => {
  timer += dt();
  if (timer < move_delay) return;
  timer = 0;

  if (player.thrusting) {
    player.animation_frame++;
    if (player.animation_frame >= thrust_animation.length) { // wrap to start
      player.animation_frame = 0;
    }
  }

  // new if statement
  if (player.invulnerable) {  
    player.hidden = !player.hidden;
  }
});

// Shooting
onKeyDown("space", () => {
    if (player.can_shoot) { // new if statement
        add([
            sprite("bullet"),
            pos(player.pos.add(pointAt(player.width/2, player.angle))),
            rotate(player.angle),
            origin("center"),
            area(),
            "bullet",
            "mobile",
            "destructs",
            {
                speed: 100
            }
        ]);
        play("laser");
        player.can_shoot = false; //
        wait(player.laser_cooldown, () => {
            player.can_shoot = true;
        });
    }
});



// Asteroids
const NUM_ASTERIODS = 5;

for (let i = 0; i < NUM_ASTERIODS; i++) {
    var spawnPoint = asteroidSpawnPoint();
    var a = add([
        sprite("asteroid"),
        pos(spawnPoint),
        rotate(rand(1,90)),
        origin("center"),
        area(),
        solid(),
        "asteroid",
        "mobile",
        "wraps",
        {
            speed: rand(5, 10),
            initializing: true
        }
    ]);

      while (a.isColliding("mobile")) {
        spawnPoint = asteroidSpawnPoint();
        a.pos = spawnPoint;
        a.pushOutAll();
    }

    a.initializing = false;
    a.pushOutAll();
    
}

// Collisions
onCollide("player", "asteroid", (p, a) => {
    if (!a.initializing) {
        p.trigger("damage"); // previously lives--
    }
});
  
onCollide("bullet", "asteroid", (b, a) => {
    if (!a.initializing) {
        destroy(b);
        destroy(a);
        play("explosion");
        score = a.is("small") ? score + 2 : score++; // 2 points for small, 1 for big
    }
});

onCollide("asteroid", "asteroid", (a1, a2) => {
    if (!(a1.initializing || a2.initializing)) {
        a1.speed = -a1.speed;
        a2.speed = -a2.speed;
    }
});

 // Take damage
player.on("damage", () => {
    if (!player.invulnerable) { // new if statement
        player.lives--;
    }

    // destroy ship if lives finished
    if (player.lives <= 0) {
        destroy(player);
    }
    else // new code
    {
        // Temporary invulnerability
        player.invulnerable = true;
    
        wait(player.invulnerablity_time, () => {
            player.invulnerable = false;
            player.hidden = false;
        });
    }
});

  // End game on player destruction
player.on("destroy", () => {
    add([
        text(`GAME OVER\n\nScore: ${score}\n\n[R]estart?`, { size: 20 }),
        pos(width()/2, height()/2),
        layer("ui")
    ]);
});

  // Restart game
onKeyPress("r", () => {
    go("main");
});

// Background music
const music = play("Steamtech-Mayhem_Looping");
music.loop();

// Asteroid destruction
on("destroy", "asteroid", (a) => {
    if (!a.is("small")) {
        // create four smaller asteroids 
        positions = [a.pos.add(vec2(a.width/4, -a.height/4)),
                    a.pos.add(vec2(-a.width/4, -a.height/4)),
                    a.pos.add(vec2(-a.width/4, a.height/4)),
                    a.pos.add(vec2(a.width/4, a.height/4))];

        // small asteroids move out from the center of the explosion
        rotations = [16,34,65,87];
    
        for (let i = 0; i < positions.length; i++) {
            var s = add([
                sprite(`asteroid_small${i+1}`),
                pos(positions[i]),
                rotate(rotations[i]),
                origin("center"),
                area(),
                solid(),
                "asteroid",
                "small",
                "mobile",
                "wraps",
                {
                    speed: rand(15, 25),
                    initializing: false
                }
            ]);

            s.pushOutAll();
        }
    }
});

  
}); //Main
go("main");

