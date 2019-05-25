/*
 Background worker for reading and parsing a CSV file in the Background
 and only get the raw value columns for each line as array
*/
"use strict";
importScripts('../lib/papaparse.min.js');
onmessage = function (e) {

    var fileHanlde = e.data.file;

    // on the test files 100 kb amounts to about 700 rows
    // 2000 ~ 14000
    Papa.LocalChunkSize = 1024 * 2000; 
    Papa.parse(fileHanlde, {
        chunk: function (results) {
            var rows = results.data;
            postMessage(rows);

            console.log("did send chunk:");
        },
        complete: function (result) {
            postMessage("Done");
        }
    });
}

