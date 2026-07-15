const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const hpFill = document.getElementById('hp-fill');
const hpText = document.getElementById('hp-text');
const scoreDisplay = document.getElementById('score-display');
const timeDisplay = document.getElementById('time-display');
const levelDisplay = document.getElementById('level-display');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const startBtn = document.getElementById('start-btn');

// Memuat Gambar dari folder "aset"
const images = {
    player_kanan: new Image(), 
    player_kiri: new Image(), 
    koin: new Image(), 
    kunci: new Image(),
    pintu: new Image(), 
    bos: new Image(), 
    rumput: new Image(),
    batu: new Image(), 
    slash_kanan: new Image(), 
    slash_kiri: new Image(),
    hati: new Image(), // Menambahkan aset hati
    monster1: new Image(), 
    monster2: new Image(), 
    monster3: new Image(), 
    monster4: new Image()
};

images.player_kanan.src = 'aset/player_kanan.png';
images.player_kiri.src = 'aset/player_kiri.png';
images.slash_kanan.src = 'aset/slash_kanan.png';
images.slash_kiri.src = 'aset/slash_kiri.png';
images.koin.src = 'aset/koin.png';
images.kunci.src = 'aset/kunci.png';
images.pintu.src = 'aset/pintu.png';
images.bos.src = 'aset/bos.png';
images.rumput.src = 'aset/rumput.jpg';
images.batu.src = 'aset/batu.png';
images.hati.src = 'aset/hati.png'; // Source aset hati
images.monster1.src = 'aset/monster1.png';
images.monster2.src = 'aset/monster2.png';
images.monster3.src = 'aset/monster3.png';
images.monster4.src = 'aset/monster4.png';

const monsterSprites = [images.monster1, images.monster2, images.monster3, images.monster4];

// Game State
let isPlaying = false;
let isPaused = false;
let level = 1;
let score = 0;
let timeElapsed = 0;
let timerInterval;

const levelLayouts = [
    [ "....................", ".###.########.####..", "....................", ".###.###..###.####..", ".#.........#.......#", ".#.#######.#.#####.#", "....................", "####.########.######", "....................", ".#####.#####.#####..", ".#...#.#...#.#...#..", ".#.###.###.#.#.###..", "....................", ".#################..", "...................." ],
    [ "....................", "....###.####.###....", ".##.#......#...#.##.", ".##.#.####.###.#.##.", "......#......#......", "#####.#.####.#.#####", "#..................#", "#.#######..#######.#", "#..................#", "#####.########.#####", "......#......#......", ".####.#.####.#.####.", ".#......#..........#", ".#.######.########.#", "...................." ],
    [ "....................", ".#######..########..", ".#.......#.......#..", ".#.#####.#.#####.#..", ".#.#...#.#.#...#.#..", ".#.#.#.#.#.#.#.#.#..", ".....#.......#......", "####.#.#####.#.#####", ".....#.......#......", ".#.#####.#####.###..", ".#.......#.......#..", ".#.#######.#####.#..", ".#...............#..", ".#################..", "...................." ]
];

// Input Handling
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'p' && isPlaying) togglePause();
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Event Klik Kiri untuk Slash
canvas.addEventListener('mousedown', (e) => {
    if (!isPlaying || isPaused) return;
    
    slashEffect.active = true;
    slashEffect.timer = 10; 
    slashEffect.x = player.x;
    slashEffect.y = player.y;

    // Logika Normal: Menghadap kanan pakai slash_kanan, menghadap kiri pakai slash_kiri
    slashEffect.img = player.facingRight ? images.slash_kanan : images.slash_kiri;

    // Deteksi monster yang terkena hit (damage 20)
    for (let i = monsters.length - 1; i >= 0; i--) {
        let monster = monsters[i];
        let dx = monster.x - player.x;
        let dy = monster.y - player.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 60) {
            monster.hp -= 20; // Hit damage
            if (monster.hp <= 0) {
                monsters.splice(i, 1);
                score += 50;
                updateUI();
            }
        }
    }
});

// --- KELAS ENTITAS ---
class Entity {
    constructor(x, y, size, img) { this.x = x; this.y = y; this.size = size; this.img = img; }
    draw() {
        if (this.img && this.img.complete) {
            ctx.drawImage(this.img, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        }
    }
}

class Wall {
    constructor(x, y) { this.x = x; this.y = y; this.size = 40; }
    draw() {
        if (images.batu.complete) ctx.drawImage(images.batu, this.x, this.y, this.size, this.size);
    }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y, 30, images.player_kanan); 
        this.speed = 3.5;
        this.maxHp = 100; // Menambahkan batas maksimal HP
        this.hp = this.maxHp;
        this.hasKey = false;
        this.invincible = false;
        this.facingRight = true; 
    }
    update() {
        let currentSpeed = keys['shift'] ? this.speed * 1.5 : this.speed;
        let nextX = this.x;
        let nextY = this.y;

        if (keys['w'] || keys['arrowup']) nextY -= currentSpeed;
        if (keys['s'] || keys['arrowdown']) nextY += currentSpeed;
        
        if (keys['a'] || keys['arrowleft']) { 
            nextX -= currentSpeed; 
            this.facingRight = false; 
        }
        if (keys['d'] || keys['arrowright']) { 
            nextX += currentSpeed; 
            this.facingRight = true; 
        }

        if (!checkWallCollision(this, nextX, this.y)) this.x = nextX;
        if (!checkWallCollision(this, this.x, nextY)) this.y = nextY;
    }
    takeDamage(damage) {
        if (this.invincible) return;
        this.hp -= damage;
        updateUI();
        canvas.classList.add('hit-flash');
        setTimeout(() => canvas.classList.remove('hit-flash'), 300);
        if (this.hp <= 0) gameOver();
        else {
            this.invincible = true;
            setTimeout(() => this.invincible = false, 1000); 
        }
    }
    draw() {
        if (this.invincible && Math.floor(Date.now() / 100) % 2 === 0) return; 
        
        this.img = this.facingRight ? images.player_kanan : images.player_kiri;
        super.draw();

        if (this.hasKey && images.kunci.complete) {
            ctx.drawImage(images.kunci, this.x + 10, this.y - 30, 20, 20);
        }
    }
}

