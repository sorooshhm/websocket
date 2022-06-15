const express = require("express");
const app = express();
const path = require("path");
const http = require("http");
const { createHash } = require("crypto");
const { GUID, getParsedBuffer, createWebSocketFrame } = require("./utils");


app.use(express.static(path.join(__dirname, "client")));

app.use((req, res) => {
  const body = http.STATUS_CODES[426];

  res.writeHead(426, {
    "Content-Length": body.length,
    "Content-Type": "text/plain",
  });
  res.end(body);
});

const server = http.createServer(app);

server.on("upgrade", (req, socket) => {
  console.log("upgrade");
  const key = req.headers["sec-websocket-key"];
  const digest = createHash("sha1")
    .update(key + GUID)
    .digest("base64");
  const headers = [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${digest}`,
  ];
  socket.write(headers.concat("\r\n").join("\r\n"));

  socket.on("data", (buffer) => {
    let bufferToParse = Buffer.alloc(0);
    let parsedBuffer;

    bufferToParse = Buffer.concat([bufferToParse, buffer]);

    do {
      parsedBuffer = getParsedBuffer(bufferToParse);

      bufferToParse = parsedBuffer.bufferRemainingBytes;

      if (parsedBuffer.payload) {
        console.log("data from client : ", parsedBuffer.payload.toString());
        socket.write(createWebSocketFrame(Buffer.from("hi client")));
      }
    } while (parsedBuffer.payload && parsedBuffer.bufferRemainingBytes.length);
  });
});
server.listen(3000);


