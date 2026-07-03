const express = require("express");
const { execFile } = require("child_process");
const { createClient } = require("redis");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../../frontend")));

// Serve graph data
app.get("/graph", (req, res) => {
  const graphPath = path.join(__dirname, "../../data/graph.json");
  fs.readFile(graphPath, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to read graph data" });
    }
    try {
      const graph = JSON.parse(data);
      res.json(graph);
    } catch (parseErr) {
      console.error(parseErr);
      res.status(500).json({ error: "Failed to parse graph data" });
    }
  });
});

// Redis setup
const redis = createClient({
  socket: {
    host: "127.0.0.1",
    port: 6379,
  },
});

redis
  .connect()
  .then(() => {
    console.log("Redis connected");
  })
  .catch(console.error);

app.post("/route", async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ error: "Request body missing" });
  }

  const { start, end, algo } = req.body;
  const algorithm = algo || "astar";
  const cacheKey = `route:${start}:${end}:${algorithm}`;

  // 1️⃣ Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    const data = JSON.parse(cached);
    return res.json({
      ...data,
      cache: "HIT",
    });
  }

  // 2️⃣ Call C++ engine (cache miss)
  execFile(
    "../core/src/route.exe",
    [start, end, algorithm, "../data/graph.json"],
    async (err, stdout) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Route engine failed" });
      }

      const result = JSON.parse(stdout);

      // 3️⃣ Store in cache (TTL = 1 hour)
      await redis.setEx(cacheKey, 3600, JSON.stringify(result));

      res.json({
        ...result,
        cache: "MISS",
      });
    }
  );
});

app.listen(3000, () => {
  console.log("Route API running on port 3000");
});
