import io from "socket.io-client";
import S from "s-js";
import SArray from "s-array";
import { patch } from "@nonphoto/bloom";
import sync from "framesync";

const mouseRecordsMaxLength = 500;
const rainSpeed = 0.002;
const rainAmount = 1;

const clockElement = document.getElementById("clock");
const canvas = document.querySelector("#graph > canvas");
const clicksElement = document.querySelector("#graph > div");
const context = canvas.getContext("2d");
const charRows = Array.from(document.querySelectorAll("#posts > * > *")).map(
  (element) => Array.from(element.querySelectorAll(":scope span"))
);

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
context.fillRect(0, 0, canvas.width, canvas.height);

const windowSize = S.data([window.innerWidth, window.innerHeight]);
window.addEventListener("resize", () => {
  windowSize([window.innerWidth, window.innerHeight]);
});

const mouseRecords = SArray([]);

fetch("/mouse")
  .then((response) => response.json())
  .then(mouseRecords);

const socket = io();
socket.on("mouse", (message) => {
  const { scroll, clicks } = S.sample(mouseRecords)[0];
  const record = {
    scroll: scroll + message.scroll,
    clicks: clicks + message.clicks,
  };
  mouseRecords.unshift(record);
  mouseRecords.slice(-500);
});

S.root(() => {
  charRows.reduce((rowAcc, row, i) => {
    return row.reduce((acc, char, j) => {
      const x = (i * 95) / charRows.length + 3;
      const y = j * 2 + 2;
      char.style.position = "fixed";
      char.style.left = `${x}vw`;
      char.style.top = `${y}rem`;
      sync.render(() => {
        const offset =
          Math.floor(
            Math.sin((acc * 0.1 - performance.now() * rainSpeed) * rainAmount)
          ) * 0.5;
        char.style.transform = `translateY(${offset}rem)`;
      }, true);
      // S.on(windowSize, () => {
      //   char.style.transform = "";
      //   sync.read(() => {
      //     layout(char.getBoundingClientRect());
      //   });
      //   sync.render(() => {
      //     const x = i * 25 - layout().x;
      //     const y = j * 50 - layout().y;
      //     char.style.transform = `translate(${x}px, ${y}px)`;
      //   });
      // });
      return acc + 1;
    }, rowAcc);
  }, 0);

  const angle = -Math.PI / 2;
  Array.from(clockElement.children).map((child, index) => {
    S(() => {
      const [width, height] = windowSize();
      const a = angle + (index * Math.PI) / 4;
      const x = (Math.cos(a) * width) / 2.1;
      const y = (Math.sin(a) * height) / 2.1;
      const px = Math.cos(a) * -50 - 50;
      const py = Math.sin(a) * -50 - 50;
      child.style.transform = `translate(${x}px, ${y}px)  translate(${px}%, ${py}%)`;
    });
  });

  patch(clicksElement, {
    children: S(() =>
      mouseRecords()
        .slice(0, 10)
        .map(({ clicks, scroll }) => ({
          tagName: "div",
          children: `${clicks} ${Math.abs(scroll)}`,
        }))
    ),
  });

  sync.update(() => {
    const max = Math.max(...mouseRecords().map(({ scroll }) => scroll));
    const min = Math.min(...mouseRecords().map(({ scroll }) => scroll));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#665635";
    mouseRecords().map(({ scroll }, index) => {
      context[index === 0 ? "moveTo" : "lineTo"](
        canvas.width - (index / mouseRecordsMaxLength) * canvas.width - 4,
        ((scroll - min) / (max - min)) * canvas.height
      );
    });
    context.stroke();
  }, true);

  S(() => {
    const [width, height] = windowSize();
    canvas.width = width;
    canvas.height = height;
  });
});
