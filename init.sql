CREATE TABLE mouse (
  ID SERIAL PRIMARY KEY,
  clicks INT NOT NULL,
  scroll INT NOT NULL
);

INSERT INTO mouse (clicks, scroll) VALUES  (0, 0);
