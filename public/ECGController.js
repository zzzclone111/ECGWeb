function uploadFile() {
    let fileInput = document.getElementById("fileInput");
    if (!fileInput.files.length) {
        alert("Vui lòng chọn file .mat!");
        return;
    }

    let formData = new FormData();
    formData.append("file", fileInput.files[0]);

    fetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.folder) {
            let link = document.getElementById("viewChartLink");
            link.href = "ECGDetail.html?folder=" + encodeURIComponent(data.folder);
            link.style.display = "block";
            link.innerText = "Xem biểu đồ";
        } else {
            alert("Lỗi: " + data.error);
        }
    })
    .catch(error => {
        alert("Có lỗi xảy ra: " + error.message);
    });
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