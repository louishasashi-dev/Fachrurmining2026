// State game
let gold = 0;
let lahan = [
  { id: 0, level: 1, baseHargaUpgrade: 100, multiplier: 1 }, // lahan 0 (utama) dengan multiplier drama
];

let lockUntil = 0;
let pendingMultiplier = 0;

let dramaFlags = {
  drama1: false,
  drama2: false,
  drama3: false,
  drama4: false,
  drama5: false,
  drama6: false,
};

let bonusChanceEndTime = 0;

// Autoclick
let autoClickActive = false;
let autoClickInterval = null;
let lastAutoClickDisableTime = 0;
const AUTO_CLICK_COOLDOWN = 30000;

// Referensi elemen DOM
const goldSpan = document.getElementById("gold-amount");
const characterImg = document.getElementById("character-img");
const lahanContainer = document.getElementById("lahan-container");
const beliLahanBtn = document.getElementById("beli-lahan-btn");
const modal = document.getElementById("drama-modal");
const modalFoto = document.getElementById("modal-foto");
const modalNama = document.getElementById("modal-nama");
const modalDialog = document.getElementById("modal-dialog");
const modalOptions = document.getElementById("modal-options");
const SAVE_KEY = "fachrurMiningSave";

// Path gambar (sesuaikan jika perlu)
const PATH_KARAKTER_DIAM =
  "assets/image/karakter/fachrur_animate_1-removebg-preview.png";
const PATH_KARAKTER_PUKUL =
  "assets/image/karakter/fachrur_animate_2-removebg-preview.png";
const PATH_ACTOR_KOKI = "assets/image/actor/koki.png";
const PATH_ACTOR_POLISI = "assets/image/actor/polisi.png";
const PATH_ACTOR_GEOLOG = "assets/image/actor/ahligeologi.png";
const PATH_ACTOR_KESEHATAN = "assets/image/actor/kesehatan.png";
const PATH_ACTOR_TENTARA = "assets/image/actor/tentara.png";
const PATH_AUDIO_MINE = "assets/sound/miningklik.mp3";
const PATH_AUDIO_UPGRADE = "assets/sound/upradgelahan.mp3";

// Daftar sound mining yang tersedia
const soundOptions = [
  { id: "none", name: "Tidak Ada Suara", path: null },
  { id: "mining1", name: "Vine Boom", path: "assets/sound/miningklik.mp3" },
  { id: "mining2", name: "BabaBoey", path: "assets/sound/miningklik2.mp3" },
  { id: "mining3", name: "Faaahh!!", path: "assets/sound/miningklik3.mp3" },
  { id: "mining4", name: "uh", path: "assets/sound/retapansolo1.mp3" },
  // Tambahkan sound baru di sini dengan format yang sama
  // Contoh: { id: 'mining4', name: 'Suara Palu', path: 'assets/sound/palu.mp3' }
];

// Pilihan sound saat ini, default ke 'mining1' (pastikan file ada)
let selectedSoundId = "mining1";

function toggleAutoClick() {
  const now = Date.now();
  const btn = document.getElementById("autoclick-btn");

  if (autoClickActive) {
    // Matikan autoclick
    stopAutoClick();
    lastAutoClickDisableTime = now;
    btn.textContent = "⏯️ Auto: OFF";
    btn.classList.remove("active");
    btn.disabled = true; // disable sementara selama cooldown

    // Aktifkan kembali setelah cooldown
    setTimeout(() => {
      btn.disabled = false;
    }, AUTO_CLICK_COOLDOWN);
  } else {
    // Cek cooldown
    if (now - lastAutoClickDisableTime < AUTO_CLICK_COOLDOWN) {
      const remaining = Math.ceil(
        (AUTO_CLICK_COOLDOWN - (now - lastAutoClickDisableTime)) / 1000,
      );
      alert(`⏳ Cooldown! Tunggu ${remaining} detik lagi.`);
      return;
    }
    // Aktifkan autoclick
    startAutoClick();
    btn.textContent = "⏸️ Auto: ON";
    btn.classList.add("active");
    btn.disabled = false;
  }
}

