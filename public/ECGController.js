async function uploadFile() {
    let fileInput = document.getElementById("fileInput");
    if (!fileInput.files.length) {
        alert("Vui lòng chọn file .mat!");
        return;
    }

    let formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        // Gửi tới API chẩn đoán
        let response = await fetch("https://heartpredict.duckdns.org/predict/", {
            method: "POST",
            body: formData
        });

        if (!response.ok) throw new Error("Lỗi khi gửi đến server EC2");

        let result = await response.json();

        if (!result || !result.prediction || !result.prediction.predicted_labels) {
            throw new Error("Không nhận được kết quả chẩn đoán");
        }

        // Gửi đến server vẽ biểu đồ (node server ở localhost)
        let viewResponse = await fetch("https://vuongle.id.vn/upload", {
            method: "POST",
            body: formData // gửi lại file cho server vẽ ảnh
        });

        let viewData = await viewResponse.json();

        if (viewData.folder && result.prediction) {
            const sessionKey = "ecg_result_" + viewData.folder;
            sessionStorage.setItem(sessionKey, JSON.stringify(result.prediction));

            // Debug log
            console.log("Lưu sessionStorage:", sessionKey);
            console.log("Dữ liệu lưu:", result.prediction);

            let link = document.getElementById("viewChartLink");
            link.href = "ECGDetail.html?folder=" + encodeURIComponent(viewData.folder);
            link.style.display = "block";
            link.innerText = "Xem biểu đồ";
        } else {
            alert("Lỗi vẽ biểu đồ: " + viewData.error);
        }

    } catch (error) {
        alert("Có lỗi xảy ra: " + error.message);
    }
}


async function loadHistory() {
    try {
        const res = await fetch("/history");
        const data = await res.json();

        const oldPatient = document.getElementById("old_patient");
        oldPatient.innerHTML = "";

        data.forEach((item, index) => {
            const div = document.createElement("div");
            div.className = "design1";
            div.innerHTML = `
                <img src="${item.images.all}" alt="ECG Result ${index + 1}">
                <p><strong>Bệnh nhân #${index + 1}</strong></p>
                <p><strong>Ngày:</strong> ${item.date}</p>
                <p><a href="ECGDetail.html?folder=${encodeURIComponent(item.folder)}" target="_blank">Xem tất cả</a></p>
            `;
            oldPatient.appendChild(div);
        });
    } catch (err) {
        console.error("Lỗi khi tải lịch sử ECG:", err);
    }
}

window.addEventListener("DOMContentLoaded", loadHistory);

document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");

    // Gửi token để kiểm tra hợp lệ
    fetch("/users", {
      headers: {
        Authorization: token
      }
    })
    .then(res => {
      if (!res.ok) {
        // Nếu token không hợp lệ hoặc không có token -> chuyển hướng login
        window.location.href = "login.html";
      }
    })
    .catch(() => {
      // Lỗi khi gọi API cũng chuyển về login
      window.location.href = "login.html";
    });
});

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