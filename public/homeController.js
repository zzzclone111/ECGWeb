document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");

    const loginIcon = document.querySelector('#navbar li:nth-child(4)');
    const userMenuWrapper = document.getElementById("user-menu-wrapper");
    const userDropdown = document.getElementById("user-dropdown");
    const signupBtn = document.getElementById("signUpBtn");

    if (token) {
      // Đã đăng nhập
      loginIcon.style.display = "none";
      userMenuWrapper.style.display = "inline-block";

      // Toggle dropdown menu
      document.getElementById("user").addEventListener("click", function (e) {
        e.preventDefault();
        userDropdown.style.display = userDropdown.style.display === "block" ? "none" : "block";
      });

      // Đổi mật khẩu
      document.getElementById("changePassword").addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "changePassword.html"; // Trang đổi mật khẩu
      });

      // Đăng xuất
      document.getElementById("logout").addEventListener("click", function (e) {
        e.preventDefault();
        if (confirm("Bạn có muốn đăng xuất không?")) {
          localStorage.removeItem("token");
          window.location.href = "login.html";
        }
      });

      // Ẩn dropdown khi click ra ngoài
      document.addEventListener("click", function (e) {
        if (!userMenuWrapper.contains(e.target)) {
          userDropdown.style.display = "none";
        }
      });
    } else {
      // Chưa đăng nhập
      loginIcon.style.display = "inline-block";
      userMenuWrapper.style.display = "none";
      signupBtn.addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "signUp.html";
      });
    }
});