/* This software is licensed under a BSD license; see the LICENSE file for details. */

define_ibex_controller({
    name: "Amaze",

    jqueryWidget: {
        _init: function () {
            this.cssPrefix = this.options._cssPrefix
            this.finishedCallback = this.options._finishedCallback
            this.utils = this.options._utils
            this.earlyExit = dget(this.options, "earlyExit", true)
            this.extraData = dget(this.options, "extraData", {})
            this.waitOnError = dget(this.options, "waitOnError", 3000)
            
            addLoaderStyle(this.cssPrefix, this.waitOnError)

            // F → 70
            // J → 74
            this.leftKeyCode = 70
            this.rightKeyCode = 74

            if (typeof this.options.sent == "string") {
                this.words = this.options.sent.split(/[ \t]+/)
                this.sentenceDesc = csv_url_encode(this.options.sent)
            } else {
                assert_is_arraylike(this.options.sent, "Bad value for 'sent' option of Amaze.")
                this.words = this.options.sent
                this.sentenceDesc = csv_url_encode(this.options.sent.join(" "))
            }

            if (typeof this.options.foils == "string") {
                this.foils = this.options.foils.split(/[ \t]+/)
            } else {
                assert_is_arraylike(this.options.foils, "Bad value for 'foils' option of Amaze.")
                this.foils = this.options.foils
            }

            this.mainDiv = $("<div>").addClass("PennController-Text-container")
            this.element.append(this.mainDiv)
            this.instructions = $("<span>")
            this.instructions.text("Press F or J to start.")
            this.mainDiv.append(this.instructions)

            this.mainDiv.addClass(this.cssPrefix + "sentence")
            this.mainDiv.css({
                display: "flex",
                position: "absolute",
                "flex-direction": "column",
                width: "100%",
                left: "0px",
                top: "calc(-40px + 50vh)",
            })

            this.leftDisplay = $(document.createElement("div"))
            this.leftDisplay.css({
                position: "absolute",
                left: "calc(0%)",
                top: "calc(2em + 0px)",
            })
            this.mainDiv.append(this.leftDisplay)

            this.rightDisplay = $(document.createElement("div"))
            this.rightDisplay.css({
                position: "absolute",
                right: "calc(0%)",
                top: "calc(2em + 0px)",
            })
            this.mainDiv.append(this.rightDisplay)

            this.wordDisplay = $("<span>")
                .css({ display: "inline-block" })
                .addClass("PennController-Text")
            this.leftDisplay.append(this.wordDisplay)
            this.foilDisplay = $("<span>")
                .css({ display: "inline-block" })
                .addClass("PennController-Text")
            this.rightDisplay.append(this.foilDisplay)

            this.stoppingPoint = this.words.length
            this.resultsLines = []

            // Don't want to be allocating arrays in time-critical code.
            this.correctAnswer = []
            this.timings = []
            this.wordOnTheLeft = []
            for (let i = 0; i < this.words.length; ++i) {
                // PCIbex doesn't like logging null values but NaNs are fine
                this.correctAnswer[i] = NaN
                this.timings[i] = new Array(2)
                this.wordOnTheLeft[i] = Math.random() < 0.5
            }

            this.previousTime = null

            this.currentWord = 0

            // Ignore keypress while we're processing an answer or punishing a mistake
            this.acceptKeypress = true

            // TODO: The "recording time for the previous word" logic here makes me nervous,
            // off-by-one errors are too easy to make, change this. The current logic is that the
            // choice keypress is not conceptually the end of the trial for a word, but the
            // beginning of the trial for the next one
            this.safeBind($(document), "keydown", event => {
                // jQuery doesn't deal with async event handlers, wich we need to sleep
                // (awaiting a timeout) on errors in non-early exit mode. Source of the
                // workaround is
                // <https://github.com/jquery-validation/jquery-validation/issues/2264#issuecomment-563027654>
                ;(async () => {
                    const keypressTime = Date.now()

                    if (
                        this.acceptKeypress &&
                        (event.keyCode == this.leftKeyCode || event.keyCode == this.rightKeyCode)
                    ) {
                        this.acceptKeypress = false
                        const previousWord = this.currentWord - 1

                        // TODO: the if logic here is iffy
                        if (0 < this.currentWord && this.currentWord <= this.stoppingPoint) {
                            answeredLeft = event.keyCode == this.leftKeyCode
                            correct = this.wordOnTheLeft[previousWord]
                                ? answeredLeft
                                : !answeredLeft
                            this.correctAnswer[previousWord] = correct

                            if (!correct) {
                                console.log("foiled!")
                                this.trialSuccess = false
                                if (this.earlyExit) {
                                    this.processResults()
                                    this.finishedCallback(this.resultsLines)
                                    return false
                                } else {
                                    this.showInstructions(
                                        `
                                            [WRONG]
                                            <p>
                                            <span class="${this.cssPrefix}loader"></span>
                                        `,
                                        {
                                            color: "red",
                                            "font-size": "2em",
                                            "font-weight": "bold",
                                        }
                                    )
                                    await new Promise(resolve =>
                                        setTimeout(resolve, this.waitOnError)
                                    )
                                }
                            }

                            this.timings[previousWord][0] = this.previousTime
                            this.timings[previousWord][1] = keypressTime
                        }

                        if (this.currentWord < this.stoppingPoint) {
                            this.showWord(this.currentWord)
                            // This might be different from keypressTime if we imposed a waiting time in
                            // this here function
                            this.previousTime = Date.now()
                        } else {
                            this.trialSuccess = true
                            this.processResults()
                            this.finishedCallback(this.resultsLines)
                            return false
                        }

                        this.currentWord++
                        this.acceptKeypress = true

                        return false
                    } else {
                        return true
                    }
                })()
            })
        },

        showInstructions: function (instructions, style) {
            this.wordDisplay.text("")
            this.foilDisplay.text("")
            this.instructions.html(instructions)
            if (style !== undefined) {
                this.instructions.css(style)
            }
        },

        showWord: function (w) {
            this.instructions.html("")
            if (this.wordOnTheLeft[w]) {
                console.log("on the left")
                this.wordDisplay.detach().appendTo(this.leftDisplay)
                this.foilDisplay.detach().appendTo(this.rightDisplay)
            } else {
                console.log("on the right")
                this.wordDisplay.detach().appendTo(this.rightDisplay)
                this.foilDisplay.detach().appendTo(this.leftDisplay)
            }
            this.wordDisplay.text(this.words[w])
            this.foilDisplay.text(this.foils[w])
        },

        processResults: function () {
            for (let i = 0; i < this.words.length; ++i) {
                line = [
                    // If we don't add these first two columns, PCIbex will eat ours, see
                    // <https://github.com/PennController/penncontroller/blob/58087d68501706f1ba334a8a86b71cfb01e8e997/src/elements/PennElement_controller.js#L71>
                    ["Parameter", "NULL"],
                    ["Value", "NULL"],
                    ["Word number", i + 1],
                    ["Word", csv_url_encode(this.words[i])],
                    ["Side", this.wordOnTheLeft[i] ? "left" : "right"],
                    ["Correct word", this.correctAnswer[i]],
                    ["Reading time", this.timings[i][1] - this.timings[i][0]],
                    ["Sentence", this.sentenceDesc],
                ]
                for (const [key, value] of Object.entries(this.extraData)) {
                    line.push([key, value])
                }
                this.resultsLines.push(line)
            }
            line = [
                ["Parameter", "Trial Success"],
                ["Value", this.trialSuccess],
            ]
            for (const [key, value] of Object.entries(this.extraData)) {
                line.push([key, value])
            }
            this.resultsLines.push(line)
        },
    },

    properties: {
        obligatory: ["sent", "foils"],
        htmlDescription: function (opts) {
            return $(document.createElement("div")).text(opts.s)
        },
    },
})

addLoaderStyle = (prefix, duration="3000") => {
    // from <https://cssloaders.github.io/>
    $("head").append(
        `<style type="text/css">
            .${prefix}loader {
                width: 48px;
                height: 48px;
                border: 10px solid #FFF;
                border-radius: 50%;
                position: relative;
                transform: rotate(45deg);
                box-sizing: border-box;
                display: inline-block;
            }

            .${prefix}loader::before {
                content: "";
                position: absolute;
                box-sizing: border-box;
                inset: -10px;
                border-radius: 50%;
                border: 10px solid #FF3D00;
                animation: prixClipFix ${duration}ms infinite linear;
            }

            @keyframes prixClipFix {
                0% {
                    clip-path: polygon(50% 50%, 0 0, 0 0, 0 0, 0 0, 0 0)
                }

                25% {
                    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 0, 100% 0, 100% 0)
                }

                50% {
                    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 100% 100%, 100% 100%)
                }

                75% {
                    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 100%)
                }

                100% {
                    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 0)
                }
            }
        </style>`
    )
}
