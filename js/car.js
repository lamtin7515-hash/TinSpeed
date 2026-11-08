class Car {
    constructor(x, y, model = 'shadow') {
        this.x = x;
        this.y = y;
        this.angle = 0; 
        this.speed = 0;
        this.model = model;

        this.targetStraight = 160 / 72; 
        this.targetTurn = 100 / 72;     
        this.targetDrift = 50 / 72;     
        
        this.baseMaxSpeed = this.targetStraight; 
        
        this.accel = model === 'thunder' ? 0.0275 : 0.0225;
        this.decel = 0.018; 
        this.turnSpeed = 0.0099;      

        this.isDrifting = false;
        this.nitroAmount = 100;
        this.isBoosting = false;
        this.isHittingWall = false;

        this.currentLap = 1;
        this.nextCheckpointIndex = 0;
        this.particles = [];
        
        this.padBoostTimer = 0; 
        
        // SỬA ĐỔI: Biến hẹn giờ cho Nitro (tách biệt khỏi thanh nạp)
        this.nitroBoostTimer = 0; 
    }

    update(controls, track, soundManager) {
        const status = track.getTrackStatus(this.x, this.y);
        this.isHittingWall = status.isOffRoad || status.isWallCollided;

        // XỬ LÝ TÔNG TƯỜNG 
        if (this.isHittingWall) {
            const angleToCenter = Math.atan2(status.nearestCenter.y - this.y, status.nearestCenter.x - this.x);
            
            this.x += Math.cos(angleToCenter) * 4;
            this.y += Math.sin(angleToCenter) * 4;
            
            let angleDiff = angleToCenter - this.angle;
            while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            
            this.angle += Math.sign(angleDiff) * (15 * Math.PI / 180);
            this.speed *= 0.4; 
            
            // Tông tường sẽ lập tức mất trạng thái xịt lửa Nitro
            this.nitroBoostTimer = 0;
            this.isBoosting = false;
            this.isDrifting = false;
        }

        // CƠ CHẾ KÍCH HOẠT NITRO (Chỉ kích hoạt khi Timer <= 0)
        // Khi nhấn Space: Tính tổng thời gian dựa trên lượng Nitro hiện có và xóa sạch thanh
        if (controls.space && this.nitroAmount > 0 && this.nitroBoostTimer <= 0 && this.speed > 0.5 && !this.isHittingWall) {
            // Tính số frame duy trì (giống độ hao hụt 0.297 cũ: 100% ~ 336 frame)
            this.nitroBoostTimer = Math.floor(this.nitroAmount / 0.297);
            
            // Xóa sạch thanh Nitro ngay lúc nhấn
            this.nitroAmount = 0;
        }

        // XỬ LÝ DUY TRÌ NITRO THEO TIMER
        if (this.nitroBoostTimer > 0 && !this.isHittingWall) {
            this.nitroBoostTimer--;
            this.isBoosting = true;
            this.spawnNitroFlames();
            if (soundManager && Math.random() < 0.08) soundManager.playNitro();
        } else {
            this.isBoosting = false;
        }

        // VẠCH TĂNG TỐC 
        if (this.padBoostTimer > 0 && !this.isHittingWall) {
            this.padBoostTimer--;
            this.spawnNitroFlames(); 
        } else {
            this.padBoostTimer = 0;
        }

        let currentTargetSpeed = this.targetStraight;
        const turning = controls.left || controls.right;
        const wantsToDrift = controls.nitro; 

        if (turning && !this.isHittingWall) {
            if (wantsToDrift) {
                this.isDrifting = true;
                currentTargetSpeed = this.targetDrift; // Về 50 km/h
                
                this.spawnDriftSparks();
                
                // Drift sẽ nạp thanh Nitro MỚI, hoàn toàn không dính dáng tới Timer đang chạy
                if (this.nitroAmount < 100) {
                    this.nitroAmount = Math.min(100, this.nitroAmount + 0.72); 
                }
                if (soundManager) soundManager.setDrift(true);
            } else {
                this.isDrifting = false;
                currentTargetSpeed = this.targetTurn; 
                
                if (soundManager) soundManager.setDrift(false);
            }
        } else {
            this.isDrifting = false;
            if (soundManager) soundManager.setDrift(false);
        }

        // Tốc độ cao hơn nếu đang được Nitro hoặc Vạch tăng tốc độ
        if (this.isBoosting || this.padBoostTimer > 0) {
            currentTargetSpeed *= 1.85; 
        }

        // GIA TỐC VÀ HÃM TỐC
        if (!this.isHittingWall) {
            if (this.speed < currentTargetSpeed) {
                this.speed += this.accel * (this.isBoosting || this.padBoostTimer > 0 ? 1.3 : 1.0);
                if (this.speed > currentTargetSpeed) this.speed = currentTargetSpeed;
            } else if (this.speed > currentTargetSpeed) {
                const activeDecel = this.isDrifting ? (this.decel * 3) : this.decel;
                this.speed -= activeDecel;
                if (this.speed < currentTargetSpeed) this.speed = currentTargetSpeed;
            }
        }

        let turnRate = this.turnSpeed * (this.isDrifting ? 2.0 : 1.0);
        if (Math.abs(this.speed) < 1.0) turnRate *= (Math.abs(this.speed) / 1.0);

        if (controls.left)  this.angle -= turnRate * (this.speed >= 0 ? 1 : -1);
        if (controls.right) this.angle += turnRate * (this.speed >= 0 ? 1 : -1);

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        this.x = Math.max(60, Math.min(track.width - 60, this.x));
        this.y = Math.max(60, Math.min(track.height - 60, this.y));

        track.boostPads.forEach(pad => {
            const dist = Math.hypot(this.x - pad.x, this.y - pad.y);
            if (dist < 55) {
                this.padBoostTimer = 180; // 3 giây
                if (soundManager) soundManager.playBoostPad();
            }
        });

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx; p.y += p.vy; p.life -= p.decay;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    spawnDriftSparks() {
        const rearX = this.x - Math.cos(this.angle) * 24;
        const rearY = this.y - Math.sin(this.angle) * 24;
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: rearX + (Math.random() - 0.5) * 12, y: rearY + (Math.random() - 0.5) * 12,
                vx: (Math.random() - 0.5) * 1.5 - Math.cos(this.angle),
                vy: (Math.random() - 0.5) * 1.5 - Math.sin(this.angle),
                color: Math.random() > 0.5 ? '#00eeff' : '#ff00aa',
                size: Math.random() * 2.5 + 2, life: 1.0, decay: 0.06
            });
        }
    }

    spawnNitroFlames() {
        const rearX = this.x - Math.cos(this.angle) * 28;
        const rearY = this.y - Math.sin(this.angle) * 28;
        for (let i = 0; i < 4; i++) {
            this.particles.push({
                x: rearX, y: rearY,
                vx: -Math.cos(this.angle) * (Math.random() * 3 + 1.5) + (Math.random() - 0.5),
                vy: -Math.sin(this.angle) * (Math.random() * 3 + 1.5) + (Math.random() - 0.5),
                color: Math.random() > 0.4 ? '#ff5500' : '#00ffff',
                size: Math.random() * 5 + 3, life: 1.0, decay: 0.08
            });
        }
    }
}