class Monster extends Entity {
    constructor(x, y, size, img, speed, maxHp, damage = 20) {
        super(x, y, size, img);
        this.speed = speed;
        this.damage = damage;
        this.maxHp = maxHp;
        this.hp = maxHp;
    }
    update(target) {
        let dx = target.x - this.x;
        let dy = target.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            let nextX = this.x + (dx / distance) * this.speed;
            let nextY = this.y + (dy / distance) * this.speed;
            
            if (!checkWallCollision(this, nextX, this.y)) this.x = nextX;
            if (!checkWallCollision(this, this.x, nextY)) this.y = nextY;
        }
    }
    draw() {
        super.draw(); 
        
        let barWidth = this.size;
        let barHeight = 5;
        let barX = this.x - this.size / 2;
        let barY = this.y - this.size / 2 - 10;
        let hpPercentage = Math.max(0, this.hp / this.maxHp);

        ctx.fillStyle = '#ff0000';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(barX, barY, barWidth * hpPercentage, barHeight);
        
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}

// --- VARIABEL GAME ---
let player;
let monsters = [];
let coins = [];
let hearts = []; // Variabel untuk menyimpan item hati
let walls = [];
let key;
let door;
let slashEffect = { active: false, x: 0, y: 0, timer: 0, img: null };

// Utilitas Tabrakan
function checkCollision(obj1, obj2) {
    let dx = obj1.x - obj2.x;
    let dy = obj1.y - obj2.y;
    return Math.sqrt(dx * dx + dy * dy) < ((obj1.size / 2 + obj2.size / 2) * 0.7);
}

function checkWallCollision(entity, newX, newY) {
    let hitboxR = (entity.size / 2) * 0.7;
    let left = newX - hitboxR, right = newX + hitboxR, top = newY - hitboxR, bottom = newY + hitboxR;
    if (left < 0 || right > canvas.width || top < 0 || bottom > canvas.height) return true;
    for (let wall of walls) {
        if (right > wall.x && left < wall.x + wall.size && bottom > wall.y && top < wall.y + wall.size) return true;
    }
    return false;
}

function drawBackground() {
    if (images.rumput.complete) {
        ctx.fillStyle = ctx.createPattern(images.rumput, 'repeat');
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#2d4c1e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function initLevel() {
    walls = []; monsters = []; coins = []; hearts = [];
    let emptyTiles = [];
    let currentLayout = levelLayouts[(level - 1) % levelLayouts.length];

    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 20; c++) {
            if (currentLayout[r][c] === '#') {
                walls.push(new Wall(c * 40, r * 40));
            } else {
                if ((r < 2 && c < 2) || (r < 2 && c > 17)) continue;
                emptyTiles.push({ x: c * 40 + 20, y: r * 40 + 20 });
            }
        }
    }

    player = new Player(20, 20);
    door = new Entity(canvas.width - 20, 20, 35, images.pintu);

    function getRandomEmptyPos() {
        if (emptyTiles.length === 0) return {x: canvas.width/2, y: canvas.height/2};
        let idx = Math.floor(Math.random() * emptyTiles.length);
        let pos = emptyTiles[idx];
        emptyTiles.splice(idx, 1); 
        return pos;
    }

    // Monster
    for (let i = 0; i < level; i++) {
        let pos = getRandomEmptyPos();
        let randomSprite = monsterSprites[Math.floor(Math.random() * monsterSprites.length)];
        let monsterSpeed = 1.6 + (level * 0.2); 
        monsters.push(new Monster(pos.x, pos.y, 30, randomSprite, monsterSpeed, 100, 15));
    }
    
    // Bos
    let bossPos = getRandomEmptyPos();
    let bossSpeed = 1.0 + (level * 0.1);
    monsters.push(new Monster(bossPos.x, bossPos.y, 38, images.bos, bossSpeed, 200, 30));

    // Koin
    for (let i = 0; i < 4 + level; i++) {
        let pos = getRandomEmptyPos();
        coins.push(new Entity(pos.x, pos.y, 25, images.koin));
    }

    // Men-spawn Item Hati (2 per level)
    for (let i = 0; i < 2; i++) {
        let pos = getRandomEmptyPos();
        hearts.push(new Entity(pos.x, pos.y, 25, images.hati));
    }

    let keyPos = getRandomEmptyPos();
    key = new Entity(keyPos.x, keyPos.y, 25, images.kunci);

    levelDisplay.innerText = level;
    updateUI();
}

