const API_URL = (() => {
  const params = new URLSearchParams(window.location.search);
  const api = params.get('api');
  if (api) return api.replace(/\/+$/, '');
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }
  return '';
})();
const rewards = [
  { id: 1, label: "Prêmio 1", img: "./premio-1.png", weight: 40 },
  { id: 2, label: "Prêmio 2", img: "./premio-2.png", weight: 25 },
  { id: 3, label: "Prêmio 3", img: "./premio-3.png", weight: 12 },
  { id: 4, label: "Prêmio 4", img: "./premio-4.png", weight: 2 },
  { id: 5, label: "Prêmio 5", img: "./premio-5.png", weight: 2 },
  { id: 6, label: "Prêmio 6", img: "./premio-6.png", weight: 10 },
  { id: 7, label: "Prêmio 7", img: "./premio-7.png", weight: 7 },
  { id: 8, label: "Prêmio 8", img: "./premio-8.png", weight: 2 },
];

const SPIN_COST = 2;
let balance = 0;

const wheel = document.getElementById("wheel");
const prizeList = document.getElementById("prizeList");
const result = document.getElementById("result");
const spinButton = document.getElementById("spinButton");
const winModal = document.getElementById("winModal");
const winLabel = document.getElementById("winLabel");
const winImage = document.getElementById("winImage");
const closeWin = document.getElementById("closeWin");
const confetti = document.getElementById("confetti");
const balanceEl = document.getElementById("balance");
const pointerImg = document.querySelector(".pointer");
if (pointerImg) {
  pointerImg.onerror = () => {
    pointerImg.style.display = "none";
  };
}

const openDeposit = document.getElementById("openDeposit");
const depositModal = document.getElementById("depositModal");
const closeDeposit = document.getElementById("closeDeposit");

const generateBtn = document.getElementById("generate");
const plansContainer = document.getElementById("plans");
const selectedAmount = document.getElementById("selectedAmount");
const selectedBonus = document.getElementById("selectedBonus");
const selectedTotal = document.getElementById("selectedTotal");
const pixResult = document.getElementById("pixResult");
const qrImage = document.getElementById("qrImage");
const qrText = document.getElementById("qrText");
const copyBtn = document.getElementById("copyPix");
const errorBox = document.getElementById("error");

const bonusMap = { 10: 0, 30: 10, 50: 30, 100: 50 };
const planValues = [10, 30, 50, 100];
let currentAmount = 10;
let rotation = 0;
let spinning = false;
let assetWarningEl = null;

function setBalance(value) {
  balance = value;
  if (balanceEl) {
    balanceEl.textContent = `R$ ${balance.toFixed(2)}`.replace(".", ",");
  }
}

setBalance(0);

function showAssetWarning(missing) {
  if (!missing.length) return;
  if (!assetWarningEl) {
    assetWarningEl = document.createElement("div");
    assetWarningEl.className = "asset-warning";
    const container = document.querySelector(".container");
    if (container) {
      container.insertBefore(assetWarningEl, container.firstChild);
    }
  }
  assetWarningEl.textContent =
    "Algumas imagens não foram encontradas: " +
    missing.join(", ") +
    ". Envie todos os arquivos para a raiz do site.";
}

function checkAssets() {
  const assets = [
    { name: "bg.png", src: "./bg.png" },
    { name: "cover.webp", src: "./cover.webp" },
    { name: "pointer.webp", src: "./pointer.webp" },
    { name: "premio-1.png", src: "./premio-1.png" },
    { name: "premio-2.png", src: "./premio-2.png" },
    { name: "premio-3.png", src: "./premio-3.png" },
    { name: "premio-4.png", src: "./premio-4.png" },
    { name: "premio-5.png", src: "./premio-5.png" },
    { name: "premio-6.png", src: "./premio-6.png" },
    { name: "premio-7.png", src: "./premio-7.png" },
    { name: "premio-8.png", src: "./premio-8.png" },
  ];
  const missing = new Set();
  let pending = assets.length;
  assets.forEach((asset) => {
    const img = new Image();
    img.onload = () => {
      pending -= 1;
      if (pending === 0) showAssetWarning([...missing]);
    };
    img.onerror = () => {
      missing.add(asset.name);
      pending -= 1;
      if (pending === 0) showAssetWarning([...missing]);
    };
    const bust = `?v=${Date.now()}`;
    img.src = `${asset.src}${bust}`;
  });
}

