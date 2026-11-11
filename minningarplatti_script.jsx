// @target illustrator

(function () {
    var previousInteraction = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

    var scriptFile = new File($.fileName);
    var scriptFolder = scriptFile.parent;

    function reportEmpty(message) {
        try {
            if ($.global.HLJOMUR_RUN_ALL === true) {
                $.writeln(message);
                return;
            }
        } catch (e) {}
        alert(message);
    }

    if (!scriptFolder.exists) {
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
        alert("Script folder does not exist. Exiting.");
        return;
    }

    var sourceFolders = [
        new Folder(scriptFolder.fsName + "/to_be_processed"),
        new Folder(scriptFolder.fsName + "/minningarplatti_to_be_processed")
    ];

    var completeFolder = new Folder(scriptFolder.fsName + "/complete");
    if (!completeFolder.exists) {
        completeFolder.create();
    }

    // Both reference vectors share one page (377.92 x 849.92 in the SVG,
    // 283.44 x 637.44 pt in the AI). The PNG has the same aspect ratio.
    // 3 Frame has two divider bars; 4 Frame has three. The artwork is a
    // black overlay, so the PNG only needs to sit on the artboard behind it.

    // Illustrator returns "#1896_...4%20Frame%20-%20Vector.ai" for a file
    // whose real name is "#1896_...4 Frame - Vector.ai". A leading # makes
    // File.decode leave the %20 sequences in place, so decode them directly.
    function readableName(fileOrName) {
        var name = fileOrName;
        if (fileOrName && fileOrName.name) {
            name = fileOrName.name;
        }
        if (!name) {
            return "";
        }

        var text = String(name);
        var out = "";
        for (var c = 0; c < text.length; c++) {
            if (text.charAt(c) === "%" && c + 2 < text.length) {
                var hex = text.substr(c + 1, 2);
                if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
                    out += String.fromCharCode(parseInt(hex, 16));
                    c += 2;
                    continue;
                }
            }
            out += text.charAt(c);
        }
        return out;
    }

    function pairKey(fileName) {
        var key = readableName(fileName).toLowerCase();
        key = key.replace(/\.[a-z0-9]+$/, "");
        key = key.replace(/images/g, "");
        key = key.replace(/vector/g, "");
        key = key.replace(/[^a-z0-9]/g, "");
        return key;
    }

    function frameCountFromName(fileName) {
        var match = readableName(fileName).match(/(^|[^0-9])([34])\s*Frames?/i);
        if (!match) {
            return null;
        }
        return match[2];
    }

    function fileInFolder(folder, fileName) {
        var direct = new File(folder.fsName + "/" + fileName);
        if (direct.exists) {
            return direct;
        }

        // # starts a URI fragment, so rebuild the file through an encoded name.
        var encoded = new File(folder.fullName + "/" + File.encode(fileName));
        if (encoded.exists) {
            return encoded;
        }

        return encoded;
    }

    var aiFiles = [];
    var pngFiles = [];

    for (var folderIndex = 0; folderIndex < sourceFolders.length; folderIndex++) {
        var sourceFolder = sourceFolders[folderIndex];
        if (!sourceFolder.exists) {
            continue;
        }

        var files = sourceFolder.getFiles();
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (!(file instanceof File)) {
                continue;
            }

            var name = readableName(file);
            if (!frameCountFromName(name)) {
                continue;
            }

            if (name.match(/\.ai$/i)) {
                aiFiles.push({ file: file, folder: sourceFolder });
            } else if (name.match(/\.png$/i)) {
                pngFiles.push({ file: file, folder: sourceFolder });
            }
        }
    }

    if (aiFiles.length === 0) {
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
        reportEmpty("No 3 Frame or 4 Frame AI files found in 'to_be_processed'.");
        return;
    }

    if (pngFiles.length === 0) {
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
        reportEmpty("No 3 Frame or 4 Frame PNG files found in 'to_be_processed'.");
        return;
    }

    var processedCount = 0;
    var errorCount = 0;
    var errorLog = [];

    function findMatchingPNG(aiEntry) {
        var aiKey = pairKey(aiEntry.file);
        var aiFrames = frameCountFromName(aiEntry.file);
        var fallback = null;

        for (var n = 0; n < pngFiles.length; n++) {
            var pngEntry = pngFiles[n];
            if (pairKey(pngEntry.file) !== aiKey) {
                continue;
            }
            if (frameCountFromName(pngEntry.file) !== aiFrames) {
                continue;
            }
            if (pngEntry.folder.fsName !== aiEntry.folder.fsName) {
                continue;
            }

            if (readableName(pngEntry.file).match(/images\.png$/i)) {
                return pngEntry;
            }
            if (!fallback) {
                fallback = pngEntry;
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

    function processAIFile(aiEntry) {
        var aiFile = aiEntry.file;
        var frames = frameCountFromName(aiFile);
        var matchingPNG = findMatchingPNG(aiEntry);

        if (!matchingPNG) {
            var missingMsg = "Missing PNG for: " + readableName(aiFile);
            $.writeln(missingMsg);
            errorLog.push(missingMsg);
            errorCount++;
            return false;
        }

        var vectorFile = fileInFolder(aiEntry.folder, readableName(aiFile));
        var imageFile = fileInFolder(matchingPNG.folder, readableName(matchingPNG.file));
        $.writeln("Processing " + frames + " Frame file: " + readableName(vectorFile) + " with " + readableName(imageFile));

        var doc = null;
        try {
            doc = openVectorFile(vectorFile);
            placePNGBehindVector(doc, imageFile);

            var outputName = readableName(aiFile);
            var saveFile = new File(completeFolder.fullName + "/" + File.encode(outputName));
            var saveOpts = new IllustratorSaveOptions();
            saveOpts.compressed = true;
            doc.saveAs(saveFile, saveOpts);

            var pdfName = outputName.replace(/\.ai$/i, ".pdf");
            var pdfFile = new File(completeFolder.fullName + "/" + File.encode(pdfName));
            var pdfOpts = new PDFSaveOptions();
            pdfOpts.preserveEditability = false;
            pdfOpts.generateThumbnails = true;
            pdfOpts.embedICCProfile = true;
            pdfOpts.embedLinkedFiles = true;
            pdfOpts.optimization = true;
            pdfOpts.compressArt = true;
            pdfOpts.fontSubsetThreshold = 100;
            pdfOpts.printerResolution = 800;
            pdfOpts.colorDownsamplingImageThreshold = 300;
            pdfOpts.grayscaleDownsamplingImageThreshold = 300;
            pdfOpts.monochromeDownsamplingImageThreshold = 450;
            try {
                pdfOpts.compatibility = PDFCompatibility.ACROBAT7;
            } catch (pdfCompatError) {}
            try {
                pdfOpts.colorDownsampling = DownsampleMethod.NODOWNSAMPLE;
            } catch (pdfColorDownsampleError) {}
            try {
                pdfOpts.grayscaleDownsampling = DownsampleMethod.NODOWNSAMPLE;
            } catch (pdfGrayDownsampleError) {}
            try {
                pdfOpts.monochromeDownsampling = DownsampleMethod.NODOWNSAMPLE;
            } catch (pdfMonoDownsampleError) {}
            try {
                pdfOpts.colorCompression = CompressionQuality.JPEGMAXIMUM;
            } catch (pdfColorCompressionError) {}
            try {
                pdfOpts.grayscaleCompression = CompressionQuality.JPEGMAXIMUM;
            } catch (pdfGrayCompressionError) {}
            doc.saveAs(pdfFile, pdfOpts);
            $.writeln("Saved PDF: " + pdfName);

            doc.close(SaveOptions.DONOTSAVECHANGES);
            doc = null;

            processedCount++;
            return true;
        } catch (e) {
            var msg = "Error processing " + readableName(aiFile) + ": " + e;
            $.writeln(msg);
            errorLog.push(msg);
            errorCount++;
            if (doc) {
                try {
                    doc.close(SaveOptions.DONOTSAVECHANGES);
                } catch (closeError) {
                    $.writeln("Error closing " + readableName(aiFile) + ": " + closeError);
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
