'use strict'

function id (e) { return e }

module.exports = function asyncMapDone (map, doneCb) {
  if(!map) return id
  var busy = false, calledDone = false, abortCb, aborted

  var finish = function(endValue, cb) {

    if(calledDone || !doneCb) {
      return cb(endValue);
    }

    calledDone = true;

    if(endValue !== true) {
      // Call doneCb with the error and also call our outgoing callback
      // with the same error.
      return doneCb(endValue, function() { cb(endValue) });
    }

    doneCb(null, function(err, data) {
      if(err) {
        // Done callback returned an error.
        cb(err);
      } else if(data !== undefined) {
        // The done callback passed some data, so send it on and flag the
        // stream as done.
        cb(null, data);
        aborted = true;
      } else {
        // The done callback returned no data, so just end now.
        cb(true)
      }
    });
  }

  return function (read) {
    return function next (abort, cb) {
      if(aborted) return finish(aborted, cb)
      if(abort) {
        aborted = abort
        if(!busy) read(abort, function (err) {
          //incase the source has already ended normally,
          //we should pass our own error.
          finish(abort, cb)
        })
        else read(abort, function (err) {
          //if we are still busy, wait for the mapper to complete.
          if(busy) abortCb = cb
          else finish(abort, cb)
        })
      }
      else
        read(null, function (end, data) {
          if(end) finish(end, cb)
          else if(aborted) finish(aborted, cb)
          else {
            busy = true
            map(data, function (err, data) {
              busy = false
              if(aborted) {
                finish(aborted, cb)
                abortCb(aborted)
              }
              else if(err) next (err, cb)
              else cb(null, data)
            })
          }
        })
    }
  }
}
