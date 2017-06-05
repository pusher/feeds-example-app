const fs = require("fs");
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");

const Feeds = require("pusher-feeds-server");

const feeds = new Feeds({
  appId: "auth-example-app",
  appKey: "the-id-bit:the-secret-bit",
  host: "api-staging-ceres.kube.pusherplatform.io"
});

function hasPermission(userId, feedId) {
  return userId === "big-brother" || feedId === `private-${userId}`;
}

const app = express();
app.use(express.static("static"));
app.use(session({ secret: "HvCYzkbSjv3hNUf3fetPChO7DNxNPuOB" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }))

app.get("/login", (req, res) => {
  req.session.userId = req.query.user_id;
  res.redirect(`/notes/${req.query.user_id}`);
});

app.get("/notes/:note_id", (req, res) => {
  // Hacky templating to embed the user ID
  fs.readFile("notes.html.template", "utf8", (err, data) => {
    html = data.replace(/\$NOTE_ID/g, req.params.note_id)
      .replace(/\$USER_ID/g, req.session.userId);
    res.type("html");
    res.send(html);
  });
});

app.post("/newsfeed", (req, res) => {
  feeds.publish("newsfeed", [ req.body ]);
  res.sendStatus(204);
});

app.post("/notes/:user_id", (req, res) => {
  const feedId = `private-${req.params.user_id}`
  if (hasPermission(req.session.userId, feedId)) {
    feeds.publish(feedId, [ req.body ]).catch(console.log);
    res.sendStatus(204);
  } else {
    res.sendStatus(401);
  }
});

app.post("/feeds/tokens", (req, res) => {
  feeds.authorize(req, res, {}, (feedId, type) => {
    return type === "READ" && hasPermission(req.session.userId, feedId);
  });
});

const port = process.env.PORT || 5000;
app.listen(port);
console.log(`Listening on port ${port}`);
