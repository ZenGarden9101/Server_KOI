class Leaf {
    constructor(posX, posY, maxSize) {
        this.iniX = posX;
        this.iniY = posY;
        this.position = createVector(0, 0);
        // random green colour with low alpha
        this.col = color(
            random(150, 160),
            random(190, 200),
            random(160, 180),
            random(50, 100)
        ); 
        this.r = random(maxSize / 1.5, maxSize); // radius of the leaf
        this.noiseSteps = noise(posX / 100, posY / 100) * 5; 

        this.canBloom = true;
        this.flowerCap = 1; // each flower can bear max 1 flower

        this.ripple;
        this.isBlown = false;

        this.velocity = createVector();
        this.acceleration = createVector();
    }

    display() {
        // draw single leaf
        push();
        fill(this.col);
        translate(this.iniX, this.iniY);
        circle(this.position.x, this.position.y, this.r * 2);
        pop();
        // if the leaf has been blown, change its X and Y based on the ripple info
        if (this.isBlown) {
            this.blowUpdate();
        }
        // update noise step to adjust position for the next frame
        this.noiseSteps += 0.003;
    }

    update(noseAttractor) {
        //noseAttractor
        this.acceleration.set(0, 0);

        // avoid small ripples
        for (let i = 0; i < ripples.length; i++) {
            let ripple = ripples[i];
            let avoid = this.avoid("ripple", ripple);
            this.acceleration.add(avoid);
            this.velocity.add(this.acceleration);
            this.velocity.limit(0.2);
        }

        // avoid movement in passive move
        if (noseAttractor) {
            let avoid = this.avoid("track", noseAttractor);
            this.acceleration.add(avoid);
            this.velocity.add(this.acceleration);
            this.velocity.limit(1);
        }
        this.position.add(this.velocity);
        this.position.limit(height/5);
    }

    // repel from the obstacle
    avoid(mode, obstacle) {
        let steering = createVector();
        let globalPos = p5.Vector.add(
            this.position,
            createVector(this.iniX, this.iniY)
        );

        if (mode == "ripple") {
            let d = dist(
                globalPos.x,
                globalPos.y,
                obstacle.position.x,
                obstacle.position.y
            );
            if (d < obstacle.size) {
                let diff = p5.Vector.sub(globalPos, obstacle.position);
                diff.div(d);
                steering.add(diff);
                steering.limit(0.02);
            }
        }
        else if (mode == "track") {
          let d = dist(
              globalPos.x,
              globalPos.y,
              obstacle.x,
              obstacle.y
          );
          if (d < 200) {
              let diff = p5.Vector.sub(globalPos, createVector(obstacle.x, obstacle.y));
              steering.add(diff);
          }
      }

        return steering;
    }

    // record the ripple's X, Y, initial size
    blow(rippleX, rippleY, rippleR) {
        this.isBlown = true;
        this.ripple = {
            rippleX: rippleX,
            rippleY: rippleY,
            rippleR: rippleR,
        };
    }

    blowUpdate() {
        let globalPos = p5.Vector.add(
            this.position,
            createVector(this.iniX, this.iniY)
        );
        this.disToRipple = dist(
            globalPos.x,
            globalPos.y,
            this.ripple.rippleX,
            this.ripple.rippleY
        );
        // only blow the leaf if it is within the ripple's effective range
        if (this.disToRipple < this.ripple.rippleR) {
            // use vector to decide moving direction
            let blowDirection = createVector(
                globalPos.x - this.ripple.rippleX,
                globalPos.y - this.ripple.rippleY
            ).normalize();
            // the closer it is to the centre of the ripple, the faster it moves
            let vel = blowDirection.mult(
                this.ripple.rippleR - this.disToRipple
            );
            this.position.add(vel);
        }
        // increment the ripple's effective range
        this.ripple.rippleR += min(width, height) / 100;
    }
}
