const express = require("express");
const session = require("express-sesison");
const Feeds = require("./pusher-feeds-server");

const feeds = new Feeds({
  appId: "auth-example-app",
  appKey: "the-id-bit:the-secret-bit"
});

function hasPermission(userId, feedId, type) {
  return true;
}

const app = express();
app.use(session({ secret: "blah" }));

app.get("/notes", (req, res) => {
  req.session.userId = req.query.user_id;
})

app.get("/feeds/tokens", (req, res) => {
  feeds.authorize(req, res, (feedId, type) => {
    return hasPermission(session.userId, feedId, type);
  });
});

app.listen(5000);
console.log(`Listening on port 5000`);
