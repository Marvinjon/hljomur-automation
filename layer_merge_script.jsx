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

    // Check if spotcolor.ai exists
    var spotColorFile = new File(scriptFolder.fsName + "/spotcolor.ai");
    if (!spotColorFile.exists) {
        alert("The 'spotcolor.ai' file does not exist in the script folder. Please add this file for the spot color reference.");
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
            
            // Create layers for our 3-layer structure
            var originalPngLayer = doc.layers.add();
            originalPngLayer.name = "Original PNG";
            
            var whitePngLayer = doc.layers.add();
            whitePngLayer.name = "White PNG";
            
            var vectorLayer = doc.layers.add();
            vectorLayer.name = "Vector Spot Color";
            
            // Get or create spot color from the spotcolor.ai file
            var spotName = "Spot1";
            var spot = null;
            
            // First check if Spot1 already exists in the document
            for (var i = 0; i < doc.spots.length; i++) {
                if (doc.spots[i].name === spotName) {
                    spot = doc.spots[i];
                    break;
                }
            }
            
            // If Spot1 doesn't exist, create it with color values from spotcolor.ai
            if (!spot) {
                // Try to open spotcolor.ai to get the spot color definition
                var tempDoc = null;
                try {
                    tempDoc = app.open(spotColorFile);
                    
                    // Find Spot1 in the opened document
                    var spotFound = false;
                    for (var i = 0; i < tempDoc.spots.length; i++) {
                        if (tempDoc.spots[i].name === spotName) {
                            // Create spot in our document with the same color
                            spot = doc.spots.add();
                            spot.name = spotName;
                            
                            // Copy the color
                            var tempSpotColor = tempDoc.spots[i].color;
                            if (tempSpotColor.typename === "RGBColor") {
                                // RGB color
                                var rgbColor = new RGBColor();
                                rgbColor.red = tempSpotColor.red;
                                rgbColor.green = tempSpotColor.green;
                                rgbColor.blue = tempSpotColor.blue;
                                spot.color = rgbColor;
                            } else if (tempSpotColor.typename === "CMYKColor") {
                                // CMYK color
                                var cmykColor = new CMYKColor();
                                cmykColor.cyan = tempSpotColor.cyan;
                                cmykColor.magenta = tempSpotColor.magenta;
                                cmykColor.yellow = tempSpotColor.yellow;
                                cmykColor.black = tempSpotColor.black;
                                spot.color = cmykColor;
                            }
                            
                            // Set the color type to SPOT
                            spot.colorType = ColorModel.SPOT;
                            
                            spotFound = true;
                            break;
                        }
                    }
                    
                    // If no spot color found, create default RGB green
                    if (!spotFound) {
                        spot = doc.spots.add();
                        spot.name = spotName;
                        var rgbColor = new RGBColor();
                        rgbColor.red = 105;
                        rgbColor.green = 208;
                        rgbColor.blue = 69;
                        spot.color = rgbColor;
                        spot.colorType = ColorModel.SPOT;
                    }
                    
                    // Close the temp document without saving
                    tempDoc.close(SaveOptions.DONOTSAVECHANGES);
                    
                } catch (e) {
                    // If there was an error opening spotcolor.ai, create default spot color
                    $.writeln("Error opening spotcolor.ai: " + e);
                    spot = doc.spots.add();
                    spot.name = spotName;
                    var rgbColor = new RGBColor();
                    rgbColor.red = 105;
                    rgbColor.green = 208;
                    rgbColor.blue = 69;
                    spot.color = rgbColor;
                    spot.colorType = ColorModel.SPOT;
                }
            }
            
            // Create SpotColor object for use
            var spotColor = new SpotColor();
            spotColor.spot = spot;
            spotColor.tint = 100;

            // Set current layer to vector layer
            doc.activeLayer = vectorLayer;
            
            // Function to recursively apply spot color to all path items, even in groups
            function applySpotColorToItem(item) {
                try {
                    if (item.typename === "PathItem") {
                        if (item.filled) item.fillColor = spotColor;
                        if (item.stroked) item.strokeColor = spotColor;
                    } else if (item.typename === "CompoundPathItem") {
                        for (var j = 0; j < item.pathItems.length; j++) {
                            var pathItem = item.pathItems[j];
                            if (pathItem.filled) pathItem.fillColor = spotColor;
                            if (pathItem.stroked) pathItem.strokeColor = spotColor;
                        }
                    } else if (item.typename === "TextFrame") {
                        item.textRange.fillColor = spotColor;
                        if (item.textRange.strokeColor) item.textRange.strokeColor = spotColor;
                    } else if (item.typename === "GroupItem") {
                        for (var k = 0; k < item.pageItems.length; k++) {
                            applySpotColorToItem(item.pageItems[k]);
                        }
                    }
                } catch (e) {
                    $.writeln("Error applying color to item: " + e);
                }
            }
            
            // Get all content from the original document
            var allPageItems = [];
            for (var i = 0; i < doc.pageItems.length; i++) {
                allPageItems.push(doc.pageItems[i]);
            }
            
            // Apply spot color to all items and move them to the vector layer
            for (var i = 0; i < allPageItems.length; i++) {
                var item = allPageItems[i];
                if (item.layer == vectorLayer) continue;
                
                try {
                    item.move(vectorLayer, ElementPlacement.PLACEATEND);
                    applySpotColorToItem(item);
                } catch (e) {
                    $.writeln("Error moving or coloring item: " + e);
                }
            }
            
            // Set current layer to white PNG layer
            doc.activeLayer = whitePngLayer;
            
            // Place white PNG in the middle layer
            var whitePlacedItem = whitePngLayer.placedItems.add();
            whitePlacedItem.file = matchingWhitePNG;
            whitePlacedItem.width = abWidth;
            whitePlacedItem.height = abHeight;
            whitePlacedItem.position = [abBounds[0], abBounds[1]];
            
            // Embed the white PNG
            try {
                whitePlacedItem.embed();
                $.writeln("Embedded white PNG: " + matchingWhitePNG.name);
            } catch(e) {
                $.writeln("Error embedding white PNG: " + e);
                errorLog.push("Error embedding white PNG " + matchingWhitePNG.name + ": " + e);
            }
            
            // Set current layer to original PNG layer (top)
            doc.activeLayer = originalPngLayer;
            
            // Place original PNG on top
            var originalPlacedItem = originalPngLayer.placedItems.add();
            originalPlacedItem.file = matchingPNG;
            originalPlacedItem.width = abWidth;
            originalPlacedItem.height = abHeight;
            originalPlacedItem.position = [abBounds[0], abBounds[1]];
            
            // Embed the original PNG
            try {
                originalPlacedItem.embed();
                $.writeln("Embedded original PNG: " + matchingPNG.name);
            } catch(e) {
                $.writeln("Error embedding original PNG: " + e);
                errorLog.push("Error embedding original PNG " + matchingPNG.name + ": " + e);
            }
            
            // Rearrange layers so Original PNG is on top, White PNG is in the middle
            whitePngLayer.zOrder(ZOrderMethod.SENDBACKWARD);
            vectorLayer.zOrder(ZOrderMethod.SENDBACKWARD);
            
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