function updateUI() {
    // Memastikan bar darah persentasenya benar berdasarkan maxHp
    let hpPercentage = Math.max(0, (player.hp / player.maxHp) * 100);
    hpFill.style.width = hpPercentage + '%';
    hpText.innerText = Math.max(0, player.hp);
    
    scoreDisplay.innerText = score;
    let minutes = Math.floor(timeElapsed / 60).toString().padStart(2, '0');
    let seconds = (timeElapsed % 60).toString().padStart(2, '0');
    timeDisplay.innerText = `${minutes}:${seconds}`;
}

function gameLoop() {
    if (!isPlaying || isPaused) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    walls.forEach(wall => wall.draw());
    door.draw();

    // Logika mengambil koin
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].draw();
        if (checkCollision(player, coins[i])) {
            coins.splice(i, 1);
            score += 15;
            updateUI();
        }
    }

    // Logika mengambil Item Hati (Healing)
    for (let i = hearts.length - 1; i >= 0; i--) {
        hearts[i].draw();
        if (checkCollision(player, hearts[i])) {
            hearts.splice(i, 1); // Hapus hati dari map
            player.hp = Math.min(player.maxHp, player.hp + 25); // Tambah 25 HP, max 100
            updateUI();
        }
    }

    if (!player.hasKey) {
        key.draw();
        if (checkCollision(player, key)) {
            player.hasKey = true;
            score += 50;
            updateUI();
        }
    }

    if (checkCollision(player, door) && coins.length === 0 && player.hasKey) {
        levelComplete();
        return;
    }

    monsters.forEach(monster => {
        monster.update(player);
        monster.draw();
        if (checkCollision(player, monster)) player.takeDamage(monster.damage);
    });

    player.update();
    player.draw();

    if (slashEffect.active && slashEffect.img) {
        ctx.drawImage(slashEffect.img, slashEffect.x - 40, slashEffect.y - 40, 80, 80);
        slashEffect.timer--;
        if (slashEffect.timer <= 0) slashEffect.active = false;
    }

    requestAnimationFrame(gameLoop);
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!isPaused && isPlaying) { timeElapsed++; updateUI(); }
    }, 1000);
}

function startGame() {
    level = 1; score = 0; timeElapsed = 0;
    isPlaying = true; isPaused = false;
    overlay.classList.add('hidden');
    initLevel(); startTimer(); requestAnimationFrame(gameLoop);
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        overlayTitle.innerText = "PAUSE";
        overlayDesc.innerText = "Tekan P atau tombol di bawah untuk lanjut";
        startBtn.innerText = "LANJUTKAN";
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
        requestAnimationFrame(gameLoop);
    }
}

function levelComplete() {
    isPlaying = false;
    score += 100 + (Math.max(0, 60 - timeElapsed) * 2);
    level++;
    overlayTitle.innerText = "LEVEL BERHASIL!";
    overlayDesc.innerText = `Skor kamu: ${score}. Bersiap untuk Level ${level}!`;
    startBtn.innerText = "LEVEL SELANJUTNYA";
    overlay.classList.remove('hidden');
}

function gameOver() {
    isPlaying = false;
    clearInterval(timerInterval);
    overlayTitle.innerText = "GAME OVER";
    overlayDesc.innerText = `Skor Akhir: ${score}`;
    startBtn.innerText = "MAIN LAGI";
    overlay.classList.remove('hidden');
}

startBtn.addEventListener('click', () => {
    if (!isPlaying && player && player.hp > 0 && level > 1) {
        isPlaying = true; overlay.classList.add('hidden');
        initLevel(); requestAnimationFrame(gameLoop);
    } else if (isPaused) { togglePause();
    } else { startGame(); }
});
// --- LOGIKA KONTROL MOBILE (LEBIH ROBUST) ---
const btnMap = {
    'btn-up': 'w',
    'btn-down': 's',
    'btn-left': 'a',
    'btn-right': 'd',
    'btn-sprint': 'shift'
};

function handleTouch(e, isPressed) {
    const btnId = e.target.id;
    if (btnMap[btnId]) {
        keys[btnMap[btnId]] = isPressed;
    }
}

Object.keys(btnMap).forEach(id => {
    const btn = document.getElementById(id);
    
    // Gunakan fungsi yang sama untuk semua event touch
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch(e, true); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); handleTouch(e, false); });
    btn.addEventListener('touchcancel', (e) => { e.preventDefault(); handleTouch(e, false); }); // Tambahan penting
});

// Khusus untuk tombol Attack
const attackBtn = document.getElementById('btn-attack');
attackBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    // Simulasikan event mousedown agar fungsi serang terpanggil
    const event = new Event('mousedown');
    canvas.dispatchEvent(event);
});
