"use strict";

window.db = (function() {
	const _out = {};

	let textNode;

	function noop() {}

	function exportFunctions(logger_) {
		if (logger_) {
			for (let m in console) {
				if (typeof console[m] == 'function') {
					_out[m] = logger_.initFunc(m);
				}
			}
		}
	}

	function getTextNode() {
		return textNode || {};
	}
	_out.getTextNode = getTextNode;

	function LoggerDefault(args) {
		this.initFunc = (f) => {
			return console[f].bind(this[f] || noop);
		}

		this.log    = console.log;
		this.assert = console.assert;
		this.warn   = console.warn;
		this.error  = console.error;
		this.trace  = console.trace;
	}
	_out.LoggerDefault = LoggerDefault;
	function LoggerCustom(args = {}) {

		this.initFunc = (f) => {
			return this[f] || noop;
		}

		this.log    = args.log || noop;
		this.assert = args.assert || noop;
		this.warn   = args.warn || noop;
		this.error  = args.error || noop;
		this.trace  = args.trace || noop;
	}
	_out.LoggerCustom = LoggerCustom;

	function LoggerGUIDefault(args = {}) {

		this.initFunc = (f) => {
			return this[f] || noop;
		}

		this.log = (arg) => {
			const node = db.getTextNode();
			if (node) {
				const output = Math.trunc(performance.now() / 1000.0) + " : " + arg + '\n';
				node.value += output;

			    let text = node.value.split('\n');
			    let cols = 0;
			    for (let i = 0; i < text.length; i += 1) {
			        cols = Math.max(cols, text[i].length);
			    }

			  if (node.cols  != cols - 2) {
			  	node.cols = cols + 2;
			  }

				let fullReadout = node.value;
				if (node.rows > 80) {
					const arr = node.value.split('\n');
					fullReadout = arr.slice(arr.length - 80, arr.length);
					node.value = fullReadout;
				}
				node.scrollTop = node.scrollHeight;

				console.log(output);
			}
		};
		this.assert = noop;
		this.warn   = noop;
		this.error  = noop;
		this.trace  = noop;
	}
	_out.LoggerGUIDefault = LoggerGUIDefault;

	function EmptyLogger() {

		this.initFunc = (f) => {
			return () => {};
		}

		this.log    = noop;
		this.assert = noop;
		this.warn   = noop;
		this.error  = noop;
		this.trace  = noop;
	}
	_out.EmptyLogger = EmptyLogger;

	let currLogger;
	let loggerStack;
	let noopLogger;
	let doc;

	function initLoggerSystem(args = {}) {
		doc = args.doc || document;
		loggerStack = [args.logger || new LoggerDefault()];

		currLogger = loggerStack[0];
		noopLogger = new EmptyLogger();

		exportFunctions(currLogger);

		if (args.redirect) {
			const div = doc.createElement("div");
			div.setAttribute("id", "logging");
			div.setAttribute("class", "resizeable");
			div.innerHTML += '<br> <br> <br>';

			const thisTextArea = doc.createElement("textarea");
            thisTextArea.spellcheck = false;
            thisTextArea.style.backgroundColor = '#808080';
            thisTextArea.style.float = "right";
            thisTextArea.setAttribute("id", "logging-text-area");
            thisTextArea.setAttribute("class", "tabSupport");
            thisTextArea.scrollTop = thisTextArea.scrollHeight;
           	textNode = thisTextArea;
           	div.appendChild(thisTextArea);

           	doc.body.appendChild(div);
		}
	}
	_out.initLoggerSystem = initLoggerSystem;

	function muteLogger() {
		currLogger = noopLogger;

		for (let m in console) {
			if (typeof console[m] == 'function') {
				_out[m] = () => {};
			}
		}	
	};
	_out.muteLogger = muteLogger;

	function unmuteLogger() {
		if (loggerStack.length === 0) {
			return;
		}

		currLogger = loggerStack[loggerStack.length - 1];

		exportFunctions(currLogger);
	}
	_out.unmuteLogger = unmuteLogger;

	function pushLogger(logger_) {
		loggerStack.push(logger_);
		if (currLogger !== noopLogger) {
			currLogger = _logger;

			exportFunctions(currLogger);
		}
	}
	_out.pushLogger = pushLogger;

	function popLogger() {
		if (loggerStack.length === 0) {
			return;
		}

		loggerStack.pop(logger_);
		if (currLogger !== noopLogger) {
			currLogger = loggerStack[loggerStack.length - 1];

			exportFunctions(currLogger);
		}
	}
	_out.popLogger = popLogger;

	return _out;

}());
