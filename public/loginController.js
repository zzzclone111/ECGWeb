document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.querySelector("form");

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Ngăn chặn reload trang

        let username = document.getElementById("loginUsername").value;
        let password = document.getElementById("loginPassword").value;

        // Kiểm tra input không rỗng
        if (!username || !password) {
            alert("Vui lòng nhập đầy đủ thông tin!");
            return;
        }

        try {
            const response = await fetch("https://vuongle.id.vn/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                alert("Đăng nhập thành công!");
                
                // Lưu token vào LocalStorage
                localStorage.setItem("token", data.token);

                // Chuyển hướng đến trang chính (dashboard)
                window.location.href = "home.html";
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
