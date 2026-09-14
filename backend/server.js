/**
 * Tiny Bloom Backend — zero external dependencies
 * Products + orders stored in JSON files under ./data
 *
 * Start:  node server.js
 * Open:   http://localhost:3000/index.html
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");
const DATA = path.join(__dirname, "data");
const PRODUCTS_FILE = path.join(DATA, "products.json");
const ORDERS_FILE = path.join(DATA, "orders.json");
const ADMIN_KEY = process.env.ADMIN_KEY || "tinybloom-admin";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function ensureData() {
  if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
  if (!fs.existsSync(PRODUCTS_FILE)) {
    const products = [
      { id: "sweet-willow", name: "Sweet Willow", price: 349, rating: "★★★★★", image: "images/sweet-willow.jpg", description: "Full-body platinum silicone newborn with hand-painted translucent skin layers, delicate mottling, and softly rooted hair.", stock: 5 },
      { id: "little-lily", name: "Little Lily", price: 289, rating: "★★★★★", image: "images/little-lily.jpg", description: "Sleeping reborn with gentle closed eyes, finely painted lashes and brows, and a softly weighted body.", stock: 8 },
      { id: "baby-rose", name: "Baby Rose", price: 319, rating: "★★★★☆", image: "images/baby-rose.jpg", description: "Soft platinum silicone with hand-finished rosy cheeks, tiny detailed fingers and toes.", stock: 6 },
      { id: "mia-grace", name: "Mia Grace", price: 379, rating: "★★★★★", image: "images/mia-grace.jpg", description: "Awake expression with rooted lashes, subtle skin veining and mottling.", stock: 4 },
      { id: "emma-bloom", name: "Emma Bloom", price: 259, rating: "★★★★★", image: "images/emma-bloom.jpg", description: "Handcrafted finish with a soft, rounded belly and translucent skin layers.", stock: 10 },
      { id: "sofia", name: "Sofia", price: 429, rating: "★★★★★", image: "images/sofia.jpg", description: "Premium full-body silicone with an open mouth and soft, flexible limbs.", stock: 3 },
      { id: "amelia", name: "Amelia", price: 299, rating: "★★★★☆", image: "images/amelia.jpg", description: "Soft skin texture, carefully weighted body and a gentle sleeping face.", stock: 7 },
      { id: "luna", name: "Luna", price: 399, rating: "★★★★★", image: "images/luna.jpg", description: "Exquisite hand-painted skin, rooted hair and a calm, peaceful expression.", stock: 5 }
    ];
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function sendJson(res, status, data) {
  const body = JSON.stringify(data);
    res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
  });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}
function orderCode() {
  return "TB-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}
function arrivalWindow() {
  const start = new Date(); start.setDate(start.getDate() + 7);
  const end = new Date(); end.setDate(end.getDate() + 12);
  return { start: start.toDateString(), end: end.toDateString() };
}
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/admin" || rel === "/admin/") rel = "/admin.html";
  if (rel === "/") rel = "/index.html";
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

ensureData();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
    });
    return res.end();
  }

  try {
    if (req.method === "GET" && pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, service: "tiny-bloom", time: new Date().toISOString() });
    }
    if (req.method === "GET" && pathname === "/api/products") {
      return sendJson(res, 200, { ok: true, products: readJson(PRODUCTS_FILE) });
    }
    if (req.method === "GET" && pathname.startsWith("/api/products/")) {
      const id = pathname.split("/").pop();
      const product = readJson(PRODUCTS_FILE).find((p) => p.id === id);
      if (!product) return sendJson(res, 404, { ok: false, error: "Product not found" });
      return sendJson(res, 200, { ok: true, product });
    }
    if (req.method === "POST" && pathname === "/api/orders") {
      const body = await readBody(req);
      const productId = String(body.productId || body.product_id || "").trim();
      const quantity = Math.max(1, Math.min(5, parseInt(body.quantity || body.qty || 1, 10) || 1));
      const customer = body.customer || body;
      const required = ["fullName", "email", "phone", "address", "city", "postal", "country"];
      for (const key of required) {
        if (!String(customer[key] || "").trim()) {
          return sendJson(res, 400, { ok: false, error: `Missing field: ${key}` });
        }
      }
      if (!productId) return sendJson(res, 400, { ok: false, error: "Missing productId" });
      const products = readJson(PRODUCTS_FILE);
      const product = products.find((p) => p.id === productId);
      if (!product) return sendJson(res, 404, { ok: false, error: "Product not found" });
      if ((product.stock || 0) < quantity) return sendJson(res, 400, { ok: false, error: "Not enough stock" });
      const window = arrivalWindow();
      const code = orderCode();
      const total = Number(product.price) * quantity;
      const order = {
        id: code, orderCode: code, productId: product.id, productName: product.name,
        unitPrice: product.price, quantity, total,
        customer: {
          fullName: String(customer.fullName).trim(), email: String(customer.email).trim(),
          phone: String(customer.phone).trim(), address: String(customer.address).trim(),
          city: String(customer.city).trim(), postal: String(customer.postal).trim(),
          country: String(customer.country).trim(), notes: String(customer.notes || "").trim()
        },
        status: "pending", arrival: window, createdAt: new Date().toISOString()
      };
      product.stock = product.stock - quantity;
      writeJson(PRODUCTS_FILE, products);
      const orders = readJson(ORDERS_FILE);
      orders.unshift(order);
      writeJson(ORDERS_FILE, orders);
      return sendJson(res, 201, {
        ok: true,
        order: { orderCode: code, productName: product.name, quantity, total, arrival: window, customerName: order.customer.fullName }
      });
    }
    if (req.method === "GET" && pathname.startsWith("/api/orders/")) {
      const code = pathname.split("/").pop();
      const order = readJson(ORDERS_FILE).find((o) => o.orderCode === code || o.id === code);
      if (!order) return sendJson(res, 404, { ok: false, error: "Order not found" });
      return sendJson(res, 200, { ok: true, order });
    }
    if (req.method === "GET" && pathname === "/api/admin/orders") {
      const key = url.searchParams.get("key") || req.headers["x-admin-key"];
      if (key !== ADMIN_KEY) return sendJson(res, 401, { ok: false, error: "Unauthorized" });
      return sendJson(res, 200, { ok: true, orders: readJson(ORDERS_FILE) });
    }
    if (req.method === "PATCH" && pathname.startsWith("/api/admin/orders/")) {
      const key = req.headers["x-admin-key"] || url.searchParams.get("key");
      if (key !== ADMIN_KEY) return sendJson(res, 401, { ok: false, error: "Unauthorized" });
      const code = decodeURIComponent(pathname.split("/").pop());
      const body = await readBody(req);
      const allowed = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"];
      const status = String(body.status || "").trim().toLowerCase();
      if (!allowed.includes(status)) return sendJson(res, 400, { ok: false, error: "Invalid order status" });
      const orders = readJson(ORDERS_FILE);
      const order = orders.find((item) => item.orderCode === code || item.id === code);
      if (!order) return sendJson(res, 404, { ok: false, error: "Order not found" });
      order.status = status;
      order.updatedAt = new Date().toISOString();
      writeJson(ORDERS_FILE, orders);
      return sendJson(res, 200, { ok: true, order });
    }
    if (req.method === "PATCH" && pathname.startsWith("/api/admin/products/")) {
      const key = req.headers["x-admin-key"] || url.searchParams.get("key");
      if (key !== ADMIN_KEY) return sendJson(res, 401, { ok: false, error: "Unauthorized" });
      const id = decodeURIComponent(pathname.split("/").pop());
      const body = await readBody(req);
      const products = readJson(PRODUCTS_FILE);
      const product = products.find((item) => item.id === id);
      if (!product) return sendJson(res, 404, { ok: false, error: "Product not found" });
      if (body.stock !== undefined) {
        const stock = Number(body.stock);
        if (!Number.isInteger(stock) || stock < 0 || stock > 10000) return sendJson(res, 400, { ok: false, error: "Stock must be a whole number from 0 to 10000" });
        product.stock = stock;
      }
      if (body.price !== undefined) {
        const price = Number(body.price);
        if (!Number.isFinite(price) || price < 0) return sendJson(res, 400, { ok: false, error: "Price must be a positive number" });
        product.price = Math.round(price * 100) / 100;
      }
      writeJson(PRODUCTS_FILE, products);
      return sendJson(res, 200, { ok: true, product });
    }
    if (req.method === "POST" && pathname === "/api/admin/products") {
      const key = req.headers["x-admin-key"] || url.searchParams.get("key");
      if (key !== ADMIN_KEY) return sendJson(res, 401, { ok: false, error: "Unauthorized" });
      const body = await readBody(req);
      const id = String(body.id || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const name = String(body.name || "").trim();
      const description = String(body.description || "").trim();
      const image = String(body.image || "").trim();
      const price = Number(body.price);
      const stock = Number(body.stock);
      if (!id || !name || !description || !image) return sendJson(res, 400, { ok: false, error: "ID, name, description, and image are required" });
      if (!Number.isFinite(price) || price < 0) return sendJson(res, 400, { ok: false, error: "Price must be a positive number" });
      if (!Number.isInteger(stock) || stock < 0 || stock > 10000) return sendJson(res, 400, { ok: false, error: "Stock must be a whole number from 0 to 10000" });
      const products = readJson(PRODUCTS_FILE);
      if (products.some((product) => product.id === id)) return sendJson(res, 409, { ok: false, error: "A product with that ID already exists" });
      const product = { id, name, price: Math.round(price * 100) / 100, salePrice: null, rating: "★★★★★", image, description, stock };
      products.push(product);
      writeJson(PRODUCTS_FILE, products);
      return sendJson(res, 201, { ok: true, product });
    }
    return serveStatic(req, res, pathname);
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { ok: false, error: err.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log("");
  console.log("  Tiny Bloom backend");
  console.log("  -------------------");
  console.log(`  Site:   http://localhost:${PORT}/index.html`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
  console.log(`  Admin:  http://localhost:${PORT}/api/admin/orders?key=${ADMIN_KEY}`);
  console.log("");
});
