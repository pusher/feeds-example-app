import { readFile } from 'fs';
import {join as joinPath} from 'path';

import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';

import Feeds from 'pusher-feeds-server';

const feeds = new Feeds({
  serviceId: 'auth-example-app',
  serviceKey: 'the-id-bit:the-secret-bit',
  cluster: 'api-staging-ceres.kube.pusherplatform.io'
});

function hasPermission(userId, feedId) {
  return userId === 'big-brother' || feedId === `private-${userId}`;
}

const app = express();

app.use(session({ secret: 'HvCYzkbSjv3hNUf3fetPChO7DNxNPuOB' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Auth user and redirect to main page
app.get('/', (req, res) => {
  readFile(joinPath(process.cwd(), 'index.html'), 'utf8', (err, data) => {
    res.type('html');
    res.send(data);
  });
});

app.get('/login', (req, res) => {
  req.session.userId = req.query.user_id;
  res.redirect(`/notes/${req.query.user_id}`);
});

// Render template with public and private feeds for logged user
app.get('/notes/:note_id', (req, res) => {
  if (!req.session.userId) {
    res.redirect('/');
    return;
  }

  // Hacky templating to embed the user ID
  readFile(joinPath(process.cwd(), 'notes-template.html'), 'utf8', (err, data) => {
    res.type('html');
    res.send(
      data
        .replace(/\$NOTE_ID/g, req.params.note_id)
        .replace(/\$USER_ID/g, req.session.userId)
    );
  });
});

// Publish data into private feed
app.post('/notes/:user_id', (req, res) => {
  const feedId = `private-${req.params.user_id}`

  if (!hasPermission(req.session.userId, feedId)) {
    return res.sendStatus(401);
  }

  feeds
    .publish(feedId, req.body)
    .then(() => res.sendStatus(204))
    .catch(err => res.status(400).send(err));
});

// Publis data into public feed
// Does not require any authe
app.post('/newsfeed', (req, res) => {
  feeds
    .publish('newsfeed', req.body)
    .then(data => res.sendStatus(204))
    .catch(err => res.status(400).send(err));
});

app.post('/feeds/tokens', (req, res) => {
  const validateRequest = (action, feedId) => action === 'READ' && hasPermission(req.session.userId, feedId);

  feeds.authorizeFeed(req.body, validateRequest)
    .then(data => res.send(data))
    .catch(err => {
      res.status(400).send(`${err.name}: ${err.message}`) 
    });
});

const port = process.env.PORT || 5000;
app.listen(port);
console.log(`Listening on port ${port}`);
