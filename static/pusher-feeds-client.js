var PusherFeeds = (function () {
'use strict';

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();







var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var defaultHost = "api-ceres.kube.pusherplatform.io";
var defaultAuthEndpoint = "/feeds/tokens";
var feedIdRegex = /^[a-zA-Z0-9-]+$/;
function feedUrl(host, appId, feedId, tailSize) {
  var query = tailSize ? "?tail_size=" + tailSize : "";
  return "https://" + host + "/apps/" + appId + "/services/feeds/v1/feeds/" + feedId + "/items" + query;
}

function authUrl(authEndpoint, feedId) {
  return authEndpoint + "?feed_id=" + feedId + "&type=READ";
}

var EventHandler = function () {
  function EventHandler(onEvent, request) {
    var _this = this;

    classCallCheck(this, EventHandler);

    this.head = 0;
    this.onEvent = onEvent;
    request.onreadystatechange = function () {
      if (request.readyState > 2) {
        _this.process(request.responseText);
      }
    };
  }

  createClass(EventHandler, [{
    key: "processSlice",
    value: function processSlice(slice) {
      var _this2 = this;

      slice.split("\n").forEach(function (line) {
        var event = JSON.parse(line);
        if (event[0] === 0) {
          // ignore?
        } else if (event[0] === 1) {
          _this2.lastEventId = event[1];
          _this2.onEvent(_extends({ itemId: event[1] }, event[3]));
        } else if (event[0] === 225) {
          console.warn("End of stream"); // do something!
        } else {
          console.warn("Unknown event type: " + event[0]);
        }
      });
    }
  }, {
    key: "process",
    value: function process(raw) {
      var lastNewLine = raw.lastIndexOf("\n");
      if (lastNewLine <= this.head) {
        return;
      }
      this.processSlice(raw.slice(this.head, lastNewLine));
      this.head = lastNewLine + 1;
    }
  }]);
  return EventHandler;
}();

function makeAuthRequest(authEndpoint, feedId) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", authUrl(authEndpoint, feedId));
    xhr.addEventListener("load", function () {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText).token);
      } else {
        reject(new Error("Couldn't get token from " + authEndpoint + "; got " + xhr.status + " " + xhr.statusText + "."));
      }
    });
    xhr.send();
  });
}

function authorize(feedId, authEndpoint) {
  if (feedId.startsWith("private-")) {
    return makeAuthRequest(authEndpoint, feedId);
  }
  return Promise.resolve(null);
}

var Subscription = function () {
  function Subscription(feedId, _ref) {
    var _this3 = this;

    var appId = _ref.appId,
        authEndpoint = _ref.authEndpoint,
        host = _ref.host,
        lastEventId = _ref.lastEventId,
        onEvent = _ref.onEvent,
        onError = _ref.onError,
        tailSize = _ref.tailSize,
        token = _ref.token;
    classCallCheck(this, Subscription);

    this.request = new XMLHttpRequest();
    this.request.open("SUBSCRIBE", feedUrl(host, appId, feedId, tailSize));
    this.eventHandler = new EventHandler(onEvent, this.request);
    this.request.onreadystatechange = function () {
      if (_this3.request.readyState > 2) {
        _this3.eventHandler.process(_this3.request.responseText);
      }
    };
    if (lastEventId) {
      this.request.setRequestHeader("Last-Event-ID", lastEventId);
    }
    if (!feedId.match(feedIdRegex)) {
      throw new TypeError("feed_id must match regex " + feedIdRegex);
    }
    authorize(feedId, authEndpoint).then(function (token) {
      if (token) {
        _this3.request.setRequestHeader("Authorization", "Bearer " + token);
      }
      _this3.request.send();
    }).catch(onError);
  }

  createClass(Subscription, [{
    key: "close",
    value: function close() {
      this.request.abort();
    }
  }, {
    key: "lastEventId",
    get: function get$$1() {
      return this.eventHandler.lastEventId;
    }
  }]);
  return Subscription;
}();

var PusherFeeds = function () {
  function PusherFeeds(_ref2) {
    var appId = _ref2.appId,
        host = _ref2.host,
        authEndpoint = _ref2.authEndpoint;
    classCallCheck(this, PusherFeeds);

    this.host = host || defaultHost;
    this.appId = appId;
    this.authEndpoint = authEndpoint || defaultAuthEndpoint;
  }

  createClass(PusherFeeds, [{
    key: "subscribe",
    value: function subscribe(feedId, options) {
      if (!options) {
        options = {};
      }
      return new Subscription(feedId, _extends({}, this, options));
    }
  }]);
  return PusherFeeds;
}();

return PusherFeeds;

}());
//# sourceMappingURL=pusher-feeds-client.js.map
