let params = new URLSearchParams(window.location.search);
let folderPath = params.get("folder");

if (folderPath) {
    let decodedUrl = decodeURIComponent(folderPath);
    $("#ecgImage").attr("src", `${decodedUrl}/all_leads.png`);
    console.log("Loading image:", `${decodedUrl}/all_leads.png`);
} else {
    console.error("Không tìm thấy ảnh ECG.");
}

console.log("Key session:", "ecg_result_" + folderPath);
console.log("Stored data:", sessionStorage.getItem("ecg_result_" + folderPath));

const prediction = JSON.parse(sessionStorage.getItem("ecg_result_" + folderPath));
console.log("Prediction:", prediction);

const labels = [
    "Normal",
    "Atrial fibrillation (AF)",
    "First-degree atrioventricular block (I-AVB)",
    "Left bundle brunch block (LBBB)",
    "Right bundle brunch block (RBBB)",
    "Premature atrial contraction (PAC)",
    "Premature ventricular contraction (PVC)",
    "ST-segment depression (STD)",
    "ST-segment elevated (STE)"
];

if (prediction && prediction.mean_probs && prediction.predicted_labels) {
    const diagnosisList = document.getElementById("diagnosis");
    diagnosisList.innerHTML = "<strong>Chẩn đoán:</strong><br>";

    let foundDiagnosis = false;

    prediction.predicted_labels.forEach((val, index) => {
        if (val === 1) {
            diagnosisList.innerHTML += `- ${labels[index]} (Xác suất: ${(prediction.mean_probs[index] * 100).toFixed(2)}%)<br>`;
            foundDiagnosis = true;
        }
    });

    if (!foundDiagnosis) {
        diagnosisList.innerHTML += "- Không nhận dạng được bệnh lý nào.";
    }
} else {
    document.getElementById("diagnosis").innerText = "Không tìm thấy kết quả chẩn đoán.";
}  

const leadNames = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6", "all_leads"];

// Hàm thay đổi ảnh khi bấm vào nút
function loadLead(leadName) {
    if (!folderPath) return;

    let imgElement = document.getElementById("ecgImage");
    let resultElement = document.getElementById("myresult");

    let newImageUrl = `${folderPath}/${leadName}.png`;
    imgElement.src = newImageUrl;
    console.log("Loading image:", newImageUrl);

    // Reset zoom để ảnh mới hiển thị đúng
    imgElement.onload = function () {
        imageZoom("ecgImage", "myresult");
    };
}

// Tạo chức năng zoom ảnh
function imageZoom(imgID, resultID) {
    let img = document.getElementById(imgID);
    let result = document.getElementById(resultID);

    if (!img || !result) {
        console.error("Không tìm thấy ảnh hoặc vùng zoom.");
        return;
    }

    //Xóa các lens cũ trước khi tạo mới
    let oldLenses = document.getElementsByClassName("img-zoom-lens");
    while (oldLenses.length > 0) {
        oldLenses[0].remove();
    }

    let lens = document.createElement("DIV");
    lens.setAttribute("class", "img-zoom-lens");
    img.parentElement.insertBefore(lens, img);

    result.style.width = "300px";
    result.style.height = "400px";

    img.onload = function () {
        result.style.backgroundImage = `url(${img.src})`;
        let lensWidth = 75;
        let lensHeight = 100;
        lens.style.width = lensWidth + "px";
        lens.style.height = lensHeight + "px";

        let cx = result.offsetWidth / lensWidth;
        let cy = result.offsetHeight / lensHeight;

        result.style.backgroundSize = `${img.width * cx}px ${img.height * cy}px`;

        lens.addEventListener("mousemove", moveLens);
        img.addEventListener("mousemove", moveLens);
        lens.addEventListener("touchmove", moveLens);
        img.addEventListener("touchmove", moveLens);

        function moveLens(e) {
            let pos = getCursorPos(e, img);
            let x = pos.x - lens.offsetWidth / 2;
            let y = pos.y - lens.offsetHeight / 2;

            if (x > img.width - lens.offsetWidth) x = img.width - lens.offsetWidth;
            if (x < 0) x = 0;
            if (y > img.height - lens.offsetHeight) y = img.height - lens.offsetHeight;
            if (y < 0) y = 0;

            lens.style.left = x + "px";
            lens.style.top = y + "px";

            result.style.backgroundPosition = `-${x * cx}px -${y * cy}px`;
        }
    };

    if (img.complete) {
        img.onload();
    }

    function getCursorPos(e, img) {
        let a = img.getBoundingClientRect();
        let x = e.pageX - a.left - window.pageXOffset;
        let y = e.pageY - a.top - window.pageYOffset;
        return { x: x, y: y };
    }
}

window.onload = function () {
    imageZoom("ecgImage", "myresult");
};

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