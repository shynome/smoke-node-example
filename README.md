# how to run

```sh
deno bundle https://raw.githubusercontent.com/shynome/smoke-node/master/example/somke.ts smoke.mjs
# start smoke hub
node ./node_modules/.bin/smoke-hub --port 5000
# start smoke rest server with browser
caddy file-server -listen 127.0.0.1:8080 -browse
# open http://127.0.0.1:8080/browser.html
# start smoke rest server with node
node node.mjs server
# connect smoke rest server and get hello world from server
node node.mjs connect 0.0.0.0
# start smoke rest server with deno (now deno is not support webrtc, so this is not working)
# deno run https://raw.githubusercontent.com/shynome/smoke-node/master/example/server.ts
```

```ts
// somke.ts
import {
  Node,
  NetworkHub,
} from "https://raw.githubusercontent.com/shynome/smoke-node/master/mod.ts";

export async function createServer() {
  const hostHub = new NetworkHub("ws://127.0.0.1:5000");
  const host = new Node({ hub: hostHub });
  const app = host.rest.createServer();
  app.get("/", (_req, res) => {
    res.headers["Content-Type"] = "text/html";
    res.send("<h1>hello world</h1>");
  });
  app.listen(80);

  console.log(await host.address());
}

export async function connectServer(addr: string) {
  const nodeHub = new NetworkHub("ws://127.0.0.1:5000");
  const node = new Node({ hub: nodeHub });
  const resp = await node.rest.fetch(`rest://${addr}/`);
  const content = await resp.text();
  console.log(content);

  await nodeHub.dispose();
  await node.dispose();
}
```
