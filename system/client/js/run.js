"use strict";

import {MREditor} from "./lib/mreditor.js";

window.MREditor = MREditor;

function treq(data) {
    fetch("/world_transition", {
        method: "POST",
        body: JSON.stringify(data),         
        headers: {
            'Content-Type': 'application/json',
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        mode: 'cors'
    }).then(res => res.json()).then(parsed => {
        console.log(parsed);
    }).error(err => {
        console.error(err);
    });
}
window.treq = treq;



window.watchFiles = function(arr, status = {}) {
    if (!arr) {
        status.message = "ERR_NO_FILES_SPECIFIED";
        console.error("No files specified");
        return false;
    }
    if (MR.server.sock.readyState !== WebSocket.OPEN) {
        status.message = "ERR_SERVER_UNAVAILABLE";
        console.error("Server is unavailable");

        return false;
    }

    MR.server.sock.send(JSON.stringify({"MR_Message" : "Watch_Files", "files" : arr}));
}



window.hotReloadFile = function(localPath) {
    const parentPath = getCurrentPath(window.location.pathname);

    let saveTo = localPath;

    saveTo = localPath;

    const origin = window.location.origin;
    const originIdx = saveTo.indexOf(origin);
    saveTo = saveTo.substring(originIdx + origin.length + 1);

    if (parentPath !== '/' && parentPath !== '\\') {
        const parentIdx = saveTo.indexOf(parentPath);
        saveTo = saveTo.substring(parentIdx + parentPath.length);
    }

    console.log(saveTo);
	MR.server.subsLocal.subscribe("Update_File", (filename, args) => {
        if (args.file !== filename) {
            console.log("file does not match");
            return;
        }

        MR.wrangler.reloadGeneration += 1;

        import(window.location.href + filename + "?generation=" + MR.wrangler.reloadGeneration).then(
            (world) => {
      
                    const conf = world.default();
                    MR.wrangler.onReload(conf);
            }).catch(err => { console.error(err); });

    }, saveTo);

    watchFiles([saveTo], {});
}


// db.initLoggerSystem({
//   logger : new db.LoggerDefault()
// });

function notImplemented(version) {
    console.warn(`Version ${version}: Not yet implemented`);
    document.body.appendChild(document.createTextNode(`Version ${version}: Not yet implemented`));
}

const VERSION = document.getElementById("version").getAttribute("value");
MR.VERSION = parseInt(VERSION);
console.log("running version:", VERSION);
switch (MR.VERSION) {
case 2: {
    notImplemented(MR.VERSION);
    break;
}
case 1: {
}
default: {
    function run() {

        let deferredActions = [];

        const RESOLUTION = document.getElementById("resolution").getAttribute("value").split(',');
        MR.wrangler.init({
            outputSurfaceName      : 'output-element',
            outputWidth            : parseInt(RESOLUTION[0]),
            outputHeight           : parseInt(RESOLUTION[1]),
            glUseGlobalContext     : true,
            // frees gl resources upon world switch
            glDoResourceTracking   : true,
            glEnableEditorHook     : true,
            enableMultipleWorlds   : true,
            enableEntryByButton    : true,
            enableBellsAndWhistles : true,
            synchronizeTimeWithServer : false,
            // main() is the system's entry point
            main : async () => {


                MREditor.enable();

                MREditor.init({
                    defaultShaderCompilationFunction : MREditor.onNeedsCompilationDefault,
                    //externalWindowGetter : function() { return MR.wrangler.externalWindow; }
                });

                MREditor.detectFeatures();

                wrangler.isTransitioning = false;

                let sourceFiles = document.getElementsByClassName("worlds");
                
                // call the main function of the selected world
                if (MR.wrangler.options.enableMultipleWorlds) {

                    try {

                        let worldIt = sourceFiles[0].firstElementChild;

                        while (worldIt !== null) {
                            const src = worldIt.src;
                            console.log("loading world:", src);
                            const world     = await import(src);
                            const localPath = getCurrentPath(src)


                            MR.worlds.push({world : world, localPath : localPath});

                            worldIt = worldIt.nextElementSibling;
                        }

                        const worldInfo = MR.worlds[MR.worldIdx];
                        setPath(worldInfo.localPath);
                        wrangler.isTransitioning = true;
                        MR.wrangler.beginSetup(worldInfo.world.default()).catch(err => {
                                //console.trace();
                                console.error(err);
                                MR.wrangler.doWorldTransition({direction : 1, broadcast : true});
                        }).then(() => { wrangler.isTransitioning = false;               
                                for (let d = 0; d < deferredActions.length; d += 1) {
                                    deferredActions[d]();
                                }
                                deferredActions = [];

                                CanvasUtil.rightAlignCanvasContainer(MR.getCanvas());

                                window.DISABLEMENUFORWORLDSEXCEPT(MR.worldIdx);
                        });

                    } catch (err) {
                        console.error(err);
                    }

                } else {
                    try {
                        
                        const src  = sourceFiles[0].firstElementChild.src;
                        setPath(getCurrentPath(src));

                        const world = await import(src);
                        MR.wrangler.beginSetup(world.default()).catch(err => {
                                console.trace();
                                console.error(err);

                                CanvasUtil.rightAlignCanvasContainer(MR.getCanvas());
                        });
                    } catch (err) {
                        console.error(err);
                    }
                }

                MR.initWorldsScroll();
                MR.initPlayerViewSelectionScroll();

                MR.syncClient.connect(window.IP, window.PORT_SYNC);

                window.COUNT = 0;

                
                wrangler.defineWorldTransitionProcedure(function(args) {
                    //console.trace();
                    let ok = false;
                    COUNT += 1;
                    //console.log(COUNT, args);
                    // try to transition to the next world
                    while (!ok) {
                        if (args.direction) {
                            //console.log(COUNT, "has direction");
                            MR.worldIdx = (MR.worldIdx + args.direction) % MR.worlds.length;
                            if (MR.worldIdx < 0) {
                                MR.worldIdx = MR.worlds.length - 1;
                            }
                        } else if (args.key !== null) {
                            //console.log(COUNT, "key exists", args.key, "worldidx", MR.worldIdx);
                            if (args.key == MR.worldIdx) {
                                ok = true;
                                continue;
                            }
                            MR.worldIdx = parseInt(args.key);
                            //console.log(COUNT, "WORLDIDX",  MR.worldIdx);
                        }


                        wrangler.isTransitioning = true;

                        //console.log(COUNT, "transitioning to world: [" + MR.worldIdx + "]");
                        //console.log(COUNT, "broadcast", args.broadcast, "direction: ", args.direction, "key", args.key);

                        CanvasUtil.setOnResizeEventHandler(null);
                        CanvasUtil.resize(MR.getCanvas(), 
                                MR.wrangler.options.outputWidth, 
                                MR.wrangler.options.outputHeight
                        );

                        MR.wrangler._gl.useProgram(null);
                        MR.wrangler._reset();
                        MR.wrangler._glFreeResources();
                        ScreenCursor.clearTargetEvents();
                        Input.deregisterKeyHandlers();

                        //console.log(COUNT, "SWITCH");

                        try {
                            // call the main function of the selected world
                            MR.server.subsLocal = new ServerPublishSubscribe();
                            MREditor.resetState();
                            

                            let hadError = false;

                            const worldInfo = MR.worlds[MR.worldIdx];
                            setPath(worldInfo.localPath);

                            MR.wrangler.beginSetup(worldInfo.world.default()).catch((e) => {
                                    console.error(e);
                                    setTimeout(function(){ 
                                            console.log("Trying another world");
                                            wrangler.doWorldTransition({direction : 1, broadcast : true});
                                    }, 500);  
                            }).then(() => {
                                wrangler.isTransitioning = false;

                                //console.log("now we should do deferred actions");
                                //console.log("ready");

                                for (let d = 0; d < deferredActions.length; d += 1) {
                                    deferredActions[d]();
                                }
                                deferredActions = [];

                                CanvasUtil.rightAlignCanvasContainer(MR.getCanvas());

                                window.DISABLEMENUFORWORLDSEXCEPT(MR.worldIdx);

                            });

                            ok = true;

                        } catch (e) {
                            console.error(e);


                            setTimeout(function(){ 
                                console.log(COUNT, "Trying another world");
                            }, 500);
                        }
                    }




                    if (args.broadcast && MR.server.sock.readyState == WebSocket.OPEN) {
                        //console.log(COUNT, "broadcasting");
                        try {
                            MR.server.sock.send(JSON.stringify({
                                "MR_Message" : "Load_World", "key" : MR.worldIdx, "content" : "TODO", "count" : COUNT})
                            );
                        } catch (e) {
                            console.error(e);
                        }
                    }
                });
        
                MR.server.subs.subscribe("Load_World", (_, args) => {
                        if (args.key === MR.worldIdx) {
                            return;
                        }

                        //console.log("loading world", args);
                        if (wrangler.isTransitioning) {
                            //console.log("is deferring transition");
                            deferredActions = [];
                            deferredActions.push(() => { 
                                MR.wrangler.doWorldTransition({direction : null, key : args.key, broadcast : false});
                            });
                            return;
                        }
                        //console.log("not deferring transition");
                        MR.wrangler.doWorldTransition({direction : null, key : args.key, broadcast : false});
                });

            },
            useExternalWindow : (new URLSearchParams(window.location.search)).has('externWin')
        });

    }
    
    // TODO initialization order revision
    MR.initialWorldIdx = 0;
    MR.server.subs.subscribe("Init", (_, args) => {
        MR.worldIdx = args.key || 0;
        MR.initialWorldIdx = args.key || 0;
        MR.server.uid = args.uid;
    });

    MR.initServer();

    setTimeout(() => {
        run();
    }, 100);

    break;
}
}

