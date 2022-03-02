const express = require("express");
const runTests = require("./test");
const { readEnv, updateEnv } = require("./env");

const { WebSocketServer } = require("ws");
const runLesson = require("./lesson");
const { updateTests, updateHints } = require("./client-socks");
const hotReload = require("./hot-reload");

const app = express();

app.use(express.static("./dist"));
// app.use(express.static("./assets"));

function handleRunTests(ws, data) {
  const { CURRENT_PROJECT, CURRENT_LESSON } = readEnv();
  runTests(ws, CURRENT_PROJECT, Number(CURRENT_LESSON));
}

function handleResetProject(ws, data) {}
function handleResetLesson(ws, data) {}

function handleGoToNextLesson(ws, data) {
  const { CURRENT_LESSON, CURRENT_PROJECT } = readEnv();
  const nextLesson = Number(CURRENT_LESSON) + 1;
  updateEnv({ CURRENT_LESSON: nextLesson });
  runLesson(ws, CURRENT_PROJECT, nextLesson);
  updateHints(ws, "");
  updateTests(ws, []);
}

function handleGoToPreviousLesson(ws, data) {
  const { CURRENT_LESSON, CURRENT_PROJECT } = readEnv();
  const prevLesson = Number(CURRENT_LESSON) - 1;
  updateEnv({ CURRENT_LESSON: prevLesson });
  runLesson(ws, CURRENT_PROJECT, prevLesson);
  updateTests(ws, []);
  updateHints(ws, "");
}

function handleConnect(ws) {
  const { CURRENT_PROJECT, CURRENT_LESSON } = readEnv();
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
