const createWebSocketFrame = (payload) => {
  const payloadLengthByteCount = payload.length < 126 ? 0 : 2;
  const buffer = Buffer.alloc(2 + payloadLengthByteCount + payload.length);
  let payloadOffset = 2;

  if (payload.length >= Math.pow(2, 16)) {
    throw new Error("Payload equal or bigger than 64 KiB is not supported");
  }

  buffer.writeUInt8(0b10000010, 0); // FIN flag = 1, opcode = 2 (binary frame)
  buffer.writeUInt8(payload.length < 126 ? payload.length : 126, 1);

  if (payloadLengthByteCount > 0) {
    buffer.writeUInt16BE(payload.length, 2);
    payloadOffset += payloadLengthByteCount;
  }

  payload.copy(buffer, payloadOffset);

  return buffer;
};

const getParsedBuffer = (buffer) => {
  let bufferRemainingBytes;
  let currentOffset = 0;
  let maskingKey;
  let payload;

  if (currentOffset + 2 > buffer.length) {
    return { payload: null, bufferRemainingBytes: buffer };
  }

  const firstByte = buffer.readUInt8(currentOffset++);
  const secondByte = buffer.readUInt8(currentOffset++);
  const isFinalFrame = !!((firstByte >>> 7) & 0x1);
  const opCode = firstByte & 0xf;
  const isMasked = !!((secondByte >>> 7) & 0x1); // https://security.stackexchange.com/questions/113297
  let payloadLength = secondByte & 0x7f;

  if (!isFinalFrame) {
    console.log("[not final frame detected]\n");
  }

  if (opCode === 0x8) {
    console.log("[connection close frame]\n");
    // TODO read payload, for example payload equal to <0x03 0xe9> means 1001:
    //   1001 indicates that an endpoint is "going away", such as a server
    //   going down or a browser having navigated away from a page.
    // More info here: https://tools.ietf.org/html/rfc6455#section-7.4
    return { payload: null, bufferRemainingBytes: null };
  }

  if (payloadLength > 125) {
    if (payloadLength === 126) {
      if (currentOffset + 2 > buffer.length) {
        return { payload: null, bufferRemainingBytes: buffer };
      }
      payloadLength = buffer.readUInt16BE(currentOffset);
      currentOffset += 2;
    } else {
      throw new Error("Payload equal or bigger than 64 KiB is not supported");
    }
  }

  if (isMasked) {
    if (currentOffset + 4 > buffer.length) {
      return { payload: null, bufferRemainingBytes: buffer };
    }
    maskingKey = buffer.readUInt32BE(currentOffset);
    currentOffset += 4;
  }

  if (currentOffset + payloadLength > buffer.length) {
    console.log("[misalignment between WebSocket frame and NodeJs Buffer]\n");
    return { payload: null, bufferRemainingBytes: buffer };
  }

  payload = Buffer.alloc(payloadLength);

  if (isMasked) {
    for (let i = 0, j = 0; i < payloadLength; ++i, j = i % 4) {
      const shift = j === 3 ? 0 : (3 - j) << 3;
      const mask = (shift === 0 ? maskingKey : maskingKey >>> shift) & 0xff;

      payload.writeUInt8(mask ^ buffer.readUInt8(currentOffset++), i);
    }
  } else {
    for (let i = 0; i < payloadLength; i++) {
      payload.writeUInt8(buffer.readUInt8(currentOffset++), i);
    }
  }

  bufferRemainingBytes = Buffer.alloc(buffer.length - currentOffset);
  for (let i = 0; i < bufferRemainingBytes.length; i++) {
    bufferRemainingBytes.writeUInt8(buffer.readUInt8(currentOffset++), i);
  }

  return { payload, bufferRemainingBytes };
};

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

module.exports = {
  GUID,
  createWebSocketFrame,
  getParsedBuffer,
};