function startAutoClick() {
  if (autoClickActive) return;
  autoClickActive = true;
  // Panggil handleMine setiap 1 detik
  autoClickInterval = setInterval(() => {
    handleMine();
  }, 1000);
}

function stopAutoClick() {
  if (autoClickInterval) {
    clearInterval(autoClickInterval);
    autoClickInterval = null;
  }
  autoClickActive = false;
}

function init() {
  loadGame();
  updateUI();

  // Isi dropdown sound
  const soundSelect = document.getElementById("sound-select");
  if (soundSelect) {
    // Kosongkan dulu
    soundSelect.innerHTML = "";
    soundOptions.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option.id;
      opt.textContent = option.name;
      if (option.id === selectedSoundId) opt.selected = true;
      soundSelect.appendChild(opt);
    });

    const autoBtn = document.getElementById("autoclick-btn");
    autoBtn.addEventListener("click", toggleAutoClick);

    document.getElementById("reset-game-btn").addEventListener("click", () => {
      if (
        confirm(
          "Apakah Anda yakin ingin mereset game? Semua kemajuan akan hilang!",
        )
      ) {
        resetGame();
      }
    });

    soundSelect.addEventListener("change", (e) => {
      selectedSoundId = e.target.value;
      saveGame(); // simpan perubahan
    });
  }

  // Event listener untuk klik/tap pada karakter
  characterImg.addEventListener("click", handleMine);
  characterImg.addEventListener("touchstart", (e) => {
    e.preventDefault();
    handleMine();
  });
  beliLahanBtn.addEventListener("click", beliLahan);
}

function playMineSound() {
  if (selectedSoundId === "none") return; // tidak ada suara

  const sound = soundOptions.find((s) => s.id === selectedSoundId);
  if (!sound || !sound.path) return;

  try {
    const audio = new Audio(sound.path);
    audio.volume = 0.3;
    audio.play().catch((e) => {
      console.log("Audio tidak bisa diputar:", e);
    });
  } catch (e) {
    console.log("Error memuat audio:", e);
  }
}

function playUpgradeSound() {
  try {
    const audio = new Audio(PATH_AUDIO_UPGRADE);
    audio.volume = 0.3; // volume 30%
    audio.play().catch((e) => {
      console.log("Audio upgrade tidak bisa diputar:", e);
    });
  } catch (e) {
    console.log("Error memuat audio upgrade:", e);
  }
}