function validateCustomer(customer) {
  if (!customer.name || !customer.email || !customer.document || !customer.phone) {
    return "Preencha nome, e-mail, CPF e telefone.";
  }
  return "";
}

function setAmount(amount) {
  currentAmount = amount;
  const bonus = bonusMap[amount] || 0;
  selectedAmount.textContent = amount.toFixed(0);
  selectedBonus.textContent = bonus.toFixed(0);
  selectedTotal.textContent = (amount + bonus).toFixed(0);
  document.querySelectorAll(".plan-btn").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.amount) === amount);
  });
}

function buildPlans() {
  plansContainer.innerHTML = "";
  planValues.forEach((value) => {
    const btn = document.createElement("button");
    btn.className = "plan-btn";
    btn.dataset.amount = value;
    btn.textContent = `R$ ${value}${bonusMap[value] ? ` (+ R$ ${bonusMap[value]} bônus)` : ""}`;
    btn.addEventListener("click", () => setAmount(value));
    plansContainer.appendChild(btn);
  });
  setAmount(currentAmount);
}

function sliceClip(startDeg, endDeg) {
  const toPoint = (deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    const x = 50 + 50 * Math.cos(rad);
    const y = 50 + 50 * Math.sin(rad);
    return `${x}% ${y}%`;
  };
  return `polygon(50% 50%, ${toPoint(startDeg)}, ${toPoint(endDeg)})`;
}

function sliceBgPosition(midDeg) {
  const rad = ((midDeg - 90) * Math.PI) / 180;
  const x = 50 + 22 * Math.cos(rad);
  const y = 50 + 22 * Math.sin(rad);
  return `${x}% ${y}%`;
}

function buildWheel() {
  const segments = rewards.length;
  const segmentAngle = 360 / segments;
  const colors = ["#4c1d1d", "#5b1f1f", "#3b0f0f", "#5f1a1a"];
  const gradientStops = rewards.map((_, idx) => {
    const start = idx * segmentAngle;
    const end = start + segmentAngle;
    const color = colors[idx % colors.length];
    return `${color} ${start}deg ${end}deg`;
  });
  wheel.style.backgroundImage = `conic-gradient(${gradientStops.join(",")}), repeating-conic-gradient(from 0deg, transparent 0deg, transparent calc(${segmentAngle}deg - 2deg), rgba(255, 215, 128, 0.9) calc(${segmentAngle}deg - 2deg), rgba(255, 215, 128, 0.9) ${segmentAngle}deg)`;

  rewards.forEach((reward, idx) => {
    const start = idx * segmentAngle;
    const end = start + segmentAngle;
    const mid = start + segmentAngle / 2;

    const slice = document.createElement("div");
    slice.className = "wheel-slice";
    slice.style.clipPath = sliceClip(start, end);
    slice.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 80%), url(${reward.img})`;
    slice.style.backgroundPosition = sliceBgPosition(mid);

    const text = document.createElement("div");
    text.className = "reward-text";
    text.style.transform = `rotate(${mid}deg) translate(0, -145px) rotate(90deg)`;
    text.textContent = reward.label;

    wheel.appendChild(slice);
    wheel.appendChild(text);
  });
}

function buildPrizeList() {
  prizeList.innerHTML = "";
  rewards.forEach((reward, idx) => {
    const card = document.createElement("div");
    card.className = "prize-card";
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = `#${idx + 1}`;

    const img = document.createElement("img");
    img.src = reward.img;
    img.alt = reward.label;
    img.onerror = () => {
      img.style.display = "none";
    };

    const title = document.createElement("span");
    title.textContent = reward.label;

    card.appendChild(label);
    card.appendChild(img);
    card.appendChild(title);
    prizeList.appendChild(card);
  });
}

