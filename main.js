// begin magic... ;-)
//http://127.0.0.1:5500/index.html
"use strict";
// importScripts('../lib/papaparse.min.js');
// to disable scrolling:
// https://stackoverflow.com/questions/4770025/how-to-disable-scrolling-temporarily

var myInfini = new Vue({
    el: '#main-content',
    data: {
        hasAccent: false,
        file: null,
        displayRows: [],
        localWebworker: null,
        headerRow: [],

        estimatedLineCount: -1,
        exactLinieCount: -1,
        topMargin: 0,

        scrollLastCall: 0,

        lowerFrameLimit: -1,
        upperFrameLimit: -1,
    },
    created() {
        this.inner = {
            parsedData: []
        }
    },
    computed: {
        lineCount() {
            return this.exactLinieCount !== -1 ? this.exactLinieCount : this.estimatedLineCount;
        },
        compBodyHeight() {
            return this.lineCount * this.rowHeight;
        },
        rowHeight() {
            if (this.lineCount <= 0)
                return 0;

            let rows = this.$refs.bodyRow;
            if (!rows)
                return 0;

            let bodyRow = rows[0];
            if (!bodyRow)
                return 0;

            return bodyRow.offsetHeight;
        },
        screenHeight() {
            return this.$refs.scrollFrame.offsetHeight;
        },
        rowsPerScreen() {
            if (this.rowHeight <= 0)
                return;
            return this.getRowsInTableBody(this.rowHeight);
        },
    },
    methods: {
        getScrollPos() {
            return this.$refs.scrollFrame.scrollTop;
        },
        getRowsInTableBody(rowHeight) {
            const height = this.$refs.scrollFrame.offsetHeight;
            return Math.floor(height / rowHeight) + 1;
        },
        onScrollHandler() {
            if (!this.newFrameReached()) 
                return;

            if (this.scrollLastCall) 
                clearTimeout(this.scrollLastCall);

            this.scrollLastCall = setTimeout(() => {

                this.innerScrollFunc();

            }, 100);
        },
        newFrameReached() {
            const scrollPos = this.getScrollPos();
            if (
                this.lowerFrameLimit > 0 &&
                scrollPos <= this.lowerFrameLimit) {
                return true;
            }

            if (scrollPos >= this.upperFrameLimit) {
                return true;
            }

            return false;
        },
        async innerScrollFunc() {
            const scrollPos = this.getScrollPos();

            const rowNum = Math.floor(scrollPos / this.rowHeight);
            const fromRow = rowNum - 2 * this.rowsPerScreen;
            const toRow = rowNum + 3 * this.rowsPerScreen + 1;
            const dataSlice = await this.getData(fromRow, toRow);

            for (let i = 0; i < this.displayRows.length; i++) {
                Vue.set(this.displayRows, i, dataSlice[i]);
            }

            this.lowerFrameLimit = scrollPos - this.screenHeight;
            this.upperFrameLimit = scrollPos + this.screenHeight;

            let topSpace = (fromRow - 1) * this.rowHeight;
            this.topMargin = topSpace < 0 ? 0 : topSpace;
        },
        async getData(from, to) {
            if (from < 0)
                from = 0;
            if (to > this.lineCount)
                to = this.lineCount - 1;

            let slice = this.inner.parsedData.slice(from, to);
            // if (slice.length < this.rowsPerScreen) {
            //     slice = await this.getDirectData(from, to);
            // }
            return slice;
        },
        async getDirectData(from, to) {
            const navi = new LineNavigator(this.file);
            let slice = [];

            return new Promise(resolve => {
                navi.readLines(from, to - 1,
                    function (err, index, lines, isEof, progress) {
                        for (let i = 0; i < lines.length; i++) {
                            const lineColumns = Papa.parse(lines[i]).data[0];
                            slice.push(lineColumns);
                        }
                        resolve(slice);
                    }
                )
            });
        },
        clearState() {
            this.topMargin = 0;
            this.exactLinieCount = -1;
            this.estimatedLineCount = -1;
            this.file = null;
            this.displayRows.splice(0);
            this.inner.parsedData = [];
            this.headerRow.splice(0);
        },
        clearAll() {
            this.$refs.fileChooser.value = null;
            try {
                this.localWebworker.terminate();
            } catch { } // its possible that parsing worker is not running anymore

            this.clearState();
        },
        fileChangedHandler(event) {
            if (event.target.files.length === 0)
                return;

            this.clearState();
            this.file = event.target.files[0];
            this.showInitialPreview();
            this.asyncGetTotalLinecount();
            this.startParse()
            this.lowerFrameLimit = 0 - this.screenHeight;
            this.upperFrameLimit = 0 + this.screenHeight;
        },
        // Fast Preview
        showInitialPreview() {
            var navi = new LineNavigator(this.file);
            var that = this;
            navi.readLines(0, 91, function (err, index, lines, isEof, progress) {
                var totalBytes = 0;
                for (var i = 1; i < lines.length; i++) {
                    totalBytes += lines[i].length;
                    var lineColumns = Papa.parse(lines[i]).data[0];
                    that.displayRows.push(lineColumns);
                }

                var parsedRows = Papa.parse(lines[0]).data;
                that.headerRow = parsedRows[0];

                var bytesPerLine = totalBytes / (lines.length - 1);
                setTimeout(
                    () => that.estimatedLineCount = Math.floor((that.file.size - lines[0].length) / bytesPerLine),
                    200);
                //use setTimeout because setting totalLineCount updates row and body height
            });
        },
        asyncGetTotalLinecount() {
            const lineWorker = new Worker("linecountWorker.js");
            var that = this;
            lineWorker.onmessage = function (message) {
                setTimeout(() => that.exactLinieCount = message.data, 200);
                lineWorker.terminate();
            };
            lineWorker.postMessage({
                file: this.file,
            });
        },
        // Full Preview
        startParse() {
            this.inner.parsedData = [];
            this.localWebworker = new Worker("worker.js");
            var that = this;
            this.localWebworker.onmessage = function (event) {
                if (event.data === "Done") {
                    that.localWebworker.terminate();
                    that.inner.parsedData.splice(0, 1); // remove header row
                    return;
                }

                that.inner.parsedData.push(...event.data);
            };
            this.localWebworker.postMessage({
                file: this.file,
            });
        }
    }
})