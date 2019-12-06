
"use strict";

window.imgutil = (function() {

    const _out = {};

    function loadImagePromise(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                resolve(image);
            };
            image.onerror = () => { console.error("failed to load: " + url); reject(); };

            image.src = url;
        });
    }
    _out.loadImagePromise = loadImagePromise;

    function loadImagesPromise(urls) {
        let urlCount = urls.length;
        let images = [];
        for (let i = 0; i < urlCount; i += 1) {
            images.push(null);
        }

        const pending = [];
        for (let i = 0; i < urlCount; i += 1) {
            pending.push(loadImagePromise(urls[i]).then((image) => {
                console.log("loaded: " + urls[i]);
                images[i] = image;
            }));
        }
        return Promise.all(pending).then(data => {
            console.log("loaded all images");
            return images;
        });
    }
    _out.loadImagesPromise = loadImagesPromise;

    function loadImage(url, callback) {
        const image = new Image();
        image.src = url;
        image.onload = callback;
        image.onerror = () => { console.error("failed to load: " + url); callback(); };
        console.log(callback);
        return image;
    }
    _out.loadImage = loadImage;

    function loadImages(urls, callback) {
        let urlCount = urls.length;
        let images = [];

        function onImageLoad(url) {
            urlCount -= 1;

            console.log("loaded: " + url);

            if (urlCount === 0) {
                console.log("all loaded");
                callback(images);
                images = null;
            }
        };

        for (let i = 0; i < urlCount; i += 1) {
            console.log("loading: " + urls[i]);
            const image = loadImage(urls[i], function() { onImageLoad(urls[i]); } );
            images.push(image);
        }
    }
    _out.loadImages = loadImages;

    return _out;

}());
