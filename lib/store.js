module.exports = function () {
    var fs   = require('fs'),
        path = require('path')

    function create(app, config, io) {
        config = config || {plugins:{store:{}}};
        var interval  = config.plugins.store.interval || 1000,
            hashMap   = {},
            hashSet   = {},
            modified  = false,
            connected = false,
            filename  = null,
            meta      = {$_id:'tomahawk'};

        function status(next) {
            process.nextTick(function () {
                if (next) next(null, {
                    connected : connected,
                    modified  : modified,
                    status    : 'OK'
                });
            });
        }

        function connect(url, next) {
            filename = url + '.json';
            filename = filename.replace('${HOME}', process.env.HOME);
            filename = filename.replace('${CWD}', process.cwd());
            if (!fs.existsSync(path.dirname(filename))) {
                fs.mkdirSync(path.dirname(filename));
            }

            load(function (err, value, meta) {
                connected = true;
                autosave();
                if (next) next(err, value, meta);
            });
        }

        function close(next) {
            save(function (err) {
                connected = false;
                if (next) next(err);
            });
        }

        function get(key, next) {
            if (key.indexOf('*') !== -1) {
                tuples = _keys(key, true);
                process.nextTick(function () {
                    if (next) next(null, tuples, meta);
                });
            } else {
                process.nextTick(function () {
                    if (next) next(null, hashMap[key], meta);
                });
            }
        }

        function set(tuples, next) {
            tuples.forEach(function (tuple) {
                hashMap[tuple.key] = tuple.value;
            });
            modified = true;
            process.nextTick(function () {
                if (next) next(null, 'OK', meta);
            });
        }

        function del(key, next) {
            var keys = [];
            if (key instanceof Array)
                keys = key
            else if (key.indexOf('*') !== -1)
                keys = _keys(key);
            else
                keys = [key];
            keys.forEach(function (key) {
                delete hashMap[key];
            });
            modified = true;
            process.nextTick(function () {
                if (next) next(null, 'OK', meta);
            });
        }

        function sget(setName, member, next) {
            // Does the set exists
            if (hashSet[setName]) {
                // Get all members?
                if (typeof(member) === 'undefined') {
                    process.nextTick(function () {
                        if (next) next(null, typeof(hashSet[setName]) === 'undefined' ? [] : Object.keys(hashSet[setName]), meta);
                    });
                    return;
                } else {
                    process.nextTick(function () {
                        if (next) next(null, (typeof(hashSet[setName][member]) !== 'undefined'), meta);
                    });
                    return;
                }
            } else {
                // set does not exists. Return empty array if asking for all members
                // or false if only one member
                process.nextTick(function () {
                    if (next) next(null, (typeof(member) === 'undefined' ? [] : false), meta);
                });
                return;
            }
        }

        function sadd(tuples, next) {
            tuples.forEach(function (tuple) {
                if (typeof(hashSet[tuple.key]) === 'undefined')
                    hashSet[tuple.key] = {};
                hashSet[tuple.key][tuple.value] = 1;
            });
            modified = true;
            process.nextTick(function () {
                if (next) next(null, 'OK', meta);
            });
        }
        
        function sdel(setName, member, next) {
            // Does the set exists
            if (hashSet[setName]) {
                // delete the whole set
                if (typeof(member) === 'undefined') {
                    delete hashSet[setName]
                }
                else {
                    // delete the member if it exists
                    if (typeof(hashSet[setName][member]) !== 'undefined') {
                        delete hashSet[setName][member]
                    }
                }
            }
            process.nextTick(function () {
                if (next) next(null, 'OK', meta);
            });
        }

        //////////////////////////// PRIVATE ///////////////////////////////////

        function _keys(key, withValue) {
            withValue = withValue || false;
            var tuples = [],
                regex  = '^' + key.replace(/\*/g, '.*') + '$';
            for (var name in hashMap) {
                if (hashMap.hasOwnProperty(name) && name.match(regex)) {
                    tuples.push(withValue ? {key: name, value: hashMap[name]} : name);
                }
            }
            return tuples;
        }

        function save(next) {
            if (modified) {
                try {
                    var payload = {
                        hashMap : JSON.stringify(hashMap),
                        hashSet : JSON.stringify(hashSet)
                    };
                    modified = false;
                    fs.writeFile(filename, JSON.stringify(payload), function (err) {
                        if (next) next(err);
                    });
                } catch (e) {
                    if (next) next(e);
                }
            } else {
                if (next) next(null);
            }
        }

        function load(next) {
            fs.readFile(filename, function (err, data) {
                if (!err) {
                    try {
                        container = JSON.parse(data);
                        if (container.hashMap && container.hashSet) {
                            hash     = container.hashMap;
                            hashSet  = container.hashSet;
                        } else {
                            hashMap = container;
                        }
                    } catch (e) {
                        err = e;
                    }
                }
                if (next) next(err);
            });
        }

        function autosave() {
            save(function (err) {
                setTimeout(function () {
                    autosave();
                },interval);
            });
        }

        ////////////////////////////////////////////////////////////////////////
        return {
            constructor : function (next) {
                connect(process.env.KVSTORE_FILENAME || config.plugins.store.filename || 'tomahawk', next);
            },
            shutdown : function (next) {
                close(next);
            },
            status  : status,
            connect : connect,
            close   : close,
            get     : get,
            set     : set,
            del     : del,
            sadd    : sadd,
            sget    : sget,
            sdel    : sdel
        };
    }

    return create;
}();