function pickReward() {
  const total = rewards.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * total;
  for (const reward of rewards) {
    roll -= reward.weight;
    if (roll <= 0) return reward;
  }
  return rewards[0];
}

function spin() {
  if (spinning) return;

  if (balance < SPIN_COST) {
    result.textContent = "Saldo insuficiente";
    return;
  }

  spinning = true;
  balance -= SPIN_COST;
  setBalance(balance);

  const reward = pickReward();
  const segments = rewards.length;
  const segmentAngle = 360 / segments;
  const index = rewards.findIndex((r) => r.id === reward.id);
  const targetAngle = 360 - (index * segmentAngle + segmentAngle / 2);
  rotation += 360 * 3 + targetAngle;

  wheel.style.transform = `rotate(${rotation}deg)`;
  result.textContent = "";

  setTimeout(() => {
    spinning = false;
    result.textContent = `Resultado: ${reward.label}`;
    winLabel.textContent = reward.label;
    winImage.src = reward.img;
    openWin();
  }, 4200);
}

function openWin() {
  confetti.innerHTML = "";
  for (let i = 0; i < 24; i += 1) {
    const span = document.createElement("span");
    span.style.setProperty("--i", i);
    confetti.appendChild(span);
  }
  winModal.classList.remove("hidden");
}

function closeWinModal() {
  winModal.classList.add("hidden");
}

async function generatePix() {
  errorBox.classList.add("hidden");
  pixResult.classList.add("hidden");
  pixResult.style.display = "none";

  const payload = {
    amount: currentAmount,
    customer: {
      name: document.getElementById("name").value.trim() || "Visitante",
      email: document.getElementById("email").value.trim(),
      document: document.getElementById("cpf").value.trim(),
      phone: document.getElementById("phone").value.trim(),
    },
  };

  const validationError = validateCustomer(payload.customer);
  if (validationError) {
    errorBox.textContent = validationError;
    errorBox.classList.remove("hidden");
    return;
  }

  try {
    const endpoint = API_URL ? `${API_URL}/api/payments/deposit` : "/api/payments/deposit";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!res.ok) {
      const detail = data.detail ? `: ${data.detail}` : "";
      const errMsg = data.error ? `${data.error}${detail}` : (text || `Erro ${res.status}`);
      throw new Error(errMsg);
    }

    qrImage.src = data.qrCode || "";
    qrText.value = data.qrCodeText || "";
    pixResult.classList.remove("hidden");
    pixResult.style.display = "block";
  } catch (err) {
    const msg = err && err.message ? err.message : "Erro ao gerar PIX";
    if (/failed to fetch/i.test(msg)) {
      errorBox.textContent = "Servidor de pagamento indisponível. Verifique a URL da API.";
    } else {
      errorBox.textContent = msg;
    }
    errorBox.classList.remove("hidden");
  }
}

async function copyPix() {
  if (!qrText.value) return;
  try {
    await navigator.clipboard.writeText(qrText.value);
    copyBtn.textContent = "Copiado!";
    setTimeout(() => (copyBtn.textContent = "Copiar código PIX"), 1500);
  } catch {
    copyBtn.textContent = "Não foi possível copiar";
    setTimeout(() => (copyBtn.textContent = "Copiar código PIX"), 1500);
  }
}

openDeposit.addEventListener("click", () => {
  depositModal.classList.remove("hidden");
  pixResult.classList.add("hidden");
  pixResult.style.display = "none";
  qrImage.src = "";
  qrText.value = "";
  errorBox.classList.add("hidden");
});
closeDeposit.addEventListener("click", () => depositModal.classList.add("hidden"));
spinButton.addEventListener("click", spin);
closeWin.addEventListener("click", closeWinModal);

buildPlans();
buildWheel();
buildPrizeList();
checkAssets();

generateBtn.addEventListener("click", generatePix);
copyBtn.addEventListener("click", copyPix);
