// @target illustrator

(function () {
    // Get the folder where this script is located
    var scriptFile = new File($.fileName);
    var scriptFolder = scriptFile.parent;
    
    if (!scriptFolder.exists) {
        alert("Script folder does not exist. Exiting.");
        return;
    }

    // Get the source folder for files to be processed
    var folder = new Folder(scriptFolder.fsName + "/to_be_processed");
    if (!folder.exists) {
        alert("The 'to_be_processed' folder does not exist. Please create it and place your files there.");
        return;
    }

    // Create complete folder if it doesn't exist
    var completeFolder = new Folder(scriptFolder.fsName + "/complete");
    if (!completeFolder.exists) {
        completeFolder.create();
    }
    
    // Get all files in the to_be_processed folder
    var files = folder.getFiles();
    var aiFiles = [];
    var pngFiles = [];
    var toWhiteFolder = new Folder(scriptFolder.fsName + "/to_white");
    var whitePngFiles = [];
    
    // Sort files by type
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var name = file.name;
        
        if (name.match(/\.ai$/i)) {
            aiFiles.push(file);
        } else if (name.match(/\.png$/i) && name.indexOf("_white") === -1) {
            pngFiles.push(file);
        }
    }
    
    // Get white PNG files from to_white folder
    if (toWhiteFolder.exists) {
        var whiteFiles = toWhiteFolder.getFiles("*.png");
        for (var j = 0; j < whiteFiles.length; j++) {
            var name = whiteFiles[j].name;
            if (name.match(/_white\.png$/i)) {
                whitePngFiles.push(whiteFiles[j]);
            }
        }
    }
    
    if (aiFiles.length === 0) {
        alert("No AI files found in 'to_be_processed' folder.");
        return;
    }
    
    if (pngFiles.length === 0) {
        alert("No PNG files found in 'to_be_processed' folder.");
        return;
    }
    
    if (whitePngFiles.length === 0) {
        alert("No white PNG files found in 'to_white' folder.");
        return;
    }
    
    var processedCount = 0;
    var errorCount = 0;
    var errorLog = [];
    
    // Define function to process a single AI file
    function processAIFile(aiFile) {
        // Find matching PNG files
        var aiBaseName = aiFile.name.replace(/\.ai$/i, "");
        var matchingPNG = null;
        var matchingWhitePNG = null;
        
        // Find matching regular PNG
        for (var i = 0; i < pngFiles.length; i++) {
            var pngName = pngFiles[i].name;
            var pngBaseName = pngName.replace(/\.png$/i, "");
            
            if (pngBaseName === aiBaseName || pngName.indexOf(aiBaseName) === 0) {
                matchingPNG = pngFiles[i];
                break;
            }
        }
        
        // Find matching white PNG
        for (var i = 0; i < whitePngFiles.length; i++) {
            var whiteName = whitePngFiles[i].name;
            var whiteBaseName = whiteName.replace(/_white\.png$/i, "");
            
            if (whiteBaseName === aiBaseName || whiteName.indexOf(aiBaseName) === 0) {
                matchingWhitePNG = whitePngFiles[i];
                break;
            }
        }
        
        if (!matchingPNG || !matchingWhitePNG) {
            var msg = "Missing PNG or white PNG for: " + aiFile.name;
            $.writeln(msg);
            errorLog.push(msg);
            errorCount++;
            return false;
        }
        
        try {
            // Open AI file
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
            
            // Require user to create Spot1 swatch manually
            var spotName = "Spot1";
            var spot = null;
            for (var i = 0; i < doc.spots.length; i++) {
                if (doc.spots[i].name === spotName) {
                    spot = doc.spots[i];
                    break;
                }
            }
            if (!spot) {
                alert('Please create a Spot Color swatch named "Spot1" in your document before running this script.\nIt must be a true Spot Color, not Process.');
                throw new Error('Spot1 swatch not found');
            }
            var spotColor = new SpotColor();
            spotColor.spot = spot;
            spotColor.tint = 100;

            function makeSpot1(item) {
                if ("filled" in item && item.filled) {
                    item.fillColor = spotColor;
                }
                if ("stroked" in item && item.stroked) {
                    item.strokeColor = spotColor;
                }
            }
            
            for (var i = 0; i < doc.pageItems.length; i++) {
                var item = doc.pageItems[i];
                if (item.typename === "PathItem" || item.typename === "TextFrame" || item.typename === "CompoundPathItem") {
                    makeSpot1(item);
                }
            }
            
            // Instead of tracing, we'll create a white silhouette directly
            
            // First, place the white PNG as a reference
            var whiteReference = doc.placedItems.add();
            whiteReference.file = matchingWhitePNG;
            whiteReference.width = abWidth;
            whiteReference.height = abHeight;
            whiteReference.position = [abBounds[0], abBounds[1]];
            
            // Create a white rectangle that matches the white PNG shape
            var whiteMask = doc.pathItems.rectangle(
                abBounds[1],     // top
                abBounds[0],     // left
                abWidth,         // width
                abHeight,        // height
                false            // reversed
            );
            
            // Set the fill color to white
            var whiteColor = new CMYKColor();
            whiteColor.cyan = 0;
            whiteColor.magenta = 0;
            whiteColor.yellow = 0;
            whiteColor.black = 0;
            whiteMask.fillColor = whiteColor;
            whiteMask.stroked = false;
            
            // Create a clipping mask using the white PNG as a template
            whiteReference.selected = true;
            whiteMask.selected = true;
            
            // Create a clipping mask
            app.executeMenuCommand("makeMask");
            
            // Place the original PNG on top
            var originalImage = doc.placedItems.add();
            originalImage.file = matchingPNG;
            originalImage.width = abWidth;
            originalImage.height = abHeight;
            originalImage.position = [abBounds[0], abBounds[1]];
            originalImage.embed(); // Embed the image in the AI file
            
            // Save the modified file to the complete folder
            var saveFile = new File(completeFolder.fsName + "/" + aiFile.name);
            
            // Save as AI file
            var saveOpts = new IllustratorSaveOptions();
            saveOpts.compressed = true;
            doc.saveAs(saveFile, saveOpts);
            doc.close(SaveOptions.DONOTSAVECHANGES);
            
            processedCount++;
            return true;
        } catch (e) {
            var msg = "Error processing " + aiFile.name + ": " + e;
            $.writeln(msg);
            errorLog.push(msg);
            errorCount++;
            return false;
        }
    }
    
    // Process each AI file
    for (var k = 0; k < aiFiles.length; k++) {
        processAIFile(aiFiles[k]);
    }
    
    // Write error log to file if there are errors
    if (errorLog.length > 0) {
        var logFile = new File(scriptFolder.fsName + "/error_log.txt");
        logFile.open("w");
        for (var i = 0; i < errorLog.length; i++) {
            logFile.writeln(errorLog[i]);
        }
        logFile.close();
    }
    
    alert("Processing complete!\n" + 
          "Files processed: " + processedCount + " of " + aiFiles.length + "\n" +
          (errorCount > 0 ? ("Errors: " + errorCount + " (see error_log.txt)") : "All files processed successfully!"));
})();
