// =====================
// IMPORTS
// =====================
const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

// =====================
// APP INIT
// =====================
const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const SECRET = "super_secret_key_123";

// =====================
// DATABASE
// =====================
// const pool = new Pool({
//   user: "postgres",
//   password: "4890",
//   host: "localhost",
//   database: "app_db",
//   port: 5432,
// });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// =====================
// MULTER CONFIG
// =====================
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// =====================
// AUTH MIDDLEWARE
// =====================
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// =====================
// AUTH ROUTES
// =====================
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  await pool.query(
    "INSERT INTO users (username, password) VALUES ($1,$2)",
    [username, hashed]
  );

  res.json({ ok: true });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE username=$1",
    [username]
  );

  if (result.rows.length === 0)
    return res.status(400).json({ error: "User not found" });

  const user = result.rows[0];

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    return res.status(400).json({ error: "Wrong password" });

  const token = jwt.sign({ id: user.id }, SECRET, {
    expiresIn: "1d"
  });

  res.json({ token });
});

app.post("/api/update-flags", auth, async (req, res) => {
  const { id, mintrans_permit, escort_received } = req.body;

  await pool.query(
    "UPDATE vehicles SET mintrans_permit=$1, escort_received=$2 WHERE id=$3",
    [mintrans_permit, escort_received, id]
  );

  res.json({ ok: true });
});

// =====================
// VEHICLE ROUTES
// =====================

// Получить машины (защищено)
app.get("/api/vehicles", auth, async (req, res) => {
  const result = await pool.query("SELECT * FROM vehicles ORDER BY id DESC");
  res.json(result.rows);
});

// Добавить машину (защищено)
app.post("/api/vehicles", auth, async (req, res) => {
  const {
    vin,
    company,
    status,
    transport_type,
    cargo_name,
    cargo_weight,
    cargo_size,
    mintrans_permit,
    escort_received
  } = req.body;

  const result = await pool.query(
    `INSERT INTO vehicles 
     (vin, company, status, transport_type, cargo_name, cargo_weight, cargo_size, mintrans_permit, escort_received) 
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) 
     RETURNING *`,
    [
      vin,
      company,
      status,
      transport_type || "regular",
      cargo_name || null,
      cargo_weight || null,
      cargo_size || null,
      mintrans_permit || false,
      escort_received || false
    ]
  );

  res.json(result.rows[0]);
});

// Обновить статус (защищено)
app.post("/api/update-status", auth, async (req, res) => {
  const { id, status } = req.body;

  await pool.query(
    "UPDATE vehicles SET status=$1 WHERE id=$2",
    [status, id]
  );

  res.json({ ok: true });
});

// Обновить Минтранс (защищено)
app.post("/api/update-mintrans", auth, async (req, res) => {
  const { id, value } = req.body;

  await pool.query(
    "UPDATE vehicles SET mintrans_permit=$1 WHERE id=$2",
    [value, id]
  );

  res.json({ ok: true });
});

// Удалить машину (защищено)
app.delete("/api/vehicles/:id", auth, async (req, res) => {
  const id = req.params.id;

  await pool.query(
    "DELETE FROM vehicles WHERE id=$1",
    [id]
  );

  res.json({ ok: true });
});

// Загрузка фото (защищено)
app.post("/api/upload/:id", auth, upload.single("photo"), async (req, res) => {
  const id = req.params.id;

  await pool.query(
    "UPDATE vehicles SET photo=$1 WHERE id=$2",
    [req.file.filename, id]
  );

  res.json({ ok: true });
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
// =====================
// SERVER START
// =====================
// app.listen(3000, () => {
//   console.log("Server running on http://localhost:3000");
// });



//psql -U postgres
//\c app_db 
//\d users
//INSERT INTO users (username, password, role)
//VALUES (
//  'admin',
//  '$2b$10$oSNMXnJRzO/ceDm4pSTHNucku6pg7gUeoHg6w.dXXzls2qTQ5cqca',
//  'admin'
//);
//$2b$10$oSNMXnJRzO/ceDm4pSTHNucku6pg7gUeoHg6w.dXXzls2qTQ5cqca
//$2b$10$p71hfXyzdFpI7fT2.10xNuLxNRovCba9.GzTa6L34WU0a4U72HMCO
//INSERT INTO users (username, password, role)
//VALUES ('admin', '$2b$10$p71hfXyzdFpI7fT2.10xNuLxNRovCba9.GzTa6L34WU0a4U72HMCO', 'admin');