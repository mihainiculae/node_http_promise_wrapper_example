module.exports = PromiseWrapper;

// mandatory fields
// maxRetries, address, method
function PromiseWrapper(data, options) {
    return new Promise((resolve, reject) => {
        makeRequest(data, parseOptions(options), (err, res)=> {
            if(err) reject(err);
            if(res) resolve(res);
        });
    });
}

function makeRequest(data, options, cb) {
    var engine = require(options.protocol.replace(":",""));
    var req = engine.request(options, (err, res) => {
        res.responseBuffer = "";
        res.on("data", (data) => {
            res.responseBuffer += data;
        });
        res.on("end", () => {
            res.requestTime = Date.now() - options.requestStart;
            cb(null, res);
        });
    }).on("socket", (socket) => {
        socket.setTimeout(options.defaultTimeout);
        socket.on("timeout", () => {
            req.abort();
        });
    }).on("error", (error) => {
        if(!options.errors) options.errors = [];
        options.requestTime = Date.now() - options.requestStart;
        options.errors.push({error, options})
        options.retries++;
        if(options.retries === options.maxRetries){
            cb(options)
        } else {
            setTimeout(()=> {
                makeRequest(data, options, cb);
                // increase the time between retries by 1 second for each failed retry
            }, options.retries * 1000);
        }
    });
    options.requestStart = Date.now();
    req.write(data);
    req.end();
}

function parseOptions(options) {
    options.retries = 0;
    var uriObj = require("url").parse(options.address);
    // default to http if no protocol is given
    // needing this later to set up request lib
    if(!uriObj.protocol) uriObj.protocol = "http:";
    return Object.assign(options, uriObj);
}