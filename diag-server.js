const http = require("http");
const fs = require("fs");

const port = process.env.PORT || 3000;

const server = http.createServer((_, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.write("=== NPM INSTALL LOG ===\n");
  res.write(fs.readFileSync("./npm-install.log", "utf8"));
  res.write("\n=== BUILD LOG ===\n");
  res.write(fs.readFileSync("./build.log", "utf8"));
  res.end();
});

server.listen(port, () => console.log("Diagnostics server on port " + port));
