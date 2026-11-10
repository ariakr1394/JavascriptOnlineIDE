document.addEventListener("DOMContentLoaded", function() {

    const output = document.getElementById("console");
    const textbox = document.getElementById("text");
    const runButton = document.getElementById("run");
    const clearButton = document.getElementById("clear");

    // Console methods
    const methods = ["log", "error", "warn", "info", "debug"];

    const colors = {
        log: "white",
        error: "red",
        warn: "yellow",
        info: "blue",
        debug: "white"
    };

    const names = {
        log: "Log",
        error: "Error",
        warn: "Warn",
        info: "Info",
        debug: "Debug"
    };

    // --------------------------------
    // Console output
    // --------------------------------

    function addMessage(type, message) {
        const line = document.createElement("div");

        const label = document.createElement("span");
        label.className = colors[type] || "white";
        label.textContent = names[type] || "Log";

        const text = document.createElement("p");
        text.className = (colors[type] || "white") + "w";
        text.textContent = message;

        line.appendChild(label);
        line.appendChild(text);
        output.appendChild(line);
    }

    // --------------------------------
    // Interaction panel
    // --------------------------------

    const hiddenStyle = document.createElement("style");

    hiddenStyle.textContent = `
        [hidden] {
            display: none !important;
        }
    `;

    document.head.appendChild(hiddenStyle);

    const panel = document.createElement("div");

    panel.style.cssText = `
        display: none;
        flex-direction: column;
        gap: 12px;
        width: 70vw;
        margin-top: 12px;
        padding: 15px;
        background: #222;
        border: 1px solid #383838;
        border-radius: 10px;
        color: white;
        box-sizing: border-box;
    `;

    output.insertAdjacentElement("afterend", panel);

    const message = document.createElement("div");

    message.style.cssText = `
        color: white;
        font-size: 14px;
        overflow-wrap: anywhere;
    `;

    panel.appendChild(message);

    // Prompt input row
    const promptRow = document.createElement("div");

    promptRow.hidden = true;

    promptRow.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
    `;

    const prefix = document.createElement("span");

    prefix.textContent = ">";

    prefix.style.cssText = `
        color: #4CAF50;
        font-size: 18px;
        font-weight: bold;
    `;

    const input = document.createElement("input");

    input.type = "text";
    input.autocomplete = "off";
    input.placeholder = "Enter your input...";

    input.style.cssText = `
        flex: 1;
        min-width: 0;
        background: #252525;
        color: white;
        border: 1px solid #444;
        border-radius: 7px;
        padding: 10px;
        font-size: 14px;
        outline: none;
        box-sizing: border-box;
    `;

    promptRow.appendChild(prefix);
    promptRow.appendChild(input);

    panel.appendChild(promptRow);

    // Buttons
    const buttons = document.createElement("div");

    buttons.hidden = true;

    buttons.style.cssText = `
        display: flex;
        gap: 8px;
    `;

    panel.appendChild(buttons);

    function createButton(label) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = label;

        button.style.cssText = `
            background: #383838;
            color: white;
            border: 1px solid #505050;
            border-radius: 8px;
            padding: 9px 20px;
            cursor: pointer;
            font-size: 14px;
        `;

        return button;
    }

    const okButton = createButton("OK");
    const cancelButton = createButton("Cancel");

    buttons.appendChild(okButton);
    buttons.appendChild(cancelButton);

    // Interaction state
    let activeCallback = null;
    let activeKind = null;

    function hidePanel() {
        panel.style.display = "none";

        promptRow.hidden = true;
        buttons.hidden = true;
        cancelButton.hidden = false;

        activeCallback = null;
        activeKind = null;
    }

    function showInteraction(kind, text, defaultValue, callback) {
        hidePanel();

        activeKind = kind;
        activeCallback = callback;

        message.textContent = text;
        panel.style.display = "flex";

        if (kind === "prompt") {
            promptRow.hidden = false;
            buttons.hidden = false;
            cancelButton.hidden = false;

            input.value = defaultValue == null ? "" : String(defaultValue);

            setTimeout(function() {
                if (activeKind === "prompt") {
                    input.focus();
                }
            }, 0);
        }

        else if (kind === "confirm") {
            buttons.hidden = false;
            cancelButton.hidden = false;
        }

        else if (kind === "alert") {
            buttons.hidden = false;
            cancelButton.hidden = true;
        }
    }

    function finishInteraction(value) {
        if (typeof activeCallback !== "function") {
            return;
        }

        const callback = activeCallback;

        hidePanel();

        callback(value);
    }

    // --------------------------------
    // Prompt keyboard
    // --------------------------------

    input.addEventListener("keydown", function(event) {

        if (event.key === "Enter" && activeKind === "prompt") {
            event.preventDefault();
            finishInteraction(input.value);
        }

        if (event.key === "Escape" && activeKind === "prompt") {
            event.preventDefault();
            finishInteraction(null);
        }

    });

    // --------------------------------
    // OK button
    // --------------------------------

    okButton.addEventListener("click", function() {

        if (activeKind === "prompt") {
            finishInteraction(input.value);
        }

        else if (activeKind === "confirm") {
            finishInteraction(true);
        }

        else if (activeKind === "alert") {
            finishInteraction(undefined);
        }

    });

    // --------------------------------
    // Cancel button
    // --------------------------------

    cancelButton.addEventListener("click", function() {

        if (activeKind === "prompt") {
            finishInteraction(null);
        }

        else if (activeKind === "confirm") {
            finishInteraction(false);
        }

    });

    // --------------------------------
    // Interpreter
    // --------------------------------

    let interpreter = null;
    let runToken = 0;

    function initInterpreter(interpreterInstance, globalObject) {

        const token = runToken;

        // Register console
        const customConsole = interpreterInstance.nativeToPseudo({});

        methods.forEach(function(method) {

            const wrapper = function() {

                const args = Array.prototype.slice.call(arguments);

                const text = args.map(function(arg) {
                    return String(arg);
                }).join(" ");

                addMessage(method, text);
            };

            interpreterInstance.setProperty(
                customConsole,
                method,
                interpreterInstance.createNativeFunction(wrapper)
            );

        });

        interpreterInstance.setProperty(
            globalObject,
            "console",
            customConsole
        );

        // --------------------------------
        // Prompt
        // --------------------------------

        const promptWrapper = function(messageText, defaultValue, callback) {

            const initialValue = defaultValue === undefined
                ? ""
                : String(defaultValue);

            showInteraction(
                "prompt",
                messageText === undefined ? "" : String(messageText),
                initialValue,
                function(value) {

                    callback(value);

                    if (token === runToken) {

                        setTimeout(function() {
                            executeSteps(token);
                        }, 0);

                    }

                }
            );

        };

        interpreterInstance.setProperty(
            globalObject,
            "prompt",
            interpreterInstance.createAsyncFunction(promptWrapper)
        );

        // --------------------------------
        // Confirm
        // --------------------------------

        const confirmWrapper = function(messageText, callback) {

            showInteraction(
                "confirm",
                messageText === undefined ? "" : String(messageText),
                "",
                function(value) {

                    callback(value);

                    if (token === runToken) {

                        setTimeout(function() {
                            executeSteps(token);
                        }, 0);

                    }

                }
            );

        };

        interpreterInstance.setProperty(
            globalObject,
            "confirm",
            interpreterInstance.createAsyncFunction(confirmWrapper)
        );

        // --------------------------------
        // Alert
        // --------------------------------

        const alertWrapper = function(messageText, callback) {

            showInteraction(
                "alert",
                messageText === undefined ? "" : String(messageText),
                "",
                function() {

                    callback(undefined);

                    if (token === runToken) {

                        setTimeout(function() {
                            executeSteps(token);
                        }, 0);

                    }

                }
            );

        };

        interpreterInstance.setProperty(
            globalObject,
            "alert",
            interpreterInstance.createAsyncFunction(alertWrapper)
        );

    }

    // --------------------------------
    // Execute interpreter
    // --------------------------------

    function executeSteps(token) {

        if (!interpreter || token !== runToken) {
            return;
        }

        try {

            for (let i = 0; i < 1000; i++) {

                const result = interpreter.step();

                if (!result) {

                    interpreter = null;
                    hidePanel();

                    return;
                }

                if (interpreter.getStatus() === Interpreter.Status.ASYNC) {
                    return;
                }

            }

            setTimeout(function() {
                executeSteps(token);
            }, 0);

        }

        catch (error) {

            addMessage(
                "error",
                error.name + ": " + error.message
            );

            interpreter = null;
            hidePanel();

        }

    }

    // --------------------------------
    // Run code
    // --------------------------------

    function runCode(code) {

        runToken++;

        const token = runToken;

        interpreter = null;

        hidePanel();

        output.innerHTML = "";

        try {

            interpreter = new Interpreter(
                code,
                initInterpreter
            );

            executeSteps(token);

        }

        catch (error) {

            addMessage(
                "error",
                error.name + ": " + error.message
            );

            interpreter = null;
            hidePanel();

        }

    }

    // --------------------------------
    // Run button
    // --------------------------------

    runButton.addEventListener("click", function() {

        const code = textbox.value;

        textbox.value = "";    

        runCode(code);

    });

    // --------------------------------
    // Clear Console
    // --------------------------------

    clearButton.addEventListener("click", function() {

        output.innerHTML = "";

    });

    // --------------------------------
    // Ctrl + Enter
    // --------------------------------

    textbox.addEventListener("keydown", function(event) {

        if (event.ctrlKey && event.key === "Enter") {

            event.preventDefault();

            runButton.click();

        }

    });

});
