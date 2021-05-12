require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

const pool = new Pool({
  connectionString: isProduction ? process.env.DATABASE_URL : connectionString,
  ssl: isProduction,
});

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app
  .get("/mouse", (_, response) => {
    pool.query("SELECT * FROM mouse", (error, results) => {
      if (error) {
        throw error;
      }
      response.status(200).json(results.rows);
    });
  })
  .put("/mouse", (request, response) => {
    const { clicks, scroll } = request.body;

    pool.query(
      "UPDATE mouse SET clicks = $1, scroll = $2 WHERE id = 1",
      [clicks, scroll],
      (error) => {
        if (error) {
          throw error;
        }
        response.status(200).send(`User modified with ID: 1`);
      }
    );
  });

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server listening`);
});
