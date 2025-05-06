#target illustrator

(function () {
    var folder = Folder.selectDialog("Select the folder with your AI and PNG files");
    if (!folder) {
        alert("No folder selected. Exiting.");
        return;
    }

    var files = folder.getFiles();
    var aiFile = null;
    var pngFile = null;
    var whitePngFile = null;

    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var name = file.name;

        if (name.match(/\.ai$/i)) {
            aiFile = file;
        } else if (name.match(/\.png$/i) && name.indexOf("_white") === -1) {
            pngFile = file;
        }
    }

    var convertedFolder = new Folder(folder.fsName + "/converted");
    if (convertedFolder.exists) {
        var convertedFiles = convertedFolder.getFiles("*.png");
        for (var j = 0; j < convertedFiles.length; j++) {
            var name = convertedFiles[j].name;
            if (name.match(/_white\.png$/i)) {
                whitePngFile = convertedFiles[j];
                break;
            }
        }
    }

    if (!aiFile || !pngFile || !whitePngFile) {
        alert("Missing required files (AI, PNG, or *_white.png).");
        return;
    }

    var doc = app.open(aiFile);
    var artboard = doc.artboards[0];
    var abBounds = artboard.artboardRect;
    var abWidth = abBounds[2] - abBounds[0];
    var abHeight = abBounds[1] - abBounds[3];

    // Remove any full-background rectangles
    for (var i = doc.pathItems.length - 1; i >= 0; i--) {
        var item = doc.pathItems[i];
        if (
            !item.guides &&
            !item.clipping &&
            Math.abs(item.width - abWidth) < 2 &&
            Math.abs(item.height - abHeight) < 2
        ) {
            item.remove();
        }
    }

    // Convert all vector items' fills and strokes to green
    var green = new RGBColor();
    green.red = 0;
    green.green = 255;
    green.blue = 0;

    function makeGreen(item) {
        if ("filled" in item && item.filled) {
            item.fillColor = green;
        }
        if ("stroked" in item && item.stroked) {
            item.strokeColor = green;
        }
    }

    for (var i = 0; i < doc.pageItems.length; i++) {
        var item = doc.pageItems[i];
        if (item.typename === "PathItem" || item.typename === "TextFrame" || item.typename === "CompoundPathItem") {
            makeGreen(item);
        }
    }

    function placeImage(file) {
        var image = doc.placedItems.add();
        image.file = file;
        image.width = abWidth;
        image.height = abHeight;
        image.position = [abBounds[0], abBounds[1]];
        return image;
    }

    placeImage(whitePngFile); // Middle white silhouette
    placeImage(pngFile);      // Top original PNG

    alert("Vector elements changed to green. PNGs placed correctly.");
})();
