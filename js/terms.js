window.addEventListener("scroll", () => {
  document
    .getElementById("mainNav")
    .classList.toggle("scrolled", window.scrollY > 40);
});

// Chỉ tài khoản admin mới thấy liên kết vào trang quản trị trên nav;
// chỉ tài khoản đã đăng nhập mới thấy liên kết "Sách đã mua".
function applyNavRoleVisibility() {
  const admin = isAdmin();
  const adminLink = document.getElementById("navAdminLink");
  if (adminLink) adminLink.style.display = admin ? "" : "none";

  const user = getCurrentUser();
  const purchasesLink = document.getElementById("navPurchasesLink");
  if (purchasesLink) purchasesLink.style.display = user ? "" : "none";

  const label = document.getElementById("navUserLabel");
  if (user) {
    label.textContent = "Xin chào, " + user.name + (admin ? " (Quản trị)" : "");
    label.style.display = "inline";
  } else {
    label.style.display = "none";
  }
}

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

// ===== Thời tiết trên nav (đồng bộ với các trang khác) =====
const OPENWEATHER_API_KEY = "b7f96772f3a9a156ce9ec79725f315ec";

function setNavWeatherText(text) {
  const label = document.getElementById("navWeatherLabel");
  if (!label) return;
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
    setNavWeatherText("🌤 " + data.name + " " + Math.round(data.main.temp) + "°C");
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
    setNavWeatherText("🌤 " + data.name + " " + Math.round(data.main.temp) + "°C");
  } catch (err) {
    setNavWeatherText("Không thể tải thời tiết");
  }
}

function initWeather() {
  setNavWeatherText("Đang lấy thời tiết...");
  if (!navigator.geolocation) {
    fetchWeatherByCity("Ho Chi Minh City");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    () => fetchWeatherByCity("Ho Chi Minh City"),
    { timeout: 8000 },
  );
}

window.addEventListener("load", () => {
  applyNavRoleVisibility();
  initWeather();
});