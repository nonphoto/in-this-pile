import io from "socket.io-client";
import S from "s-js";
import SArray from "s-array";
import { patch } from "@nonphoto/bloom";

const clockElement = document.getElementById("clock");
const canvas = document.querySelector("#graph > canvas");
const clicksElement = document.querySelector("#graph > div");
const context = canvas.getContext("2d");

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
context.fillStyle = "transparent";
context.fillRect(0, 0, canvas.width, canvas.height);

const windowSize = S.data([window.innerWidth, window.innerHeight]);
window.addEventListener("resize", () => {
  windowSize([window.innerWidth, window.innerHeight]);
});

const scrollArray = SArray([canvas.textContent]);
const clicksArray = SArray([clicksElement.textContent]);

const socket = io();
socket.on("clicks", (clicks) => {
  console.log(clicks);
  clicksArray.push(clicks);
});
socket.on("scroll", (scroll) => {
  scrollArray.push(scroll);
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
});
