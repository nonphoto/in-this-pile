import io from "socket.io-client";
import S from "s-js";
import SArray from "s-array";
import { patch } from "@nonphoto/bloom";

const clicksMaxLength = 10;
const scrollMaxLength = 500;

const clockElement = document.getElementById("clock");
const canvas = document.querySelector("#graph > canvas");
const clicksElement = document.querySelector("#graph > div");
const context = canvas.getContext("2d");

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
context.fillRect(0, 0, canvas.width, canvas.height);

const windowSize = S.data([window.innerWidth, window.innerHeight]);
window.addEventListener("resize", () => {
  windowSize([window.innerWidth, window.innerHeight]);
});

const time = S.data(0);
(function tick(t) {
  time(t);
  requestAnimationFrame(tick);
})();

const scrollArray = SArray([Number(canvas.textContent)]);
const clicksArray = SArray([clicksElement.textContent]);

console.log(scrollArray());

const socket = io();
socket.on("clicks", (clicks) => {
  console.log(clicks);
  clicksArray.push(clicks);
  clicksArray(S.sample(clicksArray).slice(-clicksMaxLength));
});
socket.on("scroll", (scroll) => {
  scrollArray.unshift(scroll);
  scrollArray(S.sample(scrollArray).slice(-scrollMaxCount));
});

S.root(() => {
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
    children: clicksArray.map((text) => ({ tagName: "div", children: text })),
  });

  S.on(time, () => {
    const max = Math.max(...scrollArray());
    const min = Math.min(...scrollArray());
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#665635";
    scrollArray().map((item, index) => {
      context[index === 0 ? "moveTo" : "lineTo"](
        canvas.width - (index / scrollMaxLength) * canvas.width - 4,
        ((item - min) / (max - min)) * canvas.height
      );
    });
    context.stroke();
  });

  S(() => {
    const [width, height] = windowSize();
    canvas.width = width;
    canvas.height = height;
  });
});
