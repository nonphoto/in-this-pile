const express = require("express");
const cors = require("cors");
const app = express();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
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
