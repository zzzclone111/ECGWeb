document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");

    const loginIcon = document.querySelector('#navbar li:nth-child(4)');
    const userIcon = document.querySelector('#navbar li:nth-child(5)');

    if (token) {
      // Đã đăng nhập
      loginIcon.style.display = "none";
      userIcon.style.display = "inline-block";

      const userLink = document.getElementById("user");
      userLink.addEventListener("click", function (e) {
        e.preventDefault();
        if (confirm("Bạn có muốn đăng xuất không?")) {
          localStorage.removeItem("token");
          window.location.href = "login.html"; // hoặc reload lại trang hiện tại
        }
      });
    } else {
      // Chưa đăng nhập
      loginIcon.style.display = "inline-block";
      userIcon.style.display = "none";
    }
});