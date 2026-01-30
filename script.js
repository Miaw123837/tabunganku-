// --- STATE MANAGEMENT ---
let savings = JSON.parse(localStorage.getItem("celenganku_data")) || [];
let activeTab = "active"; // 'active' or 'complete'
let currentId = null; // ID target yang sedang dibuka di detail

// --- UTILITIES ---
const formatIDR = (num) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);

// Konversi gambar ke Base64 agar bisa disimpan di LocalStorage
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

// Hitung estimasi waktu (minggu/hari/bulan)
const calculateEstimation = (remaining, amount, freq) => {
  if (remaining <= 0) return "Tercapai!";
  let periods = Math.ceil(remaining / amount);
  if (freq === "Harian") return `${periods} Hari Lagi`;
  if (freq === "Mingguan") return `${periods} Minggu Lagi`;
  if (freq === "Bulanan") return `${periods} Bulan Lagi`;
  return `${periods} Periode Lagi`;
};

// --- CORE FUNCTIONS ---

// 1. Render Halaman Utama
function renderHome() {
  const list = document.getElementById("savings-list");
  list.innerHTML = "";

  // Filter status
  let filtered = savings.filter((s) => {
    const isComplete = s.collected >= s.goal;
    return activeTab === "complete" ? isComplete : !isComplete;
  });

  // Sorting Logika
  const sortVal = document.getElementById("sort-select").value;
  const order = document.getElementById("order-select").value;

  filtered.sort((a, b) => {
    let valA, valB;
    if (sortVal === "name") {
      valA = a.name.toLowerCase();
      valB = b.name.toLowerCase();
    } else {
      valA = a.goal;
      valB = b.goal;
    }

    if (valA < valB) return order === "asc" ? -1 : 1;
    if (valA > valB) return order === "asc" ? 1 : -1;
    return 0;
  });

  // Generate Cards
  filtered.forEach((item) => {
    const percent = Math.min((item.collected / item.goal) * 100, 100);
    const remaining = item.goal - item.collected;
    const estimation = calculateEstimation(
      remaining,
      item.savingAmount,
      item.frequency,
    );

    // Background gradient untuk progress circle mini
    const gradient = `conic-gradient(var(--primary) ${percent}%, #eee ${percent}%)`;

    const div = document.createElement("div");
    div.className = "card";
    div.onclick = () => openDetail(item.id);
    div.innerHTML = `
            <img src="${item.image || "https://via.placeholder.com/400x200?text=No+Image"}" class="card-image">
            <h3 style="margin:0">${item.name}</h3>
            <div class="card-info">
                <div>
                    <div class="card-price">${formatIDR(item.goal)}</div>
                    <div class="subtext">${formatIDR(item.savingAmount)} / ${item.frequency}</div>
                </div>
                <div class="progress-mini" style="background: ${gradient}">
                    <span>${Math.floor(percent)}%</span>
                </div>
            </div>
            <div class="card-footer">
                Estimation: ${estimation}
            </div>
        `;
    list.appendChild(div);
  });
}

// 2. Buka Halaman Detail
function openDetail(id) {
  currentId = id;
  const item = savings.find((s) => s.id === id);
  if (!item) return;

  // Isi Data ke DOM
  document.getElementById("detail-title").innerText = item.name;
  document.getElementById("detail-img").src =
    item.image || "https://via.placeholder.com/400x200?text=No+Image";
  document.getElementById("detail-goal-amount").innerText = formatIDR(
    item.goal,
  );
  document.getElementById("detail-per-period").innerText =
    `${formatIDR(item.savingAmount)} Per ${item.frequency}`;
  document.getElementById("detail-created").innerText = item.createdDate;

  // Hitung Statisik
  const percent = Math.min((item.collected / item.goal) * 100, 100);
  const remaining = Math.max(0, item.goal - item.collected);

  document.getElementById("detail-progress-circle").style.background =
    `conic-gradient(var(--primary) ${percent}%, #eee ${percent}%)`;
  document.getElementById("detail-percent").innerText =
    `${Math.floor(percent)}%`;

  document.getElementById("detail-estimation").innerText = calculateEstimation(
    remaining,
    item.savingAmount,
    item.frequency,
  );

  document.getElementById("stat-collected").innerText = formatIDR(
    item.collected,
  );
  document.getElementById("stat-remaining").innerText = formatIDR(remaining);

  // Reminder State
  document.getElementById("reminder-toggle").checked = item.reminderOn || false;

  // Render History
  const historyList = document.getElementById("history-list");
  historyList.innerHTML = "";

  // Sort history terbaru diatas
  const reversedHistory = [...item.history].reverse();

  reversedHistory.forEach((h) => {
    const div = document.createElement("div");
    div.className = "history-item";
    const colorClass = h.type === "add" ? "text-green" : "text-red";
    const sign = h.type === "add" ? "+" : "-";
    div.innerHTML = `
            <div class="history-date">${h.date}</div>
            <div class="${colorClass}" style="font-weight:600">${sign} ${formatIDR(h.amount)}</div>
        `;
    historyList.appendChild(div);
  });

  // Switch View
  document.getElementById("home-view").classList.remove("active");
  document.getElementById("detail-view").classList.add("active");
  window.scrollTo(0, 0);
}

