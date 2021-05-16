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

function insertMouseRecord({ clicks = 0, scroll = 0 }) {
  pool.query(
    "insert into mouse (clicks, scroll) values ($1, $2)",
    [clicks, scroll],
    (error) => {
      if (error) {
        throw error;
      }
    }
  );
  console.log("Inserted new mouse record", clicks, scroll);
}

function getMouseGraph() {
  return new Promise((resolve, reject) => {
    pool.query(
      "select sum(clicks) over w as clicks, sum(scroll) over w as scroll from mouse window w as (order by created_at) order by created_at desc limit 500",
      (error, results) => {
        if (error) {
          reject(error);
        }
        resolve(
          results.rows.map(({ clicks, scroll }) => ({
            clicks: Number(clicks),
            scroll: Number(scroll),
          }))
        );
      }
    );
  });
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

function insertPost({ title, body }) {
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
}

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
app.get("/", async (_, res) => {
  const date = new Date();
  const posts = await getPosts();
  const days = Math.floor(
    (date - new Date("March 19, 2021, 00:00:00")) / 1000 / 60 / 60 / 24
  );
  res.render("index", {
    posts,
    days,
    hours: date.getHours().toString().padStart(2, "0"),
    minutes: date.getMinutes().toString().padStart(2, "0"),
    seconds: date.getSeconds().toString().padStart(2, "0"),
  });
});
app.post("/posts", (req, res) => {
  insertPost(req.body);
  res.body("done");
});
app.get("/mouse", async (_, res) => {
  const mouseGraph = await getMouseGraph();
  res.json(mouseGraph);
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("scroll-add", async (scroll) => {
    const record = { scroll, clicks: 0 };
    insertMouseRecord(record);
    io.emit("mouse", record);
  });

  socket.on("clicks-add", async () => {
    const record = { scroll: 0, clicks: 1 };
    insertMouseRecord(record);
    io.emit("mouse", record);
  });
});

server.listen(process.env.PORT || 5000, () => {
  console.log("Listening");
});
