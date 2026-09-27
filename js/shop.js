window.addEventListener("scroll", () => {
  document
    .getElementById("mainNav")
    .classList.toggle("scrolled", window.scrollY > 40);
});

// Chỉ tài khoản admin mới thấy liên kết vào trang quản trị trên nav.
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

// ===== Bộ lọc sách theo tên / tác giả và thể loại =====
let allBooksCache = [];

// Dựng danh sách thể loại từ chính dữ liệu sách hiện có (kể cả thể loại
// nhập tự do từ Gutendex), để dropdown luôn khớp với dữ liệu thật.
function populateGenreOptions(books) {
  const select = document.getElementById("filterGenre");
  const currentValue = select.value;
  const genres = Array.from(new Set(books.map((b) => b.genre).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b, "vi"),
  );

  select.innerHTML =
    '<option value="">Tất cả thể loại</option>' +
    genres.map((g) => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join("");

  if (genres.includes(currentValue)) select.value = currentValue;
}

function applyFilters() {
  const titleQuery = document.getElementById("filterTitle").value.trim().toLowerCase();
  const genreQuery = document.getElementById("filterGenre").value;

  const filtered = allBooksCache.filter((b) => {
    const matchesTitle =
      !titleQuery ||
      (b.title || "").toLowerCase().includes(titleQuery) ||
      (b.author || "").toLowerCase().includes(titleQuery);
    const matchesGenre = !genreQuery || b.genre === genreQuery;
    return matchesTitle && matchesGenre;
  });

  renderShopGrid(filtered);
}

function renderShopGrid(books) {
  const grid = document.getElementById("shopGrid");
  const countLabel = document.getElementById("filterResultCount");

  countLabel.textContent = `${books.length} / ${allBooksCache.length} đầu sách`;

  if (books.length === 0) {
    grid.innerHTML =
      '<p style="color:var(--muted); grid-column:1/-1;">Không tìm thấy sách nào khớp với bộ lọc hiện tại. Hãy thử từ khoá khác.</p>';
    return;
  }
  grid.innerHTML = books.map(renderBookCardHtml).join("");
}

function initShopPage() {
  allBooksCache = loadBooks();
  populateGenreOptions(allBooksCache);
  renderShopGrid(allBooksCache);

  document.getElementById("filterTitle").addEventListener("input", applyFilters);
  document.getElementById("filterGenre").addEventListener("change", applyFilters);
  document.getElementById("resetFilterBtn").addEventListener("click", () => {
    document.getElementById("filterTitle").value = "";
    document.getElementById("filterGenre").value = "";
    applyFilters();
  });
}

window.addEventListener("load", () => {
  initShopPage();
  applyNavRoleVisibility();
  initWeather();
});