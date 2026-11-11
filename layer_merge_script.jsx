// @target illustrator

(function () {
    // Get the folder where this script is located
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
        alert("Script folder does not exist. Exiting.");
        return;
    }

    // Get the source folder for files to be processed
    var folder = new Folder(scriptFolder.fsName + "/to_be_processed");
    if (!folder.exists) {
        reportEmpty("The 'to_be_processed' folder does not exist. Please create it and place your files there.");
        return;
    }

    // Create complete folder if it doesn't exist
    var completeFolder = new Folder(scriptFolder.fsName + "/complete");
    if (!completeFolder.exists) {
        completeFolder.create();
    }
    
    function decodeFileName(name) {
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

    function isMinningarplattiFile(name) {
        return decodeFileName(name).match(/(^|[^0-9])([34])\s*Frames?/i);
    }

    // Get all files in the to_be_processed folder.
    // 3 Frame and 4 Frame pairs are handled by minningarplatti_script.jsx.
    var files = folder.getFiles();
    var aiFiles = [];
    var pngFiles = [];
    
    // Sort files by type
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var name = file.name;

        if (isMinningarplattiFile(name)) {
            continue;
        }
        
        if (name.match(/\.ai$/i)) {
            aiFiles.push(file);
        } else if (name.match(/\.png$/i) && name.indexOf("_white") === -1) {
            pngFiles.push(file);
        }
    }
    
    if (aiFiles.length === 0) {
        reportEmpty("No AI files found in 'to_be_processed' folder.");
        return;
    }
    
    if (pngFiles.length === 0) {
        reportEmpty("No PNG files found in 'to_be_processed' folder.");
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
        // Find matching PNG file
        var aiBaseName = aiFile.name.replace(/\.ai$/i, "");
        var matchingPNG = null;
        
        // Find matching regular PNG
        for (var i = 0; i < pngFiles.length; i++) {
            var pngName = pngFiles[i].name;
            var pngBaseName = pngName.replace(/\.png$/i, "");
            
            if (pngBaseName === aiBaseName || pngName.indexOf(aiBaseName) === 0) {
                matchingPNG = pngFiles[i];
                break;
            }
        }
        
        if (!matchingPNG) {
            var msg = "Missing PNG for: " + aiFile.name;
            $.writeln(msg);
            errorLog.push(msg);
            errorCount++;
            return false;
        }
        
        // Determine which size template to use based on filename
        var sizeIs13x18 = aiFile.name.indexOf("13x18") !== -1;
        var sizeIs16x22 = aiFile.name.indexOf("16x22") !== -1;
        
        if (!sizeIs13x18 && !sizeIs16x22) {
            // Try to determine by looking for other indicators
            if (aiFile.name.match(/13.*18/) || aiFile.name.match(/18.*13/)) {
                sizeIs13x18 = true;
            } else if (aiFile.name.match(/16.*22/) || aiFile.name.match(/22.*16/)) {
                sizeIs16x22 = true;
            } else {
                var msg = "Could not determine size (13x18 or 16x22) from filename: " + aiFile.name;
                $.writeln(msg);
                errorLog.push(msg);
                errorCount++;
                return false;
            }
        }
        
        $.writeln("Identified size: " + (sizeIs13x18 ? "13x18cm" : "16x22cm") + " for " + aiFile.name);
        
        try {
            // Open AI file
            var doc = app.open(aiFile);
            var artboard = doc.artboards[0];
            var abBounds = artboard.artboardRect;
            var abWidth = abBounds[2] - abBounds[0];
            var abHeight = abBounds[1] - abBounds[3];
            
            // Create layers for our 3-layer structure - the order of creation is bottom to top
            var vectorLayer = doc.layers.add();
            vectorLayer.name = "Vector Spot Color";
            
            var originalPngLayer = doc.layers.add();
            originalPngLayer.name = "Original PNG";
            
            var whiteVectorLayer = doc.layers.add();
            whiteVectorLayer.name = "Yellow Overlay";
            
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
            
            // Set current layer to original PNG layer for the middle layer
            doc.activeLayer = originalPngLayer;
            
            // Place original PNG
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
            
            // Set current layer to white vector layer (top layer)
            doc.activeLayer = whiteVectorLayer;
            
            // Create white vector shapes directly in the document based on the SVG paths
            // Setting fill color to yellow instead of white
            var yellowColor = new RGBColor();
            yellowColor.red = 255;
            yellowColor.green = 255;
            yellowColor.blue = 0;
            
            if (sizeIs13x18) {
                // Create paths based on 13x18cm_white.svg
                
                // Calculate scaling factors
                var widthScale = abWidth / 1535;  // SVG width
                var heightScale = abHeight / 2126; // SVG height
                var scale = Math.min(widthScale, heightScale);
                
                // Create the main rectangle (first path in SVG)
                var mainPath = whiteVectorLayer.pathItems.add();
                mainPath.filled = true;
                mainPath.stroked = false;
                mainPath.fillColor = yellowColor;
                
                // Create a rectangle using the dimensions from the SVG
                // Original SVG path is at translate(199,134) with size 1138x1138
                var svgX = 199 * scale;
                var svgY = -134 * scale;  // Y is inverted in Illustrator
                var svgWidth = 1138 * scale;
                var svgHeight = 1138 * scale;
                
                // Position relative to artboard
                var rectX = abBounds[0] + svgX;
                var rectY = abBounds[1] + svgY;
                
                // Create path with 4 points (rectangle)
                var mainPathPoints = [
                    [rectX, rectY],
                    [rectX + svgWidth, rectY],
                    [rectX + svgWidth, rectY - svgHeight],
                    [rectX, rectY - svgHeight]
                ];
                mainPath.setEntirePath(mainPathPoints);
                
                // Create the small circle (second path in SVG)
                var smallPath = whiteVectorLayer.pathItems.add();
                smallPath.filled = true;
                smallPath.stroked = false;
                smallPath.fillColor = yellowColor;
                
                // Original SVG path is at translate(1025,1336) with size 204x204
                var smallX = 1025 * scale;
                var smallY = -1336 * scale;  // Y is inverted in Illustrator
                var smallWidth = 204 * scale;
                var smallHeight = 204 * scale;
                
                // Position relative to artboard
                var smallRectX = abBounds[0] + smallX;
                var smallRectY = abBounds[1] + smallY;
                
                // Create path with 4 points (rectangle)
                var smallPathPoints = [
                    [smallRectX, smallRectY],
                    [smallRectX + smallWidth, smallRectY],
                    [smallRectX + smallWidth, smallRectY - smallHeight],
                    [smallRectX, smallRectY - smallHeight]
                ];
                smallPath.setEntirePath(smallPathPoints);
                
            } else {
                // Create paths based on 16x22cm_white.svg
                
                // Calculate scaling factors
                var widthScale = abWidth / 1890;  // SVG width
                var heightScale = abHeight / 2598; // SVG height
                var scale = Math.min(widthScale, heightScale);
                
                // Create the main rectangle (first path in SVG)
                var mainPath = whiteVectorLayer.pathItems.add();
                mainPath.filled = true;
                mainPath.stroked = false;
                mainPath.fillColor = yellowColor;
                
                // Original SVG path is at translate(250,164) with size 1390x1390
                var svgX = 250 * scale;
                var svgY = -164 * scale;  // Y is inverted in Illustrator
                var svgWidth = 1390 * scale;
                var svgHeight = 1390 * scale;
                
                // Position relative to artboard
                var rectX = abBounds[0] + svgX;
                var rectY = abBounds[1] + svgY;
                
                // Create path with 4 points (rectangle)
                var mainPathPoints = [
                    [rectX, rectY],
                    [rectX + svgWidth, rectY],
                    [rectX + svgWidth, rectY - svgHeight],
                    [rectX, rectY - svgHeight]
                ];
                mainPath.setEntirePath(mainPathPoints);
                
                // Create the small circle (second path in SVG)
                var smallPath = whiteVectorLayer.pathItems.add();
                smallPath.filled = true;
                smallPath.stroked = false;
                smallPath.fillColor = yellowColor;
                
                // Original SVG path is at translate(1260,1632) with size 249x249
                var smallX = 1260 * scale;
                var smallY = -1632 * scale;  // Y is inverted in Illustrator
                var smallWidth = 249 * scale;
                var smallHeight = 249 * scale;
                
                // Position relative to artboard
                var smallRectX = abBounds[0] + smallX;
                var smallRectY = abBounds[1] + smallY;
                
                // Create path with 4 points (rectangle)
                var smallPathPoints = [
                    [smallRectX, smallRectY],
                    [smallRectX + smallWidth, smallRectY],
                    [smallRectX + smallWidth, smallRectY - smallHeight],
                    [smallRectX, smallRectY - smallHeight]
                ];
                smallPath.setEntirePath(smallPathPoints);
            }
            
            // Set opacity of yellow overlay vector layer to 1%
            whiteVectorLayer.opacity = 1;
            
            // Ensure correct layer ordering - we created them in the right order
            // but let's verify by explicitly setting the stacking order
            // (Illustrator layers stack in reverse order of creation - last created is on top)
            
            // These lines ensure proper stacking order:
            // Yellow overlay vector layer (top)
            // Original PNG Layer (middle)
            // Vector Spot Color Layer (bottom)
            
            // Make yellow overlay vector layer the top layer (in case Illustrator has reordered)
            if (whiteVectorLayer.index !== 0) {
                whiteVectorLayer.zOrder(ZOrderMethod.BRINGTOFRONT);
            }
            
            // Make original PNG layer the middle layer
            if (originalPngLayer.index !== 1) {
                originalPngLayer.zOrder(ZOrderMethod.SENDTOBACK);
                originalPngLayer.zOrder(ZOrderMethod.BRINGFORWARD);
            }
            
            // Make vector layer the bottom layer
            if (vectorLayer.index !== 2) {
                vectorLayer.zOrder(ZOrderMethod.SENDTOBACK);
            }
            
            $.writeln("Final layer order from top to bottom:");
            $.writeln("1: " + doc.layers[0].name);
            $.writeln("2: " + doc.layers[1].name);
            $.writeln("3: " + doc.layers[2].name);
            
            // Save the modified file to the complete folder
            var outputName = decodeFileName(aiFile.name);
            var saveFile = new File(completeFolder.fullName + "/" + File.encode(outputName));
            
            // Save as AI file
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
