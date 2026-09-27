  // Chỉ tài khoản admin mới thấy liên kết "Quản trị" trên thanh điều hướng.
  // Khách chưa đăng nhập hoặc tài khoản thường sẽ không thấy link này.
  (function applyNavRoleVisibility() {
    let current = null;
    try {
      current = JSON.parse(localStorage.getItem("msCurrentUser"));
    } catch (err) {
      current = null;
    }
    const isAdminUser = !!(current && current.role === "admin");
    const link = document.getElementById("navAdminLink");
    if (link) link.style.display = isAdminUser ? "" : "none";
  })();

  document.getElementById("registerForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("rg-name");
    const email = document.getElementById("rg-email");
    const pass = document.getElementById("rg-pass");
    const pass2 = document.getElementById("rg-pass2");
    const terms = document.getElementById("rg-terms");
    const errorBox = document.getElementById("rg-error");

    errorBox.style.display = "none";

    // Kiểm tra các trường bắt buộc (họ tên, email, checkbox điều khoản...)
    for (const field of [name, email, pass, pass2, terms]) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return;
      }
    }

    // Mật khẩu tối thiểu 8 ký tự
    if (pass.value.length < 8) {
      errorBox.textContent = "Mật khẩu phải có tối thiểu 8 ký tự.";
      errorBox.style.display = "block";
      pass.focus();
      return;
    }

    // Mật khẩu xác nhận phải khớp
    if (pass.value !== pass2.value) {
      errorBox.textContent = "Mật khẩu xác nhận không khớp.";
      errorBox.style.display = "block";
      pass2.focus();
      return;
    }

    // Lấy danh sách tài khoản hiện có trong localStorage
    let accounts = [];
    try {
      accounts = JSON.parse(localStorage.getItem("msAccounts")) || [];
    } catch (err) {
      accounts = [];
    }

    // Không cho phép đăng ký trùng email
    const emailExists = accounts.some(
      (acc) => acc.email.toLowerCase() === email.value.trim().toLowerCase()
    );
    if (emailExists) {
      errorBox.textContent = "Email này đã được đăng ký. Vui lòng đăng nhập.";
      errorBox.style.display = "block";
      email.focus();
      return;
    }

    // Lưu tài khoản mới vào localStorage
    // Tài khoản đăng ký công khai luôn là tài khoản thường (chỉ xem sách).
    // Tài khoản quản trị (role: 'admin') chỉ được cấp sẵn, không tự đăng ký được.
    accounts.push({
      name: name.value.trim(),
      email: email.value.trim(),
      password: pass.value,
      role: 'user',
    });
    localStorage.setItem("msAccounts", JSON.stringify(accounts));

    // Đủ điều kiện -> chuyển sang trang chủ
    window.location.href = "index.html";
  });