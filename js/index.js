window.addEventListener("scroll", () => {
  document
    .getElementById("mainNav")
    .classList.toggle("scrolled", window.scrollY > 40);
});

function renderHomeBooks() {
  const books = loadBooks();
  const grid = document.getElementById("bookGrid");

  if (books.length === 0) {
    grid.innerHTML =
      '<p style="color:var(--muted); grid-column:1/-1;">Chưa có sách nào được rao bán. Hãy vào <a href="admin.html" style="color:var(--burgundy); font-weight:600;">trang quản trị</a> để đăng sách đầu tiên.</p>';
  } else {
    grid.innerHTML = books.map(renderBookCardHtml).join("");
  }

  document
    .querySelectorAll(".js-total-books")
    .forEach((el) => (el.textContent = books.length));
  document
    .querySelectorAll(".js-total-authors")
    .forEach(
      (el) => (el.textContent = new Set(books.map((b) => b.author)).size),
    );
  document
    .querySelectorAll(".js-available-copies")
    .forEach(
      (el) =>
        (el.textContent = books
          .filter((b) => b.status === "available")
          .reduce((s, b) => s + (Number(b.copies) || 0), 0)),
    );
  document
    .querySelectorAll(".js-out-books")
    .forEach(
      (el) =>
        (el.textContent = books.filter(
          (b) => b.status !== "available",
        ).length),
    );
  document.getElementById("lastUpdatedLabel").textContent =
    getLastUpdatedLabel();
}

// Chỉ tài khoản admin mới thấy các liên kết vào trang quản trị.
// Tài khoản thường (hoặc khách chưa đăng nhập) chỉ có thể xem sách.
function applyRoleVisibility() {
  const admin = isAdmin();
  [
    document.getElementById("navAdminLink"),
    document.getElementById("heroAdminBtn"),
    document.getElementById("footerAdminLink"),
  ].forEach((el) => {
    if (el) el.style.display = admin ? "" : "none";
  });

  const user = getCurrentUser();
  const purchasesLink = document.getElementById("navPurchasesLink");
  if (purchasesLink) purchasesLink.style.display = user ? "" : "none";

  const label = document.getElementById("navUserLabel");
  if (user) {
    label.textContent =
      "Xin chào, " + user.name + (admin ? " (Quản trị)" : "");
    label.style.display = "inline";
  } else {
    label.style.display = "none";
  }
}

// Nút menu (icon burger): đưa tới đăng nhập nếu chưa có phiên,
// hoặc hỏi đăng xuất nếu đã đăng nhập.
function handleNavUserClick() {
  const user = getCurrentUser();
  if (user) {
    if (confirm("Đăng xuất khỏi tài khoản " + user.name + "?")) {
      logout();
      window.location.reload();
    }
  } else {
    window.location.href = "login.html";
  }
}

// ===== Tiện ích phụ: thời tiết (OpenWeatherMap), hiển thị ngay trên nav =====
const OPENWEATHER_API_KEY = "b7f96772f3a9a156ce9ec79725f315ec";

function setNavWeatherText(text){
  const label = document.getElementById("navWeatherLabel");
  if(!label) return;
  label.textContent = text;
  label.style.display = "inline";
}

async function fetchWeatherByCity(city) {
  try {
    const url =
      "https://api.openweathermap.org/data/2.5/weather?q=" +
      encodeURIComponent(city) +
      "&units=metric&lang=vi&appid=" +
      OPENWEATHER_API_KEY;
    const res = await fetch(url);
    const data = await res.json();
    if (String(data.cod) !== "200") {
      setNavWeatherText("Không rõ thời tiết");
      return;
    }
    setNavWeatherText(
      "🌤 " + data.name + " " + Math.round(data.main.temp) + "°C",
    );
  } catch (err) {
    setNavWeatherText("Không thể tải thời tiết");
  }
}

async function fetchWeatherByCoords(lat, lon) {
  try {
    const url =
      "https://api.openweathermap.org/data/2.5/weather?lat=" +
      lat +
      "&lon=" +
      lon +
      "&units=metric&lang=vi&appid=" +
      OPENWEATHER_API_KEY;
    const res = await fetch(url);
    const data = await res.json();
    if (String(data.cod) !== "200") {
      setNavWeatherText("Không rõ thời tiết");
      return;
    }
    setNavWeatherText(
      "🌤 " + data.name + " " + Math.round(data.main.temp) + "°C",
    );
  } catch (err) {
    setNavWeatherText("Không thể tải thời tiết");
  }
}

// Vừa vào trang: xin quyền vị trí, tìm thời tiết tự động theo vị trí đó.
// Nếu người dùng từ chối hoặc trình duyệt không hỗ trợ, dùng TP.HCM làm mặc định.
function initWeather() {
  setNavWeatherText("Đang lấy thời tiết...");
  if (!navigator.geolocation) {
    fetchWeatherByCity("Ho Chi Minh City");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
    },
    () => {
      fetchWeatherByCity("Ho Chi Minh City");
    },
    { timeout: 8000 },
  );
}

window.addEventListener("load", () => {
  renderHomeBooks();
  applyRoleVisibility();
  initWeather();
});