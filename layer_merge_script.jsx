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

    // Identify files
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var name = file.name;

        if (name.match(/\.ai$/i)) {
            aiFile = file;
        } else if (name.match(/\.png$/i) && name.indexOf("_white") === -1) {
            pngFile = file;
        }
    }

    // Check in 'converted' subfolder for white PNG
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
        alert("Missing required files (AI, PNG, or *_white.png). Make sure they are all in the folder or its 'converted' subfolder.");
        return;
    }

    // Open AI file
    var doc = app.open(aiFile);
    var artboard = doc.artboards[0];
    var abBounds = artboard.artboardRect;
    var abWidth = abBounds[2] - abBounds[0];
    var abHeight = abBounds[1] - abBounds[3];

    function placeImage(file, layerName) {
        var image = doc.placedItems.add();
        image.file = file;

        // Resize proportionally to fit the artboard
        image.width = abWidth;
        image.height = abHeight;

        // Position to top-left of artboard
        image.position = [abBounds[0], abBounds[1]];

        return image;
    }

    // Place white PNG first
    placeImage(whitePngFile, "White PNG");

    // Place normal PNG on top
    placeImage(pngFile, "Normal PNG");

    alert("All files placed, resized, and aligned correctly.");
})();
