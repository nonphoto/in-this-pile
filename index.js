require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Pool } = require("pg");
const { Server } = require("socket.io");

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
