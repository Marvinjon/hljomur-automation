// @target illustrator

(function () {
    var previousInteraction = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

    var scriptFile = new File($.fileName);
    var scriptFolder = scriptFile.parent;

    if (!scriptFolder.exists) {
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
        alert("Script folder does not exist. Exiting.");
        return;
    }

    var folder = new Folder(scriptFolder.fsName + "/minningarplatti_to_be_processed");
    if (!folder.exists) {
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
        alert("The 'minningarplatti_to_be_processed' folder does not exist. Please create it and place your 3 Frame and 4 Frame files there.");
        return;
    }

    var completeFolder = new Folder(scriptFolder.fsName + "/complete");
    if (!completeFolder.exists) {
        completeFolder.create();
    }

    // Both reference vectors share one page (377.92 x 849.92 in the SVG,
    // 283.44 x 637.44 pt in the AI). The PNG has the same aspect ratio.
    // 3 Frame has two divider bars; 4 Frame has three. The artwork is a
    // black overlay, so the PNG only needs to sit on the artboard behind it.

    function frameCountFromName(fileName) {
        var match = fileName.match(/(^|[^0-9])([34])\s*Frames?/i);
        if (!match) {
            return null;
        }
        return match[2];
    }

    function pairStem(fileName) {
        var stem = fileName.replace(/\.[^.]+$/, "");
        stem = stem.replace(/ - Images$/i, "");
        stem = stem.replace(/ - Vector$/i, "");
        return stem.toLowerCase();
    }

    var files = folder.getFiles();
    var aiFiles = [];
    var pngFiles = [];

    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (!(file instanceof File)) {
            continue;
        }

        var name = file.name;
        if (!frameCountFromName(name)) {
            continue;
        }

        if (name.match(/\.ai$/i)) {
            aiFiles.push(file);
        } else if (name.match(/\.png$/i)) {
            pngFiles.push(file);
        }
    }

    if (aiFiles.length === 0) {
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
        alert("No 3 Frame or 4 Frame AI files found in 'minningarplatti_to_be_processed'.");
        return;
    }

    if (pngFiles.length === 0) {
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
        alert("No 3 Frame or 4 Frame PNG files found in 'minningarplatti_to_be_processed'.");
        return;
    }

    var processedCount = 0;
    var errorCount = 0;
    var errorLog = [];

    function findMatchingPNG(aiFile) {
        var aiStem = pairStem(aiFile.name);
        var aiFrames = frameCountFromName(aiFile.name);
        var fallback = null;

        for (var n = 0; n < pngFiles.length; n++) {
            var pngFile = pngFiles[n];
            if (pairStem(pngFile.name) !== aiStem) {
                continue;
            }
            if (frameCountFromName(pngFile.name) !== aiFrames) {
                continue;
            }

            if (pngFile.name.match(/ - Images\.png$/i)) {
                return pngFile;
            }
            if (!fallback) {
                fallback = pngFile;
            }
        }

        return fallback;
    }

    function openVectorFile(aiFile) {
        try {
            var pdfOpts = new PDFOpenOptions();
            pdfOpts.pageToOpen = 1;
            pdfOpts.pDFCropToBox = PDFBoxType.PDFMEDIABOX;
            return app.open(aiFile, DocumentColorSpace.RGB, pdfOpts);
        } catch (e) {
            $.writeln("Opening without PDF options: " + e);
            return app.open(aiFile);
        }
    }

    function placePNGBehindVector(doc, pngFile) {
        var artboard = doc.artboards[0];
        var abBounds = artboard.artboardRect;
        var abWidth = abBounds[2] - abBounds[0];
        var abHeight = abBounds[1] - abBounds[3];

        var imageLayer = doc.layers.add();
        imageLayer.name = "Images";
        doc.activeLayer = imageLayer;

        var placedItem = imageLayer.placedItems.add();
        placedItem.file = pngFile;

        if (placedItem.width > 0 && placedItem.height > 0) {
            var scale = Math.min(abWidth / placedItem.width, abHeight / placedItem.height);
            placedItem.width = placedItem.width * scale;
        }

        var placedW = placedItem.width;
        var placedH = placedItem.height;
        placedItem.position = [
            abBounds[0] + (abWidth - placedW) / 2,
            abBounds[1] - (abHeight - placedH) / 2
        ];

        try {
            placedItem.embed();
            $.writeln("Embedded PNG: " + pngFile.name);
        } catch (e) {
            $.writeln("Error embedding PNG: " + e);
            errorLog.push("Error embedding PNG " + pngFile.name + ": " + e);
        }

        imageLayer.zOrder(ZOrderMethod.SENDTOBACK);
    }

    function processAIFile(aiFile) {
        var frames = frameCountFromName(aiFile.name);
        var matchingPNG = findMatchingPNG(aiFile);

        if (!matchingPNG) {
            var missingMsg = "Missing PNG for: " + aiFile.name;
            $.writeln(missingMsg);
            errorLog.push(missingMsg);
            errorCount++;
            return false;
        }

        $.writeln("Processing " + frames + " Frame file: " + aiFile.name + " with " + matchingPNG.name);

        var doc = null;
        try {
            doc = openVectorFile(aiFile);
            placePNGBehindVector(doc, matchingPNG);

            var saveFile = new File(completeFolder.fsName + "/" + aiFile.name);
            var saveOpts = new IllustratorSaveOptions();
            saveOpts.compressed = true;
            doc.saveAs(saveFile, saveOpts);
            doc.close(SaveOptions.DONOTSAVECHANGES);
            doc = null;

            processedCount++;
            return true;
        } catch (e) {
            var msg = "Error processing " + aiFile.name + ": " + e;
            $.writeln(msg);
            errorLog.push(msg);
            errorCount++;
            if (doc) {
                try {
                    doc.close(SaveOptions.DONOTSAVECHANGES);
                } catch (closeError) {
                    $.writeln("Error closing " + aiFile.name + ": " + closeError);
                }
            }
            return false;
        }
    }

    for (var k = 0; k < aiFiles.length; k++) {
        processAIFile(aiFiles[k]);
    }

    if (errorLog.length > 0) {
        var logFile = new File(scriptFolder.fsName + "/minningarplatti_error_log.txt");
        logFile.open("w");
        for (var eIndex = 0; eIndex < errorLog.length; eIndex++) {
            logFile.writeln(errorLog[eIndex]);
        }
        logFile.close();
    }

    app.userInteractionLevel = previousInteraction;
    app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
    alert("Minningarplatti processing complete!\n" +
          "Files processed: " + processedCount + " of " + aiFiles.length + "\n" +
          (errorCount > 0 ? ("Errors: " + errorCount + " (see minningarplatti_error_log.txt)") : "All files processed successfully!"));
})();
