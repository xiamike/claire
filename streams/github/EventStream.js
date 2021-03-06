//notify the github scraper of any new evnts that come thrhough.  

EventStream = {
  latest_ids : []
}

var https = require('https');
var Q = require('q');
var _ = require('underscore');

EventStream.init = function(config) {
  EventStream.client_id = config.client_id;
  EventStream.client_secret = config.client_secret;
  EventStream.delay = config.delay;
}

EventStream.pollEvents = function() {
  return Q.Promise(function(resolve, reject, notify) {
    repeatedGet(reject, notify);
  });
}

function repeatedGet(reject, notify){
  return getEvents().then(function(events){
    var curr_ids = events.map(function(ev){
      return ev.id;
    });
    //filter events and notify new ones
    var new_events = events.filter(function(ev){
      return !_.contains(EventStream.latest_ids, ev.id);
    });
    //started test at 3:17 am.  
    console.log(new_events.length, 'new events found');
    EventStream.latest_ids = curr_ids;

    for(var i in new_events) {
      //notify the scraper of these new events.  
      notify(new_events[i]);
    }

    //delay then poll again.  
    return Q.delay(EventStream.delay)
    .then(function () {
      return repeatedGet(reject, notify);
    });
  }, function(error){
    console.log('EventStream.getEvents promise haad error');
    return repeatedGet(reject, notify);
  });
}

function getEvents () {
  return Q.promise(function(resolve, reject, notify){
    var options = {
      hostname: 'api.github.com',
      port: 443,
      path: '/events',
      method: 'GET',
      headers: {
        'user-agent': 'githubarchive.org',
        'Authorization' : 'token 62a6e541c91f014ed4358723efbf30d82e38b22e'
      },
    };

    var req = https.request(options, function(res) {
      var data = '';

      var status = res.statusCode;
      var limit = res.headers['x-ratelimit-limit'];
      var remaining = res.headers['x-ratelimit-remaining'];
      var reset_time = res.headers['x-ratelimit-reset'];

      res.on('data', function(chunk) {
        data += chunk;
      });

      res.on('end', function() {
        console.log(remaining, 'remaining, to reset at', reset_time);
        resolve(JSON.parse(data));
      });
    });
    
    req.on('error', function(error) {
      reject(error);
    });

    req.end();
  });
}

module.exports = EventStream;
