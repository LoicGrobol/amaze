PennController.ResetPrefix(null); // Shorten command names (keep this line here))

// Start with welcome screen, then present test trials in a random order,
// and show the final screen after sending the results
Sequence("instructions", "practice", "send", "final");

// Welcome screen and logging user's ID
newTrial(
  "instructions",
  // We will print all Text elements
  defaultText.print(),
  newText("Welcome!"),
  newText(
    "In this experiment we are interested in seeing how quickly you can decide what the best way is to continue a sentence."
  ),
  newText(
    "You will see two words, one on the left and one on the right. One word will be obviously wrong."
  ),
  newText(
    "It is your job to decide which word is the correct continuation of the sentence."
  ),
  newText(
    "To do this, press F if the correct answer is on the left, or J if the correct answer is on the right."
  ),
  newText("You should do this as quickly and accurately as possible."),
  newText(
    "If you make a mistake, you will be immediately asked a question about the sentence that you did not fully read."
  ),
  newText(
    "Try to avoid this scenario by making your decisions quickly but accurately."
  ),
  newText(
    "If you read the whole sentence correctly, you will get to answer a question about that sentence having read the whole thing."
  ),
  newText("When you are ready, press SPACE to do a practice run."),
  newKey(" ").wait() // Finish trial upon press on spacebar
);

Template("practice_amaze.csv", (row) =>
  newTrial(
    "practice",
    newVar("success", "true"),
    newVar("question", row.Question),
    newController("Amaze", {
      sent: row.sentence,
      foils: row.maze,
      earlyExit: false,
      waitOnError: 5000,
      // Any value you put here (str: str) will end up in the log for each log line
      extraData: {
        sentence_type: row.con1,
      },
    })
      .print()
      .wait()
      .log()
      .remove(),
    newCanvas("side-by-side", 450, 200)
      .add(
        "0px",
        "calc(-40px + 20vh)",
        newText("comprehension_question", row.Question)
      )
      .add("calc(0%)", "calc(-40px + 50vh)", newText("no", "no"))
      .add("calc(100%)", "calc(-40px + 50vh)", newText("yes", "yes"))
      .center()
      .print(),
    newSelector("selection")
      .add(getText("no"), getText("yes"))
      .keys("F", "J")
      .log()
      .wait(),
    newVar("question_ok"),
    getSelector("selection")
      .test.selected(getText(row.Correct == "y" ? "yes" : "no"))
      .failure(
        getVar("question_ok").set("false"),
        getCanvas("side-by-side").remove(),
        newText("pleasewait", "INCORRECT").css("color", "red").center().print(),
        newTimer("wait_question", 5000).start().wait(),
        getText("pleasewait").remove()
      )
      .success(getVar("question_ok").set("true")),
    getVar("question_ok").log()
  )
);

// Send the results
SendResults("send");

// A simple final screen
newTrial(
  "final",
  newText("The experiment is over. Thank you for participating!").print(),
  newText("You can now close this page.").print(),
  // Stay on this page forever
  newButton().wait()
);
