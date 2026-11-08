class RaceTrack {
    constructor() {
        this.width = 3400;
        this.height = 2400;

        // Khung xương bản đồ mô phỏng CỰC ĐỘ khó của ảnh, 
        // với vô vàn khúc cua chữ U hẹp (200px) liên tục dồn dập.
        const sharpWaypoints = [
            { x: 1600, y: 2100 }, // Điểm xuất phát (chạy sang phải)
            
            // --- KHU VỰC ZIC-ZAC BÊN PHẢI (4 chữ U liên tiếp) ---
            { x: 3000, y: 2100 }, 
            { x: 3000, y: 1700 }, // Lên
            { x: 2000, y: 1700 }, // Trái
            { x: 2000, y: 1500 }, // Chữ U thứ 1 (rất hẹp)
            { x: 2800, y: 1500 }, // Phải
            { x: 2800, y: 1300 }, // Chữ U thứ 2
            { x: 2000, y: 1300 }, // Trái
            { x: 2000, y: 1100 }, // Chữ U thứ 3
            { x: 3000, y: 1100 }, // Phải
            { x: 3000, y: 300 },  // Lên góc trên phải
            
            // --- ĐƯỜNG TRÊN & CHỮ U LÕM GIỮA MAP ---
            { x: 2200, y: 300 },  // Trái
            { x: 2200, y: 900 },  // Đâm xuống
            { x: 2000, y: 900 },  // Chữ U thứ 4 (đáy dưới)
            { x: 2000, y: 500 },  // Lên
            { x: 1800, y: 500 },  // Chữ U thứ 5 (đỉnh trên)
            { x: 1800, y: 900 },  // Đâm xuống
            { x: 1400, y: 900 },  // Đáy chữ U bự giữa map
            { x: 1400, y: 300 },  // Đi thẳng lên
            
            // --- KHU VỰC ZIC-ZAC BÊN TRÁI (4 chữ U liên tiếp) ---
            { x: 400,  y: 300 },  // Góc trên trái
            { x: 400,  y: 900 },  // Xuống
            { x: 1200, y: 900 },  // Phải
            { x: 1200, y: 1100 }, // Chữ U thứ 6
            { x: 600,  y: 1100 }, // Trái
            { x: 600,  y: 1300 }, // Chữ U thứ 7
            { x: 1400, y: 1300 }, // Phải
            { x: 1400, y: 1500 }, // Chữ U thứ 8
            { x: 400,  y: 1500 }, // Trái
            
            // --- VỀ ĐÍCH ---
            { x: 400,  y: 2100 }  // Góc dưới trái
        ];

        // THUẬT TOÁN BO GÓC 
        this.waypoints = [];
        const cornerRadius = 300; 
        const curveSteps = 15; // Tăng step để các khúc cua chữ U mịn màng hoàn hảo hơn

        for (let i = 0; i < sharpWaypoints.length; i++) {
            const p0 = sharpWaypoints[(i - 1 + sharpWaypoints.length) % sharpWaypoints.length];
            const p1 = sharpWaypoints[i];
            const p2 = sharpWaypoints[(i + 1) % sharpWaypoints.length];

            let dx1 = p0.x - p1.x; let dy1 = p0.y - p1.y;
            let len1 = Math.hypot(dx1, dy1);
            let nx1 = dx1 / len1; let ny1 = dy1 / len1;

            let dx2 = p2.x - p1.x; let dy2 = p2.y - p1.y;
            let len2 = Math.hypot(dx2, dy2);
            let nx2 = dx2 / len2; let ny2 = dy2 / len2;

            let d = Math.min(cornerRadius, len1 / 2, len2 / 2);

            const startCurve = { x: p1.x + nx1 * d, y: p1.y + ny1 * d };
            const endCurve = { x: p1.x + nx2 * d, y: p1.y + ny2 * d };

            for (let t = 0; t <= 1; t += 1 / curveSteps) {
                const invT = 1 - t;
                const px = invT * invT * startCurve.x + 2 * invT * t * p1.x + t * t * endCurve.x;
                const py = invT * invT * startCurve.y + 2 * invT * t * p1.y + t * t * endCurve.y;
                this.waypoints.push({ x: px, y: py });
            }
        }

        this.trackWidth = 120; // Bề ngang hẹp y hệt code cũ để ép lết bánh
        this.maxTrackDistance = this.trackWidth / 2;

        // ĐÃ XÓA 2 VẠCH TĂNG TỐC Ở NGOÀI MAP
        // Căn chỉnh lại toàn bộ vạch cho nằm trọn giữa các con đường thẳng
        this.boostPads = [
            { x: 2300, y: 2100, angle: 0, width: 90, height: 40 }, // Vạch đích
            { x: 2500, y: 1700, angle: Math.PI, width: 90, height: 40 }, 
            { x: 2400, y: 1500, angle: 0, width: 90, height: 40 }, 
            { x: 2400, y: 1300, angle: Math.PI, width: 90, height: 40 }, 
            { x: 2500, y: 1100, angle: 0, width: 90, height: 40 }, 
            { x: 2600, y: 300,  angle: Math.PI, width: 90, height: 40 }, // Đường thẳng trên cùng
            
            // Chỉnh lại 3 vạch ở lõm chữ U giữa bản đồ cho chuẩn xác 100%
            { x: 2200, y: 600,  angle: Math.PI/2, width: 90, height: 40 }, // Đâm xuống
            { x: 2000, y: 700,  angle: -Math.PI/2, width: 90, height: 40 }, // Đi lên
            { x: 1800, y: 700,  angle: Math.PI/2, width: 90, height: 40 }, // Đâm xuống
            
            { x: 1600, y: 900,  angle: Math.PI, width: 90, height: 40 }, 
            { x: 900,  y: 300,  angle: Math.PI, width: 90, height: 40 }, // Đường thẳng trên cùng (trái)
            { x: 800,  y: 900,  angle: 0, width: 90, height: 40 }, 
            { x: 900,  y: 1100, angle: Math.PI, width: 90, height: 40 }, 
            { x: 1000, y: 1300, angle: 0, width: 90, height: 40 }, 
            { x: 900,  y: 1500, angle: Math.PI, width: 90, height: 40 }, 
            { x: 400,  y: 1800, angle: Math.PI/2, width: 90, height: 40 }
        ];

        this.checkpoints = [
            { x: 3000, y: 1700, radius: 450, isFinish: false }, 
            { x: 3000, y: 300,  radius: 450, isFinish: false }, 
            { x: 1400, y: 900,  radius: 450, isFinish: false }, 
            { x: 400,  y: 300,  radius: 450, isFinish: false }, 
            { x: 400,  y: 2100, radius: 450, isFinish: false }, 
            { x: 1600, y: 2100, radius: 120, isFinish: true }   
        ];
    }

    distToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1; const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return { dist: Math.hypot(px - x1, py - y1), closestX: x1, closestY: y1 };

        let t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
        const closestX = x1 + t * dx; const closestY = y1 + t * dy;
        return { dist: Math.hypot(px - closestX, py - closestY), closestX, closestY };
    }

    getTrackStatus(px, py) {
        let minDist = Infinity;
        let nearestCenter = { x: px, y: py };

        for (let i = 0; i < this.waypoints.length; i++) {
            const p1 = this.waypoints[i];
            const p2 = this.waypoints[(i + 1) % this.waypoints.length];
            const res = this.distToSegment(px, py, p1.x, p1.y, p2.x, p2.y);
            if (res.dist < minDist) {
                minDist = res.dist; nearestCenter = { x: res.closestX, y: res.closestY };
            }
        }

        return {
            distance: minDist,
            isOffRoad: minDist > this.maxTrackDistance,
            // Ép sát giới hạn va chạm (chỉ +5px) để xe không bị
            // nhận diện nhầm sang lane đối diện khi các đường quá sát nhau.
            isWallCollided: minDist > (this.maxTrackDistance + 5),
            nearestCenter
        };
    }

    draw(ctx, camera) {
        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        ctx.fillStyle = '#060812'; ctx.fillRect(0, 0, this.width, this.height);
        ctx.strokeStyle = 'rgba(0, 238, 255, 0.04)'; ctx.lineWidth = 1;
        const gridSize = 100;
        for (let x = 0; x < this.width; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke(); }
        for (let y = 0; y < this.height; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke(); }

        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        ctx.strokeStyle = 'rgba(255, 0, 100, 0.35)'; ctx.lineWidth = this.trackWidth + 30; this.renderPath(ctx); 
        ctx.strokeStyle = '#ff007f'; ctx.lineWidth = this.trackWidth + 8; this.renderPath(ctx); 
        ctx.strokeStyle = '#e6af2e'; ctx.lineWidth = this.trackWidth + 4; this.renderPath(ctx); 
        ctx.strokeStyle = '#151928'; ctx.lineWidth = this.trackWidth; this.renderPath(ctx); 
        
        ctx.strokeStyle = 'rgba(255, 220, 0, 0.65)'; ctx.lineWidth = 2; ctx.setLineDash([20, 20]); this.renderPath(ctx); 
        ctx.setLineDash([]); 

        this.drawFinishLine(ctx);

        this.boostPads.forEach(pad => {
            ctx.save(); ctx.translate(pad.x, pad.y); ctx.rotate(pad.angle);
            ctx.fillStyle = '#1e90ff'; ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 20; 
            ctx.fillRect(-pad.width / 2, -pad.height / 2, pad.width, pad.height);
            
            ctx.fillStyle = '#ffffff'; 
            ctx.beginPath(); 
            ctx.moveTo(-12, -16); 
            ctx.lineTo(12, 0); 
            ctx.lineTo(-12, 16); 
            ctx.fill();
            
            ctx.restore();
        });

        ctx.restore();
    }

    renderPath(ctx) {
        ctx.beginPath(); const pts = this.waypoints; ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath(); ctx.stroke();
    }

    drawFinishLine(ctx) {
        ctx.save(); 
        ctx.translate(1600, 2100); 
        ctx.rotate(Math.PI / 2); 
        
        const rows = 3, cols = 8, size = 12, totalW = cols * size, totalH = rows * size;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#0a0d16';
                ctx.fillRect(-totalW / 2 + c * size, -totalH / 2 + r * size, size, size);
            }
        }
        ctx.restore();
    }
}