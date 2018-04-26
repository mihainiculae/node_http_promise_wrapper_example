module.exports = PromiseWrapper;

function PromiseWrapper(data, options) {
    return new Promise((resolve, reject) => {
        makeRequest(data, options, (err, res) => {
            if (err) {
                reject(err);
            }
            if (res) {
                resolve(res);
            }
        });
    });
}

function makeRequest(data, options, cb) {
    if (!options.retries) options.retries = 0;
    var engine = require(options.protocol.replace(":", ""));
    var req = engine
        .request(options, res => {
            res.responseBuffer = "";
            res.on("data", data => {
                res.responseBuffer += data;
            });
            res.on("end", () => {
                res.requestTime = Date.now() - options.requestStart;
                cb(null, res);
            });
        })
        .on("socket", socket => {
            socket.setTimeout(options.defaultTimeout);
            socket.on("timeout", () => {
                req.abort();
            });
        })
        .on("error", error => {
            if (!options.errors) options.errors = [];
            options.requestTime = Date.now() - options.requestStart;
            options.errors.push({ error });
            options.retries++;
            if (options.retries === options.maxRetries) {
                cb(options);
            } else {
                setTimeout(() => {
                    makeRequest(data, options, cb);
                    // increase the time between retries by 1 second for each failed retry
                }, options.retries * 1000);
            }
        });
    options.requestStart = Date.now();
    req.write(data);
    req.end();
}