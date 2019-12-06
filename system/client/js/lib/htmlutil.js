"use strict";


window.HTMLUtil = (function() {
    const _util = {};

    function showElement(element) {
        element.style.display = 'block';
    }
    _util.showElement = showElement;

    function hideElement(element) {
        element.style.display = 'none';
    }
    _util.hideElement = hideElement;


    return _util;
}());