require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Pool } = require("pg");
const { Server } = require("socket.io");
const eta = require("eta");

const description =
  "In This Pile is a response to our accelerationist behavior, a space to question how we spend time with other forms of life and eachother. It is a compost pile in a small room. It’s mycelium, metal and plastic. Spores and projected pixels. It’s a body and mind. It’s growth and decay. Lines entwined. It’s space to care. A room to pause (time) in. It’s now but it’s not.";

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
        resolve(results.rows);
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
  res.render("index", {
    posts,
    description,
    hours: date.getHours().toString().padStart(2, "0"),
    minutes: date.getMinutes().toString().padStart(2, "0"),
    seconds: date.getSeconds().toString().padStart(2, "0"),
  });
});
app.post("/posts", (req, res) => {
  insertPost(req.body);
  res.json(req.body);
});
app.get("/mouse", async (_, res) => {
  const mouseGraph = await getMouseGraph();
  res.json(mouseGraph);
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("scroll-add", async (scroll) => {
    await insertMouseRecord({ scroll });
    const mouseGraph = await getMouseGraph();
    io.emit("mouse", mouseGraph);
  });

  socket.on("clicks-add", async () => {
    await insertMouseRecord({ clicks: 1 });
    const mouseGraph = await getMouseGraph();
    io.emit("mouse", mouseGraph);
  });
});

server.listen(process.env.PORT || 5000, () => {
  console.log("Listening");
});
