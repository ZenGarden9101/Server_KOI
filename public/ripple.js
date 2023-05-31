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