#!/usr/bin/env node

(function () {
    var fs        = require('fs'),
        path      = require('path'),
        rootPath  = path.join(path.dirname(fs.realpathSync(__filename)), '..'),
        config    = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'))).configuration,
        version   = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'))).version;

    function usage(msg) {
        if (msg)
            console.log(msg);
        console.log('USAGE: kv-store-plugin [install|unsintall] tomahawk {configuration}');
        console.log('       default configuration is "config.json"');
        process.exit(-1);
    }

    var args = process.argv.slice(2);
    if (args.length < 2 || args.length > 3) {
        usage();
    }

    if (args[1] !== 'tomahawk') {
        usage("Unknow plugin host: " + args[1]);
    }

    if (!process.env.HOME) {
        console.log('The HOME environment variable must be defined');
        process.exit(-1);
    }
    var tomahawk = path.join(process.env.HOME, ".tomahawk");
    var store = {
        context        : "/store/api/v1",
        implementation : "tomahawk-plugin-kv-memory-store",
        interval       : 1000,
        filename       : "tomahawk-keyvalue-store"
    };

    configFilename = args[2] ? args[2] : "config.json";

    switch (args[0]) {
        case 'install':
            if (!fs.existsSync(tomahawk)) {
                fs.mkdirSync(tomahawk,0755);
            }
            if (fs.existsSync(path.join(tomahawk, configFilename))) {
                config = JSON.parse(fs.readFileSync(path.join(tomahawk, configFilename)));
            } else {
                config = {plugins:{}};
            }
            config.plugins.store = store;
            fs.writeFileSync(path.join(tomahawk, configFilename), JSON.stringify(config));
            console.log('Installation of the kv-store-plugin in ' + path.join(tomahawk, configFilename) + ' was successful.');
            break;
        case 'uninstall':
            if (fs.existsSync(path.join(tomahawk, configFilename))) {
                var config = JSON.parse(fs.readFileSync(path.join(tomahawk, configFilename)));
                delete config.plugins.store;
                fs.writeFileSync(path.join(tomahawk, configFilename), JSON.stringify(config));
            }
            console.log('Uninstallation of the kv-store-plugin from ' + path.join(tomahawk, configFilename) + ' was successful.');
            break;
        default:
            usage("Unknown argument: " + args[0]);
            break;
    }
}).call();