// Fungsi menambang
function handleMine() {
  const now = Date.now();

  // Cek apakah sedang dalam masa lock
  if (lockUntil > now) {
    alert(
      "⛔ Tambang sedang ditutup sementara! (masih " +
        Math.ceil((lockUntil - now) / 1000) +
        " detik)",
    );
    return; // hentikan mining
  }

  if (bonusChanceEndTime > now && Math.random() < 0.1) {
    // 10% chance
    gold += 50;
    // Tampilkan notifikasi kecil (opsional)
    showFloatingText("💥 Bonus 50 gold!");
  }

  // Jika lock sudah lewat dan ada pending multiplier, berikan
  if (lockUntil !== 0 && lockUntil <= now && pendingMultiplier > 0) {
    lahan[0].multiplier += pendingMultiplier;
    pendingMultiplier = 0;
    lockUntil = 0;
    alert("✅ Penutupan selesai! Lingkungan lebih bersih, multiplier +0.5");
  }

  playMineSound();

  // Animasi gambar
  characterImg.src = PATH_KARAKTER_PUKUL;
  setTimeout(() => {
    characterImg.src = PATH_KARAKTER_DIAM;
  }, 150);

  // Hitung total gold
  let totalKlik = 0;
  lahan.forEach((l) => {
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
  lahanContainer.innerHTML = "";
  lahan.forEach((l, index) => {
    const goldPerKlik = l.id === 0 ? l.level * l.multiplier : l.level;
    const card = document.createElement("div");
    card.className = "lahan-card";
    card.innerHTML = `
            <div class="lahan-header">
                <span>Lahan ${index + 1} ${index === 0 ? "(Utama)" : ""}</span>
                <span class="lahan-level">Level ${l.level}/10</span>
            </div>
            <div class="lahan-gold-per-click">💰 ${goldPerKlik.toFixed(1)} gold/klik</div>
            <button class="lahan-upgrade-btn" data-id="${l.id}" ${l.level >= 10 ? "disabled" : ""}>
                Upgrade (${hargaUpgrade(l)} gold)
            </button>
        `;
    lahanContainer.appendChild(card);
  });

  // Tambah event listener ke tombol upgrade
  document.querySelectorAll(".lahan-upgrade-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
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
  const lahanTarget = lahan.find((l) => l.id === id);
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
  } else if (!dramaFlags.drama5 && gold >= 4000 && dramaFlags.drama4) {
    showDrama5();
  } else if (!dramaFlags.drama6 && gold >= 6000 && dramaFlags.drama5) {
    showDrama6();
  }
}

// Drama 1
function showDrama1() {
  modalFoto.src = PATH_ACTOR_KOKI;
  modalNama.textContent = "fachrur koki";
  modalDialog.textContent =
    "hallo, saya adalah koki di pertambangan anda, saya ingin memberitahu bahwa makanan sudah siap, dan bisa di makan saat sudah istirahat nanti";
  modalOptions.innerHTML = `<button class="modal-btn" id="drama1-ok">OK</button>`;
  modal.classList.remove("hidden");

  document.getElementById("drama1-ok").addEventListener("click", () => {
    // Bonus multiplier lahan 1 menjadi 1.5
    lahan[0].multiplier = 1.5;
    dramaFlags.drama1 = true;
    modal.classList.add("hidden");
    updateUI();
    saveGame();
  });
}

// Drama 2
function showDrama2() {
  modalFoto.src = PATH_ACTOR_POLISI;
  modalNama.textContent = "fachrur polisi";
  modalDialog.textContent =
    "permisi, saya dari kepolisian pasir awi, saya menerima laporan dari warga setempat, bahwa ada tambang ilegal disini, karena sudah terbukti bahwa ini tambang illegal, terpaksa akan kami tutup! jika ingin tambang ini berlanjut, pihak kalian harus bayar denda sebanyak 500 gold!, dan operasional akan di awasi oleh kami!";
  modalOptions.innerHTML = `
        <button class="modal-btn" id="drama2-bayar">Bayar 500 Gold</button>
        <button class="modal-btn secondary" id="drama2-tolak">Tolak</button>
    `;
  modal.classList.remove("hidden");

  document.getElementById("drama2-bayar").addEventListener("click", () => {
    if (gold >= 500) {
      gold -= 500;
      lahan[0].multiplier = 1; // reset multiplier ke 1
      dramaFlags.drama2 = true;
      modal.classList.add("hidden");
      updateUI();
      saveGame();
    } else {
      alert("Gold tidak cukup!"); // seharusnya tidak terjadi karena cek di awal, tapi antisipasi
    }
  });

  document.getElementById("drama2-tolak").addEventListener("click", () => {
    // Tanya konfirmasi
    if (
      confirm(
        "Yakin? Anda harus mulai dari awal, karena anda harus pindah ke lokasi yang baru... Y/N",
      )
    ) {
      resetGame();
      modal.classList.add("hidden");
    }
  });
}

// Drama 3
function showDrama3() {
  modalFoto.src = PATH_ACTOR_POLISI;
  modalNama.textContent = "fachrur polisi";
  modalDialog.textContent =
    "baik selama pengawasan kami, tidak ada kejanggalan dan bukti bahwa tambang ini ilegal, kami akan selesaikan pengawasan ini.";
  modalOptions.innerHTML = `<button class="modal-btn" id="drama3-ok">OK</button>`;
  modal.classList.remove("hidden");

  document.getElementById("drama3-ok").addEventListener("click", () => {
    lahan[0].multiplier = 2; // multiplier menjadi 2
    dramaFlags.drama3 = true;
    modal.classList.add("hidden");
    updateUI();
    saveGame();
  });
}

// Drama 4 - Ahli Geologi
function showDrama4() {
  modalFoto.src = PATH_ACTOR_GEOLOG;
  modalNama.textContent = "fachrur ahli geologi";
  modalDialog.textContent =
    "Selamat! Saya menemukan urat emas besar di kedalaman lahan Anda. Tapi perlu dana untuk eksplorasi lebih lanjut.";
  modalOptions.innerHTML = `
        <button class="modal-btn" id="drama4-lahan">Investasi 1500 gold (Lahan baru gratis)</button>
        <button class="modal-btn" id="drama4-upgrade">Investasi 1500 gold (Upgrade lahan tertinggi +2 level)</button>
        <button class="modal-btn secondary" id="drama4-tolak">Tolak</button>
    `;
  modal.classList.remove("hidden");

  // Opsi 1: Lahan baru gratis
  document.getElementById("drama4-lahan").addEventListener("click", () => {
    if (gold >= 1500) {
      gold -= 1500;
      // Tambah lahan baru langsung (tanpa syarat level 10)
      const idBaru = lahan.length;
      lahan.push({ id: idBaru, level: 1, multiplier: 1 });
      dramaFlags.drama4 = true;
      modal.classList.add("hidden");
      updateUI();
      saveGame();
    } else {
      alert("Gold tidak cukup!");
    }
  });

  // Opsi 2: Upgrade lahan tertinggi +2 level (maksimal 10)
  document.getElementById("drama4-upgrade").addEventListener("click", () => {
    if (gold >= 1500) {
      gold -= 1500;
      // Cari lahan dengan level tertinggi
      let lahanTertinggi = lahan.reduce((prev, current) =>
        prev.level > current.level ? prev : current,
      );
      lahanTertinggi.level = Math.min(lahanTertinggi.level + 2, 10);
      dramaFlags.drama4 = true;
      modal.classList.add("hidden");
      updateUI();
      saveGame();
    } else {
      alert("Gold tidak cukup!");
    }
  });

  // Opsi 3: Tolak
  document.getElementById("drama4-tolak").addEventListener("click", () => {
    dramaFlags.drama4 = true; // drama tidak muncul lagi
    modal.classList.add("hidden");
    saveGame();
  });
}

// Drama 5 – Inspektur Kesehatan
function showDrama5() {
  modalFoto.src = PATH_ACTOR_KESEHATAN;
  modalNama.textContent = "fachrur petugas kesehatan";
  modalDialog.textContent =
    "Laporan debu tambang melebihi ambang batas! Pekerja bisa sakit. Kami harus tutup sementara atau Anda beli alat pelindung.";
  modalOptions.innerHTML = `
        <button class="modal-btn" id="drama5-beli">Beli alat pelindung (800 gold)</button>
        <button class="modal-btn secondary" id="drama5-tutup">Terima penutupan sementara</button>
    `;
  modal.classList.remove("hidden");

  // Opsi beli alat
  document.getElementById("drama5-beli").addEventListener("click", () => {
    if (gold >= 800) {
      gold -= 800;
      lahan[0].multiplier += 0.3;
      dramaFlags.drama5 = true;
      modal.classList.add("hidden");
      updateUI();
      saveGame();
      alert("🛡️ Alat pelindung terpasang! Multiplier +0.3");
    } else {
      alert("Gold tidak cukup!");
    }
  });

  // Opsi tutup sementara
  document.getElementById("drama5-tutup").addEventListener("click", () => {
    lockUntil = Date.now() + 30000; // 30 detik
    pendingMultiplier = 0.5;
    dramaFlags.drama5 = true;
    modal.classList.add("hidden");
    updateUI();
    saveGame();
    alert("⏳ Tambang ditutup selama 30 detik. Setelah itu, multiplier +0.5");
  });
}

function showDrama6() {
  modalFoto.src = PATH_ACTOR_TENTARA;
  modalNama.textContent = "fachrur komandan tentara";
  modalDialog.textContent =
    "Wilayah tambang ini masuk area latihan militer! Kalau mau tetap beroperasi, ada dua opsi: kerja sama atau kami ambil alih sementara.";
  modalOptions.innerHTML = `
        <button class="modal-btn" id="drama6-kerjasama">Kerja Sama (1200 gold)</button>
        <button class="modal-btn secondary" id="drama6-tolak">Tolak (dampak negatif)</button>
    `;
  modal.classList.remove("hidden");

  // Opsi kerja sama
  document.getElementById("drama6-kerjasama").addEventListener("click", () => {
    if (gold >= 1200) {
      gold -= 1200;
      lahan[0].multiplier += 0.5;
      bonusChanceEndTime = Date.now() + 120000; // 2 menit
      dramaFlags.drama6 = true;
      modal.classList.add("hidden");
      updateUI();
      saveGame();
      alert("🤝 Kerja sama berhasil! Multiplier +0.5 dan bonus 2 menit!");
    } else {
      alert("Gold tidak cukup!");
    }
  });

  // Opsi tolak
  document.getElementById("drama6-tolak").addEventListener("click", () => {
    lockUntil = Date.now() + 45000; // 45 detik
    pendingMultiplier = 0.3; // multiplier setelah lock selesai
    dramaFlags.drama6 = true;
    modal.classList.add("hidden");
    updateUI();
    saveGame();
    alert(
      "⏳ Tambang diambil alih selama 45 detik. Setelah itu, multiplier +0.3",
    );
  });
}

function saveGame() {
  const gameState = {
    gold: gold,
    lahan: lahan,
    dramaFlags: dramaFlags,
    selectedSoundId: selectedSoundId,
    lockUntil: lockUntil,
    pendingMultiplier: pendingMultiplier,
    dramaFlags: dramaFlags,
    bonusChanceEndTime: bonusChanceEndTime,
    autoClickActive: autoClickActive,
    lastAutoClickDisableTime: lastAutoClickDisableTime,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
}

function loadGame() {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    try {
      const state = JSON.parse(saved);
      gold = state.gold || 0;
      lahan = state.lahan || [{ id: 0, level: 1, multiplier: 1 }];
      lahan = lahan.map((l) => ({
        ...l,
        multiplier: l.multiplier !== undefined ? l.multiplier : 1,
      }));
      dramaFlags = state.dramaFlags || {
        drama1: false,
        drama2: false,
        drama3: false,
        drama4: false,
        drama5: false,
      };
      selectedSoundId = state.selectedSoundId || "mining1";
      lockUntil = state.lockUntil || 0;
      pendingMultiplier = state.pendingMultiplier || 0;
      bonusChanceEndTime = state.bonusChanceEndTime || 0;
      autoClickActive = state.autoClickActive || false;
      lastAutoClickDisableTime = state.lastAutoClickDisableTime || 0;
    } catch (e) {
      console.error("Gagal memuat save:", e);
    }
  }
  updateUI();
}

// Reset game ke awal
function resetGame() {
  gold = 0;
  lahan = [{ id: 0, level: 1, multiplier: 1 }];
  dramaFlags = {
    drama1: false,
    drama2: false,
    drama3: false,
    drama4: false,
    drama5: false,
  };
  lockUntil = 0;
  pendingMultiplier = 0;
  bonusChanceEndTime = 0;
  stopAutoClick();
  autoClickActive = false;
  lastAutoClickDisableTime = 0;
  const btn = document.getElementById("autoclick-btn");
  if (btn) {
    btn.textContent = "⏯️ Auto: OFF";
    btn.classList.remove("active");
    btn.disabled = false;
  }
  updateUI();
  saveGame();
}

// Jalankan inisialisasi
init();
