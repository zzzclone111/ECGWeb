const express = require("express"); // Framework Express để tạo server web
const multer = require("multer"); // Multer để xử lý file upload
const { spawn } = require("child_process"); // exec để chạy lệnh hệ thống (Python script)
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
    console.log("Connected to MongoDB Atlas");
}).catch((err) => {
    console.error("MongoDB connection error:", err);
});

// Cấu hình multer để lưu file tải lên vào thư mục "uploads/"
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "uploads");
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Tối đa 5MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== ".mat") {
            return cb(new Error("Chỉ hỗ trợ file .mat"));
        }
        cb(null, true);
    }
});

app.use(express.static("public"));
app.use(express.json()); // Xử lý dữ liệu JSON
app.use(express.urlencoded({ extended: true })); // Xử lý form data

// API nhận file ECG (.mat) từ phía client
app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Không có file được tải lên" });
    }

    const inputFilePath = req.file.path;
    const outputFolder = path.join(__dirname, "public", "ecg_results", Date.now().toString());

    try {
        await fs.ensureDir(outputFolder);

        // Chạy script Python bằng spawn (không dùng exec)
        const py = spawn("python", ["process_ecg.py", inputFilePath, outputFolder]);

        py.stdout.on("data", (data) => {
            console.log(`stdout: ${data}`);
        });

        py.stderr.on("data", (data) => {
            console.error(`stderr: ${data}`);
        });

        py.on("close", async (code) => {
            await fs.remove(inputFilePath); // Xóa file gốc sau xử lý

            if (code !== 0) {
                return res.status(500).json({ error: `Xử lý thất bại (mã lỗi ${code})` });
            }

            res.json({ folder: `ecg_results/${path.basename(outputFolder)}` });
        });

    } catch (err) {
        console.error("Lỗi khi xử lý file:", err);
        res.status(500).json({ error: "Lỗi xử lý file" });
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

// Khởi động server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
