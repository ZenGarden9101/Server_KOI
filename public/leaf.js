// TODO: redo the leaf class - make it easier to draw

class Leaf {
  constructor(posX, posY, maxSize) {
    this.iniX = posX;
    this.iniY = posY;
    this.position = createVector(this.iniX, this.iniY);
    // random green colour
    this.col = color(random(150, 160), random(190, 200), random(160, 180), random(50, 150)); // alpha random(20)
    this.r = random(maxSize/1.5, maxSize);
    this.noiseSteps = noise(posX/100, posY/100) * 5//random(100);

    this.canBloom = true;
    this.flowerCap = 1;

    this.ripple;
    this.isBlown = false;

    this.velocity = p5.Vector.random2D();
    this.velocity.setMag(random(2, 10));
    this.acceleration = createVector();
  }

  display() {
    noStroke();
    fill(this.col);

    // if the leaf has been blown, change its X and Y based on the ripple info
    if(this.isBlown) {
      this.blowUpdate();
    }
    // moving x, y to make the drawing more dynamic
    else{
      this.position.x = this.iniX + lerp(-this.r/2, this.r/2, noise(this.noiseSteps+ 10));
      this.position.y = this.iniY + lerp(-this.r/2, this.r/2, noise(this.noiseSteps));
    }
    
    // draw single leaf
    circle(this.position.x, this.position.y, this.r * 2);

    // update noise step to adjust position for the next frame
    this.noiseSteps += 0.003;
  }

  // TODO: create a path based on cam tracking
  // avoid(obstacle) {
  //   let steering = createVector();
  //   let d = dist(
  //       this.position.x,
  //       this.position.y,
  //       obstacle.position.x,
  //       obstacle.position.y);
  //   if (d < obstacle.size ) { //flockParams.perceptionRadius
  //       let diff = p5.Vector.sub( this.position, obstacle.position);
  //       diff.div(d);
  //       steering.add(diff);
  //       steering.setMag(flockParams.maxSpeed);
  //       steering.limit(flockParams.maxForce);
  //   }
  //   return steering;
  
  // }
  // flock(kois, noseAttractor) {
  //   this.acceleration.mult(0);
  //   let alignment = this.align(kois);
  //   let cohesion = this.cohesion(kois);
  //   let separation = this.separation(kois);

  //   // avoid small ripples
  //   for(let i = 0; i < ripples.length; i++) {
  //       let ripple = ripples[i];
  //       // console.log(ripple);
  //       let avoid = this.avoid(ripple);
  //       this.acceleration.add(avoid);
  //   }
  // }

  // update() {
  //   this.position.add(this.velocity);
  //   this.velocity.add(this.acceleration);
  //   this.velocity.limit(flockParams.maxSpeed);
  // }

  // record the ripple's X, Y, initial size
  blow(rippleX, rippleY, rippleR) {
    this.isBlown = true;
    this.ripple = {
      rippleX: rippleX,
      rippleY: rippleY,
      rippleR: rippleR
    };
    
  }

  blowUpdate() {
    this.disToRipple = dist(this.position.x, this.position.y, this.ripple.rippleX, this.ripple.rippleY);
    // only blow the leaf if it is within the ripple's effective range
    if(this.disToRipple < this.ripple.rippleR) {
      // use vector to decide moving direction
      let blowDirection = createVector(this.position.x - this.ripple.rippleX, this.position.y - this.ripple.rippleY).normalize();
      // the closer it is to the centre of the ripple, the faster it moves
      let vel = blowDirection.mult(this.ripple.rippleR - this.disToRipple);
      this.position.add(vel)
    }
    // increment the ripple's effective range
    this.ripple.rippleR += min(width, height) / 100;
  }
}
  