PennController.ResetPrefix(null); // Shorten command names (keep this line here))

// Start with welcome screen, then present test trials in a random order,
// and show the final screen after sending the results
Sequence(
    "welcome", "consent", "info_collection",
    "instructions", "practice", randomize("experiment"),
    "send", "final"
    );

Header(/* void */)
    // This .log command will apply to all trials
    .log("ID", GetURLParameter("id")); // Append the "ID" URL parameter to each result line

newTrial("welcome",
    defaultText.left().print()
    ,
    newText("Welcome!")
    ,
    newText("\n")
    ,
    newText("This experiment needs to be run on a computer. If you are currently using a tablet (e.g. an iPad) or a smartphone, your data won't be saved. Please log off and start again from an appropriate device.")
    ,
    newText("\n")
    ,
    newText("You will start by approving a consent form, and we will collect some information about your background.")
    ,
    newText("\n")
    ,
    newText("Please enter your Prolific ID and then click the button below to start the experiment.")
    ,
    newTextInput("ID")
        .center()
        .print()
    ,
    newText(" ")
    ,
    newButton("Next")
        .center()
        .print()
        .wait(getTextInput("ID").testNot.text("") )
    ,
    newVar("ID")
        .settings.global()
        .set( getTextInput("ID") )
    )
    .log( "ID" , getVar("ID") );


newTrial("consent",
    newHtml("consent_form", "consent.html")
        .cssContainer({"width":"720px"})
        .checkboxWarning("You must consent before continuing.")
        .print()
    ,
    newButton("continue", "Click to continue")
        .center()
        .print()
        .wait(getHtml("consent_form").test.complete()
                  .failure(getHtml("consent_form").warn())
        )
).log( "ID" , getVar("ID") );

// Collecting Participant info if we need them
newTrial("info_collection",
     // Automatically print all Text elements, centered
    defaultText.left().print()
    ,
    newText("Participant information.")
    ,
    newText(" ")
    ,
    newText("The information provided here is anonymous and used exclusively for data analysis purposes.")
    ,
    newText(" ")
    ,
    newText("Year of Birth:")
    ,
    newTextInput("inputYear", "")
        .left()
        .css("margin","1em")    // Add a 1em margin around this element
        .print()
        .log()
    ,
    newText(" ")
    .print()
    ,
    newText("Which language do you speak at home?")
    ,
    newTextInput("language1", "")
        .left()
        .css("margin","1em")    // Add a 1em margin around this element
        .print()
        .log()
    ,
    newText(" ")
    ,
    newText("Which language do you consider your mother tongue?")
    ,
    newTextInput("language2", "")
        .left()
        .css("margin","1em")    // Add a 1em margin around this element
        .print()
        .log()
    ,
    newText(" ")
    ,
    newText("Do you know any other language? Please list them together with your perceived level of knowledge (base, intermediate, fluent, mothertongue). For example: English, mothertongue.")
    ,
    newTextInput("language3", "")
        .left()
        .css("margin","1em")    // Add a 1em margin around this element
        .print()
        .log()
    ,
    newText(" ")
    .print()
    ,
    newText("Make sure the information you provided is correct. Then, click on the button below to proceed. ")
    .print()
     ,
    newText(" ")
    ,
    newButton("Next")
        .center()
        .print()
        // Only validate a click on Start when inputID has been filled
        .wait( getTextInput("inputYear").testNot.text("") )
).log( "ID" , getVar("ID") );


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
    newText("It is your job to decide which word is the correct continuation of the sentence."),
    newText(
        "To do this, press F if the correct answer is on the left, or J if the correct answer is on the right."
    ),
    newText("You should do this as quickly and accurately as possible."),
    newText(
        "If you make a mistake, you will be immediately asked a question about the sentence that you did not fully read."
    ),
    newText("Try to avoid this scenario by making your decisions quickly but accurately."),
    newText(
        "If you read the whole sentence correctly, you will get to answer a question about that sentence having read the whole thing."
    ),
    newText("When you are ready, press SPACE to do a practice run."),
    newKey(" ").wait() // Finish trial upon press on spacebar
);

// TODO: Add a copy of the below so we can run practice objects without randomization
var trial_result = "success";
Template("practice_amaze.csv", (row) =>
    newTrial(
        "practice",
        newVar("success", "true"),
        newVar("question", row.Question),
        newController("Amaze", {
            sent: row.sentence,
            foils: row.maze,
            successCallback: () => {
                trial_result = "success";
            },
            failureCallback: () => {
                trial_result = "failure";
            },
            // Any value you put here (str: str) will end up in the log for each log line
            extraData: {
                sentence_type: row.con1,
            },
        })
            .print()
            .wait()
            .log()
            .remove(),
        newVar("trial_result").set((_) => trial_result),
        getVar("trial_result").log(),
        newCanvas("side-by-side", 450, 200)
            .add("0px", "calc(-40px + 20vh)", newText("comprehension_question", row.Question))
            .add("calc(0%)", "calc(-40px + 50vh)", newText("no", "no"))
            .add("calc(100%)", "calc(-40px + 50vh)", newText("yes", "yes"))
            .center()
            .print(),
        newSelector("selection").add(getText("no"), getText("yes")).keys("F", "J").log().wait(),
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

// Ugly global var, the only way (that didn't involve monkeypatching the controller anyway) I found
// to exfiltrate results from the controller in the current state of the PennController (trust me,
// I've tried)
var trial_result = "success";
Template("peelle_smazecb.csv", (row) => // V1 smaze; V2 smazecb
    newTrial(
        "experiment",
        newVar("success", "true"),
        newVar("question", row.Question),
        newController("Amaze", {
            sent: row.sentence,
            foils: row.maze,
            successCallback: () => {
                trial_result = "success";
            },
            failureCallback: () => {
                trial_result = "failure";
            },
            // Any value you put here (str: str) will end up in the log for each log line
            extraData: {
                sentence_type: row.con1
            },
        })
            .print()
            .wait()
            .log()
            .remove(),
        newVar("trial_result").set((_) => trial_result),
        getVar("trial_result").log(),
        newCanvas("side-by-side", 450, 200)
            .add("0px", "calc(-40px + 20vh)", newText("comprehension_question", row.Question))
            .add("calc(0%)", "calc(-40px + 50vh)", newText("no", "no"))
            .add("calc(100%)", "calc(-40px + 50vh)", newText("yes", "yes"))
            .center()
            .print(),
        newSelector("selection").add(getText("no"), getText("yes")).keys("F", "J").log().wait(),
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
        .log("group", row.group)
        .log("item", row.index)
        .log("sentence_type", row.con1)
);

// Send the results
SendResults("send");

// A simple final screen
newTrial(
    "final",
    newText("The experiment is over. Thank you for participating!").print(),
    newText("Please copy and paste this code to Prolific: C18G4NXZ").print(),
    newText("You can now close this page.").print(),
    // Stay on this page forever
    newButton().wait()
);
