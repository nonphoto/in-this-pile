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
const maxDripSpeed = 0.005;

const clockElement = document.getElementById("clock");
const canvas = document.getElementById("canvas");
const graphElement = document.getElementById("graph");
const context = canvas.getContext("2d");
const paragraphElements = Array.from(
  document.querySelectorAll("#posts > div > *")
);
const livestreamElement = document.getElementById("livestream");

const windowSize = S.data([canvas.clientWidth, canvas.clientHeight]);
window.addEventListener("resize", () => {
  windowSize([canvas.clientWidth, canvas.clientHeight]);
});

const time = S.data(Date.now());
setInterval(() => {
  time(Date.now());
}, 1000);

const toggle = S.data(0);

const chars = S(() =>
  paragraphElements
    .flatMap((element) =>
      element.textContent.trim().replaceAll(/\s/gm, "  ").split("")
    )
    .slice(0, (windowSize()[0] * windowSize()[1]) / 2000)
    .map((char, _, array) => {
      const r = Math.random() * array.length;
      const l = Math.floor(Math.random() * 5 + 5);
      return { r, l, char };
    })
);

const mouseRecords = SArray([]);
fetch("/mouse")
  .then((response) => response.json())
  .then((result) => {
    mouseRecords(result);
  });

const lastWatered = S.data();
fetch("/water")
  .then((response) => response.json())
  .then(({ updated_at }) => {
    lastWatered(new Date(updated_at));
  });

const dripSpeed = S(() => {
  if (lastWatered()) {
    const t = 1 - (time() - lastWatered()) / 1000 / 60 / 60 / 12;
    return Math.max(Math.min(t, 1), 0) * maxDripSpeed;
  } else {
    return 0;
  }
});

const socket = io();
socket.on("mouse", (message) => {
  mouseRecords.unshift(message);
  mouseRecords(S.sample(mouseRecords).slice(0, mouseRecordsMaxLength));
  if (typeof player !== "undefined") {
    player.playVideo();
  }
});

S.root(() => {
  document.body.addEventListener("click", () => {
    toggle((S.sample(toggle) + 1) % 3);
    if (
      typeof player !== "undefined" &&
      typeof player.playVideo === "function"
    ) {
      player.playVideo();
    }
  });

  S(() => {
    document.body.dataset.toggle = toggle();
  });

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

  Array.from(clockElement.children).map((child, index) => {
    S(() => {
      const t = time() / 1000 / 60 / 60 / 24;
      const [width, height] = windowSize();
      const a = t + (index * Math.PI) / 4;
      const x = (Math.cos(a) * width) / 2.1;
      const y = (Math.sin(a) * height) / 2.1;
      const px = Math.cos(a) * -50 - 50;
      const py = Math.sin(a) * -50 - 50;
      child.style.transform = `translate(${x}px, ${y}px)  translate(${px}%, ${py}%)`;
    });
  });

  patch(graphElement, {
    children: S(() =>
      mouseRecords()
        .slice(0, 10)
        .map(({ clicks, scroll }) => ({
          tagName: "div",
          children: `${scroll}${clicks}`,
        }))
    ),
  });

  sync.update(() => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();

    if (S.sample(toggle) !== 1) {
      S.sample(chars).forEach(({ char, r, l }, i) => {
        Array.from(Array(l).keys()).map((j) => {
          const offset = (i * canvas.width) / Math.PI;
          const h = Math.floor(canvas.height / 64) * 64;
          const x = offset % canvas.width;
          const y =
            (Math.floor(offset / canvas.width) * 64 +
              (j === 0
                ? 0
                : Math.max(
                    (Math.floor(
                      j + r + performance.now() * S.sample(dripSpeed)
                    ) %
                      100) -
                      90,
                    0
                  ) * 32)) %
            h;

          context.fillStyle = "#79a4b5";
          context.font = "32px Arial";
          context.fillText(char, x, y);
        });
      });
    }

    const max = Math.max(...mouseRecords().map(({ scroll }) => scroll));
    const min = Math.min(...mouseRecords().map(({ scroll }) => scroll));
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#6b6558";
    const width = canvas.width / 8;
    const height = canvas.height / 2;

    mouseRecords().map(({ scroll }, index) => {
      context[index === 0 ? "moveTo" : "lineTo"](
        width - (index / mouseRecordsMaxLength) * width - 4 + width * 3,
        ((scroll - min) / (max - min)) * height + height / 2
      );
    });
    context.stroke();
  }, true);

  S(() => {
    const [width, height] = windowSize();
    canvas.width = width * 2;
    canvas.height = height * 2;
  });
});

const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

let player;
window.onYouTubeIframeAPIReady = function () {
  player = new YT.Player("livestream", {
    videoId: "oTaujkHopfI",
    playerVars: {
      playsinline: 1,
      autoplay: 1,
      mute: 1,
      controls: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      rel: 0,
      showinfo: 0,
      showsearch: 0,
    },
    events: {
      onReady(event) {
        event.target.playVideo();
      },
    },
  });
};
