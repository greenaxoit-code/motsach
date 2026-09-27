      // Chỉ tài khoản admin mới thấy liên kết "Quản trị" trên thanh điều hướng.
      // Khách chưa đăng nhập hoặc tài khoản thường sẽ không thấy link này.
      (function applyNavRoleVisibility() {
        let current = null;
        try {
          current = JSON.parse(localStorage.getItem("msCurrentUser"));
        } catch (err) {
          current = null;
        }
        const isAdmin = !!(current && current.role === "admin");
        const link = document.getElementById("navAdminLink");
        if (link) link.style.display = isAdmin ? "" : "none";
      })();

      // Lấy danh sách tài khoản đã đăng ký (lưu trong localStorage bởi trang register.html)
      function getAccounts() {
        try {
          return JSON.parse(localStorage.getItem("msAccounts")) || [];
        } catch (err) {
          return [];
        }
      }

      // Đảm bảo luôn tồn tại ít nhất 1 tài khoản quản trị (role: 'admin')
      // để có thể đăng nhập và truy cập trang quản trị ngay từ đầu.
      function seedDefaultAdmin() {
        const accounts = getAccounts();
        const hasAdmin = accounts.some((acc) => acc.role === "admin");
        if (!hasAdmin) {
          accounts.push({
            name: "Quản trị viên",
            email: "admin@motsach.vn",
            password: "admin123",
            role: "admin",
          });
          localStorage.setItem("msAccounts", JSON.stringify(accounts));
        }
      }
      seedDefaultAdmin();

      document
        .getElementById("loginForm")
        .addEventListener("submit", function (e) {
          e.preventDefault();

          const email = document.getElementById("li-email");
          const pass = document.getElementById("li-pass");
          const remember = document.getElementById("li-remember");
          const errorBox = document.getElementById("li-error");

          errorBox.style.display = "none";

          // Kiểm tra các trường bắt buộc đã hợp lệ chưa
          if (!email.checkValidity()) {
            email.reportValidity();
            return;
          }
          if (!pass.checkValidity()) {
            pass.reportValidity();
            return;
          }

          // Đối chiếu với danh sách tài khoản đã đăng ký trong localStorage
          const accounts = getAccounts();
          const matched = accounts.find(
            (acc) =>
              acc.email.toLowerCase() === email.value.trim().toLowerCase() &&
              acc.password === pass.value
          );

          if (!matched) {
            errorBox.textContent =
              accounts.length === 0
                ? "Bạn chưa có tài khoản nào. Vui lòng đăng ký trước."
                : "Email hoặc mật khẩu không đúng.";
            errorBox.style.display = "block";
            return;
          }

          // Lưu phiên đăng nhập hiện tại để lần sau vào lại còn nhớ
          localStorage.setItem(
            "msCurrentUser",
            JSON.stringify({
              name: matched.name,
              email: matched.email,
              role: matched.role || "user",
            })
          );
          localStorage.setItem("msRemember", remember.checked ? "1" : "0");

          // Đủ điều kiện -> chuyển sang trang chủ
          window.location.href = "index.html";
        });

      // Nếu đã có phiên đăng nhập được ghi nhớ, tự điền email để tiện đăng nhập lại
      (function prefillRememberedEmail() {
        const current = localStorage.getItem("msCurrentUser");
        const remembered = localStorage.getItem("msRemember");
        if (current && remembered === "1") {
          try {
            const user = JSON.parse(current);
            document.getElementById("li-email").value = user.email || "";
          } catch (err) {}
        }
      })();