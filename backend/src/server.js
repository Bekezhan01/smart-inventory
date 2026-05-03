require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 4000;

// 👉 ROUTES алдымен
app.get("/", (req, res) => {
  res.send("Smart Inventory API is running 🚀");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Smart Inventory API ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});
