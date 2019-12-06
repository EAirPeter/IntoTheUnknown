"use strict";

const MREditor = (function() {
    
    const _outEnabled = {};
    const _outDisabled = {};

    const TEXT_COLOR_NO_ERROR = "#d3b58d"; //'#BFBFBF';
    const TEXT_COLOR_ERROR    = '#dddda0';
    const ERR_COLOR_MESSAGE   = 'red';
    const BG_COLOR_NO_ERROR   = 'black';
    const BG_COLOR_ERROR      = 'black';

    let globalErrorMsgNode;
    let globalErrorMsgNodeText;
    let globalErrorMsgState = {vertex : "", fragment : "", link : ""};

    class Editor {
        constructor() {
            this.libMap = null;
            this.tempCompiledShader = null;
            this.libToShaderMap = new Map();
        }
    }
    const _out = new Editor();
    MR.editor = _out;

    function hookIntoGFXLib(gfxLib__) {

    }
    _out.hookIntoGFXLib = hookIntoGFXLib;


    function disable() {

    }
    _out.disable = disable;

    function enable() {

    }
    _out.enable = enable;

    _out.shaderMap = null;

    function detectFeatures() {
        const textArea = document.createElement("textarea");
        document.body.appendChild(textArea);
        textArea.focus();

        MREditor.insertTextSupported = document.queryCommandEnabled("insertText");
        console.log("insertTextSupport:", MREditor.insertTextSupported);
        textArea.blur();

        document.body.removeChild(textArea);
    }
    _out.detectFeatures = detectFeatures;


    function autoExpand(field) {
      // field.style.height = "inherit";

      // var computed = window.getComputedStyle(field);

      // var height = parseInt(computed.getPropertyValue('border-top-width'), 10) +
      //              parseInt(computed.getPropertyValue('padding-top'), 10) +
      //              field.scrollHeight +
      //              parseInt(computed.getPropertyValue('padding-bottom'), 10) +
      //              parseInt(computed.getPropertyValue('border-bottom-width'), 10);


      // field.style.height = height + 'px';

      let text = field.value.split('\n');
      let cols = 0;
      for (let i = 0; i < text.length; i += 1) {
          cols = Math.max(cols, text[i].length);
      }

      field.rows = text.length;
      field.cols = cols;
    }
 

    function watchFiles(arr, status = {}) {
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

    function unwatchFiles(arr, status = {}) {
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

        MR.server.sock.send(JSON.stringify({"MR_Message" : "Unwatch_Files", "files" : arr}));
    }

    function resetState() {
        MREditor.nextLibID = 1;
        if (MREditor.shaderMap) {   
            let toUnwatch = [];
            for (let record of MREditor.shaderMap.values()) {
                for (let prop in record.paths) {
                    if (Object.prototype.hasOwnProperty.call(record.paths, prop)) {
                        toUnwatch.push(record.paths[prop]);
                    }
                }
            }

            if (MREditor.libGroupMap) {
                for (let record of MREditor.libGroupMap.values()) {
                    if (record.paths) {
                        for (let prop in record.paths) {
                            if (Object.prototype.hasOwnProperty.call(record.paths, prop)) {
                                toUnwatch.push(record.paths[prop]);
                            }                        
                        }
                    }
                }
            }
            if (toUnwatch.length > 0) {
                unwatchFiles(toUnwatch);
            }

            for (let prop in globalErrorMsgState) {
                globalErrorMsgState[prop] = "";
            }
            globalErrorMsgNodeText.nodeValue = "";
        }
        {
          _out.shaderMap = new Map();
          const _tareas = document.getElementById("text-areas");
          if (!_tareas) {
            return;
          }
          const _children = _tareas.children;
          for (let i = 0; i < _children.length; i += 1) {
            let _subtareas = _children[i];
            while (_subtareas && _subtareas.firstChild) {
                _subtareas.removeChild(_subtareas.firstChild);
            }
          }
        }
        {
          if (wrangler.externalWindow) {
            const _tareas = wrangler.externalWindow.document.getElementById("text-areas");
            if (!_tareas) {
              return;
            }
            const _children = _tareas.children;
            for (let i = 0; i < _children.length; i += 1) {
              let _subtareas = _children[i];
              while (_subtareas && _subtareas.firstChild) {
                  _subtareas.removeChild(_subtareas.firstChild);
              }
            }
          }
        }

        _out.libMap = null;
        _out.libGroupMap = null;

        GFX.tempCompiledShaderDirty = false;
        GFX.tempPreprocessorErrRecord = null;
        GFX.tempCompiledShader = null;
    }
    _out.resetState = resetState;

        const saveCallback = (event) => {
            let msgs = [];
            let ok = true;
            { // save shaders
                const keys = MREditor.shaderMap.keys();
                let kcount = 0;
                const status = {};

                for (const k of keys) {
                    ok = ok && saveShaderToFile(k, status);
                    
                    if (status.message === "ERR_SERVER_UNAVAILABLE") {
                        MR.wrangler.menu.save.name = "save failed, server unavailable";
                        const oldStyle = window.getComputedStyle(MR.wrangler.menu.save.el);

                        MR.wrangler.menu.save.el.style.color = "red";

                        setTimeout(() => {
                            MR.wrangler.menu.save.name = MR.wrangler.menu.save.nameInit;
                            MR.wrangler.menu.save.el.style = oldStyle;
                        }, 1000);

                        MR.server.subs.subscribeOneShot('open', saveCallback);
                        // attempt to re-connect
                        MR.initServer();



                        return;
                    }

                    msgs.push(k);
                    kcount += 1;
                }

                if (!ok) {
                    if (kcount != 0) {
                        msgs = ["save failed, fix errors first"];
                        MR.wrangler.menu.save.name = msgs[0];
                        const oldStyle = window.getComputedStyle(MR.wrangler.menu.save.el);

                        MR.wrangler.menu.save.el.style.color = "red";

                        setTimeout(() => {
                            MR.wrangler.menu.save.name = MR.wrangler.menu.save.nameInit;
                            MR.wrangler.menu.save.el.style = oldStyle;
                        }, 1000);

                        return;
                    }
                }
            }

            { // save shader libraries
                const keys = MREditor.libGroupMap.keys();
                let kcount = 0;
                const status = {};

                for (const k of keys) {
                    ok = ok && saveShaderLibsToFile(k, status);

                    msgs.push(k);
                    kcount += 1;
                }

                if (!ok) {
                    msgs = ["save failed"];
                    MR.wrangler.menu.save.name = msgs[0] + " " + status.message;
                    const oldStyle = window.getComputedStyle(MR.wrangler.menu.save.el);

                    MR.wrangler.menu.save.el.style.color = "red";

                    setTimeout(() => {
                        MR.wrangler.menu.save.name = MR.wrangler.menu.save.nameInit;
                        MR.wrangler.menu.save.el.style = oldStyle;
                    }, 1000);
                    return;
                }
            }

            const oldStyle = window.getComputedStyle(MR.wrangler.menu.save.el);
            MR.wrangler.menu.save.el.style.color = "#66ff00";
            MR.wrangler.menu.save.name = "saved";
            const intervalID = setInterval(() => {
                MR.wrangler.menu.save.name = MR.wrangler.menu.save.nameInit;
                MR.wrangler.menu.save.el.style = oldStyle;
                clearInterval(intervalID);
            }, 350);

            // if (msgs.length > 0) {
            //     const oldStyle = window.getComputedStyle(MR.wrangler.menu.save.el);
            //     MR.wrangler.menu.save.el.style.color = "#66ff00";
            //     MR.wrangler.menu.save.name = "saved " + msgs[0];

            //     let i = 1;
            //     const intervalID = setInterval(() => {
            //         if (i === msgs.length) {
            //             MR.wrangler.menu.save.name = MR.wrangler.menu.save.nameInit;
            //             MR.wrangler.menu.save.el.style = oldStyle;
            //             clearInterval(intervalID);
            //         } else {
            //             MR.wrangler.menu.save.name = "saved " + msgs[i];
            //         }

            //         i += 1;

            //     }, 350);
            // }
        };


    function init(args) {

        this.defaultShaderCompilationFunction = 
        args.defaultShaderCompilationFunction || this.onNeedsCompilationDefault;

        this.getExternalWindow = args.externalWindowGetter;

        const doc = (this.getExternalWindow) ? this.getExternalWindow().document : document;

        doc.addEventListener('input', function (event) {
            if (event.target.tagName.toLowerCase() !== 'textarea') return;
            autoExpand(event.target);
        }, false);

        resetState();



        const showHideState = {
            idx   : 0,
            text  : ["Show", "Hide"],
            style : ["none", "block"],
            classes : ["hidden", "shown"]
        };
        MREditor.toggleHideEditor = (event) => {
            MR.wrangler.menu.hide.name = 
                showHideState.text[showHideState.idx];
            document.getElementById('text-areas').style.display = 
                showHideState.style[showHideState.idx];

            showHideState.idx ^= 1;

            const classes = showHideState.classes;
            globalErrorMsgNode.classList.remove(classes[1 - showHideState.idx]);
            globalErrorMsgNode.classList.add(classes[showHideState.idx]);

            MR.wrangler.codeIsHidden = (showHideState.idx === 1);
        };
        MREditor.hideEditor = (event) => {
            MR.wrangler.menu.hide.name = 
                showHideState.text[0];
            document.getElementById('text-areas').style.display = 
                showHideState.style[0];

            showHideState.idx = 1;

            const classes = showHideState.classes;
            globalErrorMsgNode.classList.remove(classes[1]);
            globalErrorMsgNode.classList.add(classes[0]);

            MR.wrangler.codeIsHidden = true;
        };
        MREditor.showEditor = (event) => {
            MR.wrangler.menu.hide.name = 
                showHideState.text[1];
            document.getElementById('text-areas').style.display = 
                showHideState.style[1];

            showHideState.idx = 0;

            const classes = showHideState.classes;
            globalErrorMsgNode.classList.remove(classes[0]);
            globalErrorMsgNode.classList.add(classes[1]);

            MR.wrangler.codeIsHidden = false;
        };

        MR.wrangler.menu.hide = new MenuItem(
            MR.wrangler.menu.el, 'ge_menu', 'Hide', 
            MREditor.toggleHideEditor
        );
        MR.wrangler.codeIsHidden = false;

        document.getElementById("text-areas").style.paddingBottom = 
            (MR.wrangler.menu.el.getBoundingClientRect().height * 1.5) + "px";

        MR.wrangler.menu.save = new MenuItem(MR.wrangler.menu.el, 'ge_menu', 'Save', saveCallback);
        document.addEventListener("keydown", function(e) {
          if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)  && e.keyCode == 83) {
            e.preventDefault();
            saveCallback(e);
          }
        }, false);

        const header = doc.createElement("H1");
        header.classList.add("status_info");
        header.classList.add("hidden");
        header.classList.add("fixed");
        header.style.color = ERR_COLOR_MESSAGE;
        const text   = doc.createTextNode('');
        header.appendChild(text);
        const textAreas = document.getElementById('text-areas');

        textAreas.parentNode.insertBefore(header, textAreas);

        globalErrorMsgNode = header;
        globalErrorMsgNodeText = text;
    }
    _out.init = init;

    function createShaderProgramFromStringsAndHandleErrors(vertex, fragment) {
        GFX.tempCompiledShader = GFX.createShaderProgramFromStrings(
            vertex,
            fragment
        );
        GFX.tempCompiledShaderDirty = true;
    }
    _out.createShaderProgramFromStringsAndHandleErrors = createShaderProgramFromStringsAndHandleErrors;

    function preprocessAndCreateShaderProgramFromStringsAndHandleErrors(vertex, fragment, libMap, autoIncludes) {
        
        const vertRecord = GFX.preprocessShader(vertex,   libMap);
        const fragRecord = GFX.preprocessShader(fragment, libMap);

        if (!vertRecord.isValid || !fragRecord.isValid) {
            GFX.tempErrorDirty = true;
            GFX.tempPreprocessorErrRecord = {program : null, errRecord : {
                vertex : vertRecord.errRecord, 
                fragment : fragRecord.errRecord
            }};

            GFX.tempCompiledShaderDirty = true;
            return;
        }

        GFX.tempCompiledShader = GFX.createShaderProgramFromStrings(
            vertRecord.shaderSource,
            fragRecord.shaderSource
        );
        GFX.tempCompiledShaderDirty = true;
    }
    _out.preprocessAndCreateShaderProgramFromStringsAndHandleErrors = preprocessAndCreateShaderProgramFromStringsAndHandleErrors;


    async function loadAndRegisterShaderLibrariesForLiveEditing(_gl, key, args, options) {
        return new Promise(async (resolve, reject) => {
            const libArgs = [];
            try {
                let err = false;
                Promise.all(args.map(async lib => {
                    if (!lib.path) {
                        return;
                    }

                    const libSrc = await assetutil.loadText(lib.path);
                    if (libSrc === null) {
                        err = true;
                        reject(null);
                    }

                    libArgs.push({key : lib.key, code : libSrc, path : lib.path, foldDefault : lib.foldDefault});

                })).then(result => {
                    if (err) {
                        reject(null);
                    } else {
                        _out.registerShaderLibrariesForLiveEditing(_gl, key, libArgs, options);
                        resolve(libArgs);
                    }
                });
            } catch (err) {
                reject(null);
            }
        }).catch((err) => { return null; });
    }
    _out.loadAndRegisterShaderLibrariesForLiveEditing = loadAndRegisterShaderLibrariesForLiveEditing;

    _out.recompileDelayDefault = 50;

    function registerShaderLibrariesForLiveEditing(_gl, key, args, options) {
        if (!args) {
            console.warn("No libraries object specified. Libraries section will be empty.");
            return;
        }

        if (!this.libMap) {
            this.libMap = new Map();
        }
        const libMap = this.libMap;

        if (!this.libGroupMap) {
            this.libGroupMap = new Map();
            this.nextLibID = 1;
        }
        const libGroupMap = this.libGroupMap;
        let record = libGroupMap.get(key);
        if (!record) {
            record = {
                args : args, originals : {}, textAreas : {}, 
                assocShaderCompileCallbacks : new Map(),
                options : options,
                paths : {},
            };
            libGroupMap.set(key, record);
        }
       
        for (let i = 0; i < args.length; i += 1) {
            const codeKey = args[i].key;
            const codeTxt = args[i].code;

            record.originals[codeKey] = codeTxt;

            libMap.set(codeKey, codeTxt);
        }

        const doc = (MR.wrangler.externalWindow) ? MR.wrangler.externalWindow.document : document;

        const textAreas = doc.getElementById("shader-libs-container");

        const textAreaElements = record.textAreas;

            // create shader lib container
            const SHADER_DIV = doc.createElement("div");
            SHADER_DIV.setAttribute("id", key + "-shader-lib-container");
            textAreas.appendChild(SHADER_DIV);

                // create header
                const HEADER_DIV = doc.createElement("div");
                HEADER_DIV.setAttribute("id", key + "lib header");
                SHADER_DIV.appendChild(HEADER_DIV); 
                const hOuter = doc.createElement("H1");
                const tOuter = doc.createTextNode(key + '\n');
                hOuter.classList = "shader_section_success";
                hOuter.appendChild(tOuter);
                HEADER_DIV.appendChild(hOuter);

            SHADER_DIV.appendChild(HEADER_DIV);

                // create hideable container
                const SHADER_LIB_GROUP_DIV = doc.createElement("div");
                SHADER_LIB_GROUP_DIV.setAttribute("id", key + "hideable container lib");

            SHADER_DIV.appendChild(SHADER_LIB_GROUP_DIV);

                HEADER_DIV.onclick = () => {
                    const isHidden = !propHiddenState.get('main');
                    propHiddenState.set('main', isHidden);
                    switch (isHidden) {
                    case true: {
                        HTMLUtil.hideElement(SHADER_LIB_GROUP_DIV);
                        hOuter.classList = "shader_section_success_inactive";

                        return;
                    }
                    case false: {
                        HTMLUtil.showElement(SHADER_LIB_GROUP_DIV);
                        hOuter.classList = "shader_section_success";

                        return;
                    }
                    default: {
                        return;
                    }
                    }
                }

        const propHiddenState = new Map();
        propHiddenState.set("main", false);

        for (let i = 0; i < args.length; i += 1) {
            const arg = args[i];
            let text = '';
            let code = '';

            code = arg.code;
            text = code.split('\n');
            const prop = arg.key;

            let DIV = doc.createElement("div");
            DIV.setAttribute("id", key + " : " + prop + "_div");

            let h = doc.createElement("H1");                // Create a <h1> element
            let t = doc.createTextNode(key + " : " + prop + '\n');
            h.appendChild(t);

            DIV.appendChild(h);

            SHADER_LIB_GROUP_DIV.appendChild(DIV);

            const thisTextArea = doc.createElement("textarea");
            thisTextArea.spellcheck = false;
            textAreaElements[prop] = thisTextArea;
            DIV.appendChild(thisTextArea);
            thisTextArea.setAttribute("id", key + "_" + prop + "_textArea");
            thisTextArea.setAttribute("class", "tabSupport");
            thisTextArea.style.wrap = "off";

            let parentElement = thisTextArea.parentElement;

            if (arg.foldDefault) {
                propHiddenState.set(key + prop, true);
                h.classList = "shader_section_success_inactive";
                HTMLUtil.hideElement(thisTextArea);
            } else {
                propHiddenState.set(key + prop, false);
                h.classList = "shader_section_success";
            }

            h.onclick = () => {
                const isHidden = !propHiddenState.get(key + prop);
                propHiddenState.set(key + prop, isHidden);

                switch (isHidden) {
                case true: {
                    HTMLUtil.hideElement(thisTextArea);
                    h.classList = "shader_section_success_inactive";

                    return;
                }
                case false: {
                    HTMLUtil.showElement(thisTextArea);
                    h.classList = "shader_section_success";
                    return;
                }
                default: {
                    return;
                }
                }
            };

            let cols = 0;
            for (let i = 0; i < text.length; i += 1) {
                cols = Math.max(cols, text[i].length);
            }

            thisTextArea.rows = text.length + 1;
            thisTextArea.cols = cols;
            thisTextArea.value = code;
            thisTextArea.style.backgroundColor = BG_COLOR_NO_ERROR;
            thisTextArea.style.color = TEXT_COLOR_NO_ERROR;

            const textarea = thisTextArea;




            thisTextArea.addEventListener('keyup', (event) => {

                event.preventDefault();

                if (record["timeout" + prop]) {
                    clearTimeout(record["timeout" + prop]);
                }

                switch (event.key) {
                case "`": {
                }
                case "ArrowUp": {
                }
                case "ArrowDown": {
                }
                case "ArrowLeft": {
                }
                case "ArrowRight": {
                    return;
                }
                default: {
                    break;
                }
                }
                record["timeout" + prop] = setTimeout(() => {
                    for (let i = 0; i < record.args.length; i += 1) {
                        const textE = textAreaElements[prop]; 
                        if (textE) {
                            record.args[i][prop] = textE.value;
                            libMap.set(prop, textE.value);
                        }
                    } 

                    console.warn("TODO: Only re-compile dependent shaders");

     
                    for (const v of this.shaderMap.values()) {
                        v.compile();
                    }

                }, MREditor.recompileDelayDefault);
            });

            if (MREditor.insertTextSupported) {
                thisTextArea.addEventListener('keydown', (event) => {
                    const cursor = textarea.selectionStart;
                    if(event.key == "Tab") {
                        event.preventDefault();
                        doc.execCommand("insertText", false, '    ');
                    } else if (event.key == "Enter") {
                        event.preventDefault();
                        doc.execCommand("insertText", false, '\n');
                    } else if (event.key == '`') {
                        event.preventDefault();
                        return;
                    }
                });
            } else {
                thisTextArea.addEventListener('keydown', (event) => {
                    if (event.key == "Tab") {
                        // event.preventDefault()
                        // const cursor = textarea.selectionStart
                        // textarea.value = textarea.value.slice(0, cursor) + '    ' + textarea.value.slice(textarea.selectionEnd)
                        // textarea.selectionStart = textarea.selectionEnd = cursor + 4
                    } else if (event.key == "Enter") {
                        // event.preventDefault()
                        // const cursor = textarea.selectionStart
                        // textarea.value = textarea.value.slice(0, cursor) + '\n' + textarea.value.slice(textarea.selectionEnd)
                        // textarea.selectionStart = textarea.selectionEnd = cursor + 1
                    } else if (event.key == '`') {
                        event.preventDefault();
                        return;
                    }
                });
            }
        }

        { //// watch files
            const toWatch = []
            for (let i = 0; i < args.length; i += 1) {
                const arg = args[i];
                let saveTo = _out.defaultShaderOutputPath;

                if (arg.path) {
                    const argPath = arg.path;
                    const parentPath = getCurrentPath(window.location.pathname);
                    saveTo = getPath(arg.path);

                    const origin = window.location.origin;
                    const originIdx = saveTo.indexOf(origin);
                    saveTo = saveTo.substring(originIdx + origin.length + 1);

                    if (parentPath !== '/' && parentPath !== '\\') {
                        const parentIdx = saveTo.indexOf(parentPath);
                        saveTo = saveTo.substring(parentIdx + parentPath.length);
                    }
                    const prop = arg.key;
                    record.paths[prop] = saveTo;

                    toWatch.push(saveTo);
                    MR.server.subsLocal.subscribe("Update_File", (filename, args) => {
                        if (args.file !== filename) {
                            console.log("file does not match");
                            return;
                        }
                        console.log("updating file");

                        const textE = textAreaElements[prop]
                        if (textE) {
                            record.args[prop] = args.content;
                            textE.value = args.content;
                            for (const v of this.shaderMap.values()) {
                                v.compile();
                            }
                        }
                    }, saveTo);
                }

            }
       
            console.log(record.paths);
            if (toWatch.length > 0) {
                watchFiles(toWatch);
            }
        } ////


    }
    _out.registerShaderLibrariesForLiveEditing = registerShaderLibrariesForLiveEditing;



    function onNeedsCompilationDefault(args, libMap, userData) {
        const vertex    = args.vertex;
        const fragment  = args.fragment;

        const vertRecord = GFX.preprocessShader(vertex,   libMap);
        const fragRecord = GFX.preprocessShader(fragment, libMap);

        if (!vertRecord.isValid || !fragRecord.isValid) {
            return {program : null, errRecord : {
                vertex : vertRecord.errRecord, 
                fragment : fragRecord.errRecord
            }};
        }
        
        const errRecord = {};
        const program = GFX.createShaderProgramFromStrings(
            vertRecord.shaderSource, 
            fragRecord.shaderSource, 
            errRecord
        );

        return {program : program, errRecord : errRecord}
    }
    _out.onNeedsCompilationDefault = onNeedsCompilationDefault;

    function onNeedsCompilationNoPreprocessorDefault(args, libMap, userData) {
        const vertex    = args.vertex;
        const fragment  = args.fragment;
        
        const errRecord = {};
        const program = GFX.createShaderProgramFromStrings(
            vertRecord.shaderSource, 
            fragRecord.shaderSource, 
            errRecord
        );

        return {program : program, errRecord : errRecord};        
    }
    _out.onNeedsCompilationNoPreprocessorDefault = onNeedsCompilationNoPreprocessorDefault;

    function saveLibsToFile(key) {
        if (!key) {
            console.error("No shader key specified");
            return;
        }        
    }

    _out.defaultShaderOutputPath = "worlds/saved_editor_shaders";



    function saveShaderToFile(key, status = {}) {
        console.log("Saving:", key);
        if (!key) {
            status.message = "ERR_NO_KEY_SPECIFIED";
            console.error("No shader key specified");
            return false;
        }

        const record = MREditor.shaderMap.get(key);
        if (!record) {
            status.message = "ERR_NO_SHADER_RECORD";
            console.error("Shader not on record");
            return false;
        }

        if (record.hasError) {
            status.message = "ERR_SHADER_HAS_ERROR";
            console.warn("Writing canceled, shader has error");
            return false;
        }

        if (MR.server.sock.readyState !== WebSocket.OPEN) {
            status.message = "ERR_SERVER_UNAVAILABLE";
            console.error("Server is unavailable");

            return false;
        }

        const options = record.options;

        let writeQueue = [];
        function enqueueWrite(q, text, path, opts) {
            //console.log("writing", text, "to", getPath(relativePath));

            q.push({path : path, text : text, opts : opts});
        }
        function submitWrite(q) {
            MR.server.sock.send(JSON.stringify({"MR_Message" : "Write_Files", "files" : q}));
        }

        for (let prop in record.args) {
            if (Object.prototype.hasOwnProperty.call(record.args, prop)) {
                const textE = record.textAreas[prop];
                if (textE) {
                    let saveTo = _out.defaultShaderOutputPath;
                    let guardAgainstOverwrite = true;
                    if (options && options.paths && options.paths[prop]) {
                        guardAgainstOverwrite = false;

                        const parentPath = getCurrentPath(window.location.pathname);
                        // const localPath = options.saveTo[prop];
                        // console.log("parentPath:", parentPath);
                        // console.log("local file to save:", options.saveTo[prop]);
                        // console.log("origin:", window.location.origin);
                        
                        saveTo = getPath(options.paths[prop]);

                        const origin = window.location.origin;
                        const originIdx = saveTo.indexOf(origin);
                        saveTo = saveTo.substring(originIdx + origin.length + 1);
                        // console.log("remove origin:", saveTo);

                        if (parentPath !== '/' && parentPath !== '\\') {
                            const parentIdx = saveTo.indexOf(parentPath);
                            saveTo = saveTo.substring(parentIdx + parentPath.length);
                        }
                    } else {
                        saveTo += "/" + prop + ".glsl";
                    }

                    console.log("Destination:", saveTo);

                    enqueueWrite(writeQueue, textE.value, saveTo, {guardAgainstOverwrite : guardAgainstOverwrite});
                }

            }
        }
        if (writeQueue.length > 0) {
            submitWrite(writeQueue);
        }

        return true;
    }
    _out.saveShaderToFile = saveShaderToFile;

    function saveShaderLibsToFile(key, status = {}) {
        console.log("Saving:", key);
        if (!key) {
            status.message = "ERR_NO_KEY_SPECIFIED";
            console.error("No shader lib key specified");
            return false;
        }

        const record = MREditor.libGroupMap.get(key);
        if (!record) {
            status.message = "ERR_NO_SHADER_RECORD";
            console.error("Shader lib not on record");
            return false;
        }

        if (MR.server.sock.readyState !== WebSocket.OPEN) {
            status.message = "ERR_SERVER_UNAVAILABLE";
            console.error("Server is unavailable");

            return false;
        }

        let writeQueue = [];
        function enqueueWrite(q, text, path, opts) {
            q.push({path : path, text : text, opts : opts});
        }
        function submitWrite(q) {
            MR.server.sock.send(JSON.stringify({"MR_Message" : "Write_Files", "files" : q}));
        }

        for (let i = 0; i < record.args.length; i += 1) {
            let arg  = record.args[i];
            let prop = arg.key;

            const textE = record.textAreas[prop];
            if (textE) {
                let saveTo = _out.defaultShaderOutputPath;
                let guardAgainstOverwrite = true;

                if (arg.path) {
                    guardAgainstOverwrite = false;

                    const parentPath = getCurrentPath(window.location.pathname);
                    
                    saveTo = getPath(arg.path);

                    const origin = window.location.origin;
                    const originIdx = saveTo.indexOf(origin);
                    saveTo = saveTo.substring(originIdx + origin.length + 1);

                    if (parentPath !== '/' && parentPath !== '\\') {
                        const parentIdx = saveTo.indexOf(parentPath);
                        saveTo = saveTo.substring(parentIdx + parentPath.length);
                    }
                } else {
                    saveTo += "/" + prop + ".glsl";
                }

                console.log("Destination:", saveTo);

                enqueueWrite(writeQueue, textE.value, saveTo, {guardAgainstOverwrite : guardAgainstOverwrite});
            }
        }
        if (writeQueue.length > 0) {
            submitWrite(writeQueue);
        }

        return true;
    }
    _out.saveShaderLibsToFile = saveShaderLibsToFile;

    async function loadAndRegisterShaderForLiveEditing(_gl, key, callbacks, options) {
        if (!options || !options.paths || !options.paths.vertex || !options.paths.fragment) {
            return Promise.reject("No paths provided");
        }
        return new Promise(async (resolve, reject) => {
            try {
                const vsrc = await assetutil.loadText(options.paths.vertex);
                const fsrc = await assetutil.loadText(options.paths.fragment);
                
                _out.registerShaderForLiveEditing(
                    _gl, key, 
                    {vertex : vsrc, fragment : fsrc}, 
                    callbacks, 
                    options
                );
                resolve([vsrc, fsrc]);
            } catch (err) {
                reject(null);
            }
            

        });
    }
    _out.loadAndRegisterShaderForLiveEditing = loadAndRegisterShaderForLiveEditing;

    _out.insertTextSupported = true;

    function updateShaderCompilationCallbacks(key, callbacks) {
        if (!key) {
            return;
        }

        const record = MREditor.shaderMap.get(key);
        if (!record) {
            return;
        }

        record.onNeedsCompilation = callbacks.onNeedsCompilation || record.onNeedsCompilation;
        record.onAfterCompilation = callbacks.onAfterCompilation || record.onAfterCompilation;
    }
    _out.updateShaderCompilationCallbacks = updateShaderCompilationCallbacks;

    function registerShaderForLiveEditing(_gl, key, args, callbacks, options) {
        if (!key) {
            console.error("No shader key specified");
            return;
        }

        const onNeedsCompilation = callbacks.onNeedsCompilation || this.defaultShaderCompilationFunction;

        const onAfterCompilation = callbacks.onAfterCompilation;
        const userData = (options && options.userData) ? options.userData : null;

        const libMap = this.libMap || null;

        let record = MREditor.shaderMap.get(key);
        if (!record) {
            record = {
                args : args, 
                originals : {}, 
                textAreas : {}, 
                logs: {}, 
                errorMessageNodes : {}, 
                program : null, 
                compile : null, 
                options : options, 
                hasError : false,
                errorStates : {},
                headers : {},
                paths : {},
                lineAdjustments : {},
                onAfterCompilation : onAfterCompilation,
                onNeedsCompilation : onNeedsCompilation
            };

            MREditor.shaderMap.set(key, record);
            for (let prop in args) {
                if (Object.prototype.hasOwnProperty.call(args, prop)) {
                    record.originals[prop] = args[prop];
                }
            }
        }


        const doc = (MR.wrangler.externalWindow) ? MR.wrangler.externalWindow.document : document;
        const textAreas = doc.getElementById("shader-programs-container");
        const textAreaElements = record.textAreas;

            // create shader container
            const SHADER_DIV = doc.createElement("div");
            SHADER_DIV.setAttribute("id", key + "-shader-container");
            textAreas.appendChild(SHADER_DIV);

                // create header
                const HEADER_DIV = doc.createElement("div");
                HEADER_DIV.setAttribute("id", key + "header");
                SHADER_DIV.appendChild(HEADER_DIV); 
                const hOuter = doc.createElement("H1");
                const tOuter = doc.createTextNode(key + '\n');
                hOuter.classList = "shader_section_success";
                hOuter.appendChild(tOuter);
                HEADER_DIV.appendChild(hOuter);

            SHADER_DIV.appendChild(HEADER_DIV);

                // create hideable container
                const SHADER_STAGE_DIV = doc.createElement("div");
                SHADER_STAGE_DIV.setAttribute("id", key + "hideable container");

            SHADER_DIV.appendChild(SHADER_STAGE_DIV);


                HEADER_DIV.onclick = () => {
                    const isHidden = !propHiddenState.get('main');
                    propHiddenState.set('main', isHidden);
                    switch (isHidden) {
                    case true: {
                        HTMLUtil.hideElement(SHADER_STAGE_DIV);
                        hOuter.classList = (propErrorState.get("main")) ? 
                                            "shader_section_error_inactive" :
                                            "shader_section_success_inactive"

                        return;
                    }
                    case false: {
                        HTMLUtil.showElement(SHADER_STAGE_DIV);
                        hOuter.classList = (propErrorState.get("main")) ? 
                                            "shader_section_error" :
                                            "shader_section_success"

                        return;
                    }
                    default: {
                        return;
                    }
                    }
                }

        
        const propHiddenState = new Map();
        const propErrorState = new Map();
        record.errorStates = propErrorState;
        propHiddenState.set("main", false);
        propErrorState.set("main", false);

        const logError = function(args) {

            const errorMessageNodes = record.errorMessageNodes;
            let hasError = false;
            for (let prop in args) {
                if (Object.prototype.hasOwnProperty.call(args, prop)) {
                    const errMsgNode = errorMessageNodes[prop]

                    if (errMsgNode) {
                        const textArea = record.textAreas[prop];
                        const splitTextArea = textArea.value.split('\n');
                        const errText = args[prop];
                        if (!errText) {
                            continue;
                        }

                        errMsgNode.nodeValue = errText;

                        globalErrorMsgState[prop] = errMsgNode.nodeValue + 
                            "\t in FILE : " + 
                            ((record.paths[prop]) ? record.paths[prop]: '') + '\n';

                        textAreaElements[prop].parentElement.style.color = 'red';
                        hasError = true;
                    }
                }
            }
            if (args.link != '') {
                hasError = true;
            }
            if (hasError) {
                hOuter.classList = propHiddenState.get("main") ? 
                                    "shader_section_error_inactive" :
                                    "shader_section_error";
                record.hasError = true;

                let errMsg = '';
                for (let msgProp in globalErrorMsgState) {
                    errMsg += globalErrorMsgState[msgProp];
                }
                if (args.link) {
                    errMsg += args.link;
                }
                globalErrorMsgNodeText.nodeValue = errMsg;
            } else {
                hOuter.classList = propHiddenState.get("main") ? 
                                    "shader_section_success_inactive" :
                                    "shader_section_success";

                record.hasError = false;
                globalErrorMsgNodeText.nodeValue = '';
            }
        }
        record.logs.logError = logError;

        function clearLogErrors() {
            const errorMessageNodes = record.errorMessageNodes;
            let hasError = false;
            for (let prop in errorMessageNodes) {
                if (Object.prototype.hasOwnProperty.call(errorMessageNodes, prop)) {
                    const errMsgNode = errorMessageNodes[prop]
                    if (errMsgNode) {
                        errMsgNode.nodeValue = '';
                    }
                }
            }
            GFX.clearErrRecord();
            for (let prop in globalErrorMsgState) {
                globalErrorMsgState[prop] = "";
            }
        }
        record.logs.clearLogErrors = clearLogErrors;

        for (let prop in args) {
            if (Object.prototype.hasOwnProperty.call(args, prop)) {
                let text = '';
                let code = '';

                code = args[prop];
                text = code.split('\n');
                if (text === '') {
                    continue;
                }

                propErrorState.set(key + prop, false);

                let DIV = doc.createElement("div");
                DIV.setAttribute("id", key + " : " + prop + "_div");

                let h = doc.createElement("H1");                // Create a <h1> element
                let t = doc.createTextNode(key + " : " + prop + '\n');
                h.appendChild(t);

                let hErr = doc.createElement('H1');
                hErr.style.color = 'red';
                let tErr = doc.createTextNode('');
                hErr.appendChild(tErr);

                record.errorMessageNodes[prop] = tErr;

                DIV.appendChild(h);
                DIV.appendChild(hErr);

                SHADER_STAGE_DIV.appendChild(DIV);

                const thisTextArea = doc.createElement("textarea");
                thisTextArea.spellcheck = false;
                textAreaElements[prop] = thisTextArea;
                DIV.appendChild(thisTextArea);
                thisTextArea.setAttribute("id", key + "_" + prop + "_textArea");
                thisTextArea.setAttribute("class", "tabSupport");
                thisTextArea.style.wrap = "off";

                let parentElement = thisTextArea.parentElement;

                if (options && options.foldDefault && options.foldDefault[prop]) {
                    propHiddenState.set(key + prop, true);
                    h.classList = "shader_section_success_inactive";
                    HTMLUtil.hideElement(thisTextArea);
                    HTMLUtil.hideElement(hErr);
                } else {
                    propHiddenState.set(key + prop, false);
                    h.classList = "shader_section_success";
                }

                record.headers[prop] = h;


                h.onclick = () => {
                    const isHidden = !propHiddenState.get(key + prop);
                    propHiddenState.set(key + prop, isHidden);

                    switch (isHidden) {
                    case true: {
                        HTMLUtil.hideElement(thisTextArea);
                        HTMLUtil.hideElement(hErr);

                        h.classList = (propErrorState.get(key + prop)) ? 
                                            "shader_section_error_inactive" :
                                            "shader_section_success_inactive"

                        return;
                    }
                    case false: {
                        HTMLUtil.showElement(thisTextArea);
                        HTMLUtil.showElement(hErr);

                        h.classList = (propErrorState.get(key + prop)) ? 
                                            "shader_section_error" :
                                            "shader_section_success"
                        return;
                    }
                    default: {
                        return;
                    }
                    }
                };
                


                 
                let cols = 0;
                for (let i = 0; i < text.length; i += 1) {
                    cols = Math.max(cols, text[i].length);
                }

                thisTextArea.rows = text.length + 1;
                thisTextArea.cols = cols;
                thisTextArea.value = code;
                thisTextArea.style.backgroundColor = BG_COLOR_NO_ERROR;
                thisTextArea.style.color = TEXT_COLOR_NO_ERROR

                const textarea = thisTextArea;

                thisTextArea.addEventListener('keyup', (event) => {

                    event.preventDefault();

                    if (record["timeout" + prop]) {
                        clearTimeout(record["timeout" + prop]);
                    }

                    switch (event.key) {
                    case "`": {
                    }
                    case "ArrowUp": {
                    }
                    case "ArrowDown": {
                    }
                    case "ArrowLeft": {
                    }
                    case "ArrowRight": {
                        return;
                    }
                    default: {
                        break;
                    }
                    }

                    record["timeout" + prop] = setTimeout(() => {
                        for (let prop in record.args) {
                            if (Object.prototype.hasOwnProperty.call(record.args, prop)) {
                                const textE = textAreaElements[prop]; 
                                if (textE) {
                                    record.args[prop] = textE.value;
                                }

                            }
                        } 

                        if (this.libGroupMap) {
                            for (const record of this.libGroupMap.values()) {
                                for (let i = 0; i < record.args.length; i += 1) {
                                    const textE = record.textAreas[record.args[i].key]; 
                                    if (textE) {
                                        record.args[i][record.args[i].key] = textE.value;
                                        libMap.set(record.args[i].key, textE.value);
                                    }
                                }
                            }
                        }

                        compile();
                    }, record.hasError ? 100 :  MREditor.recompileDelayDefault);
                })

                if (MREditor.insertTextSupported) {
                    thisTextArea.addEventListener('keydown', (event) => {
                        const cursor = textarea.selectionStart;
                        if(event.key == "Tab") {
                            event.preventDefault();
                            doc.execCommand("insertText", false, '    ');
                        } else if (event.key == "Enter") {
                            event.preventDefault();
                            doc.execCommand("insertText", false, '\n');
                        } else if (event.key == '`') {
                            event.preventDefault();
                            return;
                        }
                    });
                } else {
                    thisTextArea.addEventListener('keydown', (event) => {
                        if (event.key == "Tab") {
                            // event.preventDefault()
                            // const cursor = thisTextArea.selectionStart
                            // thisTextArea.value = thisTextArea.value.slice(0, cursor) + '    ' + thisTextArea.value.slice(thisTextArea.selectionEnd);
                            // thisTextArea.selectionStart = thisTextArea.selectionEnd = cursor + 4;
                        } else if (event.key == "Enter") {
                            // event.preventDefault()
                            // const cursor = textarea.selectionStart
                            // textarea.value = textarea.value.slice(0, cursor) + '\n' + textarea.value.slice(textarea.selectionEnd)
                            // textarea.selectionStart = textarea.selectionEnd = cursor + 1
                        } else if (event.key == '`') {
                            event.preventDefault();
                            return;
                        }
                    });
                }
            }
        }



        { //// watch files
            const toWatch = [];
            for (let prop in args) {
                let saveTo = _out.defaultShaderOutputPath;
                if (options && options.paths && options.paths[prop]) {
                    const parentPath = getCurrentPath(window.location.pathname);
                    
                    saveTo = getPath(options.paths[prop]);

                    const origin = window.location.origin;
                    const originIdx = saveTo.indexOf(origin);
                    saveTo = saveTo.substring(originIdx + origin.length + 1);

                    if (parentPath !== '/' && parentPath !== '\\') {
                        const parentIdx = saveTo.indexOf(parentPath);
                        saveTo = saveTo.substring(parentIdx + parentPath.length);
                    }

                    record.paths[prop] = saveTo;


                    toWatch.push(saveTo);
                    MR.server.subsLocal.subscribe("Update_File", (filename, args) => {
                        if (args.file !== filename) {
                            console.log("file does not match");
                            return;
                        }
                        console.log("updating file");

                        const textE = textAreaElements[prop]; 
                        if (textE) {
                            record.args[prop] = args.content;
                            textE.value = args.content;
                            record.compile();
                        }
                    }, saveTo);
                }
            }
            console.log(record.paths);
            if (toWatch.length > 0) {
                watchFiles(toWatch);
            }
        } ////

        function compile() {
            for (let prop in record.args) {
                if (Object.prototype.hasOwnProperty.call(record.args, prop)) {
                    const textE = textAreaElements[prop]; 
                    if (textE) {
                        record.args[prop] = textE.value;
                    }

                }
            } 

            let hasError  = false;
            let status    = null;
            let program   = null;
            let errRecord = null;
            if (record.onNeedsCompilation) {
                try {
                    status = record.onNeedsCompilation(record.args, libMap);
                } catch (err) {
                    console.error(err);
                    return;
                }

                if (!status) {
                    if (GFX.tempCompiledShaderDirty) {
                        GFX.tempCompiledShaderDirty = false;

                        program = GFX.tempCompiledShader;
                        if (!program) {
                            hasError = true;
                            if (GFX.tempErrorDirty) {
                                GFX.tempErrorDirty = false;
                                errRecord = GFX.tempPreprocessorErrRecord;
                                GFX.tempPreprocessorErrRecord = null;
                            } else {
                                errRecord = GFX.errRecord;
                            }
                        } else {
                            GFX.tempCompiledShader = null;
                        }
                    }
                } else {
                    hasError = (status.program == null);
                    errRecord = status.errRecord || GFX.errRecord;
                    program  = status.program;
                }
            } else {
                db.warn("onNeedsCompilation unspecified");
            }

            if (!hasError) {
                record.logs.clearLogErrors();

                const oldProgram = record.program;
                gl.useProgram(program);
                gl.deleteProgram(oldProgram);

                record.program = program;

                record.hasError = false;

                textAreaElements.vertex.style.color             = TEXT_COLOR_NO_ERROR;
                textAreaElements.fragment.style.color           = TEXT_COLOR_NO_ERROR;
                textAreaElements.vertex.style.backgroundColor   = BG_COLOR_NO_ERROR;
                textAreaElements.fragment.style.backgroundColor = BG_COLOR_NO_ERROR;

                if (!record.onAfterCompilation) {
                    console.warn("onAfterCompilation unspecified");
                } else {
                    try {
                        record.onAfterCompilation(program, userData);
                    } catch (err) {
                        console.error(err);
                        return;
                    }
                }

                hOuter.classList = propHiddenState.get("main") ? 
                                    "shader_section_success_inactive" :
                                    "shader_section_success";

                if (propErrorState.get("main") === true) {
                    propErrorState.set("main", false);

                    for (let prop in record.args) {
                        if (Object.prototype.hasOwnProperty.call(record.args, prop)) {
                            propErrorState.set(key + prop, false);
                            record.headers[prop].classList = propHiddenState.get(key + prop) ? 
                                                "shader_section_success_inactive" :
                                                "shader_section_success";
                        }
                    }
                }

                globalErrorMsgNodeText.nodeValue = '';

            } else if (hasError) {

                globalErrorMsgNodeText.nodeValue = '';

                record.logs.clearLogErrors();
                record.logs.logError(errRecord);

                record.hasError = true;

                textAreaElements.vertex.style.color             = TEXT_COLOR_ERROR;
                textAreaElements.fragment.style.color           = TEXT_COLOR_ERROR;
                textAreaElements.vertex.style.backgroundColor   = BG_COLOR_ERROR;
                textAreaElements.fragment.style.backgroundColor = BG_COLOR_ERROR;

                hOuter.classList = propHiddenState.get("main") ? 
                                    "shader_section_error_inactive" :
                                    "shader_section_error";

                propErrorState.set("main", true);


                for (let prop in record.args) {
                    if (!Object.prototype.hasOwnProperty.call(record.args, prop)) {
                        continue;
                    }
                    if (Object.prototype.hasOwnProperty.call(errRecord, prop)) {
                        propErrorState.set(key + prop, true);
                        record.headers[prop].classList = propHiddenState.get(key + prop) ? 
                                    "shader_section_error_inactive" :
                                    "shader_section_error";
                    } else {
                        propErrorState.set(key + prop, false);
                        record.headers[prop].classList = propHiddenState.get(key + prop) ? 
                                    "shader_section_success_inactive" :
                                    "shader_section_success";
                    }
                }
            }
        }
        record.compile = compile;

        if ((options && (options.doCompilationAfterFirstSetup !== false)) || !options) {
            compile();
            if (record.hasError) {
                console.warn("First-time compilation failed, using default error condition shader");
                const defaultErrorVertex = `#version 300 es
                precision highp float;

                void main() {
                  // Multiply the position by the matrix.
                  gl_Position = vec4(vec3(0.0), 1.0);
                }
                `;

                const defaultErrorFragment = `#version 300 es
                precision highp float;

                out vec4 fragColor;

                void main() {
                    fragColor = vec4(1.0, 0.0, 0.0, 0.0);
                }
                `;

                const shaderRecord = GFX.createShaderProgramFromStrings(defaultErrorVertex, defaultErrorFragment);
                if (record.onAfterCompilation) {
                    record.onAfterCompilation(shaderRecord.program, userData);
                }
            }
        }

        return compile;
    }

    _out.registerShaderForLiveEditing = registerShaderForLiveEditing;

    return _out;
}());

export {MREditor};
