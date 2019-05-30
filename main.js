// begin magic... ;-)
"use strict";

var customappaproto = new Vue({
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
        rowsPerScreen(){
            if(this.rowHeight <= 0)
                return;
            return this.getRowsInTableBody(this.rowHeight);
        }
    },
    methods: {
        getRowsInTableBody(rowHeight){
            const height = this.$refs.scrollFrame.offsetHeight;
            return Math.floor(height / rowHeight) + 1;
        },
        onScrollHandler() {
            console.log(this.$refs.scrollFrame.scrollTop);
            let vertScrollPos = this.$refs.scrollFrame.scrollTop;
            let rowNum = Math.floor(vertScrollPos / this.rowHeight) + 1;
            let dataSlice = this.inner.parsedData.slice(rowNum, rowNum+this.rowsPerScreen);
            this.displayRows.splice(0);
            this.displayRows.push(...dataSlice);

            this.topMargin = (rowNum - 1) * this.rowHeight;
        },
        clearState() {
            this.topMargin =0;
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
            } catch { } // its possible that not parsing worker is running

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