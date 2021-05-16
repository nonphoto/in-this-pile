import io from "socket.io-client";
import S from "s-js";
import SArray from "s-array";
import { patch } from "@nonphoto/bloom";
import sync from "framesync";

function fitRect(rect, target) {
  var sw = target[2] / rect[2];
  var sh = target[3] / rect[3];
  var scale = Math.max(sw, sh);
  return [
    target[0] + (target[2] - rect[2] * scale) / 2,
    target[1] + (target[3] - rect[3] * scale) / 2,
    rect[2] * scale,
    rect[3] * scale,
  ];
}

const mouseRecordsMaxLength = 500;

const clockElement = document.getElementById("clock");
const canvas = document.querySelector("#graph > canvas");
const clicksElement = document.querySelector("#graph > div");
const context = canvas.getContext("2d");
const paragraphElements = Array.from(
  document.querySelectorAll("#posts > div > *")
);
const charsElement = document.getElementById("chars");
const livestreamElement = document.getElementById("livestream");

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
context.fillRect(0, 0, canvas.width, canvas.height);

const windowSize = S.data([window.innerWidth, window.innerHeight]);
window.addEventListener("resize", () => {
  windowSize([window.innerWidth, window.innerHeight]);
});

const toggle = S.data(0);

const time = S.data(0);
(function tick(t) {
  time(t);
  requestAnimationFrame(tick);
})();

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
  document.body.addEventListener("click", () => {
    toggle((S.sample(toggle) + 1) % 3);
  });

  S(() => {
    document.body.dataset.toggle = toggle();
  });

  patch(
    charsElement,
    paragraphElements
      .flatMap((element) =>
        element.textContent.trim().replaceAll(/\s/gm, "  ").split("")
      )
      .slice(0, 500)
      .map((char, i, array) => {
        const r = Math.random() * array.length;
        const l = Math.floor(Math.random() * 5 + 5);
        return Array.from(Array(l).keys()).map((j) => {
          const transform = S(() => {
            const [width, height] = windowSize();
            const offset = i * 128;
            const x = offset % width;
            const y =
              Math.floor(offset / width) * 32 +
              (j === 0
                ? 0
                : (Math.max(Math.floor(j + r + time() * 0.01) - 250, 0) % 100) *
                  16);
            return `translate(${x}px, ${y % height}px) translate(-50%, -50%)`;
          });
          return { children: char, style: { transform } };
        });
      })
  );

  S(() => {
    const [windowWidth, windowHeight] = windowSize();
    const [left, top, width, height] = fitRect(
      [0, 0, 560, 315],
      [0, 0, windowWidth, windowHeight]
    );
    livestreamElement.style.width = `${width}px`;
    livestreamElement.style.height = `${height}px`;
    livestreamElement.style.top = `${top}px`;
    livestreamElement.style.left = `${left}px`;
  });

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
