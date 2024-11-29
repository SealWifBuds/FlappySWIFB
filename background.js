class BackgroundDemo {
    constructor() {
        this.canvas = document.getElementById('backgroundCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size to window size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Background elements
        this.stars = [];
        this.bubbles = [];
        this.nebulae = [];
        this.numStars = 100;
        this.numBubbles = 20;
        this.numNebulae = 5;

        // Initialize background elements
        this.initializeStars();
        this.initializeBubbles();
        this.initializeNebulae();

        // Start animation
        this.animate();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initializeStars() {
        for (let i = 0; i < this.numStars; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                brightness: Math.random() * 0.5 + 0.5,
                speed: Math.random() * 0.2 + 0.1,
                twinkleSpeed: Math.random() * 0.02 + 0.01,
                increasing: true
            });
        }
    }

    initializeBubbles() {
        for (let i = 0; i < this.numBubbles; i++) {
            this.bubbles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height + this.canvas.height,
                size: Math.random() * 8 + 4,
                speed: Math.random() * 1 + 0.5,
                opacity: Math.random() * 0.3 + 0.1,
                wobbleOffset: Math.random() * Math.PI * 2,
                wobbleSpeed: Math.random() * 0.02 + 0.01
            });
        }
    }

    initializeNebulae() {
        for (let i = 0; i < this.numNebulae; i++) {
            this.nebulae.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 200 + 100,
                color: this.getRandomNebulaeColor(),
                opacity: Math.random() * 0.3 + 0.1
            });
        }
    }

    getRandomNebulaeColor() {
        const colors = [
            'rgba(64, 0, 128, 0.2)',    // Deep purple
            'rgba(0, 64, 128, 0.2)',    // Deep blue
            'rgba(0, 128, 128, 0.2)',   // Teal
            'rgba(0, 128, 64, 0.2)',    // Sea green
            'rgba(128, 0, 128, 0.2)'    // Purple
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    updateStars() {
        this.stars.forEach(star => {
            // Twinkle effect
            if (star.increasing) {
                star.brightness += star.twinkleSpeed;
                if (star.brightness >= 1) star.increasing = false;
            } else {
                star.brightness -= star.twinkleSpeed;
                if (star.brightness <= 0.5) star.increasing = true;
            }

            // Move right to left
            star.x += star.speed;
            if (star.x > this.canvas.width) {
                star.x = 0;
                star.y = Math.random() * this.canvas.height;
            }
        });
    }

    updateBubbles() {
        this.bubbles.forEach(bubble => {
            bubble.y -= bubble.speed;
            bubble.x += Math.sin(bubble.wobbleOffset) * 0.5;
            bubble.wobbleOffset += bubble.wobbleSpeed;

            if (bubble.y < -bubble.size) {
                bubble.y = this.canvas.height + bubble.size;
                bubble.x = Math.random() * this.canvas.width;
            }
        });
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#000033');    // Deep space blue at top
        gradient.addColorStop(0.5, '#000066');  // Middle blue
        gradient.addColorStop(1, '#003366');    // Underwater blue at bottom
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw nebulae
        this.nebulae.forEach(nebula => {
            const gradient = this.ctx.createRadialGradient(
                nebula.x, nebula.y, 0,
                nebula.x, nebula.y, nebula.size
            );
            gradient.addColorStop(0, nebula.color);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(
                nebula.x - nebula.size,
                nebula.y - nebula.size,
                nebula.size * 2,
                nebula.size * 2
            );
        });

        // Draw stars
        this.stars.forEach(star => {
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            this.ctx.fill();
        });

        // Draw bubbles
        this.bubbles.forEach(bubble => {
            // Main bubble
            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${bubble.opacity})`;
            this.ctx.fill();

            // Bubble shine
            this.ctx.beginPath();
            this.ctx.arc(
                bubble.x - bubble.size * 0.3,
                bubble.y - bubble.size * 0.3,
                bubble.size * 0.2,
                0,
                Math.PI * 2
            );
            this.ctx.fillStyle = `rgba(255, 255, 255, ${bubble.opacity * 2})`;
            this.ctx.fill();
        });
    }

    update() {
        this.updateStars();
        this.updateBubbles();
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Start background demo when page loads
window.addEventListener('load', () => {
    new BackgroundDemo();
});