// 3. Tambah Target Baru
document.getElementById("form-target").addEventListener("submit", async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById("inp-image");
  let imgBase64 = "";
  if (fileInput.files.length > 0) {
    imgBase64 = await toBase64(fileInput.files[0]);
  }

  const newItem = {
    id: Date.now(),
    name: document.getElementById("inp-name").value,
    image: imgBase64,
    goal: parseInt(document.getElementById("inp-goal").value),
    savingAmount: parseInt(document.getElementById("inp-saving").value),
    frequency: document.getElementById("inp-freq").value,
    collected: 0,
    createdDate: new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    history: [],
    reminderOn: false,
  };

  if (currentId) {
    // Jika Mode Edit
    const index = savings.findIndex((s) => s.id === currentId);
    // Pertahankan data lama yang tidak diubah di form edit sederhana ini
    newItem.collected = savings[index].collected;
    newItem.history = savings[index].history;
    newItem.createdDate = savings[index].createdDate;
    newItem.id = currentId;
    if (!imgBase64) newItem.image = savings[index].image; // Keep old image if no new one
    savings[index] = newItem;
    currentId = null; // reset
  } else {
    savings.push(newItem);
  }

  saveData();
  closeModal("modal-form");
  document.getElementById("form-target").reset();
  renderHome();

  // Jika kita sedang di halaman detail (setelah edit), refresh detailnya
  if (
    !document.getElementById("detail-view").classList.contains("hidden") &&
    currentId
  ) {
    openDetail(newItem.id);
  }
});

// 4. Proses Transaksi (Nabung/Tarik)
function processTransaction(type) {
  const amount = parseInt(document.getElementById("trans-amount").value);
  if (!amount || amount <= 0) return alert("Masukkan nominal valid");

  const index = savings.findIndex((s) => s.id === currentId);
  if (index === -1) return;

  if (type === "nabung") {
    savings[index].collected += amount;
    savings[index].history.push({
      date: new Date().toLocaleString("id-ID"),
      amount: amount,
      type: "add",
    });
  } else {
    if (savings[index].collected < amount) return alert("Saldo tidak cukup!");
    savings[index].collected -= amount;
    savings[index].history.push({
      date: new Date().toLocaleString("id-ID"),
      amount: amount,
      type: "subtract",
    });
  }

  saveData();
  closeModal("modal-transaction");
  document.getElementById("form-transaction").reset();
  openDetail(currentId); // Refresh halaman detail
}

// 5. Delete & Edit Helpers
function deleteCurrentTarget() {
  if (confirm("Yakin ingin menghapus target ini?")) {
    savings = savings.filter((s) => s.id !== currentId);
    saveData();
    goHome();
  }
}

function editCurrentTarget() {
  const item = savings.find((s) => s.id === currentId);
  if (!item) return;

  document.getElementById("inp-name").value = item.name;
  document.getElementById("inp-goal").value = item.goal;
  document.getElementById("inp-saving").value = item.savingAmount;
  document.getElementById("inp-freq").value = item.frequency;

  // Trick: Set currentId globally so submit form knows it's edit mode
  // Note: Form submit handler handles logic based on currentId presence but we need to manage logic carefully
  // Untuk simplifikasi: Edit mode menggunakan form yang sama
  openModal("modal-form");
}

// --- NAVIGATION & UI HELPERS ---
function setTab(tab) {
  activeTab = tab;
  document
    .querySelectorAll(".tab-item")
    .forEach((el) => el.classList.remove("active"));
  event.target.classList.add("active");

  // Animasi garis
  const indicator = document.querySelector(".tab-indicator");
  indicator.style.left = tab === "active" ? "0" : "50%";

  renderHome();
}

function goHome() {
  document.getElementById("detail-view").classList.remove("active");
  document.getElementById("home-view").classList.add("active");
  currentId = null;
  renderHome();
}

function openModal(id) {
  document.getElementById(id).style.display = "flex";
}
function closeModal(id) {
  document.getElementById(id).style.display = "none";
}
function saveData() {
  localStorage.setItem("celenganku_data", JSON.stringify(savings));
}

// Dark Mode Toggle
document.getElementById("theme-btn").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// Listener untuk Reminder Toggle (Simulasi Simpan State)
document.getElementById("reminder-toggle").addEventListener("change", (e) => {
  const index = savings.findIndex((s) => s.id === currentId);
  if (index !== -1) {
    savings[index].reminderOn = e.target.checked;
    saveData();
  }
});

// Init
renderHome();
