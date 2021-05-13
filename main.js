require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Pool } = require("pg");
const { Server } = require("socket.io");
const eta = require("eta");

console.log("Connecting to database", process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

function updateMouse(clicks, scroll) {
  pool.query(
    "UPDATE mouse SET clicks = $1, scroll = $2 WHERE id = 1",
    [clicks, scroll],
    (error) => {
      if (error) {
        throw error;
      }
    }
  );
}

function getPosts() {
  return new Promise((resolve, reject) => {
    pool.query("SELECT * FROM posts", (error, results) => {
      if (error) {
        reject(error);
      }
      resolve(results.rows);
    });
  });
}

console.log("Selecting initial values");
pool.query("SELECT * FROM mouse", (error, results) => {
  if (error) {
    throw error;
  }

  let { clicks, scroll } = results.rows[0];
  console.log("Selected initial values", clicks, scroll);

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  app.use(cors());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(express.static("public"));
  app.engine("eta", eta.renderFile);
  app.set("view engine", "eta");
  app.set("views", "./views");
  app.get("/", (_, res) => {
    const date = new Date();
    getPosts().then((posts) => {
      res.render("index", {
        scroll,
        clicks,
        posts,
        description:
          "In This Pile is a response to our accelerationist behavior, a space to question how we spend time with other forms of life and eachother. It is a compost pile in a small room. It’s mycelium, metal and plastic. Spores and projected pixels. It’s a body and mind. It’s growth and decay. Lines entwined. It’s space to care. A room to pause (time) in. It’s now but it’s not.",
        hours: date.getHours().toString().padStart(2, "0"),
        minutes: date.getMinutes().toString().padStart(2, "0"),
        seconds: date.getSeconds().toString().padStart(2, "0"),
      });
    });
  });
  app.get("/posts", (_, res) => {
    pool.query("SELECT * FROM posts", (error, results) => {
      if (error) {
        throw error;
      }
      res.json(results.rows);
    });
  });
  app.post("/posts", (req, res) => {
    const { title, body } = req.body;
    pool.query(
      "INSERT INTO posts (title, body) VALUES ($1, $2)",
      [title, body],
      (error) => {
        if (error) {
          throw error;
        }
        console.log("Inserted new post", title, body);
      }
    );
    res.json(req.body);
  });

  io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("scroll-add", (deltaY) => {
      scroll += deltaY;
      io.emit("scroll", scroll);
      updateMouse(clicks, scroll);
      console.log("Updated scroll", scroll);
    });

    socket.on("clicks-add", () => {
      clicks += 1;
      io.emit("clicks", clicks);
      updateMouse(clicks, scroll);
      console.log("Updated clicks", clicks);
    });
  });

  server.listen(process.env.PORT || 5000, () => {
    console.log("Listening");
  });
});
