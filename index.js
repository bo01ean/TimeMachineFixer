var exec = require('child_process').exec;
var debug = require("debug")("app")
var fs = require("fs");
var Q = require("Q");

var sleep = require('sleep');


var hostname;
var path = "/Volumes/OldTimeMachines/";
var timemachines = [];

getHostname().then(function(data){
    hostname = data;
    debug("'" + hostname.replace(/\s+/, "") + "'");
    disableTimeMachine().then(function(data) {
        debug(data);
        getTimeMachinesFromDir(path).then(function(data) {
            debug(data);
            for (var i = 0; i < timemachines.length; i++) {
                fixBundle(timemachines[i]);
            }
        })
    })
})

function fixBundle(bundle){
    changeFlags(bundle).then(function(data) {
        attachBundle(bundle).then(function(disk) {
            var list = disk.match(/disk[0-9]s[0-9]/g);
            var devname = "/dev/" + list[1];
            sleep.sleep(5);
            repairBundle(devname).then(function(data) {
                debug(data);
                detachBundle(devname).then(function(data) {
                    debug(data);
                })
            })
        })
    })
}

function repairBundle(devName) {
    debug("Repairing: " + devName);
    return promiseExec("diskutil repairVolume " + devName);
}

function detachBundle(disk) {
    debug("Detaching from disk: " + disk);
    return promiseExec("hdiutil detach /dev/" + disk);
}

function attachBundle(bundle) {
    debug("Attaching to bundle: " + bundle);
    return promiseExec("hdiutil attach -nomount -readwrite -noverify -noautofsck " + bundle);
}

function changeFlags(file) {
    debug("Changing flags for: " + file);
    return promiseExec("chflags -R nouchg " + file);
}

function getTimeMachinesFromDir(path) {
    debug("Getting Time Machines from: " + path);
    return getFileList(path, /\.sparse/);
}

function getFileList(inpath, regex) {
    var deferred = Q.defer();
    // Read the directory
    fs.readdir(inpath, function (err, list) {
        for(var i = 0; i<list.length; i++) {
            if(list[i].match(regex)) {
                timemachines.push(path + list[i]);
            }
        }
        deferred.resolve(timemachines);
    });
    return deferred.promise;
}

function getHostname() {
    debug("Getting hostname");
    return promiseExec("hostname -s | sed -e 's/-/ /g'");
}

function disableTimeMachine(){
    debug("Disabling Time Machine");
    return promiseExec("tmutil disable");
}

function promiseExec(command) {
    var deferred = Q.defer();
    exec(command, function (err, data) {
        if (err) {
            debug(err);
            deferred.reject(err);
        }
        return deferred.resolve(data);
    });
    return deferred.promise;
}