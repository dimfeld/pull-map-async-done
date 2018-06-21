# pull-map-async-map-done

This is based on the async-map through stream from the core pull-stream module, with the addition of a done callback that can optionally pass on a final value.

```
var asyncMap = require('pull-async-map-done');

asyncMap(
    function map(data, cb) {
        cb(null, `Value: ${data}`);
    },
    function done(err, cb) {
        if(err) console.log("Error!");
        cb(null, "Done"); // or cb(null) to not pass through a final piece of data
    }
)
```