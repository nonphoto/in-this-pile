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
  pool.query(
    "delete from mouse where ID not in (select id from mouse order by created_at desc limit 500)",
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
      "select * from mouse order by created_at desc",
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

function getLastMouseRecord() {
  return new Promise((resolve, reject) => {
    pool.query(
      "select * from mouse order by created_at desc limit 1",
      (error, results) => {
        if (error) {
          reject(error);
        }
        const [{ clicks, scroll }] = results.rows;
        resolve({
          clicks: Number(clicks),
          scroll: Number(scroll),
        });
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

getLastMouseRecord().then((currentRecord) => {
  console.log(currentRecord);
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
    date.setHours(date.getHours() + 1);
    const posts = await getPosts();
    const days = Math.floor(
      (date - new Date("March 19, 2021, 00:00:00")) / 1000 / 60 / 60 / 24
    );
    res.render("index", {
      posts,
      days,
      time: date.toLocaleTimeString("en-US", {
        hour12: false,
        timeZone: "EST",
      }),
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
      currentRecord = {
        scroll: currentRecord.scroll + scroll,
        clicks: currentRecord.clicks,
      };
      insertMouseRecord(currentRecord);
      io.emit("mouse", currentRecord);
    });

    socket.on("clicks-add", async () => {
      currentRecord = {
        scroll: currentRecord.scroll,
        clicks: currentRecord.clicks + 1,
      };
      insertMouseRecord(currentRecord);
      io.emit("mouse", currentRecord);
    });
  });

  server.listen(process.env.PORT || 5000, () => {
    console.log("Listening");
  });
});
