// polyfill node start
import wrtc from "wrtc";
globalThis.RTCPeerConnection = wrtc.RTCPeerConnection;

import ws from "websocket";
globalThis.WebSocket = ws.w3cwebsocket;
// polyfill node end

// fix wrtc from: https://github.com/node-webrtc/node-webrtc/issues/636#issuecomment-774171409
process.on("beforeExit", (code) => process.exit(code));

import { createServer, connectServer } from "./smoke.mjs";
const args = process.argv.slice(2);

switch (args[0]) {
  case "server":
    console.log("run server");
    await createServer();
    break;
  case "connect":
    if (typeof args[1] !== "string") {
      console.log("please input addr");
      break;
    }
    console.log("connect server");
    await connectServer(args[1]);
    break;
  default:
    console.log("unknown args");
    console.log(args);
    break;
}
