document.addEventListener("DOMContentLoaded", () => {
    const signUpForm = document.querySelector("form");

    signUpForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Ngăn chặn reload trang

        let name = document.getElementById("custName").value.trim();
        let email = document.getElementById("email").value.trim();
        let username = document.getElementById("username").value.trim();
        let password = document.getElementById("password").value.trim();
        let confirmPassword = document.getElementById("confirmPassword").value.trim();

        // Kiểm tra dữ liệu đầu vào
        if (!name || !username || !password || !confirmPassword || !email) {
            alert("Vui lòng nhập đầy đủ thông tin!");
            return;
        }

        if (password.length < 6) {
            alert("Mật khẩu phải có ít nhất 6 ký tự!");
            return;
        }

        if (password !== confirmPassword) {
            alert("Mật khẩu nhập lại không khớp!");
            return;
        }

        try {
            const response = await fetch("http://localhost:3000/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, email, username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                alert("Đăng ký thành công! Chuyển hướng đến trang đăng nhập...");
                
                // Chuyển hướng đến trang đăng nhập
                window.location.href = "login.html";
            } else {
                alert(`Lỗi: ${data.error}`);
            }
        } catch (error) {
            console.error("Lỗi kết nối server:", error);
            alert("Không thể kết nối tới server.");
        }
    });
});
