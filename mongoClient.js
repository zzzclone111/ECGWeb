const mongoose = require("mongoose");

mongoose.connect("mongodb+srv://zzzvuongldk:Vl271104*@cluster0.mongodb.net/myapp", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("✅ Connected to MongoDB Atlas");
}).catch((err) => {
    console.error("❌ MongoDB connection error:", err);
});

module.exports = mongoose;