// State game
let gold = 0;
let lahan = [
    { id: 0, level: 1, baseHargaUpgrade: 100, multiplier: 1 } // lahan 0 (utama) dengan multiplier drama
];
let dramaFlags = {
    drama1: false,
    drama2: false,
    drama3: false,
    drama4: false 
};

// Referensi elemen DOM
const goldSpan = document.getElementById('gold-amount');
const characterImg = document.getElementById('character-img');
const lahanContainer = document.getElementById('lahan-container');
const beliLahanBtn = document.getElementById('beli-lahan-btn');
const modal = document.getElementById('drama-modal');
const modalFoto = document.getElementById('modal-foto');
const modalNama = document.getElementById('modal-nama');
const modalDialog = document.getElementById('modal-dialog');
const modalOptions = document.getElementById('modal-options');
const SAVE_KEY = 'fachrurMiningSave';


// Path gambar (sesuaikan jika perlu)
const PATH_KARAKTER_DIAM = 'assets/image/karakter/fachrur_animate_1-removebg-preview.png';
const PATH_KARAKTER_PUKUL = 'assets/image/karakter/fachrur_animate_2-removebg-preview.png';
const PATH_ACTOR_KOKI = 'assets/image/actor/koki.png';
const PATH_ACTOR_POLISI = 'assets/image/actor/polisi.png';
const PATH_ACTOR_GEOLOG = 'assets/image/actor/ahligeologi.png';
const PATH_AUDIO_MINE = 'assets/sound/miningklik.mp3';
const PATH_AUDIO_UPGRADE = 'assets/sound/upradgelahan.mp3';

// Daftar sound mining yang tersedia
const soundOptions = [
    { id: 'none', name: 'Tidak Ada Suara', path: null },
    { id: 'mining1', name: 'Vine Boom', path: 'assets/sound/miningklik.mp3' },
    { id: 'mining2', name: 'BabaBoey', path: 'assets/sound/miningklik2.mp3' },
    { id: 'mining3', name: 'Faaahh!!', path: 'assets/sound/miningklik3.mp3' },
    // Tambahkan sound baru di sini dengan format yang sama
    // Contoh: { id: 'mining4', name: 'Suara Palu', path: 'assets/sound/palu.mp3' }
];

// Pilihan sound saat ini, default ke 'mining1' (pastikan file ada)
let selectedSoundId = 'mining1';

function init() {
    loadGame();
    updateUI();

    // Isi dropdown sound
    const soundSelect = document.getElementById('sound-select');
    if (soundSelect) {
        // Kosongkan dulu
        soundSelect.innerHTML = '';
        soundOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.id;
            opt.textContent = option.name;
            if (option.id === selectedSoundId) opt.selected = true;
            soundSelect.appendChild(opt);
        });

        soundSelect.addEventListener('change', (e) => {
            selectedSoundId = e.target.value;
            saveGame(); // simpan perubahan
        });
    }

    // Event listener untuk klik/tap pada karakter
    characterImg.addEventListener('click', handleMine);
    characterImg.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleMine();
    });
    beliLahanBtn.addEventListener('click', beliLahan);
}

function playMineSound() {
    if (selectedSoundId === 'none') return; // tidak ada suara

    const sound = soundOptions.find(s => s.id === selectedSoundId);
    if (!sound || !sound.path) return;

    try {
        const audio = new Audio(sound.path);
        audio.volume = 0.3;
        audio.play().catch(e => {
            console.log('Audio tidak bisa diputar:', e);
        });
    } catch (e) {
        console.log('Error memuat audio:', e);
    }
}

function playUpgradeSound() {
    try {
        const audio = new Audio(PATH_AUDIO_UPGRADE);
        audio.volume = 0.3; // volume 30%
        audio.play().catch(e => {
            console.log('Audio upgrade tidak bisa diputar:', e);
        });
    } catch (e) {
        console.log('Error memuat audio upgrade:', e);
    }
}

// Fungsi menambang
function handleMine() {
    playMineSound();

    // Animasi gambar
    characterImg.src = PATH_KARAKTER_PUKUL;
    setTimeout(() => {
        characterImg.src = PATH_KARAKTER_DIAM;
    }, 150);

    // Hitung total gold dari semua lahan
    let totalKlik = 0;
    lahan.forEach(l => {
        if (l.id === 0) {
            totalKlik += l.level * l.multiplier;
        } else {
            totalKlik += l.level;
        }
    });
    gold += totalKlik;
    updateUI();
    cekDrama();
    saveGame();
}

