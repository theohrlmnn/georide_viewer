import http from "http";

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello from Node.js without Express!\n");
});

server.listen(4000, () => {
  console.log("Server is running at http://localhost:4000");
});
