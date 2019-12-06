"use strict";

/**
 * @description used to track the cursor<br>
 *      and set its position, click state, and graphic
 * @namespace
 */
window.ScreenCursor = (function() {
    let _cursor = {};

    /**
     * default graphic
     * @memberof Cursor
     * @type {string}
     * @final
     */
    _cursor.DEFAULT_CURSOR = "default";
    /**
     * hand graphic
     * @memberof Cursor
     * @type {string}
     * @final
     */
    _cursor.HAND_CURSOR    = "pointer";

    // set the default cursor graphic
    _cursor.cursorType     = _cursor.DEFAULT_CURSOR;

    /**
     * @description set the cursor graphic
     * @memberOf Cursor
     * @param {string} cursorType Cursor.DEFAULT_CURSOR or Cursor.HAND_CURSOR
     */
    _cursor.set = function(cursorType) {
        document.body.style.cursor = cursorType; 
        _cursor.cursorType = cursorType;
    };

    let targetEventCleanupFuncs = [];

    function clearTargetEvents() {
        for (let f = 0; f < targetEventCleanupFuncs.length; f += 1) {
            targetEventCleanupFuncs[f]();
        }
    }
    _cursor.clearTargetEvents = clearTargetEvents;


    /**
     * @description tracks the cursor<br>
     * @param {Object} target the HTML DOM element to which we are attaching cursor event handlers
     * @param {Object} handler the object containing functions to handle cursor events (the restoration program passes a CrystalApplet instance)
     * @param {Object} callbacks map of down, move, up to respective functions attached to the handler, example:
     * <pre><code>
     *      canvas, // pass a canvas element here
     *      object, // the "handler" is the object that contains functions for cursor-down, cursor-move, and cursor-up handling
     *      { // this is the callbacks object, which maps "down,""move," and "up" to the *names* of the functions attached to "handler" that should respond to the respective events"  
     *          down : "mouseDown",
     *          move : "mouseMove",
     *          up   : null,
     *      }
     * </pre><code>
     * @memberOf Cursor
     *
     * @return {function(void) : Object} a function that returns the cursor state attached to a given call of trackCursor
     */
    function trackCursor(target, callbacks) {
        // internal object that stores the x, y, and z values for the cursor
        const cursor = new Float32Array([
            0.0,
            0.0,
            0.0 
        ]);

        const prevCursor = new Float32Array([
            0.0,
            0.0,
            0.0
        ]);

        // save the callbacks individually
        const downCallback = (callbacks) ? callbacks.down : null;
        const moveCallback = (callbacks) ? callbacks.move : null;
        const upCallback   = (callbacks) ? callbacks.up   : null;

        const info = {
            position : () => {
                return cursor;
            },
            prevPosition : () => {
                return prevCursor;
            },
            updateState : () => {
                prevCursor[0] = cursor[0];
                prevCursor[1] = cursor[1];
                prevCursor[2] = cursor[2];
            },
            hide : () => {
                if (target.style) {
                    target.style.cursor = "none";
                }
            },
            show : () => {
                if (target.style) {
                    return target.style.cursor = "";
                }
            },
            x : () => { 
                return cursor[0]; 
            },
            y : () => {
                return cursor[1];
            },
            z : () => {
                return cursor[2];
            },
            down : downCallback,
            move : moveCallback,
            up   : upCallback,
        };

        // sets cursor coordinates offset from the top-left of the program bounding rectangle
        target.set = function(x, y, z) {
            const r = this.getBoundingClientRect();

            cursor[0] = (1 + x - r.left) || 0;
            cursor[1] = (1 + y - r.top)  || 0;
            cursor[2] = z;
        };

        
        // mouse-down handler
        target.onmousedown = function(e) {
            // set cursor state using the given cursor event "e"
            this.set(e.clientX, e.clientY, 1);

            if (downCallback != null) {
               info.down(info);
            }
        };


        // mouse-move handler
        target.onmousemove = function(e) {
            // set cursor state using the given cursor event "e"
            this.set(e.clientX, e.clientY, cursor[2]);
            if (moveCallback != null) {
               info.move(info);
           }
        };


        
        // mouse-up handler
        target.onmouseup = function(e) {
            // set cursor state using the given cursor event "e"
            this.set(e.clientX, e.clientY, 0);

            if (upCallback != null) {
               info.up(info);
            }
        };
        

        targetEventCleanupFuncs.push(function() {
            target.set         = undefined;
            target.onmousedown = undefined;
            target.onmouseup   = undefined;
            target.onmousemove = undefined;
        });

        return info;

    }
    _cursor.trackCursor = trackCursor;

    return _cursor;
}());