// Update tampilan gold dan lahan
function updateUI() {
    goldSpan.textContent = Math.floor(gold); // tampilkan integer
    renderLahan();
    // Cek apakah bisa beli lahan baru
    const lahanTerakhir = lahan[lahan.length - 1];
    if (lahanTerakhir.level >= 10 && gold >= 1000) {
        beliLahanBtn.disabled = false;
    } else {
        beliLahanBtn.disabled = true;
    }
}

// Render semua lahan
function renderLahan() {
    lahanContainer.innerHTML = '';
    lahan.forEach((l, index) => {
        const goldPerKlik = l.id === 0 ? l.level * l.multiplier : l.level;
        const card = document.createElement('div');
        card.className = 'lahan-card';
        card.innerHTML = `
            <div class="lahan-header">
                <span>Lahan ${index + 1} ${index === 0 ? '(Utama)' : ''}</span>
                <span class="lahan-level">Level ${l.level}/10</span>
            </div>
            <div class="lahan-gold-per-click">💰 ${goldPerKlik.toFixed(1)} gold/klik</div>
            <button class="lahan-upgrade-btn" data-id="${l.id}" ${l.level >= 10 ? 'disabled' : ''}>
                Upgrade (${hargaUpgrade(l)} gold)
            </button>
        `;
        lahanContainer.appendChild(card);
    });

    // Tambah event listener ke tombol upgrade
    document.querySelectorAll('.lahan-upgrade-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            upgradeLahan(id);
        });
    });
}

// Hitung harga upgrade berdasarkan level
function hargaUpgrade(lahan) {
    return lahan.level * 100; // level 1 -> 100, level 2 -> 200, dst
}

// Upgrade lahan
function upgradeLahan(id) {
    const lahanTarget = lahan.find(l => l.id === id);
    if (!lahanTarget) return;
    const harga = hargaUpgrade(lahanTarget);
    if (gold >= harga && lahanTarget.level < 10) {
        gold -= harga;
        lahanTarget.level++;
        playUpgradeSound();
        updateUI();
        saveGame();
    }
}

// Beli lahan baru
function beliLahan() {
    const lahanTerakhir = lahan[lahan.length - 1];
    if (lahanTerakhir.level >= 10 && gold >= 1000) {
        gold -= 1000;
        const idBaru = lahan.length; // id unik
        lahan.push({ id: idBaru, level: 1, baseHargaUpgrade: 100, multiplier: 1 });
        updateUI();
        saveGame();
    }
}

// Cek apakah drama harus muncul
function cekDrama() {
    if (!dramaFlags.drama1 && gold >= 100) {
        showDrama1();
    } else if (!dramaFlags.drama2 && gold >= 1000) {
        showDrama2();
    } else if (!dramaFlags.drama3 && gold >= 1500) {
        showDrama3();
    } else if (!dramaFlags.drama4 && gold >= 3000 && dramaFlags.drama3) {
        showDrama4();
    }
}

// Drama 1
function showDrama1() {
    modalFoto.src = PATH_ACTOR_KOKI;
    modalNama.textContent = 'fachrur koki';
    modalDialog.textContent = 'hallo, saya adalah koki di pertambangan anda, saya ingin memberitahu bahwa makanan sudah siap, dan bisa di makan saat sudah istirahat nanti';
    modalOptions.innerHTML = `<button class="modal-btn" id="drama1-ok">OK</button>`;
    modal.classList.remove('hidden');

    document.getElementById('drama1-ok').addEventListener('click', () => {
        // Bonus multiplier lahan 1 menjadi 1.5
        lahan[0].multiplier = 1.5;
        dramaFlags.drama1 = true;
        modal.classList.add('hidden');
        updateUI();
        saveGame();
    });
}

// Drama 2
function showDrama2() {
    modalFoto.src = PATH_ACTOR_POLISI;
    modalNama.textContent = 'fachrur polisi';
    modalDialog.textContent = 'permisi, saya dari kepolisian pasir awi, saya menerima laporan dari warga setempat, bahwa ada tambang ilegal disini, karena sudah terbukti bahwa ini tambang illegal, terpaksa akan kami tutup! jika ingin tambang ini berlanjut, pihak kalian harus bayar denda sebanyak 500 gold!, dan operasional akan di awasi oleh kami!';
    modalOptions.innerHTML = `
        <button class="modal-btn" id="drama2-bayar">Bayar 500 Gold</button>
        <button class="modal-btn secondary" id="drama2-tolak">Tolak</button>
    `;
    modal.classList.remove('hidden');

    document.getElementById('drama2-bayar').addEventListener('click', () => {
        if (gold >= 500) {
            gold -= 500;
            lahan[0].multiplier = 1; // reset multiplier ke 1
            dramaFlags.drama2 = true;
            modal.classList.add('hidden');
            updateUI();
            saveGame();
        } else {
            alert('Gold tidak cukup!'); // seharusnya tidak terjadi karena cek di awal, tapi antisipasi
        }
    });

    document.getElementById('drama2-tolak').addEventListener('click', () => {
        // Tanya konfirmasi
        if (confirm('Yakin? Anda harus mulai dari awal, karena anda harus pindah ke lokasi yang baru... Y/N')) {
            resetGame();
            modal.classList.add('hidden');
        }
    });
}

