'use strict';

window.VRCanvasWrangler = (function() {

    // temporary hard-coded shim for matrix operations
    const mat4 = {};
    mat4.create = function() {
        return new Float32Array(16);
    }
    mat4.identity = function(t) {
        t.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    }
    mat4.perspective = function perspective(t,e,n,r,a){var c=1/Math.tan(e/2),i=1/(r-a);return t[0]=c/n,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=c,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=(a+r)*i,t[11]=-1,t[12]=0,t[13]=0,t[14]=2*a*r*i,t[15]=0,t}

    class VRBasicCanvasWrangler {
        // Empty constructor.
        constructor() {}

        // Initialization.
        init(options) {
            MR.perspective = mat4.perspective;

            if (options.useExternalWindow) {
                this.externalWindow = window.open('', "Editor", 
                    "height=640,width=640,menubar=no,toolbar=no,resizable=no,menu=no");

                if (!this.externalWindow) {
                    console.warn("failed to load external window");
                } else {

                    this.externalWindow.document.head.innerHTML = `
                    <title>Editor</title>
                    <style type="text/css" media="screen">
                    textarea {
                        margin: 0;
                        border-radius: 0;
                        font:20px courier;
                        min-height: 0%;
                        /* min-width: 100%; */
                        /* max-height: 50vh; */
                        /* resize: vertical; */
                    }


                    .textAreaColumn div span {
                        display:block;
                        font:20px courier;
                        color: red;
                    }

                    .text_area_block {
                        font-family:    courier;
                        font-size:      12px;
                        font-weight:    bold;
                    }
                    /*
                    body.noScroll {
                        overflow: hidden;
                    }*/

                    </style>
                    `

                    this.externalWindow.document.body.innerHTML = `
                    <div style="float: left;" class="text_area_block" id="text-areas">
                    <div style="float: left;" class="text_area_block" id="shader-programs-container"></div>
                    <br>
                    <br>
                    <div style="float: left;" class="text_area_block" id="shader-libs-container"></div>
                    </div>`;



                    this.externalWindow.document.body.style.backgroundColor = 'black';
                    this.externalWindow.document.body.style.color = 'white';

                    window.onunload = () => { this.externalWindow.close(); };

                }

            }


            // Set default options.
            options = options || {};
            options.contextOptions = options.contextOptions || { xrCompatible: true };
            options.contextNames = options.contextNames || ['webgl2', 'webgl', 'experimental-webgl'];
            options.main = options.main || function() {};
            options.glDoResourceTracking = options.glDoResourceTracking || true;
            options.glUseGlobalContext = options.glUseGlobalContext || true;
            options.outputSurfaceName = options.outputSurfaceName || 'output-element';
            options.outputWidth = options.outputWidth || 1280;
            options.outputHeight = options.outputHeight || 720;
            options.useCustomState = options.useCustomState || true;
            options.enableEntryByButton    = (options.enableEntryByButton !== undefined)    ? options.enableEntryByButton    : true;
            options.enableMultipleWorlds   = (options.enableMultipleWorlds !== undefined)   ? options.enableMultipleWorlds   : true;
            options.enableBellsAndWhistles = (options.enableBellsAndWhistles !== undefined) ? options.enableBellsAndWhistles : true;
            // Member variables.
            this.options = options;
            this.main = options.main;
            this.glDoResourceTracking = options.glDoResourceTracking;
            this.useCustomState = options.useCustomState;
            this._projectionMatrix = mat4.create();
            this._viewMatrix = mat4.create();
            this._animationHandle = 0;

            this.buttonsCache = [];

            this._VRIsActive = false;

            this.VRIsActive = () => {
                return this._VRIsActive;
            }
            MR.VRIsActive = this.VRIsActive;
            // Bound functions
            this.onVRRequestPresent = this._onVRRequestPresent.bind(this);
            this.onVRExitPresent = this._onVRExitPresent.bind(this);
            this.onVRPresentChange = this._onVRPresentChange.bind(this);

            // Uninitialized member variables (see _init()).
            this._parent = null;
            this._canvas = null;
            this._glCanvas = null;
            this._mirrorCanvas = null;
            this._immersiveCanvas = null;
            this._gl = null;
            this._version = null;
            this._button = null;
            this._frameData = null;
            this.frameData = () => {
                return this._frameData;
            }
            MR.frameData = this.frameData;
            MR.controllers = navigator.getGamepads();


            this.customState = null;
            this.persistentStateMap = null;
            this.globalPersistentState = null;

            this.reloadGeneration = 0;

            this._clearConfig();

            this._init();

            Input.initKeyEvents(this._canvas);
        }

        start() {
            let target = null;
            if (this._vrDisplay && this.options.enableBellsAndWhistles) {
                this._vrDisplay.cancelAnimationFrame(this._animationHandle);
                this._animationHandle = this._vrDisplay.requestAnimationFrame(this.config.onAnimationFrame);
            } else {
                window.cancelAnimationFrame(this._animationHandle);          
                this._animationHandle = window.requestAnimationFrame(this.config.onAnimationFrame);
            }
        }

        async beginSetup(options) {
            return this.configure(options);
        }

        async onReload(options) {
            const conf = this.config;

            conf.onSelectStart = options.onSelectStart || conf.onSelectStart;
            conf.onReload = options.onReload || conf.onReload;

            conf.onSelect = options.onSelect || conf.onSelect;
            conf.onSelectEnd = options.selectEnd || conf.selectEnd;

            if (conf.onReload) {
                await conf.onReload(this.customState);
            }

            conf.onStartFrame = options.onStartFrame || conf.onStartFrame;
            conf.onEndFrame = options.onEndFrame || conf.onEndFrame;
            conf.onDraw = options.onDraw || conf.onDraw;
            conf.onDrawXR = options.onDrawXR || conf.onDraw;
            conf.onExit = options.onExit || conf.onExit;
            conf.onAnimationFrame = options.onAnimationFrame || conf.onAnimationFrame;
            conf.onAnimationFrameWindow = options.onAnimationFrameWindow || conf.onAnimationFrameWindow;
        }

        async configure(options) {
            if (this.config.onExit) {
                this.config.onExit(this.customState);
            }

            this._clearConfig();
            this._reset();

            options = options || {};

            options.onStartFrame = options.onStartFrame || (function(t, state) {});
            options.onEndFrame = options.onEndFrame || (function(t, state) {});
            options.onDraw = options.onDraw || (function(t, p, v, state, eyeIdx) {}); // projMat, viewMat
            options.onDrawXR = options.onDrawXR || options.onDraw;
            options.onAnimationFrame = options.onAnimationFrame || this._onAnimationFrame.bind(this);
            options.onAnimationFrameWindow = options.onAnimationFrameWindow || this._onAnimationFrameWindow.bind(this);
            options.onSelectStart = options.onSelectStart || function(t, state) {};
            options.onReload = options.onReload || function(state) {};
            options.onExit = options.onExit || function(state) {};

            options.onSelect = options.onSelect || (function(t, state) {});
            options.onSelectEnd = options.selectEnd || (function(t, state) {});

            this.config = options;
            this.name = options.name || "unnamed";

            if (this.useCustomState) {
                // retrieve persistent state for this world
                let persistentState = this.persistentStateMap.get(options.name);
                if (!persistentState) {
                    persistentState = {};
                    this.persistentStateMap.set(options.name, persistentState);
                }

                this.customState = {};
                this.customState.persistent = persistentState;
                this.customState.globalPersistent = this.globalPersistentState;
            }

            if (options.setup) {
                // try {
                    return options.setup(this.customState, this, this._session).then(() => {
                        this.start();
                    })
                // } catch (e) {
                //   console.error(e);
                //   throw new Error("setup unsuccessful");
                // }
            }
            return this.start();
        }

        //
        // Private member functions (if we can claim such a thing...)
        //

        async _init() {
            this._initButton();
            this._initCanvasOnParentElement();
            this._initCustomState();

            const ctx = GFX.initGLContext(this._canvas, this.options.contextNames, this.options.contextOptions);
            console.assert(ctx.isValid);
            this._gl      = ctx.gl;
            this._version = ctx.version;

            if (this.options.glUseGlobalContext) {
                window.gl = this._gl;
            }
            if (this.options.glDoResourceTracking) {
                this._glAttachResourceTracking();
            }

            this.timeStart = 0;
            window.timeStart = this.timeStart;



            this.menu = new Menu();
            if (this.options.enableMultipleWorlds) {

                this.worldsScroll = createVerticalMenuElement();

                MR.initWorldsScroll = () => {
                    window.CLICKMENU = (id) => {
                        const el = document.getElementById(id);
                        el.classList = "active";
                        MR.wrangler.doWorldTransition({direction : null, key : id, broadcast : true}); 
                        MR.wrangler.menu.enableDisableWorldsScroll();     

                        window.DISABLEMENUFORWORLDSEXCEPT(id);   
                    }
                    window.DISABLEMENUFORWORLDSEXCEPT = (id) => {
                        const worldsMenuItems = this.worldsScroll.getElementsByTagName("div");

                        id = parseInt(id);
                        for (let i = 0; i < id; i += 1) {
                            worldsMenuItems[i].classList.remove("active");
                        }
                        for (let i = id + 1; i < worldsMenuItems.length; i += 1) {
                            worldsMenuItems[i].classList.remove("active");
                        }
                        worldsMenuItems[id].classList.add("active");
                    }
                    const worlds = MR.worlds;
                    const wCount = worlds.length;
                    const contentArr = [];
                    for (let i = 0; i < wCount; i += 1) {
                        contentArr.push(
                            "<div id="
                        );
                        contentArr.push(i);
                        contentArr.push(' onclick="window.CLICKMENU(this.id)">');
                        contentArr.push(i);
                        contentArr.push(' ');
                        contentArr.push(worlds[i].world.default().name);
                        contentArr.push("</div>\n");
                    }

                    this.worldsScroll.innerHTML = contentArr.join('');
                };

                this.worldsScrollEnabled = 0;
                this.worldsScroll.style.display = "none";
                const worldsScrollDisplayOpt = ["none", ""];

                this.menu.enableDisableWorldsScroll = () => {
                    this.worldsScrollEnabled = 1 - this.worldsScrollEnabled; 
                    this.worldsScroll.style.display = 
                    worldsScrollDisplayOpt[this.worldsScrollEnabled]; 
                }

                this.menu.menus.worldsSelection = new MenuItem(
                    this.menu.el,
                    'ge_menu',
                    "Worlds",
                    this.menu.enableDisableWorldsScroll
                );
                this.menu.menus.worldsSelection.el.appendChild(this.worldsScroll);

                this.menu.menus.transition = new MenuItem(
                    this.menu.el, 
                    'ge_menu', 
                    'Prev',
                    () => { MR.wrangler.doWorldTransition({direction : -1, broadcast : true}); }
                    );
                this.menu.menus.transition = new MenuItem(
                    this.menu.el, 
                    'ge_menu', 
                    'Next',
                    () => { return MR.wrangler.doWorldTransition({direction : +1, broadcast : true}); }
                    );

                this.playerViewScroll = createVerticalMenuElement();

                MR.initPlayerViewSelectionScroll = () => {
                    window.CLICKMENUPLAYERS = (id) => {
                        const el = document.getElementById(id);
                        el.classList = "active";
                        MR.wrangler.menu.enableDisablePlayersScroll();     

                        window.DISABLEMENUFORPLAYERSEXCEPT(id);   
                    }
                    window.DISABLEMENUFORPLAYERSEXCEPT = (id) => {
                        const playersMenuItems = this.playerViewScroll.getElementsByTagName("div");
                        id = parseInt(id);
                        for (let i = 0; i < id; i += 1) {
                            playersMenuItems[i].classList.remove("active");
                        }

                        const len = playersMenuItems.length;
                        for (let i = id + 1; i < len; i += 1) {
                            playersMenuItems[i].classList.remove("active");
                        }
                        playersMenuItems[id].classList.add("active");

                        const playerid = playersMenuItems[id].getAttribute("value");
                        MR.viewpointController.switchView(playerid);
                        MR.updatePlayersMenu();
                    }
                    function addPlayerMenuEntry(contentArr, i, id) {
                        contentArr.push(
                            "<div id="
                        );
                        contentArr.push(i);
                        contentArr.push(" value=");
                        contentArr.push(id);
                        contentArr.push(' onclick="window.CLICKMENUPLAYERS(this.id)">');
                        contentArr.push('       ');
                        contentArr.push(id);
                        contentArr.push("</div>\n");                        
                    }
                    MR.updatePlayersMenu = () => {
                        const players = MR.avatars;
                        const contentArr = [];

                        let i = 0;
                        for (let id in players) {
                            addPlayerMenuEntry(contentArr, i, id);
                            i += 1;
                        }

                        this.playerViewScroll.innerHTML = contentArr.join('');
                    };
                };

                this.playerViewScrollEnabled = 0;
                this.playerViewScroll.style.display = "none";
                const playerViewScrollDisplayOpt = ["none", ""];

                this.menu.enableDisablePlayersScroll = () => {
                    this.playerViewScrollEnabled = 1 - this.playerViewScrollEnabled; 
                    this.playerViewScroll.style.display = 
                    playerViewScrollDisplayOpt[this.playerViewScrollEnabled]; 
                }
//////////////////////////////////////////////////////////////////////////////////
                this.menu.menus.playerViewSelection = new MenuItem(
                    this.menu.el,
                    'ge_menu',
                    'User View',
                    this.menu.enableDisablePlayersScroll
                );
                this.menu.menus.playerViewSelection.el.appendChild(this.playerViewScroll);

                }

                this.menu.menus.worldsSelection = new MenuItem(
                    this.menu.el,
                    'ge_menu',
                    "Reconnect",
                    MR.initServer
                    );

                if (this.options.enableBellsAndWhistles) {
                    const status = await this._initWebVR();
                    if (!status) {
                        console.log('Initializing PC browser mode ...');
                        this._initFallback();
                    }
                } else {
                    console.log('Initializing PC browser mode ...');
                    this._initFallback();        
                }
                this.main();
            }

            _initButton() {
                if (this.options.enableBellsAndWhistles && this.options.enableEntryByButton) {
                    this._button = new XRDeviceButton({
                        onRequestSession: this._onVRRequestPresent.bind(this),
                        onEndSession: this._onVRExitPresent.bind(this)
                    });
                    document.querySelector('body').prepend(this._button.domElement);
                }
            }

            _initCanvasOnParentElement(parent = 'active') {
                const parentCanvasRecord = CanvasUtil.createCanvasOnElement(
                    'active',
                    this.options.outputSurfaceName,
                    this.options.outputWidth,
                    this.options.outputHeight
                    );
                console.assert(parentCanvasRecord !== null);
                console.assert(parentCanvasRecord.parent !== null);
                console.assert(parentCanvasRecord.canvas !== null);

                this._parent = parentCanvasRecord.parent;
                this._canvas = parentCanvasRecord.canvas;
            }

            _initCustomState() {
                if (this.useCustomState) {
                    console.log('Initializing custom state');
                    this.customState = {};
                    this.persistentStateMap = new Map();
                    this.globalPersistent = {};
                }
            }

            _initWebVR() {
                if (navigator.getVRDisplays) {
                    this._frameData = new VRFrameData();
                    const button = this._button;
                    const me = this;
                    navigator.getVRDisplays().then(function(displays) {
                        if (displays.length > 0) {
                        const vrDisplay = displays[displays.length - 1]; // ?
                        me._vrDisplay = vrDisplay;

                        // It's highly recommended that you set the near and far planes to somethin
                        // appropriate for your scene so the projection matrices WebVR produces
                        // have a well-scaled depth buffer.
                        vrDisplay.depthNear = 0.1;
                        vrDisplay.depthFar = 1024.0;

                        // Generally, you want to wait until VR support is confirmed and you know the
                        // user has a VRDisplay capable of presenting connected before adding UI that
                        // advertizes VR features.
                        if (vrDisplay.capabilities.canPresent) {
                            button.enabled = true;
                        }

                        // The UA may kick us out of VR present mode for any reason, so to ensure we
                        // always know when we gegin/end presenting we need to listen for events.
                        window.addEventListener('vrdisplaypresentchange', me.onVRPresentChange, false);

                        // These events fire when the user agent has had some indication that it would
                        // be appropriate to enter or exit VR presentation mode, such as the user putting
                        // on a headset and triggering a proximity sensor.
                        window.addEventListener('vrdisplayactivate', me.onVRRequestPresent, false);
                        window.addEventListener('vrdisplaydeactivate', me.onVRExitPresent, false);
                    } else {
                        console.warn('WebVR supported, but no displays found.');
                        // TODO route error modes to fallback display
                    }
                }, function() {
                    console.warn('Your browser does not support WebVR.');
                    // TODO route error modes to fallback display
                });
                    return true;
                } else if (navigator.getVRDevices) {
                    console.warn('Your browser supports WebVR, but not the latest version.')
                    return false;
                } else {
                    return false;
                }
            }

            defineWorldTransitionProcedure(fn) {
                this.doWorldTransition = fn.bind(this);
            }

            _initFallback() {
                const modalCanvasInit = () => {
                    const bodyWidth = document.body.getBoundingClientRect().width;
                    const parent = document.getElementById('output-container');
                    parent.float = 'right';
                    let P = parent;
                    P.style.left = (((P.style.left) + bodyWidth - this._canvas.clientWidth)) + "px";

                    const out = document.getElementById('output-element');
                    out.style.position = 'relative';
                    out.style.float = 'right';

                    let shiftX = parseInt(P.style.left);
                    let shiftY = 0;

                    let shiftDown__ = false;
                    let mouseDown__ = false;
                    let altDown = false;
                    let clientX = 0;
                    let clientY = 0;

                    window.getClientX = () => {
                        return clientX;
                    }

                    window.getClientY = () => {
                        return clientY;
                    }

                    const mouseMoveHandler__ = function(event) {
                        const w = MR.wrangler._canvas.clientWidth;
                        const h = MR.wrangler._canvas.clientHeight;
                        P.style.left = (clientX - (w / 2.0)) + "px";
                        P.style.top = (clientY - (h / 2.0)) + "px";
                    };

                    let beforeW;
                    let beforeH;
                    let altInitDown = true;
                    let initialX = 0;

                    document.addEventListener('mousemove', (event) => {
                        clientX = event.clientX;
                        clientY = event.clientY;

                        if (altDown) {
                            const cursorX = clientX;
                            if (altInitDown) {
                                altInitDown = false;
                                beforeW = CanvasUtil.baseCanvasDimensions.width;
                                beforeH = CanvasUtil.baseCanvasDimensions.height;
                                initialX = cursorX;
                            }

                            const xDist = (cursorX - initialX);
                            this._canvas.width = Math.max(64, beforeW + xDist);
                            this._canvas.height = Math.floor(beforeH * ((this._canvas.width / beforeW)));
                            
                            CanvasUtil.baseCanvasDimensions.width = this._canvas.clientWidth;
                            CanvasUtil.baseCanvasDimensions.height = this._canvas.clientHeight;
                            CanvasUtil.handleResizeEvent(this._canvas, this._canvas.clientWidth, this._canvas.clientHeight);
                        }
                    });
                    document.addEventListener('mousedown', (event) => {
                        clientX = event.clientX;
                        clientY = event.clientY;
                    });
                    document.addEventListener('mouseup', (event) => {
                        clientX = event.clientX;
                        clientY = event.clientY;
                    });
                    document.addEventListener('keydown', (event) => {
                        if (event.key == "`") {
                            window.addEventListener('mousemove', mouseMoveHandler__);
                            shiftDown__ = true;
                            mouseMoveHandler__({clientX : clientX, clientY : clientY});
                        } else if (event.key == 'Alt') {
                            if (window.navigator.userAgent.indexOf("Mac") != -1)
                                altDown = true;
 
                            event.preventDefault();
                        }
                    });
                    document.addEventListener('keyup', (event) => {
                        if (event.key == "`") {
                            window.removeEventListener('mousemove', mouseMoveHandler__);
                            shiftDown__ = false;
                        } else if (event.key == 'Alt') {
                            CanvasUtil.baseCanvasDimensions.width = this._canvas.clientWidth;
                            CanvasUtil.baseCanvasDimensions.height = this._canvas.clientHeight;
                            CanvasUtil.handleResizeEvent(this._canvas, this._canvas.clientWidth, this._canvas.clientHeight);

                            altInitDown = true;
                            altDown = false;

                            event.preventDefault();
                        }
                    });
                }
                modalCanvasInit();


            }

            _clearConfig() {
                this.config = this.config || {};
                const options = this.config;

                options.onStartFrame = (function(t, state) {});
                options.onEndFrame = (function(t, state) {});
                options.onDraw = (function(t, p, v, state, eyeIdx) {});
                options.onDrawXR = (function(t, p, v, state, eyeIdx) {});
                options.onAnimationFrame = this._onAnimationFrame.bind(this);
                options.onAnimationFrameWindow = this._onAnimationFrameWindow.bind(this);
                options.onReload = function(state) {};
                options.onExit = function(state) {};
            //options.onWindowFrame = this._onWindowFrame.bind(this);

            // selection
            options.onSelectStart = (function(t, state) {});
            options.onSelect = (function(t, state) {});
            options.onSelectEnd = (function(t, state) {});
        }

        _reset() {
            if (this._vrDisplay) {
                this._vrDisplay.cancelAnimationFrame(this._animationHandle);
            } else {
                window.cancelAnimationFrame(this._animationHandle);
            }
        }

        _onVRRequestPresent () {
            // This can only be called in response to a user gesture.
            this._vrDisplay.requestPresent([{ source: this._canvas }]).then(function () {
                // Nothing to do because we're handling things in onVRPresentChange.
            }, function (err) {
                console.error(err);
                console.log(err.name);
                console.log(err.message);
                console.log(err.code);
            });
        }
        
        _onVRExitPresent () {
            if (!this._vrDisplay.isPresenting)
                return;
            this._vrDisplay.exitPresent().then(function () {
            }, function (err) {
                console.error(err);
            });
        }

        _onVRPresentChange() {
            if (this._vrDisplay == null) {
                return;
            }

            if (this._vrDisplay.isPresenting) {
                if (!this._VRIsActive) {
                    this._oldCanvasWidth = this._canvas.width;
                    this._oldCanvasHeight = this._canvas.height;
                    const leftEye = this._vrDisplay.getEyeParameters('left');
                    const rightEye = this._vrDisplay.getEyeParameters('right');

                    this._canvas.width  = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
                    this._canvas.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);

                    this._vrDisplay.resetPose();
                }
                this._VRIsActive = true;

                return;
            }
            if (this._VRIsActive) {
                this.canvas.width   = this._oldCanvasWidth;
                this._canvas.height = this._oldCanvasHeight;
            }
            this._VRIsActive = false;


        }

        _onFrameXR(t) {
        }

        _onAnimationFrameWindow(t) {
            this.time = t / 1000.0;
            this.timeMS = t;

            this._animationHandle = window.requestAnimationFrame(this.config.onAnimationFrame);
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            mat4.identity(this._viewMatrix);
            mat4.perspective(this._projectionMatrix, Math.PI/4,
                gl.canvas.width / gl.canvas.height,
                0.01, 1024);

            Input.updateKeyState();
            this.config.onStartFrame(t, this.customState);

            GFX.viewportXOffset = 0;
            this.config.onDraw(t, this._projectionMatrix, this._viewMatrix, this.customState);
            this.config.onEndFrame(t, this.customState);
        }

        _onAnimationFrame(t) {
            this.time = t / 1000.0;
            this.timeMS = t;

            // For now, all VR gamepad button presses trigger a world transition.
            MR.controllers = navigator.getGamepads();
            let gamepads = navigator.getGamepads();
            let vrGamepadCount = 0;
            let doTransition = false;
            for (var i = 0; i < gamepads.length; ++i) {
                var gamepad = gamepads[i];
                if (gamepad) { // gamepads may contain null-valued entries (eek!)
                    if (gamepad.pose || gamepad.displayId ) { // VR gamepads will have one or both of these properties.
                        var cache = this.buttonsCache[vrGamepadCount] || [];
                        for (var j = 0; j < gamepad.buttons.length; j++) {

                            // Check for any buttons that are pressed and previously were not.

                            if (cache[j] != null && !cache[j] && gamepad.buttons[j].pressed) {
                                console.log('pressed gamepad', i, 'button', j);
                                //doTransition = true;
                            }
                            cache[j] = gamepad.buttons[j].pressed;
                        }
                        this.buttonsCache[vrGamepadCount] = cache;
                        vrGamepadCount++;
                    }
                }
            }

            // revert to windowed rendering if there is no VR display
            // or if the VR display is not presenting
            const vrDisplay = this._vrDisplay;
            if (!vrDisplay) {
                this.config.onAnimationFrameWindow(t);
                if (this.options.enableMultipleWorlds && doTransition) {
                   this.doWorldTransition({direction : 1, broadcast : true});
                }
                return;
            }

            const gl = this._gl;
            const frame = this._frameData;
            if (!vrDisplay.isPresenting) {
               this.config.onAnimationFrameWindow(t);
               if (this.options.enableMultipleWorlds && doTransition) {
                  this.doWorldTransition({direction : 1, broadcast : true});
               }
               return;
            }
            vrDisplay.getFrameData(frame);

            this._animationHandle = vrDisplay.requestAnimationFrame(this.config.onAnimationFrame);

            Input.updateControllerState();
            this.config.onStartFrame(t, this.customState);

            // left eye
            gl.viewport(0, 0, gl.canvas.width * 0.5, gl.canvas.height);
            GFX.viewportXOffset = 0;
            this.config.onDrawXR(t, frame.leftProjectionMatrix, frame.leftViewMatrix, this.customState);
                    
            // right eye
            gl.viewport(gl.canvas.width * 0.5, 0, gl.canvas.width * 0.5, gl.canvas.height);
            GFX.viewportXOffset = gl.canvas.width * 0.5;
            this.config.onDrawXR(t, frame.rightProjectionMatrix, frame.rightViewMatrix, this.customState);

            this.config.onEndFrame(t, this.customState);
            if (this.options.enableMultipleWorlds && doTransition) {
               this.doWorldTransition({direction : 1, broadcast : true});
            }
            vrDisplay.submitFrame();
        }

        _glAttachResourceTracking() {
            if (!this.glDoResourceTracking) {
                return;
            }
            GFX.glAttachResourceTracking(this._gl, this._version);
        }

        _glFreeResources() {
            if (!this.glDoResourceTracking) {
                return;
            }
            //console.log("Cleaning graphics context:");
            GFX.glFreeResources(this._gl);
        }
    };

    return VRBasicCanvasWrangler;
})();
