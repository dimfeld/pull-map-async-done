// Test with done callback that returns data

var pull = require('pull-stream')
var Spec = require('pull-spec');
var tape = require('tape')
var asyncMap = require('../');
tape('normal case with done callback returning data', function(t) {
  var doneCalled = false;

  pull(
    pull.count(),
    pull.take(21),
    asyncMap(function(data, cb) {
        return cb(null, data + 1)
      },
      function done(err, cb) {
        t.equal(err, null, 'done callback has null err');
        doneCalled = true;
        cb(null, 100);
      }
    ),
    pull.collect(function(err, ary) {
      console.log(ary)
      t.equal(ary.length, 22)
      t.equal(doneCalled, true, 'done called');
      t.end()
    })
  )
})

tape('normal case with async done callback returning data', function(t) {
  var doneCalled = false;

  pull(
    pull.count(),
    pull.take(21),
    asyncMap(function(data, cb) {
        return cb(null, data + 1)
      },
      function done(err, cb) {
        t.equal(err, null, 'done callback has null err');
        doneCalled = true;
        setImmediate(cb, null, 100);
      }
    ),
    pull.collect(function(err, ary) {
      console.log(ary)
      t.equal(ary.length, 22)
      t.equal(doneCalled, true, 'done called');
      t.end()
    })
  )
})

tape('done callback error is propagated and done callback data is ignored', function(t) {
  var doneCalled = false;
  var ERR = new Error('error');

  pull(
    pull.count(),
    pull.take(21),
    asyncMap(function(data, cb) {
        return cb(null, data + 1)
      },
      function done(err, cb) {
        t.equal(err, null, 'done callback has null err');
        doneCalled = true;
        cb(ERR, 100);
      }
    ),
    pull.collect(function(err, ary) {
      console.log(ary)
      t.equal(ary.length, 21)
      t.equal(doneCalled, true, 'done called');
      t.equal(err, ERR, 'done callback error is passed on');
      t.end()
    })
  )
})

tape('abort async map', function(t) {
  var err = new Error('abort')
  t.plan(2)

  var read = pull(
    pull.infinite(),
    asyncMap(function(data, cb) {
        setImmediate(function() {
          cb(null, data)
        })
      },
      function done(err, cb) {
        setImmediate(cb, null, 100);
      }
    )
  )

  read(null, function(end) {
    if(!end) throw new Error('expected read to end')
    t.ok(end, "read's callback")
  })

  read(err, function(end) {
    if(!end) throw new Error('expected abort to end')
    t.equal(end, err, "Abort's callback")
  })

})

tape('abort async map (async source)', function(t) {
  var err = new Error('abort')
  t.plan(2)

  var read = pull(
    function(err, cb) {
      setImmediate(function() {
        if(err) return cb(err)
        cb(null, 'x')
      })
    },
    asyncMap(function(data, cb) {
        setImmediate(function() {
          cb(null, data)
        })
      },
      function done(err, cb) {
        setImmediate(cb, null, 100);
      }
    ),
  )

  read(null, function(end) {
    if(!end) throw new Error('expected read to end')
    t.ok(end, "read's callback")
  })

  read(err, function(end) {
    if(!end) throw new Error('expected abort to end')
    t.equal(end, err, "Abort's callback")
  })

})
tape('asyncMap aborts when map errors', function(t) {
  t.plan(3)
  var ERR = new Error('abort')
  pull(
    pull.values([1, 2, 3], function(err) {
      console.log('on abort')
      t.equal(err, ERR, 'abort gets error')
      t.end()
    }),
    asyncMap(function(data, cb) {
      cb(ERR)
    },
      function done(err, cb) {
        t.equal(err, ERR, 'done callback gets error');
        cb(null, 100)
      }),
    pull.collect(function(err) {
      t.equal(err, ERR, 'collect gets error')
    })
  )
})

tape("async map should pass its own error", function(t) {
  var i = 0
  var error = new Error('error on last call')

  pull(
    function(end, cb) {
      end ? cb(true) : cb(null, i + 1)
    },
    asyncMap(function(data, cb) {
      setTimeout(function() {
        if(++i < 5) cb(null, data)
        else {
          cb(error)
        }
      }, 100)
    },
      function done(err, cb) {
        t.equal(err, error, 'done callback gets error');
        cb(null, 100);
      }),
    pull.collect(function(err, five) {
      t.equal(err, error, 'should return err')
      t.deepEqual(five, [1, 2, 3, 4], 'should skip failed item')
      t.end()
    })
  )
})

tape("original error takes precedence over done callback error", function(t) {
  var i = 0
  var error = new Error('error on last call')

  pull(
    function(end, cb) {
      end ? cb(true) : cb(null, i + 1)
    },
    asyncMap(function(data, cb) {
      setTimeout(function() {
        if(++i < 5) cb(null, data)
        else {
          cb(error)
        }
      }, 100)
    },
      function done(err, cb) {
        t.equal(err, error, 'done callback gets original error');
        cb(new Error("done callback error"), 100);
      }),
    pull.collect(function(err, five) {
      t.equal(err, error, 'should return original err')
      t.deepEqual(five, [1, 2, 3, 4], 'should skip failed item')
      t.end()
    })
  )
})


tape('spec with normal done callback', function(t) {
  t.doesNotThrow(function() {
    pull(
      Spec(pull.values([1, 2, 3])),
      asyncMap(
        function(data, cb) { cb(null, data); },
        function(err, cb) { cb(null, 100); }
      ),
      pull.collect(function(err, data) {
        t.notOk(err, 'no error');
        t.end();
      })
    )
  });
});

tape('spec with normal done callback (async)', function(t) {
  t.doesNotThrow(function() {
    pull(
      Spec(pull.values([1, 2, 3])),
      asyncMap(
        function(data, cb) { setImmediate(cb, null, data); },
        function(err, cb) { setImmediate(cb, null, 100); }
      ),
      pull.collect(function(err, data) {
        t.notOk(err, 'no error');
        t.deepEqual(data, [1, 2, 3, 100]);
        t.end();
      })
    )
  });

});

tape('spec when done callback throws an error', function(t) {
  var ERR = new Error('error');
  t.doesNotThrow(function() {
    pull(
      Spec(pull.values([1, 2, 3])),
      asyncMap(
        function(data, cb) { cb(null, data); },
        function(err, cb) { cb(ERR, 100); }
      ),
      pull.collect(function(err, data) {
        t.equal(err, ERR, 'error is passed through');
        t.end();
      })
    )
  });
});

tape('spec when done callback throws an error (async)', function(t) {
  var ERR = new Error('error');
  t.doesNotThrow(function() {
    pull(
      Spec(pull.values([1, 2, 3])),
      asyncMap(
        function(data, cb) { setImmediate(cb, null, data); },
        function(err, cb) { setImmediate(cb, ERR, 100); }
      ),
      pull.collect(function(err, data) {
        t.equal(err, ERR, 'error is passed through');
        t.end();
      })
    )
  });
});
