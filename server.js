const express = require("express"); // Framework Express để tạo server web
const multer = require("multer"); // Multer để xử lý file upload
const { exec } = require("child_process"); // exec để chạy lệnh hệ thống (Python script)
const path = require("path"); // Module path để xử lý đường dẫn file
const bcrypt = require("bcryptjs"); // Mã hóa mật khẩu
const jwt = require("jsonwebtoken"); // JSON Web Token
const fs = require("fs-extra"); // Quản lý file
const mongoose = require("mongoose"); // Kết nối MongoDB
const User = require("./models/user"); // Model người dùng
require('dotenv').config();


const app = express(); 

// Kết nối MongoDB
mongoose.connect("mongodb+srv://zzzvuongldk:Vl271104*@cluster0.imgttoi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("✅ Connected to MongoDB Atlas");
}).catch((err) => {
    console.error("❌ MongoDB connection error:", err);
});

// Cấu hình multer để lưu file tải lên vào thư mục "uploads/"
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = path.join(__dirname, "uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
})

var upload = multer({ storage: storage });

app.use(express.static("public"));
app.use(express.json()); // Xử lý dữ liệu JSON
app.use(express.urlencoded({ extended: true })); // Xử lý form data

// API nhận file ECG (.mat) từ phía client
app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const inputFilePath = req.file.path;
    const outputFolder = path.join(__dirname, "public", "ecg_results", Date.now().toString());

    try {
        // Tạo thư mục lưu kết quả nếu chưa có
        await fs.ensureDir(outputFolder);

        // Gọi script Python để xử lý file
        exec(`python process_ecg.py "${inputFilePath}" "${outputFolder}"`, async (error) => {
            if (error) {
                console.error("Error executing Python script:", error);
                return res.status(500).json({ error: "Error processing file" });
            }

            try {
                // Xóa file tạm thời sau khi xử lý xong
                await fs.remove(inputFilePath);

                // Trả về đường dẫn thư mục chứa ảnh
                res.json({ folder: `ecg_results/${path.basename(outputFolder)}` });
            } catch (err) {
                res.status(500).json({ error: "Error processing results" });
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Error creating directory" });
    }
});

// API đăng ký người dùng
app.post('/register', async (req, res) => {
    const { name, email, username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            username,
            password: hashedPassword,
        });

        await newUser.save();  // Lưu user vào MongoDB
        res.json({ message: "Đăng ký thành công!" });

    } catch (err) {
        if (err.code === 11000) { // Nếu username hoặc email đã tồn tại
            res.status(400).json({ error: "Username hoặc email đã tồn tại" });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// API đăng nhập người dùng
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: "Tài khoản không tồn tại" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Sai mật khẩu" });

        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ message: "Đăng nhập thành công!", token });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Middleware kiểm tra token JWT
const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(401).json({ error: "Không có token" });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: "Token không hợp lệ" });
        req.user = decoded;
        next();
    });
};

// API lấy danh sách người dùng (chỉ cho phép truy cập khi đã đăng nhập)
app.get('/users', verifyToken, async (req, res) => {
    try {
        const users = await User.find({}, 'name email username');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API lấy lịch sử kết quả ECG
app.get("/history", async (req, res) => {
    const ecgDir = path.join(__dirname, "public", "ecg_results");

    try {
        const folders = await fs.readdir(ecgDir);

        const results = await Promise.all(
            folders.map(async (folder) => {
                const folderPath = path.join(ecgDir, folder);
                const leads = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
                const images = {
                    all: `ecg_results/${folder}/all_leads.png`,
                    leads: leads.map(lead => `ecg_results/${folder}/${lead}.png`)
                };

                const hasMainImage = await fs.pathExists(path.join(folderPath, "all_leads.png"));
                if (!hasMainImage) return null;

                return {
                    folder: `ecg_results/${folder}`,
                    images,
                    date: new Date(parseInt(folder)).toLocaleDateString(),
                };
            })
        );

        res.json(results.filter(Boolean));
    } catch (err) {
        console.error("Error reading ECG history:", err);
        res.status(500).json({ error: "Không thể đọc dữ liệu lịch sử" });
    }
});

// Khởi động server tại cổng 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
