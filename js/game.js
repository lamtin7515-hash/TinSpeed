window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('game-container');
    const minimapCanvas = document.getElementById('minimapCanvas');
    const miniCtx = minimapCanvas.getContext('2d');

    const lapDisplay = document.getElementById('lapDisplay');
    const timeDisplay = document.getElementById('timeDisplay');
    const speedDisplay = document.getElementById('speedDisplay');
    const nitroBar = document.getElementById('nitroBar');
    const offRoadAlert = document.getElementById('offRoadAlert');
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const finalTime = document.getElementById('finalTime');
    const topSpeedDisplay = document.getElementById('topSpeed');
    const btnStartGame = document.getElementById('btnStartGame');
    const btnRestartGame = document.getElementById('btnRestartGame');
    const carCards = document.querySelectorAll('.car-card');

    let selectedCarModel = 'shadow';
    let gameState = 'MENU';
    let startTime = 0;
    let maxSpeedAchieved = 0;
    const TOTAL_LAPS = 3;

    let scene, camera, renderer;
    let carGroup; 
    let particleMeshes = []; 

    const sound = new SoundManager();
    const track = new RaceTrack();
    let carPhysics = new Car(1600, 2100, selectedCarModel); 
    
    const controls = { left: false, right: false, nitro: false, space: false };
    nitroBar.style.width = `100%`;

    function init3D() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x060812);
        scene.fog = new THREE.Fog(0x060812, 300, 1200);

        camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 1, 3000);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.top = '0px';
        renderer.domElement.style.left = '0px';
        renderer.domElement.style.zIndex = '0';
        container.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(500, 1000, 500); 
        scene.add(dirLight);

        const trackCanvas = document.createElement('canvas');
        trackCanvas.width = 2048; 
        trackCanvas.height = 2048;
        const tCtx = trackCanvas.getContext('2d');
        
        tCtx.scale(2048 / track.width, 2048 / track.height);
        track.draw(tCtx, {x: 0, y: 0}); 

        const trackTexture = new THREE.CanvasTexture(trackCanvas);
        trackTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        trackTexture.generateMipmaps = true; 
        trackTexture.minFilter = THREE.LinearMipmapLinearFilter;

        const floorGeo = new THREE.PlaneGeometry(track.width, track.height);
        const floorMat = new THREE.MeshBasicMaterial({ map: trackTexture });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(track.width / 2, 0, track.height / 2);
        scene.add(floor);

        carGroup = new THREE.Group();
        
        const chassis = new THREE.Mesh(
            new THREE.BoxGeometry(40, 10, 20), 
            new THREE.MeshStandardMaterial({ color: selectedCarModel === 'thunder' ? 0x0099ff : 0x7209b7 })
        );
        chassis.position.y = 8;
        carGroup.add(chassis);

        const cockpit = new THREE.Mesh(
            new THREE.BoxGeometry(18, 8, 14), 
            new THREE.MeshStandardMaterial({ color: 0x111111 })
        );
        cockpit.position.set(-6, 16, 0);
        carGroup.add(cockpit);

        const spoiler = new THREE.Mesh(
            new THREE.BoxGeometry(6, 2, 22), 
            new THREE.MeshStandardMaterial({ color: selectedCarModel === 'thunder' ? 0x00eeff : 0xf72585 })
        );
        spoiler.position.set(-18, 18, 0);
        carGroup.add(spoiler);

        const tailLight = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 16), new THREE.MeshBasicMaterial({color: 0xff0033}));
        tailLight.position.set(-20, 8, 0);
        carGroup.add(tailLight);

        scene.add(carGroup);

        const particleGeo = new THREE.BoxGeometry(3, 3, 3);
        for(let i = 0; i < 60; i++) {
            const pMat = new THREE.MeshBasicMaterial({ 
                color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending 
            });
            const pMesh = new THREE.Mesh(particleGeo, pMat);
            pMesh.visible = false;
            scene.add(pMesh);
            particleMeshes.push(pMesh);
        }

        carPhysics.angle = 0;
        camera.position.set(
            carPhysics.x - Math.cos(carPhysics.angle) * 140,
            60,
            carPhysics.y - Math.sin(carPhysics.angle) * 140
        );
        camera.lookAt(carPhysics.x, 20, carPhysics.y);
        carGroup.position.set(carPhysics.x, 0, carPhysics.y);
        carGroup.rotation.y = -carPhysics.angle;
        drawMinimap();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    carCards.forEach(card => {
        card.addEventListener('click', () => {
            carCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedCarModel = card.getAttribute('data-car');
            
            if (scene) {
                const primary = selectedCarModel === 'thunder' ? 0x0099ff : 0x7209b7;
                const secondary = selectedCarModel === 'thunder' ? 0x00eeff : 0xf72585;
                carGroup.children[0].material.color.setHex(primary);
                carGroup.children[2].material.color.setHex(secondary);
            }
        });
    });

    init3D();

    btnStartGame.addEventListener('click', () => { 
        sound.init(); 
        startGame(); 
    });
    btnRestartGame.addEventListener('click', () => { startGame(); });

    function startGame() {
        startScreen.classList.remove('active');
        gameOverScreen.classList.remove('active');
        
        carPhysics = new Car(1600, 2100, selectedCarModel);
        carPhysics.angle = 0; 
        carPhysics.speed = 0;
        
        const primary = selectedCarModel === 'thunder' ? 0x0099ff : 0x7209b7;
        const secondary = selectedCarModel === 'thunder' ? 0x00eeff : 0xf72585;
        carGroup.children[0].material.color.setHex(primary);
        carGroup.children[2].material.color.setHex(secondary);

        camera.position.set(
            carPhysics.x - Math.cos(carPhysics.angle) * 140,
            60,
            carPhysics.y - Math.sin(carPhysics.angle) * 140
        );

        gameState = 'PLAYING'; startTime = performance.now(); maxSpeedAchieved = 0;
    }

    // --- XỬ LÝ SỰ KIỆN BÀN PHÍM ---
    window.addEventListener('keydown', (e) => {
        switch (e.key.toLowerCase()) {
            case 'a': case 'arrowleft': controls.left = true; break;
            case 'd': case 'arrowright': controls.right = true; break;
            case 'shift': controls.nitro = true; break; // Drift
            case ' ': controls.space = true; break;     // Nitro
            case 'r': 
                carPhysics.x = 1600; carPhysics.y = 2100; carPhysics.speed = 0; carPhysics.angle = 0; 
                break;
        }
    });

    window.addEventListener('keyup', (e) => {
        switch (e.key.toLowerCase()) {
            case 'a': case 'arrowleft': controls.left = false; break;
            case 'd': case 'arrowright': controls.right = false; break;
            case 'shift': controls.nitro = false; break;
            case ' ': controls.space = false; break;
        }
    });

    // --- XỬ LÝ SỰ KIỆN NÚT ẢO (CẢM ỨNG & CHUỘT) ---
    function bindTouchButton(elementId, controlKey) {
        const btn = document.getElementById(elementId);
        
        const press = (e) => { 
            e.preventDefault(); 
            controls[controlKey] = true; 
        };
        const release = (e) => { 
            e.preventDefault(); 
            controls[controlKey] = false; 
        };

        // Cho màn hình cảm ứng
        btn.addEventListener('touchstart', press, {passive: false});
        btn.addEventListener('touchend', release, {passive: false});
        btn.addEventListener('touchcancel', release, {passive: false});
        
        // Cho chuột trên máy tính
        btn.addEventListener('mousedown', press);
        btn.addEventListener('mouseup', release);
        btn.addEventListener('mouseleave', release);
    }

    bindTouchButton('btnLeft', 'left');
    bindTouchButton('btnRight', 'right');
    bindTouchButton('btnDrift', 'nitro'); // Phím Shift (Drift)
    bindTouchButton('btnNitro', 'space'); // Phím Space (Nitro)


    function formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
    }

    function checkLapProgress() {
        const nextCp = track.checkpoints[carPhysics.nextCheckpointIndex];
        const dist = Math.hypot(carPhysics.x - nextCp.x, carPhysics.y - nextCp.y);

        if (dist < nextCp.radius) {
            carPhysics.nextCheckpointIndex = (carPhysics.nextCheckpointIndex + 1) % track.checkpoints.length;
            if (nextCp.isFinish) {
                if (carPhysics.currentLap >= TOTAL_LAPS) finishRace();
                else { carPhysics.currentLap++; sound.playLapSound(); }
            }
        }
    }

    function finishRace() {
        gameState = 'FINISH';
        finalTime.innerText = formatTime(performance.now() - startTime);
        topSpeedDisplay.innerText = `${Math.round(maxSpeedAchieved * 72)} KM/H`; 
        gameOverScreen.classList.add('active');
    }

    function drawMinimap() {
        miniCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
        const scaleX = minimapCanvas.width / track.width;
        const scaleY = minimapCanvas.height / track.height;

        miniCtx.save();
        miniCtx.beginPath();
        miniCtx.strokeStyle = 'rgba(0, 238, 255, 0.45)';
        miniCtx.lineWidth = 10; miniCtx.lineCap = 'round'; miniCtx.lineJoin = 'round';
        track.waypoints.forEach((p, i) => {
            if (i === 0) miniCtx.moveTo(p.x * scaleX, p.y * scaleY);
            else miniCtx.lineTo(p.x * scaleX, p.y * scaleY);
        });
        miniCtx.closePath(); miniCtx.stroke();

        miniCtx.fillStyle = '#ff0055'; miniCtx.shadowColor = '#ff0055'; miniCtx.shadowBlur = 8;
        miniCtx.beginPath(); miniCtx.arc(carPhysics.x * scaleX, carPhysics.y * scaleY, 4, 0, Math.PI * 2); miniCtx.fill();
        miniCtx.restore();
    }

    function gameLoop() {
        if (gameState === 'PLAYING') {
            carPhysics.update(controls, track, sound);
            sound.updateEngine(carPhysics.speed, carPhysics.baseMaxSpeed);
            checkLapProgress();

            carGroup.position.set(carPhysics.x, 0, carPhysics.y);
            carGroup.rotation.y = -carPhysics.angle;

            const camDist = 140; 
            const camHeight = 60; 
            
            const targetCamX = carPhysics.x - Math.cos(carPhysics.angle) * camDist;
            const targetCamZ = carPhysics.y - Math.sin(carPhysics.angle) * camDist;
            const targetCamPos = new THREE.Vector3(targetCamX, camHeight, targetCamZ);

            camera.position.lerp(targetCamPos, 0.15);
            camera.lookAt(carPhysics.x, 20, carPhysics.y);

            particleMeshes.forEach(pm => pm.visible = false); 
            carPhysics.particles.forEach((p, index) => {
                if(index < particleMeshes.length) {
                    const pm = particleMeshes[index];
                    pm.position.set(p.x, 4, p.y);
                    pm.scale.setScalar(p.size / 2.5);
                    pm.material.color.set(p.color);
                    pm.material.opacity = p.life;
                    pm.visible = true;
                }
            });

            const kmh = Math.round(Math.abs(carPhysics.speed) * 72); 
            if (carPhysics.speed > maxSpeedAchieved) maxSpeedAchieved = carPhysics.speed;

            speedDisplay.innerText = kmh;
            nitroBar.style.width = `${carPhysics.nitroAmount}%`;
            lapDisplay.innerText = `${carPhysics.currentLap} / ${TOTAL_LAPS}`;
            timeDisplay.innerText = formatTime(performance.now() - startTime);

            if (carPhysics.isHittingWall) offRoadAlert.classList.add('active');
            else offRoadAlert.classList.remove('active');
        }

        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
        if (gameState === 'PLAYING') drawMinimap();
        
        requestAnimationFrame(gameLoop);
    }
    
    requestAnimationFrame(gameLoop);
});