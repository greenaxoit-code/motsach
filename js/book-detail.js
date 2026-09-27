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

// ===== Thời tiết trên nav (đồng bộ với trang chủ) =====
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

// ===== Nội dung trang chi tiết sách =====
function getBookIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderBookDetail() {
  const container = document.getElementById("detailContent");
  const id = getBookIdFromUrl();
  const book = id ? loadBooks().find((b) => b.id === id) : null;

  if (!book) {
    container.innerHTML = `
      <div class="detail-notfound">
        <h2>Không tìm thấy sách này</h2>
        <p style="color:var(--muted); margin-bottom:24px;">Cuốn sách có thể đã bị xoá khỏi hệ thống.</p>
        <a href="shop.html" class="btn btn-gold">Quay lại danh sách sách</a>
      </div>
    `;
    return;
  }

  document.title = book.title + " — Mọt Sách";

  const coverStyle = book.bannerImage
    ? ` style="background-image:linear-gradient(180deg, rgba(20,10,10,0) 30%, rgba(20,10,10,0.75) 100%), url('${book.bannerImage}')"`
    : "";
  const coverClass = book.bannerImage ? "has-image" : book.cover || "cv1";

  const user = getCurrentUser();
  const purchased = hasPurchased(book.id);

  let descSectionHtml = "";
  if (purchased) {
    descSectionHtml = `
      <button type="button" class="btn btn-gold" id="viewDescBtn">Xem mô tả</button>
      <div class="detail-desc empty" id="descBox" style="display:none; margin-top:16px;"></div>
    `;
  } else if (book.status !== "available" || (Number(book.copies) || 0) <= 0) {
    descSectionHtml = `
      <div class="purchase-box">
        <div class="purchase-price">Giá: ${formatPrice(book.price)}</div>
        <p style="color:var(--muted); font-size:14px;">
          Sách này hiện đã hết hàng, chưa thể mua lúc này.
        </p>
      </div>
    `;
  } else if (user) {
    descSectionHtml = `
      <div class="purchase-box">
        <div class="purchase-price">Giá: ${formatPrice(book.price)}</div>
        <p style="color:var(--muted); font-size:14px; margin-bottom:16px;">
          Mua sách để mở khoá xem mô tả nội dung.
        </p>
        <button type="button" class="btn btn-gold" id="buyBookBtn">Mua sách — ${formatPrice(book.price)}</button>
      </div>
    `;
  } else {
    descSectionHtml = `
      <div class="purchase-box">
        <div class="purchase-price">Giá: ${formatPrice(book.price)}</div>
        <p style="color:var(--muted); font-size:14px; margin-bottom:16px;">
          Đăng nhập để mua sách và xem mô tả nội dung.
        </p>
        <a href="login.html" class="btn btn-gold">Đăng nhập</a>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="detail-card">
      <div class="detail-cover ${coverClass}"${coverStyle}>
        <h1>${escapeHtml(book.title)}</h1>
      </div>
      <div class="detail-info">
        <div class="author">${escapeHtml(book.author)}</div>
        <div class="detail-stars">${"★".repeat(book.rating || 0)}${"☆".repeat(5 - (book.rating || 0))}</div>
        <div class="detail-meta-row">
          <span class="genre-tag">${escapeHtml(book.genre)}</span>
          <span class="badge ${book.status === "available" ? "badge-available" : "badge-out"}">${book.status === "available" ? "Còn sách" : "Hết sách"}</span>
          <span class="genre-tag">${book.copies} bản</span>
        </div>
        ${descSectionHtml}
      </div>
    </div>
  `;

  if (purchased) {
    const viewBtn = document.getElementById("viewDescBtn");
    const descBox = document.getElementById("descBox");
    viewBtn.addEventListener("click", () => {
      const isHidden = descBox.style.display === "none";
      if (isHidden) {
        descBox.textContent = book.description
          ? book.description
          : "Cuốn sách này chưa có mô tả.";
        descBox.classList.toggle("empty", !book.description);
        descBox.style.display = "block";
        viewBtn.textContent = "Ẩn mô tả";
      } else {
        descBox.style.display = "none";
        viewBtn.textContent = "Xem mô tả";
      }
    });
  } else if (user) {
    document.getElementById("buyBookBtn").addEventListener("click", () => {
      const ok = confirm(
        `Xác nhận mua sách "${book.title}" với giá ${formatPrice(book.price)}?`,
      );
      if (!ok) return;
      const result = purchaseBook(book.id);
      if (!result.success) {
        alert(
          result.reason === "out-of-stock"
            ? "Rất tiếc, sách vừa hết hàng."
            : "Không thể mua sách lúc này. Vui lòng thử lại.",
        );
        renderBookDetail();
        return;
      }
      alert("Mua sách thành công! Giờ bạn có thể xem mô tả.");
      renderBookDetail();
    });
  }
}

window.addEventListener("load", () => {
  renderBookDetail();
  applyNavRoleVisibility();
  initWeather();
});