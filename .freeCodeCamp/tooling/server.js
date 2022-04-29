import express from "express";
import runTests from "./test.js";
import { readEnv, updateEnv } from "./env.js";

import { WebSocketServer } from "ws";
import runLesson from "./lesson.js";
import { updateTests, updateHints } from "./client-socks.js";
import hotReload from "./hot-reload.js";

const app = express();

app.use(express.static("./dist"));

async function handleRunTests(ws, data) {
  const { CURRENT_PROJECT, CURRENT_LESSON } = await readEnv();
  runTests(ws, CURRENT_PROJECT, Number(CURRENT_LESSON));
}

function handleResetProject(ws, data) {}
function handleResetLesson(ws, data) {}

async function handleGoToNextLesson(ws, data) {
  const { CURRENT_LESSON, CURRENT_PROJECT } = await readEnv();
  const nextLesson = Number(CURRENT_LESSON) + 1;
  updateEnv({ CURRENT_LESSON: nextLesson });
  runLesson(ws, CURRENT_PROJECT, nextLesson);
  updateHints(ws, "");
  updateTests(ws, []);
}

async function handleGoToPreviousLesson(ws, data) {
  const { CURRENT_LESSON, CURRENT_PROJECT } = await readEnv();
  const prevLesson = Number(CURRENT_LESSON) - 1;
  updateEnv({ CURRENT_LESSON: prevLesson });
  runLesson(ws, CURRENT_PROJECT, prevLesson);
  updateTests(ws, []);
  updateHints(ws, "");
}

async function handleConnect(ws) {
  const { CURRENT_PROJECT, CURRENT_LESSON } = await readEnv();
  runLesson(ws, CURRENT_PROJECT, CURRENT_LESSON);
}

const server = app.listen(8080, () => {
  console.log("Listening on port 8080");
});

const handle = {
  connect: (ws, data) => {
    handleConnect(ws);
  },
  "run-tests": handleRunTests,
  "reset-project": handleResetProject,
  "go-to-next-lesson": handleGoToNextLesson,
  "go-to-previous-lesson": handleGoToPreviousLesson,
};

const wss = new WebSocketServer({ server });

wss.on("connection", function connection(ws) {
  hotReload(ws);
  ws.on("message", function message(data) {
    const parsedData = parseBuffer(data);
    handle[parsedData.event]?.(ws, parsedData);
  });
  sock("connect", { message: "Server says 'Hello!'" });

  function sock(type, data = {}) {
    ws.send(parse({ event: type, data }));
  }
});

function parse(obj) {
  return JSON.stringify(obj);
}

function parseBuffer(buf) {
  return JSON.parse(buf.toString());
}
