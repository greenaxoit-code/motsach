window.addEventListener("scroll", () => {
  document
    .getElementById("mainNav")
    .classList.toggle("scrolled", window.scrollY > 40);
});

function handleNavUserClick() {
  const user = getCurrentUser();
  if (user) {
    if (confirm("Đăng xuất khỏi tài khoản " + user.name + "?")) {
      logout();
      window.location.href = "index.html";
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

// ===== Nội dung trang "Sách đã mua" =====
function renderPurchasedPage() {
  const user = getCurrentUser();
  const admin = isAdmin();

  // Nav: chỉ tài khoản admin mới thấy link Quản trị.
  const adminLink = document.getElementById("navAdminLink");
  if (adminLink) adminLink.style.display = admin ? "" : "none";

  const label = document.getElementById("navUserLabel");
  if (user) {
    label.textContent = "Xin chào, " + user.name + (admin ? " (Quản trị)" : "");
    label.style.display = "inline";
  }

  // Chưa đăng nhập -> mời đăng nhập để xem tủ sách đã mua.
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const grid = document.getElementById("purchasedGrid");
  const books = getMyPurchasedBooks();

  if (books.length === 0) {
    grid.innerHTML =
      '<p style="color:var(--muted); grid-column:1/-1;">Bạn chưa mua cuốn sách nào. Hãy vào <a href="shop.html" style="color:var(--burgundy); font-weight:600;">cửa hàng</a> để chọn mua sách đầu tiên.</p>';
    return;
  }

  grid.innerHTML = books.map(renderBookCardHtml).join("");
}

window.addEventListener("load", () => {
  renderPurchasedPage();
  initWeather();
});