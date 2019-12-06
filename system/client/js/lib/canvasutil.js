"use strict";

const CanvasUtil = (function() {

	let _onResizeEventHandler;
	
	function resizeToDisplaySize(canvas, scale = 1) {
	  const realToCSSPixels = window.devicePixelRatio;

	  const displayWidth = Math.floor(canvas.clientWidth * realToCSSPixels * scale);
	  const displayHeight = Math.floor(canvas.clientHeight * realToCSSPixels * scale);

	  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
	      canvas.width = displayWidth;
	      canvas.height = displayHeight;
	  }
	}
	function resize(canvas, resx, resy) {
		canvas.width = resx * ((MR && MR.wrangler && MR.wrangler._VRIsActive) ? 2.0 : 1.0);
		canvas.height = resy;

		CanvasUtil.baseCanvasDimensions.width  = resx;
		CanvasUtil.baseCanvasDimensions.height = resy;

		_out.handleResizeEvent(canvas, resx, resy);
	}


	function createCanvasOnElement(canvasName, parentName = 'output-element', width = 400, height = 400) {
	  const parent = document.querySelector('#' + parentName);
	  if (!parent) {
	    return null;
	  }

	  const canvas = document.createElement("canvas");
	  canvas.setAttribute('id', canvasName);

	  parent.appendChild(canvas);

	  canvas.width = width;
	  canvas.height = height;

	  CanvasUtil.baseCanvasDimensions.width = width;
	  CanvasUtil.baseCanvasDimensions.height = height;
	  // TODO: figure out proper display size
	  //resizeToDisplaySize(canvas);

	  return {
	    parent : parent, 
	    canvas : canvas
	  };
	}

	function setOnResizeEventHandler(handler) {
		_onResizeEventHandler = handler;
	}

	function rightAlignCanvasContainer(target, container) {
        const P = container || document.getElementById('output-container');
        const bodyWidth = document.body.getBoundingClientRect().width;

        P.style.left = Math.max(0.0, (bodyWidth - target.clientWidth)) + "px";
    };

	function handleResizeEvent(target, width, height, container) {
		if (!_onResizeEventHandler) {
			return;
		}

		_onResizeEventHandler(target, width, height);
	}

	const _out = {
	  resizeToDisplaySize : resizeToDisplaySize,
	  createCanvasOnElement : createCanvasOnElement,
	  setOnResizeEventHandler : setOnResizeEventHandler,
	  handleResizeEvent : handleResizeEvent,
	  resize : resize,
	  baseCanvasDimensions : {},
	  rightAlignCanvasContainer : rightAlignCanvasContainer
	};

	return _out;

}());
window.CanvasUtil = CanvasUtil;
