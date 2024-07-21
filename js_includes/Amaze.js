/* This software is licensed under a BSD license; see the LICENSE file for details. */

define_ibex_controller({
    name: "Amaze",

    jqueryWidget: {
        _init: function () {
            this.cssPrefix = this.options._cssPrefix;
            this.utils = this.options._utils;
            this.finishedCallback = this.options._finishedCallback;

            // F → 70
            // J → 74
            this.leftKeyCode = 70;
            this.rightKeyCode = 74;

            if (typeof (this.options.sent) == "string") {
                this.words = this.options.sent.split(/[ \t]+/);
                this.sentenceDesc = csv_url_encode(this.options.sent);
            } else {
                assert_is_arraylike(this.options.sent, "Bad value for 'sent' option of Amaze.");
                this.words = this.options.sent;
                this.sentenceDesc = csv_url_encode(this.options.sent.join(' '));
            }

            if (typeof (this.options.foils) == "string") {
                this.foils = this.options.foils.split(/[ \t]+/);
            } else {
                assert_is_arraylike(this.options.foils, "Bad value for 'foils' option of Amaze.");
                this.foils = this.options.foils;
            }

            this.mainDiv = $("<div>").addClass("PennController-Text-container")
            this.element.append(this.mainDiv);
            this.instructions = $("<span>");
            this.instructions.text("Press F or J to start.");
            this.mainDiv.append(this.instructions);

            this.mainDiv.addClass(this.cssPrefix + "sentence");
            this.mainDiv.css(
                {
                    "display": "flex",
                    "position": "absolute",
                    "flex-direction": "column",
                    "width": "100%",
                    "left": "0px",
                    "top": "calc(-40px + 50vh)",
                }
            );

            this.leftDisplay = $(document.createElement("div"));
            this.leftDisplay.css(
                {
                    "position": "absolute",
                    "left": "calc(0%)",
                    "top": "calc(2em + 0px)",
                }
            );
            this.mainDiv.append(this.leftDisplay);

            this.rightDisplay = $(document.createElement("div"));
            this.rightDisplay.css(
                {
                    "position": "absolute",
                    "left": "calc(100%)",
                    "top": "calc(2em + 0px)",
                }
            );
            this.mainDiv.append(this.rightDisplay);

            this.wordDisplay = $("<span>").css({ "display": "inline-block" }).addClass("PennController-Text");
            this.leftDisplay.append(this.wordDisplay);
            this.foilDisplay = $("<span>").css({ "display": "inline-block" }).addClass("PennController-Text");
            this.rightDisplay.append(this.foilDisplay);

            this.currentWord = 0;

            this.stoppingPoint = this.words.length;
            this.resultsLines = [];

            // Don't want to be allocating arrays in time-critical code.
            this.timings = [];
            for (var i = 0; i < this.words.length; ++i) {
                this.timings[i] = new Array(2);
            }
            this.previousTime = null;
    
            this.wordOnTheLeft = [];
            for (var i = 0; i < this.words.length; ++i) {
                this.wordOnTheLeft[i] = (Math.random() < 0.5);
            }

            // We need this (lol) to access to the controller properties in the callback below
            var t = this;

            // TODO: The "recording time for the previous word" logic here makes me nervous,
            // off-by-one errors are too easy to make, change this.
            this.safeBind($(document), 'keydown', function (e) {
                var time = new Date().getTime(); // Can't we get the time without allocating a new object?

                if (e.keyCode == t.leftKeyCode || e.keyCode == t.rightKeyCode) {
                    const previousWord = t.currentWord-1
                    if (t.currentWord > 0 && t.currentWord <= t.stoppingPoint) {
                        if (
                            (e.keyCode == t.rightKeyCode && t.wordOnTheLeft[previousWord])
                            || (e.keyCode == t.leftKeyCode && !t.wordOnTheLeft[previousWord])
                        ) {
                            console.log("foiled!");
                            t.processResults();
                            t.finishedCallback(t.resultsLines);
                        }
                        t.timings[previousWord][0] = time;
                        t.timings[previousWord][1] = t.previousTime;
                    }
                    t.previousTime = time;

                    if (t.currentWord < t.stoppingPoint)
                        t.showWord(t.currentWord);
                    ++(t.currentWord);
                    if (t.currentWord > t.stoppingPoint) {
                        t.processResults();
                        t.finishedCallback(t.resultsLines);
                    }
                    return false;
                }
                else {
                    return true;
                }
            });
        },

        showWord: function (w) {
            this.instructions.text("");
            if (this.wordOnTheLeft[w]) {
                console.log("on the left");
                this.wordDisplay.detach().appendTo(this.leftDisplay);
                this.foilDisplay.detach().appendTo(this.rightDisplay);
            } else {
                console.log("on the right");
                this.wordDisplay.detach().appendTo(this.rightDisplay);
                this.foilDisplay.detach().appendTo(this.leftDisplay);
            }
            this.wordDisplay.text(this.words[w]);
            this.foilDisplay.text(this.foils[w]);
        },

        processResults: function () {
            for (var i = 0; i < this.words.length; ++i) {
                // TODO: how do we display the results when the participant has been foiled?
                this.resultsLines.push([
                    ["Word number", i + 1],
                    ["Word", csv_url_encode(this.words[i])],
                    ["Side", (this.wordOnTheLeft[i] ? "left" : "right")],
                    ["Reading time", this.timings[i][0] - this.timings[i][1]],
                    ["Sentence (or sentence MD5)", this.sentenceDesc]
                ]);
            }
        }
    },

    properties: {
        obligatory: ["sent", "foils"],
        htmlDescription: function (opts) {
            return $(document.createElement("div")).text(opts.s);
        }
    }
});
