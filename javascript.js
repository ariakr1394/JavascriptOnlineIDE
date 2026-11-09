
document.addEventListener("DOMContentLoaded", function() {

    const output = document.getElementById("console");
    const textbox = document.getElementById("text");
    const runButton = document.getElementById("run");
    const clearButton = document.getElementById("clear");
    const iframe = document.getElementById("sandbox");

    // Console methods
    const methods = ["log", "error", "warn", "info", "debug"];

    // Colors
    const colors = {
        log: "white",
        error: "red",
        warn: "yellow",
        info: "blue",
        debug: "white"
    };

    // Labels
    const names = {
        log: "Log",
        error: "Error",
        warn: "Warn",
        info: "Info",
        debug: "Debug"
    };

    // Display messages
    function addMessage(type, message) {

        const line = document.createElement("div");

        const label = document.createElement("span");
        label.className = colors[type];
        label.textContent = names[type];

        const text = document.createElement("p");
        text.className = colors[type] + "w";
        text.textContent = message;

        line.appendChild(label);
        line.appendChild(text);

        output.appendChild(line);
    }

    // Receive messages from iframe
    window.addEventListener("message", function(event) {

        if (event.source !== iframe.contentWindow) return;

        const data = event.data;

        if (!data || !methods.includes(data.type)) return;

        addMessage(data.type, String(data.message));

    });

    // Run JavaScript in sandbox
    function runCode(code) {

        iframe.onload = function() {

            iframe.contentWindow.postMessage({
                type: "execute",
                code: code
            }, "*");

        };

        iframe.srcdoc = `
            <script>

                const methods = ["log", "error", "warn", "info", "debug"];

                // Capture console methods
                methods.forEach(method => {

                    console[method] = function(...args) {

                        const message = args.map(arg => {

                            if (arg instanceof Error) {
                                return arg.message;
                            }

                            if (typeof arg === "object" && arg !== null) {
                                try {
                                    return JSON.stringify(arg);
                                } catch {
                                    return "[Object]";
                                }
                            }

                            return String(arg);

                        }).join(" ");

                        parent.postMessage({
                            type: method,
                            message: message
                        }, "*");

                    };

                });

                // Capture JavaScript errors
                window.onerror = function(message) {

                    parent.postMessage({
                        type: "error",
                        message: String(message)
                    }, "*");

                    return true;
                };

                // Capture Promise errors
                window.onunhandledrejection = function(event) {

                    parent.postMessage({
                        type: "error",
                        message: "Unhandled Promise Rejection: " +
                            String(event.reason)
                    }, "*");

                };

                // Execute received code
                window.addEventListener("message", function(event) {

                    if (event.source !== parent) return;

                    if (!event.data || event.data.type !== "execute") return;

                    try {

                        eval(event.data.code);

                    } catch (error) {

                        parent.postMessage({
                            type: "error",
                            message: error.name + ": " + error.message
                        }, "*");

                    }

                });

            <\/script>
        `;

    }

    // Run button
    runButton.addEventListener("click", function() {

        const code = textbox.value;
        textbox.value = "";

        runCode(code);

    });

    // Clear Console button
    clearButton.addEventListener("click", function() {

        output.innerHTML = "";

    });
// Ctrl + Enter shortcut
textbox.addEventListener("keydown", function(event) {

    if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        runButton.click();
    }

});
});
