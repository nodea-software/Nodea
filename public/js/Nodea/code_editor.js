/*!
 * Nodea v3.1
 * Copyright 2016
 * Licensed under GPLV3.0 https://www.gnu.org/licenses/gpl.html
 */

$(document).ready(function() {

    var editorContent = {};
    var editorScrollContent = {};
    var editorSaveContent = {};

    /* -------- Editor Initialisation -------- */
    // var intro1 = "	───▄▀▀▀▄▄▄▄▄▄▄▀▀▀▄───\n" +
		  //       "	───█▒▒░░░░░░░░░▒▒█───\n" +
		  //       "	────█░░█░░░░░█░░█────\n" +
		  //       "	─▄▄──█░░░▀█▀░░░█──▄▄─\n" +
		  //       "	█░░█─▀▄░░░░░░░▄▀─█░░█\n" +
		  //       "	█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█\n" +
		  //       "	█░░╦─╦╔╗╦─╔╗╔╗╔╦╗╔╗░░█\n" +
		  //       "	█░░║║║╠─║─║─║║║║║╠─░░█\n" +
		  //       "	█░░╚╩╝╚╝╚╝╚╝╚╝╩─╩╚╝░░█\n" +
		  //       "	█▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█\n\n\n";

    // var intro1 = " _____                 _\n";
    // intro1 += "|   | |___ _ _ _ _____|_|___ ___\n";
    // intro1 += "| | | | -_| | | |     | | . |_ -|\n";
    // intro1 += "|_|___|___|_____|_|_|_|_|  _|___|\n";
    // intro1 += "                        |_|\n\n\n";

    var intro1 = ' _   _           _\n';
    intro1 += '| \\ | |         | |\n';
    intro1 += '|  \\| | ___   __| | ___  __ _\n';
    intro1 += '|     |/ _ \\ / _  |/ _ \\/ _  |\n';
    intro1 += '| |\\  | (_) | (_| |  __/ (_| |\n';
    intro1 += '|_| \\_|\\___/ \\__,_|\\___|\\__,_|\n\n';

    /* Get browser chosenTheme */
    var chosenTheme = localStorage.getItem("nodea_editor_theme");

    if (chosenTheme == null) {
        localStorage.setItem("nodea_editor_theme", "monokai");
        chosenTheme = "monokai";
    } else if (chosenTheme != "monokai") {
        $("#select-theme").val(chosenTheme);
        $('head').append("<link href='/css/codemirror/themes/" + chosenTheme + ".css' rel='stylesheet' type='text/css'>");
    }

    function foldAll(cm) {
        for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++)
            cm.foldCode(CodeMirror.Pos(i, 0), null, "fold");
    };

    function unfoldAll(cm) {
        for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++)
            cm.foldCode(CodeMirror.Pos(i, 0), null, "unfold");
    };

    function getSelectedRange() {
        return {
            from: myEditor.getCursor(true),
            to: myEditor.getCursor(false)
        };
    }

    function autoFormatSelection(cm) {
        var range = getSelectedRange();
        var from = range.from;
        var to = range.to;
        if(range.from.line == range.to.line){
            from = CodeMirror.Pos(cm.firstLine(), 0);
            to = CodeMirror.Pos(cm.lastLine()+1, 0);
        }
        myEditor.autoFormatRange(from, to);
    }

    var isAlreadyFolded = false;

    myEditor = CodeMirror(document.getElementById("codemirror-editor"), {
        value: "\n" + intro1 + intro2,
        theme: chosenTheme,
        keyMap: "sublime",
        extraKeys: {
            "F11": function(cm) {
                cm.setOption("fullScreen", !cm.getOption("fullScreen"));
            },
            "Esc": function(cm) {
                if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
            },
            "Ctrl-S": function(cm) {
                if (typeof $("#update-file").data("path") !== "undefined")
                    $("#update-file").trigger("click");
                else
                    toastr.error("Please select a file before saving.")
            },
            "Ctrl-0": function(cm) {
                if(isAlreadyFolded) {
                    isAlreadyFolded = false;
                    unfoldAll(cm);
                } else {
                    isAlreadyFolded = true;
                    foldAll(cm);
                }
            },
            "Ctrl-=": function(cm) {
                autoFormatSelection(cm);
            }
        },
        lineNumbers: true,
        indentUnit: 4,
        indentWithTabs: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        showTrailingSpace: true,
        autoCloseTags: true,
        foldGutter: true,
        highlightDifferences: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
    });

    /* Event change on editor to highlight the unsave work */
    myEditor.on("keyup", function(instance, changeObj){
        if(typeof editorSaveContent[$("#update-file").attr("data-path")] !== "undefined" &&
            editorSaveContent[$("#update-file").attr("data-path")] != myEditor.getValue()){
            $("ul.nav.nav-tabs#editor-navtabs li.active").addClass("modified");
        }
        else{
            $("ul.nav.nav-tabs#editor-navtabs li.active").removeClass("modified");
        }
    });

    /* -------- Switch Editor Theme -------- */
    var selectTheme = document.getElementById("select-theme");
    $(document).on("change", "#select-theme", function() {
        var theme = $(this).val();
        $('head').append("<link href='/css/codemirror/themes/" + theme + ".css' rel='stylesheet' type='text/css'>");
        myEditor.setOption("theme", theme);
        localStorage.setItem("nodea_editor_theme", theme);
    });

    /* -------- Set mode depending of file extension -------- */
    // CodeMirror.defineMode("dust", function(config, parserConfig) {
    //     var dustOverlay = {
    //         token: function(stream, state) {
    //             var ch;
    //             if (stream.match("{<")) {
    //                 while ((ch = stream.next()) != null)
    //                     if (ch == "}") {
    //                         //stream.eat("}");
    //                         return "dust";
    //                     }
    //             }
    //             if (stream.match("{/")) {
    //                 while ((ch = stream.next()) != null)
    //                     if (ch == "}") {
    //                         //stream.eat("}");
    //                         return "dust";
    //                     }
    //             }
    //             if (stream.match("{>")) {
    //                 while ((ch = stream.next()) != null)
    //                     if (ch == "}") {
    //                         //stream.eat("}");
    //                         return "dust";
    //                     }
    //             }
    //             while (stream.next() != null && !stream.match("{<", false)) {}
    //             return null;
    //         }
    //     };
    //     var mode = {
    //         name: "xml",
    //         htmlMode: true,
    //         matchClosing: false
    //     };
    //     return CodeMirror.overlayMode(CodeMirror.getMode(config, parserConfig.backdrop || mode), dustOverlay);
    // });

    CodeMirror.defineSimpleMode("dust-tags", {
        start: [{
            regex: /\{!/,
            push: "comment",
            token: "comment"
        }, {
            regex: /\{/,
            push: "dust",
            token: "tag"
        }],
        dust: [{
            regex: /\}/,
            pop: true,
            token: "tag"
        }, {
            regex: /"(?:[^\\"]|\\.)*"?/,
            token: "string"
        }, {
            regex: /'(?:[^\\']|\\.)*'?/,
            token: "string"
        }, {
            regex: /[#\/]([A-Za-z_]\w*)/,
            token: "keyword"
        }, {
            regex: /[<\/]([A-Za-z_]\w*)/,
            token: "keyword"
        }, {
            regex: /[>\/]([A-Za-z_]\w*)/,
            token: "keyword"
        }, {
            regex: /[+\/]([A-Za-z_]\w*)/,
            token: "keyword"
        }, {
            regex: /[?\/]([A-Za-z_]\w*)/,
            token: "keyword"
        }, {
            regex: /[@\/]([A-Za-z_]\w*)/,
            token: "keyword"
        }, {
            regex: /[:\/]([A-Za-z_]\w*)/,
            token: "keyword"
        }, {
            regex: /[\^\/]([A-Za-z_]\w*)/,
            token: "keyword"
        }, {
            regex: /\d+/i,
            token: "number"
        }, {
            regex: /=|~|@|true|false|>|<|:|\||\//,
            token: "atom"
        }, {
            regex: /(?:\.\.\/)*(?:[A-Za-z_][\w\.]*)+/,
            token: "variable-2"
        }],
        comment: [{
            regex: /\}/,
            pop: true,
            token: "comment"
        }, {
            regex: /./,
            token: "comment"
        }]
    });

    CodeMirror.defineMode("dust", function(config, parserConfig) {
        var dust = CodeMirror.getMode(config, "dust-tags");
        if (!parserConfig || !parserConfig.base) return dust;
        return CodeMirror.multiplexingMode(
            CodeMirror.getMode(config, parserConfig.base), {
                open: "{",
                close: "}",
                mode: dust,
                parseDelimiters: true
            }
        );
    });

    CodeMirror.defineMIME("text/x-dust-template", "dust");

    function setMode(extension) {
        switch (extension) {
            case "css":
                myEditor.setOption("mode", "css");
                break;
            case "html":
                myEditor.setOption("mode", "htmlmixed");
                break;
            case "dust":
                myEditor.setOption("mode", {name: 'dust', base: 'htmlmixed'});
                break;
            case "js":
                myEditor.setOption("mode", "javascript");
                break;
            case "json":
                var mode = {
                    name: "javascript",
                    json: true
                };
                myEditor.setOption("mode", mode);
                break;
            case "sql":
                myEditor.setOption("mode", "sql");
                break;
            case "xml":
                myEditor.setOption("mode", "xml");
                break;
        }
    };

    var fileToDisable = ["/models/", "/_core/"];
    function toDisable(path){
        for(var i=0; i<fileToDisable.length; i++){
            if(path.indexOf(fileToDisable[i]) != -1){
                return true;
            }
        }
        return false;
    };

    /* -------- Load a file in the editor -------- */
    $(document).on("click", ".load-file", function(event, refreshFromInstruction) {

        var ajaxData = {
            path: $(this).attr("data-path")
        };

        // Security
        $("#update-file").prop("disabled", true);

        $.ajax({
            url: '/editor/load_file',
            type: 'POST',
            data: JSON.stringify(ajaxData),
            dataType: 'json',
            contentType: "application/json",
            context: this,
            success: function(data) {
                // Is read only file ?
                var isToDisable = toDisable($(this).attr("data-path"));

                /* Save the current editor content in the OLD tab */
                editorContent[$("#update-file").attr("data-path")] = myEditor.getValue();
                editorScrollContent[$("#update-file").attr("data-path")] = myEditor.getScrollInfo();

                /* Color select file in folders */
                $(".load-file").each(function() {
                    $(this).css("color", "#777", "important");
                });
                $(this).css("color", "rgb(60, 141, 188)");

                /* Remove other active tabs */
                $("ul.nav.nav-tabs#editor-navtabs li").each(function() {
                    $(this).removeClass("active");
                });

                /* Update the save button */
                data.path = data.path.replace(/\\/gi, '/');
                if(!isToDisable){
                    $("#update-file").attr("data-path", data.path);
                    $("#update-file").removeAttr("disabled");
                } else{
                    $("#update-file").attr("data-path", "");
                    $("#update-file").prop("disabled", true);
                }

                /* Set good file editor mode */
                setMode(data.extension);

                if (!$("li[data-path='" + data.path + "']").length || $("li[data-path='" + data.path + "']").length < 1) {
                    /* Add tab */
                    var tab = "<li class='nav-item load-file active' data-path='" + data.path + "' data-toggle='pill' href='#editor-navtabs' role='tab' aria-controls='custom-content-below-home' aria-selected='false'>" +
                        "<a class='nav-link active' style='cursor:pointer' data-toggle='tab'>" + $(this).attr("data-filename") +
                        "  <i class='fa fa-times close-tab' aria-hidden='true'></i>" +
                        "</a></li>";
                    $("ul.nav.nav-tabs#editor-navtabs").append(tab);

                    /* Add content from server side in editor */
                    editorContent[data.path] = data.html;
                    editorSaveContent[data.path] = data.html;
                    myEditor.setValue(data.html);
                    if(isToDisable)
                        myEditor.setOption("readOnly", true);
                    else
                        myEditor.setOption("readOnly", false);
                } else {
                    /* Tab already exist */
                    $("li[data-path='"+data.path+"']").addClass("active");
                    if(refreshFromInstruction) {
                        editorContent[data.path] = data.html;
                        editorSaveContent[data.path] = data.html;
                        myEditor.setValue(data.html);
                    } else {
                        /* Get the old content */
                        myEditor.setValue(editorContent[data.path]);
                        myEditor.scrollTo(editorScrollContent[data.path].left, editorScrollContent[data.path].top);
                    }

                    if(isToDisable)
                        myEditor.setOption("readOnly", true);
                    else
                        myEditor.setOption("readOnly", false);
                }

                myEditor.clearHistory();
            },
            error: function(error) {
                console.error(error);
                toastr.error("Sorry, an error occured :/");
            }
        });
    });

    /* -------- Update the current file -------- */
    $(document).on("click", "#update-file", function() {
        var ajaxData = {
            path: $(this).attr("data-path"),
            content: myEditor.getValue()
        }

        $("#update-file").prop("disabled", true);

        $.ajax({
            url: '/editor/update_file',
            type: 'POST',
            data: JSON.stringify(ajaxData),
            dataType: 'json',
            contentType: "application/json",
            context: this,
            success: function(data) {
                editorContent[ajaxData.path] = ajaxData.content;
                editorSaveContent[ajaxData.path] = ajaxData.content;
                $("ul.nav.nav-tabs#editor-navtabs li.active").removeClass("modified");
                toastr.success("Le fichier a bien été mis à jour !");
                $("#update-file").removeAttr("disabled");
            },
            error: function(error) {
                console.error(error);
                toastr.error("Sorry, an error occured :/");
            }
        });
    });

    /* -------- Close tabs -------- */
    $(document).on("click", ".close-tab", function(e) {
        e.stopPropagation();
        e.preventDefault();
        $(this).parents("li").remove();
        if ($(".nav-tabs#editor-navtabs li").length == 0) {
            myEditor.setValue("\n\n" + intro1 + intro2);
            /* Update the save button */
            $("#update-file").attr("data-path", "");
            $("#update-file").prop("disabled", true);
        } else {
            $(".nav-tabs#editor-navtabs li").first().trigger("click");
        }
    });
});
