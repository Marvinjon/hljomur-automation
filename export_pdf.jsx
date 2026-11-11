// @target illustrator

(function () {
    var previousInteraction = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

    var scriptFile = new File($.fileName);
    var scriptFolder = scriptFile.parent;
    var completeFolder = new Folder(scriptFolder.fsName + "/complete");
    var pdfFolder = new Folder(scriptFolder.fsName + "/pdf");

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

    function fileInFolder(folder, fileName) {
        var direct = new File(folder.fsName + "/" + fileName);
        if (direct.exists) {
            return direct;
        }

        var encoded = new File(folder.fullName + "/" + File.encode(fileName));
        if (encoded.exists) {
            return encoded;
        }

        return encoded;
    }

    if (!completeFolder.exists) {
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
        alert("The 'complete' folder does not exist. Run the processing script first.");
        return;
    }

    if (!pdfFolder.exists) {
        pdfFolder.create();
    }

    var files = completeFolder.getFiles();
    var aiFiles = [];
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (!(file instanceof File)) {
            continue;
        }
        if (readableName(file).match(/\.ai$/i)) {
            aiFiles.push(file);
        }
    }

    if (aiFiles.length === 0) {
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
        alert("No AI files found in 'complete'.");
        return;
    }

    var processedCount = 0;
    var errorCount = 0;
    var errorLog = [];

    for (var k = 0; k < aiFiles.length; k++) {
        var aiFile = aiFiles[k];
        var outputName = readableName(aiFile);
        var doc = null;

        try {
            var sourceFile = fileInFolder(completeFolder, outputName);
            doc = app.open(sourceFile);

            var pdfName = outputName.replace(/\.ai$/i, ".pdf");
            var pdfFile = new File(pdfFolder.fullName + "/" + File.encode(pdfName));
            var pdfOpts = new PDFSaveOptions();
            pdfOpts.compatibility = PDFCompatibility.ACROBAT5;
            pdfOpts.generateThumbnails = true;
            pdfOpts.preserveEditability = true;
            doc.saveAs(pdfFile, pdfOpts);
            doc.close(SaveOptions.DONOTSAVECHANGES);
            doc = null;

            processedCount++;
            $.writeln("Saved PDF: " + pdfName);
        } catch (e) {
            var msg = "Error exporting " + outputName + ": " + e;
            $.writeln(msg);
            errorLog.push(msg);
            errorCount++;
            if (doc) {
                try {
                    doc.close(SaveOptions.DONOTSAVECHANGES);
                } catch (closeError) {}
            }
        }
    }

    if (errorLog.length > 0) {
        var logFile = new File(scriptFolder.fsName + "/pdf_error_log.txt");
        logFile.open("w");
        for (var eIndex = 0; eIndex < errorLog.length; eIndex++) {
            logFile.writeln(errorLog[eIndex]);
        }
        logFile.close();
    }

    app.userInteractionLevel = previousInteraction;
    app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
    alert("PDF export complete!\n" +
          "Files exported: " + processedCount + " of " + aiFiles.length + "\n" +
          "PDFs saved in the pdf folder.\n" +
          (errorCount > 0 ? ("Errors: " + errorCount + " (see pdf_error_log.txt)") : "All files exported successfully!"));
})();
