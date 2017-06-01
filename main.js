const fs = require("fs");
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const Feeds = require("./pusher-feeds-server");

const feeds = new Feeds({
  appId: "auth-example-app",
  appKey: "the-id-bit:the-secret-bit"
});

function hasPermission(userId, feedId) {
  if (userId === "admin") {
    return true;
  }
  return `private-${userId}` === feedId;
}

const app = express();
app.use(session({ secret: "blah" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/login.html");
});

app.get("/login", (req, res) => {
  req.session.userId = req.query.user_id;
  res.redirect(`/notes/${req.query.user_id}`);
});

app.get("/notes/:user_id", (req, res) => {
  req.session.userId = req.params.user_id;
  // Hacky templating to embed the user ID
  fs.readFile("notes.html", "utf8", (err, data) => {
    data = data.replace("$USER_ID", req.params.user_id);
    res.type('html');
    res.send(data);
  });
});

app.post("/newsfeed", (req, res) => {
  feeds.publish("newsfeed", req.body);
});

app.post("/notes/:user_id", (req, res) => {
  const feedId = `private-${req.params.user_id}`
  if (hasPermission(req.session.userId, feedId)) {
    feeds.publish(feedId, req.body.item_data);
    res.sendStatus(204)
  } else {
    res.sendStatus(401)
  }
});

app.get("/feeds/tokens", (req, res) => {
  feeds.authorize(req, res, (feedId, type) => {
    if (type !== 'WRITE') {
      return false;
    }
    return hasPermission(session.userId, feedId);
  });
});

app.listen(5000);
console.log(`Listening on port 5000`);
