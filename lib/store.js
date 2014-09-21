module.exports = function () {
    var fs   = require('fs'),
        path = require('path')

    function isUndefined(object) { return typeof(object) === 'undefined'; }

    function create(app, config, io) {
        config = config || {plugins:{store:{}}};
        var interval  = config.plugins.store.interval || 1000,
            keyValuePairs   = {},
            keySets   = {},
            modified  = false,
            connected = false,
            filename  = null,
            version   = config.version        || '0.0.0',
            logger    = config.logger         || {log:function(){}},
            meta      = config.meta           || {$_id:'kv-store'};

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
                    if (next) next(null, keyValuePairs[key], meta);
                });
            }
        }

        function set(tuples, next) {
            tuples.forEach(function (tuple) {
                keyValuePairs[tuple.key] = tuple.value;
            });
            modified = true;
            process.nextTick(function () {
                if (next) next(null, 'OK', meta);
            });
        }

        function del(key, next) {
            var keys  = [],
                count = 0;
            if (key instanceof Array)
                keys = key
            else if (key.indexOf('*') !== -1)
                keys = _keys(key);
            else
                keys = [key];
            keys.forEach(function (key) {
                if (!isUndefined(keyValuePairs[key])) {
                    ++count;
                    delete keyValuePairs[key];
                }
            });
            modified = true;
            process.nextTick(function () {
                if (next) next(null, count, meta);
            });
        }

        function sget(setName, member, next) {
            logger.log('debug', 'kv-memory::sget(setName: %s, member:%s) >>> %j', setName, member, keySets, meta);
            // Does the set exists
            if (keySets[setName]) {
                // Get all members?
                if (member === '*') {
                    process.nextTick(function () {
                        logger.log('debug', 'kv-memory::sget(setName: %s, member:%s) >>> %j >>> %j', setName, member, keySets, Object.keys(keySets[setName]), meta);
                        if (next) next(null, Object.keys(keySets[setName]), meta);
                    });
                    return;
                } else {
                    process.nextTick(function () {
                        if (next) next(null, isUndefined(keySets[setName][member])?0:1, meta);
                    });
                    return;
                }
            } else {
                // set does not exists. Return empty array if asking for all members
                // or false if only one member
                process.nextTick(function () {
                    if (next) next(null, (member === '*' ? [] : 0), meta);
                });
                return;
            }
        }

        function sadd(tuples, next) {
            logger.log('debug', 'kv-memory::sadd(tuples: %j)', tuples, meta);
            var count = 0;
            tuples.forEach(function (tuple) {
                if (isUndefined(keySets[tuple.key])) {
                    keySets[tuple.key] = {};
                }
                keySets[tuple.key][tuple.value] = 1;
                ++count;
            });
            modified = true;
            process.nextTick(function () {
                if (next) next(null, count, meta);
            });
        }
        
        function sdel(setName, member, next) {
            logger.log('debug', 'kv-memory::sdel(setName: %s, member: %j)', setName, member, meta);
            var count = 0;
            // Does the set exists
            if (keySets[setName]) {
                // delete the whole set
                if (member === '*') {
                    count += Object.keys(keySets[setName]).length;
                    delete keySets[setName]
                    modified = true;
                }
                else {
                    // delete the member if it exists
                    if (!isUndefined(keySets[setName][member])) {
                        delete keySets[setName][member]
                        ++count;
                        modified = true;
                    }
                }
            }
            process.nextTick(function () {
                if (next) next(null, count, meta);
            });
        }

        //////////////////////////// PRIVATE ///////////////////////////////////

        function _keys(key, withValue) {
            withValue = withValue || false;
            var tuples = [],
                regex  = '^' + key.replace(/\*/g, '.*') + '$';
            for (var name in keyValuePairs) {
                if (keyValuePairs.hasOwnProperty(name) && name.match(regex)) {
                    tuples.push(withValue ? {key: name, value: keyValuePairs[name]} : name);
                }
            }
            return tuples;
        }

        function save(next) {
            if (modified) {
                try {
                    var payload = {
                        keyValuePairs : keyValuePairs,
                        keySets : keySets
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
                        if (container.keyValuePairs && container.keySets) {
                            keyValuePairs = container.keyValuePairs;
                            keySets       = container.keySets;
                        } else {
                            keyValuePairs = container;
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

