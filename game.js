class SoundManager {
    constructor() {
        this.audioContext = null;
        this.isMuted = false;
        this.isMusicMuted = false;
        this.currentMusic = null;
        this.backgroundMusic = {
            seal: new Audio('./assets/seal.mp3'),
            raccoon: new Audio('./assets/raccoon.mp3')
        };
        
        // Configure music tracks
        Object.values(this.backgroundMusic).forEach(track => {
            track.loop = true;
            track.volume = 0.5;
        });
        
        // Safely initialize AudioContext
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }

    createSound(frequency, duration = 0.1, volume = 0.1, type = 'sine') {
        if (this.isMuted || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (error) {
            console.warn('Sound creation error:', error);
        }
    }

    playJumpSound() {
        const frequencies = [330];
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.createSound(880, 0.1, 0.2); // High-pitched jump sound
            }, index * 100);
        });
    }

    playGameOverSound() {
        const frequencies = [330, 220, 165];
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.createSound(freq, 0.3, 0.4, 'triangle');
            }, index * 100);
        });
    }

    playMusic(character) {
        this.currentMusic = this.backgroundMusic[character];
        if (!this.isMusicMuted) {
            if (this.currentMusic.paused) {
                this.currentMusic.play();
            } else {
                this.currentMusic.pause();
            };
        }else {
            this.currentMusic.pause();
        }
    }

    toggleMusic() {
        this.isMusicMuted = !this.isMusicMuted;
        if (this.isMusicMuted) {
            this.currentMusic.pause();
        } else {
            if (this.gameActive) this.currentMusic.play();
        }
        return this.isMusicMuted;
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
}

class FlappyMemesGame {
    constructor() {
        // Get DOM elements
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.gameOverScreen = document.getElementById('gameOver');
        this.startScreen = document.getElementById('startScreen');
        this.finalScoreElement = document.getElementById('finalScore');
        this.pauseOverlay = document.getElementById('pauseOverlay');
        this.gameContainer = document.getElementById('gameContainer');

        // Character selection
        this.selectedCharacter = 'seal';
        
        // Initialize character selection handlers
        this.initCharacterSelection();

        // Time-based update variables
        this.lastTime = 0;
        this.deltaTime = 0;
        this.targetFPS = 60;
        this.timeStep = 1000 / this.targetFPS;

        // Game settings
        this.baseSpeed = 60; // Pixels per second (increased from 60 to compensate for time-based)
        this.gravity = 700; // Pixels per second squared
        this.jumpForce = -350; // Pixels per second
        this.rocketGap = 180;
        this.rocketWidth = 50;
        this.characterSize = 50;
        this.gameSpeed = 2.2;
        
        // Hitbox adjustment
        this.characterHitboxScale = {
            width: 0.75,
            height: 0.75
        };

        // Background animation settings
        this.nebulae = [];
        this.numNebulae = 8;
        this.nebulaOffset = 0;

        // Particle systems
        this.bubbles = [];
        this.ripples = [];
        this.scorePopups = [];
        this.comets = [];
        this.flames = []; 
        this.rocketFlames = []; 
        this.rocketStreams = []; 
        this.isShootingFire = false; 
        this.maxBubbles = 20;
        this.maxRipples = 3;
        this.maxComets = 5;
        this.maxFlames = 8;
        this.flameWidth = 100;
        this.flameHeight = 60;
        this.fireShootTimer = 0;
        this.fireShootDuration = 0.5; // Changed to 0.5 seconds instead of frames

        // Load assets
        this.loadAssets();

        // Event listeners
        this.gameContainer.addEventListener('click', (e) => {
            // Don't trigger jump if clicking on buttons
            if (e.target.tagName === 'BUTTON') return;
            
            // Prevent click from propagating to other elements
            e.preventDefault();
            e.stopPropagation();
            this.jump();
        });
        
        this.gameContainer.addEventListener('touchstart', (e) => {
            // Don't trigger jump if touching buttons
            if (e.target.tagName === 'BUTTON') return;
            
            e.preventDefault();
            e.stopPropagation();
            this.jump();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.jump();
            }
        });

