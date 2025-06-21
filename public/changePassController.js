document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.querySelector("form");

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Ngăn chặn reload trang

        let username = document.getElementById("username").value;
        let currPass = document.getElementById("currPass").value;
        let newPass = document.getElementById("newPass").value;
        let newPassConfirm = document.getElementById("newPassConfirm").value;

        // Kiểm tra input không rỗng
        if (!currPass || !newPass || !newPassConfirm || !username) {
            alert("Vui lòng nhập đầy đủ thông tin!");
            return;
        }

        if( newPass !== newPassConfirm) {
            alert("Mật khẩu mới không khớp, vui lòng nhập lại!");
            return;
        }

        try {
            const response = await fetch("https://vuongle.id.vn/changePass", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, currPass, newPass }),
            });

            const data = await response.json();

            if (response.ok) {
                alert("Đổi mật khẩu thành công!");
                // Xoá token khỏi LocalStorage
                localStorage.removeItem("token");

                // Chuyển hướng đến trang đăng nhập
                window.location.href = "login.html";
                console.log("Success");
            } else {
                alert(`Lỗi: ${data.error}`);
            }
        } catch (error) {
            console.error("Lỗi kết nối server:", error);
            alert("Không thể kết nối tới server.");
        }
    });
});