// Drama 3
function showDrama3() {
    modalFoto.src = PATH_ACTOR_POLISI;
    modalNama.textContent = 'fachrur polisi';
    modalDialog.textContent = 'baik selama pengawasan kami, tidak ada kejanggalan dan bukti bahwa tambang ini ilegal, kami akan selesaikan pengawasan ini.';
    modalOptions.innerHTML = `<button class="modal-btn" id="drama3-ok">OK</button>`;
    modal.classList.remove('hidden');

    document.getElementById('drama3-ok').addEventListener('click', () => {
        lahan[0].multiplier = 2; // multiplier menjadi 2
        dramaFlags.drama3 = true;
        modal.classList.add('hidden');
        updateUI();
        saveGame();
    });
}

// Drama 4 - Ahli Geologi
function showDrama4() {
    modalFoto.src = PATH_ACTOR_GEOLOG;
    modalNama.textContent = 'fachrur ahli geologi';
    modalDialog.textContent = 'Selamat! Saya menemukan urat emas besar di kedalaman lahan Anda. Tapi perlu dana untuk eksplorasi lebih lanjut.';
    modalOptions.innerHTML = `
        <button class="modal-btn" id="drama4-lahan">Investasi 1500 gold (Lahan baru gratis)</button>
        <button class="modal-btn" id="drama4-upgrade">Investasi 1500 gold (Upgrade lahan tertinggi +2 level)</button>
        <button class="modal-btn secondary" id="drama4-tolak">Tolak</button>
    `;
    modal.classList.remove('hidden');

    // Opsi 1: Lahan baru gratis
    document.getElementById('drama4-lahan').addEventListener('click', () => {
        if (gold >= 1500) {
            gold -= 1500;
            // Tambah lahan baru langsung (tanpa syarat level 10)
            const idBaru = lahan.length;
            lahan.push({ id: idBaru, level: 1, multiplier: 1 });
            dramaFlags.drama4 = true;
            modal.classList.add('hidden');
            updateUI();
            saveGame();
        } else {
            alert('Gold tidak cukup!');
        }
    });

    // Opsi 2: Upgrade lahan tertinggi +2 level (maksimal 10)
    document.getElementById('drama4-upgrade').addEventListener('click', () => {
        if (gold >= 1500) {
            gold -= 1500;
            // Cari lahan dengan level tertinggi
            let lahanTertinggi = lahan.reduce((prev, current) => (prev.level > current.level) ? prev : current);
            lahanTertinggi.level = Math.min(lahanTertinggi.level + 2, 10);
            dramaFlags.drama4 = true;
            modal.classList.add('hidden');
            updateUI();
            saveGame();
        } else {
            alert('Gold tidak cukup!');
        }
    });

    // Opsi 3: Tolak
    document.getElementById('drama4-tolak').addEventListener('click', () => {
        dramaFlags.drama4 = true; // drama tidak muncul lagi
        modal.classList.add('hidden');
        saveGame();
    });
}

function saveGame() {
    const gameState = {
        gold: gold,
        lahan: lahan,
        dramaFlags: dramaFlags,
        selectedSoundId: selectedSoundId // tambahkan
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
}

window.addEventListener('beforeunload', saveGame);

function loadGame() {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
        try {
            const state = JSON.parse(saved);
            gold = state.gold || 0;
            lahan = state.lahan || [{ id: 0, level: 1, multiplier: 1 }];
            lahan = lahan.map(l => ({
                ...l,
                multiplier: l.multiplier !== undefined ? l.multiplier : 1
            }));
            dramaFlags = state.dramaFlags || { drama1: false, drama2: false, drama3: false, drama4: false };
            selectedSoundId = state.selectedSoundId || 'mining1'; // default jika tidak ada
        } catch (e) {
            console.error('Gagal memuat save:', e);
        }
    }
    updateUI();
}

// Reset game ke awal
function resetGame() {
    gold = 0;
    lahan = [{ id: 0, level: 1, multiplier: 1 }];
    dramaFlags = { drama1: false, drama2: false, drama3: false, drama4: false };
    updateUI();
    saveGame();
}

// Jalankan inisialisasi
init();