        // Initialize game state
        this.reset();
        this.initializeBackground();

         // Sound management
         this.soundManager = new SoundManager();
        telegram.webapp.ready();
    }

    initCharacterSelection() {
        const characterOptions = document.querySelectorAll('.character-option');
        
        const handleSelection = (option, event) => {
            // Prevent any default behavior
            event.preventDefault();
            event.stopPropagation();
            
            // Remove selected class from all options
            characterOptions.forEach(opt => opt.classList.remove('selected'));
            // Add selected class to clicked/touched option
            option.classList.add('selected');
            // Update selected character
            this.selectedCharacter = option.dataset.character;
            // Reset game with new character
            this.reset();
        };

        characterOptions.forEach(option => {
            // Handle click events
            option.addEventListener('click', (e) => handleSelection(option, e));

            // Handle touch events with improved handling
            option.addEventListener('touchstart', (e) => handleSelection(option, e), { passive: false });
            
            // Prevent any other touch events from interfering
            option.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, { passive: false });
            
            option.addEventListener('touchmove', (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, { passive: false });
        });
    }

    syncCharacterSelection() {
        // Update the visual selection to match the current character
        const characterOptions = document.querySelectorAll('.character-option');
        characterOptions.forEach(option => {
            if (option.dataset.character === this.selectedCharacter) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    loadAssets() {
        // Load character images
        this.characterImgs = {
            seal: new Image(),
            raccoon: new Image()
        };
        this.characterImgs.seal.src = 'assets/seal.svg';
        this.characterImgs.raccoon.src = 'assets/raccoon.svg';

        // Load rocket image
        this.rocketImg = new Image();
        this.rocketImg.src = 'assets/rocket.svg';

        // Load background
        this.backgroundImg = new Image();
        this.backgroundImg.src = 'assets/background.svg';
    }

    initializeBackground() {
        // Create nebulae with x positions
        for (let i = 0; i < this.numNebulae; i++) {
            this.nebulae.push({
                x: Math.random() * (this.canvas.width + 400) - 200,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 200 + 150, // Larger nebulae
                color: this.getRandomNebulaeColor(),
                opacity: Math.random() * 0.3 + 0.1,
                parallaxSpeed: 0.5 + Math.random() * 0.2
            });
        }
    }

    getRandomNebulaeColor() {
        const colors = [
            'hsl(240, 70%, 50%)',  // Blue
            'hsl(280, 70%, 50%)',  // Purple
            'hsl(200, 70%, 50%)',  // Light Blue
            'hsl(320, 70%, 50%)',  // Pink
            'hsl(180, 70%, 50%)'   // Cyan
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    updateBackground() {
        // Update nebula positions
        this.nebulae.forEach(nebula => {
            nebula.x -= this.gameSpeed * nebula.parallaxSpeed;
            if (nebula.x < -nebula.size) {
                nebula.x = this.canvas.width + nebula.size;
                nebula.y = Math.random() * this.canvas.height;
                nebula.color = this.getRandomNebulaeColor();
            }
        });
    }

    reset() {
        this.character = {
            x: 50,
            y: this.canvas.height / 2,
            velocity: 0,
            rotation: 0
        };

        this.rockets = [];
        this.score = 0;
        this.gameActive = false;
        this.isPaused = true;
        this.bubbles = [];
        this.ripples = [];
        this.scorePopups = [];
        this.comets = [];
        this.flames = []; 
        this.rocketFlames = []; 
        this.rocketStreams = []; 
        this.isShootingFire = false; 
        this.fireShootTimer = 0;
        // Initialize flames ahead of visible area
        this.initializeFlames();

        // Add initial rocket
        this.addRocket();

        // Update score display
        this.scoreElement.textContent = `Score: ${this.score}`;
        
        // Hide game over screen and pause overlay
        this.gameOverScreen.style.display = 'none';
        this.pauseOverlay.style.display = 'none';

        // Sync the visual character selection with current character
        this.syncCharacterSelection();
    }

    initializeFlames() {
        // Calculate how many flames we need to cover the screen plus buffer
        const totalWidth = this.canvas.width + this.flameWidth * 4; // Extra buffer
        const numFlames = Math.ceil(totalWidth / (this.flameWidth * 0.7)) + 1; // Overlap flames by 30%

        // Create initial flames
        for (let i = 0; i < numFlames; i++) {
            this.flames.push({
                x: this.canvas.width + (i * this.flameWidth * 0.7), // Start from right edge with overlap
                y: this.canvas.height,
                width: this.flameWidth,
                height: this.flameHeight,
                frameCount: Math.random() * 100, // Randomize initial frame for varied animation
                speed: this.gameSpeed
            });
        }
    }

    createRocketFlame(x, y) {
        const numParticles = 5;
        for (let i = 0; i < numParticles; i++) {
            const speed = Math.random() * 180 + 300; // 300-480 pixels per second
            const size = Math.random() * 10 + 5;
            const lifetime = Math.random() * 0.33 + 0.17; // 0.17-0.5 seconds
            
            this.rocketFlames.push({
                x: x,
                y: y,
                vx: -speed,
                vy: (Math.random() - 0.5) * 120, // ±60 pixels per second vertical spread
                size: size,
                lifetime: lifetime,
                maxLifetime: lifetime,
                color: `hsl(${Math.random() * 30}, 100%, 50%)`
            });
        }
    }

    createRocketStream(x, y, direction) {
        const numParticles = 5;
        for (let i = 0; i < numParticles; i++) {
            const speed = Math.random() * 180; // 0-180 pixels per second
            const size = Math.random() * 12 + 8;
            const lifetime = Math.random() * 0.17 + 0.17; // 0.17-0.34 seconds
            const spread = Math.random() * 20 - 10;
            
            this.rocketStreams.push({
                x: x + spread,
                y: y,
                vx: -this.baseSpeed * this.gameSpeed,
                vy: speed * direction,
                size: size,
                lifetime: lifetime,
                maxLifetime: lifetime,
                color: `hsl(${Math.random() * 40}, 100%, 50%)`
            });
        }
    }

    createBubble() {
        if (this.bubbles.length >= this.maxBubbles) return;

        this.bubbles.push({
            x: Math.random() * this.canvas.width,
            y: this.canvas.height + 10,
            size: Math.random() * 4 + 2,
            speed: Math.random() * 30 + 15, // Reduced from 120+60 to 30+15 pixels per second
            opacity: Math.random() * 0.5 + 0.1
        });
    }

    createRipple() {
        if (this.ripples.length >= this.maxRipples) return;

        this.ripples.push({
            x: this.character.x + this.characterSize/2,
            y: this.character.y + this.characterSize/2,
            size: 7.5, // Increased by 50% from 5
            growthSpeed: 60, // Increased by 50% from 40
            opacity: 0.8
        });
    }

    createComet() {
        if (this.comets.length < this.maxComets) {
            this.comets.push({
                x: this.canvas.width + 50,
                y: Math.random() * (this.canvas.height * 0.7),
                size: Math.random() * 3 + 2,
                speed: Math.random() * 1.5 + 3, // Reduced by 90% (from 15+30 to 1.5+3)
                angle: Math.random() * 15 + 15,
                tailLength: Math.random() * 50 + 30,
                opacity: Math.random() * 0.5 + 0.5
            });
        }
    }

    createFlame() {
        // Calculate the rightmost flame's position
        let rightmostX = -Infinity;
        this.flames.forEach(flame => {
            rightmostX = Math.max(rightmostX, flame.x);
        });

        // Create new flame next to the rightmost one, with overlap
        this.flames.push({
            x: rightmostX + this.flameWidth * 0.7, // Overlap flames by 30%
            y: this.canvas.height,
            width: this.flameWidth,
            height: this.flameHeight,
            frameCount: Math.random() * 100,
            speed: this.gameSpeed
        });
    }

    createScorePopup() {
        this.scorePopups.push({
            x: this.canvas.width / 2,
            y: 70,
            score: "+1",
            opacity: 1,
            scale: 1.5
        });
    }

    addRocket() {
        const minGapPosition = 50;
        const maxGapPosition = this.canvas.height - 50 - this.rocketGap;
        const gapPosition = Math.random() * (maxGapPosition - minGapPosition) + minGapPosition;

        this.rockets.push({
            x: this.canvas.width,
            gapTop: gapPosition,
            passed: false
        });
    }

    update() {
        this.updateBackground();
        if(this.gameActive) {
            if (this.isPaused) {
                // Gentle floating animation while paused
                this.character.y = this.canvas.height / 2 + Math.sin(Date.now() / 500) * 20;
                this.character.rotation = Math.sin(Date.now() / 1000) * 5;
                return;
            }

            // Convert deltaTime from milliseconds to seconds for physics calculations
            const dt = this.deltaTime / 1000;

            // Update fire shoot timer
            if (this.isShootingFire) {
                this.fireShootTimer += dt;
                if (this.fireShootTimer >= this.fireShootDuration) {
                    this.isShootingFire = false;
                    this.fireShootTimer = 0;
                }
            }

            // Create bubbles randomly (adjusted for time-based)
            if (Math.random() < 0.5 * dt) { 
                this.createBubble();
            }

            // Check if we need more flames ahead
            const rightmostFlame = Math.max(...this.flames.map(flame => flame.x), -Infinity);
            if (rightmostFlame < this.canvas.width + this.flameWidth * 3) {
                this.createFlame();
            }

            // Update bubbles
            this.bubbles = this.bubbles.filter(bubble => {
                bubble.y -= bubble.speed * dt; 
                return bubble.y + bubble.size > 0;
            });

            // Update ripples
            this.ripples = this.ripples.filter(ripple => {
                ripple.size += ripple.growthSpeed * dt;
                ripple.opacity -= 0.8 * dt; // Reduced from 2.4 to 0.8 for longer duration
                return ripple.opacity > 0;
            });

            // Update comets
            this.updateComets();

            // Update score popups
            this.scorePopups = this.scorePopups.filter(popup => {
                popup.y -= 60 * dt; // 60 pixels per second
                popup.opacity -= 1.2 * dt;
                popup.scale -= 0.6 * dt;
                return popup.opacity > 0;
            });

            // Update flames
            this.flames = this.flames.filter(flame => {
                flame.x -= this.baseSpeed * this.gameSpeed * dt;
                flame.frameCount += dt * 60; // Convert to time-based animation
                return flame.x + flame.width > -this.flameWidth;
            });

            // Update rocket flames
            this.rocketFlames = this.rocketFlames.filter(flame => {
                flame.lifetime -= dt;
                flame.x += flame.vx * dt;
                flame.y += flame.vy * dt;
                return flame.lifetime > 0;
            });

            // Update rocket streams
            this.rocketStreams = this.rocketStreams.filter(stream => {
                stream.lifetime -= dt;
                stream.x += stream.vx * dt;
                stream.y += stream.vy * dt;
                return stream.lifetime > 0;
            });

             // Update character
            this.character.velocity += this.gravity * dt;
            this.character.y += this.character.velocity * dt;
            this.character.rotation = Math.min(Math.max(this.character.velocity * 0.1, -30), 30);

            // Update rockets
            for (let rocket of this.rockets) {
                rocket.x -= this.baseSpeed * this.gameSpeed * dt;

                // Check if rocket is passed
                if (!rocket.passed && rocket.x + this.rocketWidth < this.character.x) {
                    rocket.passed = true;
                    this.score++;
                    this.scoreElement.textContent = `Score: ${this.score}`;
                    this.createScorePopup();
                    this.isShootingFire = true;
                    this.fireShootTimer = 0;
                }

                // Create fire streams for all rockets if enabled
                if (this.isShootingFire && Math.random() < 0.4) {
                    // Increase particle frequency during short duration
                    const numBursts = 2; // Create multiple bursts per frame for more intense effect
                    for (let i = 0; i < numBursts; i++) {
                        // Top rocket shoots down
                        this.createRocketStream(rocket.x + this.rocketWidth/2, rocket.gapTop + 25, 1);
                        // Bottom rocket shoots up
                        this.createRocketStream(rocket.x + this.rocketWidth/2, rocket.gapTop + this.rocketGap - 25, -1);
                    }
                }
            }

            // Add new rocket when needed
            if (this.rockets[this.rockets.length - 1].x < this.canvas.width - 200) {
                this.addRocket();
            }

            // Remove off-screen rockets
            this.rockets = this.rockets.filter(rocket => rocket.x + this.rocketWidth > 0);

            // Check collisions
            if (this.checkCollision()) {
                this.gameOver();
                return;
            }

            // Check boundaries
            if (this.character.y < 0 || this.character.y + this.characterSize > this.canvas.height) {
                this.gameOver();
                return;
            }
        }
    }

    updateComets() {
        // Create comets randomly
        if (Math.random() < 0.02) {  // 5% chance each frame
            this.createComet();
        }

        // Update existing comets
        this.comets = this.comets.filter(comet => {
            // Calculate movement based on angle
            const angleRad = (comet.angle * Math.PI) / 180;
            comet.x -= comet.speed * Math.cos(angleRad);
            comet.y += comet.speed * Math.sin(angleRad);
            
            // Remove if off screen (left or bottom)
            return comet.x + comet.tailLength > 0 && comet.y < this.canvas.height + 50;
        });
    }

    checkCollision() {
        const characterBox = {
            x: this.character.x + this.characterSize * (1 - this.characterHitboxScale.width) / 2,
            y: this.character.y + this.characterSize * (1 - this.characterHitboxScale.height) / 2,
            width: this.characterSize * this.characterHitboxScale.width,
            height: this.characterSize * this.characterHitboxScale.height
        };

        // Check rocket collisions
        for (let rocket of this.rockets) {
            if (this.intersects(characterBox, {
                x: rocket.x + 5,
                y: 0,
                width: this.rocketWidth - 10,
                height: rocket.gapTop
            })) return true;

            if (this.intersects(characterBox, {
                x: rocket.x + 5,
                y: rocket.gapTop + this.rocketGap,
                width: this.rocketWidth - 10,
                height: this.canvas.height - (rocket.gapTop + this.rocketGap)
            })) return true;
        }

        return false;
    }

    intersects(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    draw() {
        // Clear canvas first
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw space background gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0a0a2a');
        gradient.addColorStop(0.3, '#1a1a4a');
        gradient.addColorStop(0.6, '#2a2a6a');
        gradient.addColorStop(0.8, '#1a1a4a');
        gradient.addColorStop(1, '#0a0a2a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw nebulae with parallax
        this.nebulae.forEach(nebula => {
            const gradient = this.ctx.createRadialGradient(
                nebula.x, nebula.y, 0,
                nebula.x, nebula.y, nebula.size
            );
            gradient.addColorStop(0, nebula.color);
            gradient.addColorStop(0.5, this.adjustColorOpacity(nebula.color, 0.5));
            gradient.addColorStop(1, 'transparent');
            this.ctx.fillStyle = gradient;
            this.ctx.globalAlpha = nebula.opacity;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.globalAlpha = 1;
        });

        // Draw comets
        this.comets.forEach(comet => {
            // Calculate tail end point based on angle
            const angleRad = (comet.angle * Math.PI) / 180;
            const tailEndX = comet.x + comet.tailLength * Math.cos(angleRad);
            const tailEndY = comet.y - comet.tailLength * Math.sin(angleRad);
            
            // Draw comet tail (gradient)
            const tailGradient = this.ctx.createLinearGradient(
                tailEndX, tailEndY,
                comet.x, comet.y
            );
            
            // Animate tail color
            const offset = Math.sin(comet.size * 0.1) * 0.1;
            tailGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            tailGradient.addColorStop(1, `rgba(255, 255, 255, ${comet.opacity})`);

            // Save context for rotation
            this.ctx.save();
            this.ctx.translate(comet.x, comet.y);
            this.ctx.rotate(-angleRad);  // Negative angle to rotate clockwise
            this.ctx.translate(-comet.x, -comet.y);

            // Draw tail
            this.ctx.beginPath();
            this.ctx.moveTo(comet.x, comet.y - comet.size/2);
            this.ctx.lineTo(comet.x + comet.tailLength, comet.y);
            this.ctx.lineTo(comet.x, comet.y + comet.size/2);
            this.ctx.fillStyle = tailGradient;
            this.ctx.fill();

            // Draw comet head
            this.ctx.beginPath();
            this.ctx.arc(comet.x, comet.y, comet.size, 0, Math.PI * 2);
            this.ctx.fillStyle = 'white';
            this.ctx.fill();

            this.ctx.restore();
        });

        // Draw bubbles
        this.bubbles.forEach(bubble => {
            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${bubble.opacity})`;
            this.ctx.fill();
        });

        // Draw ripples
        this.ripples.forEach(ripple => {
            this.ctx.beginPath();
            this.ctx.arc(ripple.x, ripple.y, ripple.size, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${ripple.opacity})`;
            this.ctx.lineWidth = 2; // Reduced from 3 for smaller ripples
            this.ctx.stroke();
        });

        // Draw character with smoother rotation
        this.ctx.save();
        this.ctx.translate(
            this.character.x + this.characterSize/2,
            this.character.y + this.characterSize/2
        );
        
        // Limit rotation angle and make it smoother
        const rotationAngle = Math.min(Math.max(this.character.velocity * 0.1, -30), 30);
        this.ctx.rotate(rotationAngle * Math.PI / 180);
        
        this.ctx.drawImage(
            this.characterImgs[this.selectedCharacter],
            -this.characterSize/2,
            -this.characterSize/2,
            this.characterSize,
            this.characterSize
        );
        this.ctx.restore();

        // Draw rockets
        for (let rocket of this.rockets) {
            // Draw top rocket
            this.ctx.save();
            this.ctx.translate(rocket.x, rocket.gapTop);
            this.ctx.scale(1, -1);
            this.ctx.drawImage(this.rocketImg, 0, 0, this.rocketWidth, rocket.gapTop);
            this.ctx.restore();

            // Draw bottom rocket
            this.ctx.drawImage(
                this.rocketImg,
                rocket.x,
                rocket.gapTop + this.rocketGap,
                this.rocketWidth,
                this.canvas.height - (rocket.gapTop + this.rocketGap)
            );
        }

        // Draw flames
        this.flames.forEach(flame => {
            // Create flame gradient
            const flameGradient = this.ctx.createLinearGradient(
                flame.x, flame.y,
                flame.x, flame.y - flame.height
            );
            
            // Animate flame colors
            const offset = Math.sin(flame.frameCount * 0.1) * 0.1;
            flameGradient.addColorStop(0, '#FF4500');  // Red-orange base
            flameGradient.addColorStop(0.4 + offset, '#FFA500');  // Orange middle
            flameGradient.addColorStop(1, '#FFD700');  // Yellow top
            
            this.ctx.fillStyle = flameGradient;
            
            // Draw multiple flame tips for each flame section
            const numTips = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(flame.x, flame.y);
            
            // Create base points
            for (let i = 0; i <= numTips; i++) {
                const x = flame.x + (flame.width * i) / numTips;
                const waveOffset = Math.sin((flame.frameCount + i * 30) * 0.3) * 8;
                const heightVariation = Math.sin((flame.frameCount + i * 20) * 0.2) * 10;
                
                if (i === 0) {
                    this.ctx.moveTo(x, flame.y);
                } else {
                    // Create flame tips
                    const midX = x - flame.width / (numTips * 2);
                    const tipHeight = flame.height + heightVariation;
                    this.ctx.quadraticCurveTo(
                        midX, flame.y - tipHeight + waveOffset,
                        x, flame.y
                    );
                }
            }
            
            this.ctx.closePath();
            
            // Add glow effect
            this.ctx.shadowColor = '#FF4500';
            this.ctx.shadowBlur = 20;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });

        // Draw rocket flames
        this.rocketFlames.forEach(flame => {
            const alpha = flame.lifetime / flame.maxLifetime;
            this.ctx.beginPath();
            this.ctx.fillStyle = flame.color.replace(')', `, ${alpha})`).replace('hsl', 'hsla');
            this.ctx.arc(flame.x, flame.y, flame.size * (1 + (1 - alpha) * 0.5), 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw rocket streams
        this.rocketStreams.forEach(stream => {
            const alpha = stream.lifetime / stream.maxLifetime;
            this.ctx.beginPath();
            this.ctx.fillStyle = stream.color.replace(')', `, ${alpha})`).replace('hsl', 'hsla');
            // Draw elongated flame particle
            this.ctx.ellipse(
                stream.x, 
                stream.y, 
                stream.size * 0.5, // width
                stream.size * (1 + (1 - alpha)), // height - gets longer as it fades
                0, 0, Math.PI * 2
            );
            this.ctx.fill();
        });

        // Draw score popups
        this.scorePopups.forEach(popup => {
            this.ctx.save();
            this.ctx.fillStyle = `rgba(255, 255, 255, ${popup.opacity})`;
            this.ctx.font = `bold ${24 * popup.scale}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(popup.score, popup.x, popup.y);
            this.ctx.restore();
        });
    }

    adjustColorOpacity(color, opacity) {
        // Convert HSL color to RGBA with opacity
        return color.replace('hsl', 'hsla').replace(')', `, ${opacity})`);
    }

    start() {
        this.gameActive = true;
        this.isPaused = true;
        this.startScreen.style.display = 'none';
        this.gameOverScreen.style.display = 'none';
        this.pauseOverlay.style.display = 'block';
        // Start game loop
        // Start the game loop if it's not already running
        if (!this.isLoopRunning) {
            this.isLoopRunning = true;
            this.lastTime = performance.now();
            requestAnimationFrame((time) => this.gameLoop(time));
        }
    }

    gameLoop(currentTime) {
        if (!this.isLoopRunning) return;

        // Calculate delta time
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update game state
        this.update();
        
        // Draw game
        this.draw();

        // Continue the game loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    gameOver() {
        this.soundManager.playGameOverSound();
        this.gameActive = false;
        this.finalScoreElement.textContent = this.score;
        this.gameOverScreen.style.display = 'block';
        this.soundManager.playMusic(this.selectedCharacter); 
    }

    jump() {
        if (!this.gameActive) return;
        
        if (this.isPaused) {
            this.isPaused = false;
            this.soundManager.playMusic(this.selectedCharacter);
            this.pauseOverlay.style.display = 'none';
        }
        
        this.character.velocity = this.jumpForce;
        this.createRipple();
        this.soundManager.playJumpSound();
    }
}

// Game instance
let game;

// Initialize game when the window loads
window.addEventListener('load', () => {
    game = new FlappyMemesGame();
});

function toggleMute() {
    if (!game) return;
    const muteButton = document.getElementById('muteButton');
    const isMuted = game.soundManager.toggleMute();
    
    // Update button icon
    muteButton.textContent = isMuted ? '🔇' : '🔊';
}

function toggleMusic() {
    if (!game) return;
    const playButton = document.getElementById('playButton');
    const muteButton = document.getElementById('muteButton');
    const isMuted = game.soundManager.toggleMusic();
    
    // Update button icon
    playButton.textContent = isMuted ? '⏸️' : '▶️';
}

function startGame() {
    if (!game) {
        game = new FlappyMemesGame();
    }
    game.start();
}

function restartGame() {
    if (!game) return;
    // Keep the current character
    const currentCharacter = game.selectedCharacter;
    const currentMusicMuted = game.soundManager.isMusicMuted;
    const currentisMuted = game.soundManager.isMuted;
    game = new FlappyMemesGame();
    game.selectedCharacter = currentCharacter;
    game.syncCharacterSelection();
    document.getElementById('startScreen').style.display = 'block';
    game.soundManager.isMusicMuted = currentMusicMuted;
    game.soundManager.isMuted = currentisMuted;
}
