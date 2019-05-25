/*
 Separate worker only for the task of counting the exact number of lines
 (however: from the first 100 lines we already create a quick estimate)
*/
"use strict";
onmessage = function (e) {

    const fileHanlde = e.data.file;
    let totalLineCount = 0;
    // get full line count
    var reader = new FileReader();
    reader.onload = function (e) {
        var text = e.target.result;
        var match = text.match(/\r?\n/g);
        totalLineCount = match.length;
        postMessage(totalLineCount);
    };
    reader.readAsText(fileHanlde);
}

