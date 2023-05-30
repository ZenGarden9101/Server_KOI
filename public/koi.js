class FlockParams {
    constructor() {
        this.maxForce = 0.08;
        this.maxSpeed = 3;
        this.perceptionRadius = 100;
        this.alignAmp = 0.9;
        this.cohesionAmp = 0.5;
        this.separationAmp = 1;
    }
}

let flockParams = new FlockParams();
// const gui = new dat.GUI()
// gui.add(flockParams, 'alignAmp', 0.5, 2)
// gui.add(flockParams, 'cohesionAmp', 0.5, 2)
// gui.add(flockParams, 'separationAmp', 0.5, 2)
// gui.add(flockParams, 'maxSpeed', 2, 6)
// gui.add(flockParams, 'maxForce', .05, 3)
// gui.add(flockParams, 'perceptionRadius', 20, 300)

// const shadowColor = color(0);//"rgba(0,0,0,0.05)";

/*==================
Ripple
===================*/
class Ripple {
    constructor(x, y) {
        this.position = createVector(x, y);
        this.size = random(50, 100);
        this.lifespan = 255;
        this.color = color(255);
        this.shadowColor = color(0);
        this.sizeStep = random(2, 3);
        this.lifeStep = random(2, 10);
        
    }

    drawShape(x, y, offset, size, color) {
        push();
        stroke(color);
        strokeWeight(1);
        noFill();
        circle(x + offset, y + offset, size);
        pop();
    }

    show() {
        this.color.setAlpha(this.lifespan);
        this.shadowColor.setAlpha(map(this.lifespan, 255, 0, 15, 0));

        this.drawShape(
            this.position.x,
            this.position.y,
            0,
            this.size,
            this.color
        );
        this.drawShape(
            this.position.x,
            this.position.y,
            50,
            this.size,
            this.shadowColor
        );
    }

    update() {
        this.size += this.sizeStep;
        this.lifespan -= this.lifeStep;
    }
}

/*==================
Koi
===================*/

const koiColors = ["#E95D0C", "#EEA237", "#E02D28"];

class Koi {
    constructor(x, y, koiColor) {
        this.color = color(koiColor);
        this.offsetX = random(-100, 100);
        this.offsetY = random(-100, 100);
        this.position = createVector(x + this.offsetX, y + this.offsetY);
        this.velocity = p5.Vector.random2D();
        this.velocity.setMag(random(2, 10));
        this.acceleration = createVector();
        this.maxForce = flockParams.maxForce;
        this.maxSpeed = flockParams.maxSpeed;
        this.baseSize = int(random(15, 20));
        this.bodyLength = this.baseSize * 2;
        this.body = new Array(this.bodyLength).fill({ ...this.position });
    }

    calculateSteeringForce(kois, factorType) {
        let steering = createVector();
        let total = 0;
        for (let other of kois) {
            let d = dist(
                this.position.x,
                this.position.y,
                other.position.x,
                other.position.y
            );
            if (d < flockParams.perceptionRadius && other != this) {
                switch (factorType) {
                    case "align":
                        steering.add(other.velocity);
                        break;
                    case "cohesion":
                        steering.add(other.position);
                        break;
                    case "separation":
                        let diff = p5.Vector.sub(this.position, other.position);
                        diff.div(d);
                        steering.add(diff);
                        break;
                    default:
                        break;
                }
                total++;
            }
        }

        if (total > 0) {
            steering.div(total);
            if (factorType === "cohesion") steering.sub(this.position);
            steering.setMag(flockParams.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(flockParams.maxForce);
        }
        return steering;
    }

    align = (kois) => this.calculateSteeringForce(kois, "align");

    cohesion = (kois) => this.calculateSteeringForce(kois, "cohesion");

    separation = (kois) =>
        this.calculateSteeringForce(kois, "separation");

    // avoid
    avoid(obstacle) {
        let steering = createVector();
        let d = dist(
            this.position.x,
            this.position.y,
            obstacle.position.x,
            obstacle.position.y);
        if (d < obstacle.size ) { //flockParams.perceptionRadius
            let diff = p5.Vector.sub( this.position, obstacle.position);
            diff.div(d);
            steering.add(diff);
            steering.setMag(flockParams.maxSpeed);
            steering.limit(flockParams.maxForce);
        }
        return steering;
    }

    // being attracted to a given attractor
    attract(attractor) {
        let steering = createVector();

        // steer towards the attractor position
        let diff = p5.Vector.sub(attractor, this.position);
        steering.add(diff);
        steering.setMag(flockParams.maxSpeed);
        steering.limit(flockParams.maxForce);
        return steering;
    }

    wrap() {
        if (this.position.x > width + 50) {
            this.position.x = -50;
        } else if (this.position.x < -50) {
            this.position.x = width + 50;
        }
        if (this.position.y > height + 50) {
            this.position.y = -50;
        } else if (this.position.y < -50) {
            this.position.y = height + 50;
        }
    }

    flock(kois, noseAttractor) {
        this.acceleration.mult(0);
        let alignment = this.align(kois);
        let cohesion = this.cohesion(kois);
        let separation = this.separation(kois);

        // avoid small ripples
        for(let i = 0; i < ripples.length; i++) {
            let ripple = ripples[i];
            // console.log(ripple);
            let avoid = this.avoid(ripple);
            this.acceleration.add(avoid);
        }

        // TODO: each flock should only have one attractor only
        if (noseAttractor) {
            // console.log("valid attractor");
            let attract = this.attract(noseAttractor);
            // add attractor effect
            this.acceleration.add(attract);
        }

        alignment.mult(flockParams.alignAmp);
        cohesion.mult(flockParams.cohesionAmp);
        separation.mult(flockParams.separationAmp);

        this.acceleration.add(separation);
        this.acceleration.add(alignment);
        this.acceleration.add(cohesion);

        this.acceleration.add(p5.Vector.random2D().mult(0.05));
    }

    updateBody() {
        this.body.unshift({ ...this.position });
        this.body.pop();
    }

    show() {
        noStroke();
        this.body.forEach((b, index) => {
            let size;
            if (index < this.bodyLength / 6) {
                size = this.baseSize + index * 1.8;
            } else {
                size = this.baseSize * 2 - index;
            }
            this.color.setAlpha(this.bodyLength - index);
            fill(this.color);
            ellipse(b.x, b.y, size, size);
        });
    }

    showShadow() {
        noStroke();
        this.body.forEach((b, index) => {
            let size;
            if (index < this.bodyLength / 6) {
                size = this.baseSize + index * 1.8;
            } else {
                // fill(255, 255, 255, 50 - index)
                size = this.baseSize * 1.8 - index;
            }

            fill(200, 200, 200, 20);
            ellipse(b.x + 50, b.y + 50, size, size);
        });
    }

    update() {
        this.position.add(this.velocity);
        this.velocity.add(this.acceleration);
        this.velocity.limit(flockParams.maxSpeed);
        this.updateBody();
    }
}

/*==================
Sketch: click to ripple
===================*/
// function mouseClicked() {
//     ripples.push(new Ripple(mouseX, mouseY))
// }
