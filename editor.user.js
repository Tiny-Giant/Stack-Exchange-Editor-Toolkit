// ==UserScript==
// @name           Stack-Exchange-Editor-Toolkit
// @author         Cameron Bernhardt (AstroCB)
// @developer      Jonathan Todd (jt0dd)
// @developer      sathyabhat
// @contributor    Unihedron
// @contributor    Tiny Giant
// @contributor    Mogsdad
// @grant          GM_addStyle
// @license        MIT
// @namespace      http://github.com/AstroCB
// @version        1.5.2.15
// @run-at         document-start
// @description    Fix common grammar/usage annoyances on Stack Exchange posts with a click
// @include        *://*.stackexchange.com/questions/*
// @include        *://stackoverflow.com/questions/*
// @include        *://stackoverflow.com/review/helper/*
// @include        *://meta.stackoverflow.com/questions/*
// @include        *://serverfault.com/questions/*
// @include        *://meta.serverfault.com/questions/*
// @include        *://superuser.com/questions/*
// @include        *://meta.superuser.com/questions/*
// @include        *://askubuntu.com/questions/*
// @include        *://meta.askubuntu.com/questions/*
// @include        *://stackapps.com/questions/*
// @include        *://*.stackexchange.com/posts/*
// @include        *://stackoverflow.com/posts/*
// @include        *://meta.stackoverflow.com/posts/*
// @include        *://serverfault.com/posts/*
// @include        *://meta.serverfault.com/posts/*
// @include        *://superuser.com/posts/*
// @include        *://meta.superuser.com/posts/*
// @include        *://askubuntu.com/posts/*
// @include        *://meta.askubuntu.com/posts/*
// @include        *://stackapps.com/posts/*
// @include        *://*.stackexchange.com/review/*
// @include        *://stackoverflow.com/review/*
// @include        *://meta.stackoverflow.com/review/*
// @include        *://serverfault.com/review/*
// @include        *://meta.serverfault.com/review/*
// @include        *://superuser.com/review/*
// @include        *://meta.superuser.com/review/*
// @include        *://askubuntu.com/review/*
// @include        *://meta.askubuntu.com/review/*
// @include        *://stackapps.com/review/*
// @exclude        *://*.stackexchange.com/questions/tagged/*
// @exclude        *://stackoverflow.com/questions/tagged/*
// @exclude        *://meta.stackoverflow.com/questions/tagged/*
// @exclude        *://serverfault.com/questions/tagged/*
// @exclude        *://meta.serverfault.com/questions/tagged/*
// @exclude        *://superuser.com/questions/tagged/*
// @exclude        *://meta.superuser.com/questions/tagged/*
// @exclude        *://askubuntu.com/questions/tagged/*
// @exclude        *://meta.askubuntu.com/questions/tagged/*
// @exclude        *://stackapps.com/questions/tagged/*
// @exclude        *://*.stackexchange.com/questions/new/*
// @exclude        *://stackoverflow.com/questions/new/*
// @exclude        *://meta.stackoverflow.com/questions/new/*
// @exclude        *://serverfault.com/questions/new/*
// @exclude        *://meta.serverfault.com/questions/new/*
// @exclude        *://superuser.com/questions/tagged/new/*
// @exclude        *://meta.superuser.com/questions/tagged/new/*
// @exclude        *://askubuntu.com/questions/tagged/new/*
// @exclude        *://meta.askubuntu.com/questions/tagged/new/*
// @exclude        *://stackapps.com/questions/tagged/new/*
// ==/UserScript==

(function(){
    "use strict";
    function EditorToolkit(targetID) {
        if (!(this instanceof EditorToolkit)) return false;

        var App = this;

        // Place edit items here
        App.items = {};
        App.originals = {};

        // Place selected jQuery items here
        App.selections = {};

        // Place "global" app data here
        App.globals = {};

        // Place "helper" functions here
        App.funcs = {};

        //Preload icon alt
        var SEETicon = new Image();

        SEETicon.src = '//i.imgur.com/d5ZL09o.png';

        // Check if there was an ID passed (if not, use question ID from URL);
        if (!targetID) targetID = window.location.href.match(/\/(\d+)\//g)[0].split("/").join("");
        App.globals.targetID = targetID;

        App.globals.spacerHTML = '<li class="wmd-spacer wmd-spacer3" id="wmd-spacer3-' + App.globals.targetID + '" style="left: 400px !important;"></li>';

        App.globals.reasons = [];

        App.globals.replacedStrings = {
            "block": [],
            "inline": []
        };
        App.globals.placeHolders = {
            "block": "_xCodexBlockxPlacexHolderx_",
            "inline": "_xCodexInlinexPlacexHolderx_"
        };
        App.globals.placeHolderChecks = {
            "block": /_xCodexBlockxPlacexHolderx_/g,
            "inline": /_xCodexInlinexPlacexHolderx_/g
        };
        App.globals.checks = {
            "block": /((?:[ ]{4}|[ ]{0,3}\t)+.+(?:\r?\n))+|(  (?:\[\d\]): \w*:+\/\/.*\n)+/g,  // block code or markdown link section
            "inline": /(`.+`)|(\[.+\]\(.+\))|(\w*:+(?:\/\/|\\)[^()\n"'>]*)/g   // inline code, quoted text or URLs
        };

        // Assign modules here
        App.globals.pipeMods = {};

        // Define order in which mods affect  here
        App.globals.order = ["omit", "edit", "replace"];


        // Define edit rules
        App.edits = {
            so: {
                expr: /\bstack\s*overflow\b/gi,
                replacement: "Stack Overflow",
                reason: "'Stack Overflow' is the legal name"
            },
            se: {
                expr: /\bstack\s*exchange\b/gi,
                replacement: "Stack Exchange",
                reason: "'Stack Exchange' is the legal name"
            },
            expansionSO: {
                expr: /([^\b.])SO\b/g,
                replacement: "$1Stack Overflow",
                reason: "'Stack Overflow' is the legal name"
            },
            expansionSE: {
                expr: /([^\b.])SE\b/g,
                replacement: "$1Stack Exchange",
                reason: "'Stack Exchange' is the legal name"
            },
            javascript: {
                expr: /([^\b.])(javascript|js)\b/gi,
                replacement: "$1JavaScript",
                reason: "'JavaScript' is the proper capitalization"
            },
            jsfiddle: {
                expr: /\bjsfiddle\b/gi,
                replacement: "JSFiddle",
                reason: "'JSFiddle' is the proper capitalization"
            },
            jquery: {
                expr: /\bjquery\b/gi,
                replacement: "jQuery",
                reason: "'jQuery' is the proper capitalization"
            },
            angular: {
                expr: /\bangular(?:js)?\b/gi,
                replacement: "AngularJS",
                reason: "'AngularJS is the proper capitalization"
            },
            html: {
                expr: /([^\b.])html(\d)?\b/gi,
                replacement: "$1HTML$2",
                reason: "HTML stands for HyperText Markup Language"
            },
            css: {
                expr: /([^\b.])css\b/gi,
                replacement: "$1CSS",
                reason: "CSS stands for Cascading Style Sheets"
            },
            json: {
                expr: /\bjson\b/gi,
                replacement: "JSON",
                reason: "JSON stands for JavaScript Object Notation"
            },
            ajax: {
                expr: /\bajax\b/gi,
                replacement: "AJAX",
                reason: "AJAX stands for Asynchronous JavaScript and XML"
            },
            php: {
                expr: /([^\b.])php\b/gi,
                replacement: "$1PHP",
                reason: "PHP stands for PHP: Hypertext Preprocessor"
            },
            voting: {
                expr: /\b(down|up)\Wvot/gi,
                replacement: "$1vote",
                reason: "the proper spelling (despite the tag name) is '$1vote' (one word)"
            },
            c: {
                expr: /([^\b.])c([#+]+)|([^\b.])\bc\b/gi,
                replacement: "$1C$2",
                reason: "C$1 is the proper reference"
            },
            java: {
                expr: /\bjava\b/gi,
                replacement: "Java",
                reason: "Java is the proper reference"
            },
            sql: {
                expr: /([^\b.])sql\b/gi,
                replacement: "$1SQL",
                reason: "SQL is the proper reference"
            },
            sqlite: {
                expr: /\bsqlite\s*([0-9]*)\b/gi,
                replacement: "SQLite $2",
                reason: "SQLite is the proper reference"
            },
            android: {
                expr: /\bandroid\b/gi,
                replacement: "Android",
                reason: "Android is the proper reference"
            },
            oracle: {
                expr: /\boracle\b/gi,
                replacement: "Oracle",
                reason: "Oracle is the proper reference"
            },
            windows: {
                expr: /\b(?:win|windows)\s*[0-9]+\b/gi,
                replacement: "Windows $1",
                reason: "Windows $1 is the proper reference"
            },
            windowsXP: {
                expr: /\b(?:win|windows)\s*xp\b/gi,
                replacement: "Windows XP",
                reason: "Windows XP is the proper reference"
            },
            windowsVista: {
                expr: /\b(?:win|windows)\s*vista\b/gi,
                replacement: "Windows Vista",
                reason: "Windows Vista is the proper reference"
            },
            linux: {
                expr: /\blinux\b/gi,
                replacement: "Linux",
                reason: "Linux is the proper reference"
            },
            wordpress: {
                expr: /\bwordpress\b/gi,
                replacement: "WordPress",
                reason: "WordPress is the proper reference"
            },
            google: {
                expr: /\bgoogle\b/gi,
                replacement: "Google",
                reason: "Google is the proper reference"
            },
            mysql: {
                expr: /\bmysql\b/gi,
                replacement: "MySQL",
                reason: "MySQL is the proper reference"
            },
            apache: {
                expr: /\bapache\b/gi,
                replacement: "Apache",
                reason: "Apache is the proper reference"
            },
            git: {
                expr: /\bgit\b/gi,
                replacement: "Git",
                reason: "Git is the proper reference"
            },
            github: {
                expr: /\bgithub\b/gi,
                replacement: "GitHub",
                reason: "GitHub is the proper reference"
            },
            facebook: {
                expr: /\bfacebook\b/gi,
                replacement: "Facebook",
                reason: "Facebook is the proper reference"
            },
            python: {
                expr: /\bpython\b/gi,
                replacement: "Python",
                reason: "Python is the proper reference"
            },
            urli: {
                expr: /\bur([li])\b/gi,
                replacement: "UR$1",
                reason: "UR$1 is the proper reference"
            },
            ios: {
                expr: /\bios\b/gi,
                replacement: "iOS",
                reason: "iOS is the proper reference"
            },
            iosnum: {
                expr: /\bios([0-9])\b/gi,
                replacement: "iOS $1",
                reason: "the proper usage is 'iOS' followed by a space and the version number"
            },
            ubunto: {
                expr: /\b[uoa]*b[uoa]*[tn][oua]*[tnu][oua]*\b/gi,
                replacement: "Ubuntu",
                reason: "Ubuntu is the proper reference"
            },
            regex: {
                expr: /\bregex(p)?/gi,
                replacement: "RegEx$1",
                reason: "RegEx$1 is the proper reference"
            },
            thanks: {
                expr: /[^\n.!?:]*\b(th?anks?|th(?:an)?x|tanx|h[ae]?lp|edit|update|suggestion|advice|pl(?:ease|z|s)|folks?|hi|hello|ki‌nd(‌?:est|ly)|first\squestion)[^,.!\n]*[,.!\n]*|[\r\n]*(regards|cheers?),?[\t\f ]*[\r\n]?\w*\.?/gi,
                replacement: "",
                reason: "'$1' is unnecessary noise"
            },
            apostrophes: {
                expr: /\b(can|doesn|don|won|hasn|isn|didn)[^\w']*t\b/gi,
                replacement: "$1't",
                reason: "grammar and spelling"
            },
            prolly: {
                expr: /\bproll?y\b/gi,
                replacement: "probably",
                reason: "grammar and spelling"
            },
            i: {
                expr: /\bi\b/gi,
                replacement: "I",
                reason: "grammar and spelling"
            },
            im: {
                expr: /\bi\W*m\b/gi,
                replacement: "I'm",
                reason: "grammar and spelling"
            },
            ive: {
                expr: /\bi\W*ve\b/gi,
                replacement: "I've",
                reason: "grammar and spelling"
            },
            ur: {
                expr: /\bur\b/gi,
                replacement: "your", // May also be "you are", but less common on SO
                reason: "grammar and spelling"
            },
            u: {
                expr: /\bu\b/gi,
                replacement: "you",
                reason: "grammar and spelling"
            },
            gr8: {
                expr: /\bgr8\b/gi,
                replacement: "great",
                reason: "grammar and spelling"
            },
            allways: {
                expr: /\b(a)llways\b/gi,
                replacement: "$1lways",
                reason: "grammar and spelling"
            },
            // Punctuation & Spacing come last
            multiplesymbols: {
                expr: /([^\w\s*\-_])\1{1,}/g,
                replacement: "$1",
                reason: "punctuation & spacing"
            },
            multiplespaces: {
                expr: /[ ]{2,}/g,
                replacement: " ",
                reason: "punctuation & spacing"
            },
            blanklines: {
                expr: /(\s*[\r\n])+/gm,
                replacement: "\n\n",
                reason: "punctuation & spacing"
            }
        };

        // Populate funcs
        App.popFuncs = function() {
            // This is where the magic happens: this function takes a few pieces of information and applies edits to the post with a couple exceptions
            App.funcs.fixIt = function(input, expression, replacement, reasoning) {
                // If there is nothing to search, exit
                if (!input) return false;
                // Scan the post text using the expression to see if there are any matches
                var matches = expression.exec(input);
                var tmpinput = input;
                input = input.replace(expression, function() { 
                    var matches = [].slice.call(arguments,0,-2); 
                    reasoning = reasoning.replace(/[$](\d)+/g,function(){ 
                        var phrases = [].slice.call(arguments,0,-2);
                        var phrase = matches[phrases[1]]; 
                        return phrase ? phrase : ''; 
                    });
                    return replacement.replace(/[$](\d)+/g,function(){ 
                        var phrases = [].slice.call(arguments,0,-2);
                        var phrase = matches[phrases[1]]; 
                        return phrase ? phrase : ''; 
                    }); 
                });
                if(input !== tmpinput) {
                    return {
                        reason: reasoning,
                        fixed: String(input).trim()
                    };
                } else return false;
            };

            // Omit code
            App.funcs.omitCode = function(str, type) {
                return str.replace(App.globals.checks[type], function(match) {
                    App.globals.replacedStrings[type].push(match);
                    return App.globals.placeHolders[type]; 
                });
            };

            // Replace code
            App.funcs.replaceCode = function(str, type) {
                if(!str) return false;
                var i = 0;
                str = str.replace(App.globals.placeHolderChecks[type], function(match) {
                    return App.globals.replacedStrings[type][i++];
                });
                return str.replace(/(\s*[\r\n]){3,}/g,'\n\n');
            };

            App.funcs.applyListeners = function() { // Removes default Stack Exchange listeners; see https://github.com/AstroCB/Stack-Exchange-Editor-Toolkit/issues/43
                function removeEventListeners(e) {
                    if (e.which === 13) {
                        if (e.metaKey || e.ctrlKey) {
                            // CTRL/CMD + Enter -> Activate the auto-editor
                            App.selections.buttonFix.click();
                        } else {
                            // It's possible to remove the event listeners, because of the way outerHTML works.
                            this.outerHTML = this.outerHTML;
                            App.selections.submitButton.click();
                        }
                    }
                }

                // Tags box
                App.selections.tagField.keydown(removeEventListeners);

                // Edit summary box
                App.selections.summary.keydown(removeEventListeners);
            };

            // Wait for relevant dynamic content to finish loading
            App.funcs.dynamicDelay = function(callback) {
                setTimeout(callback, 1000);
            };

            // Populate or refresh DOM selections
            App.funcs.popSelections = function() {
                var targetID = App.globals.targetID;
                var scope = $('div[data-questionid="' + targetID + '"]');
                if (!scope.length) scope = $('div[data-answerid="' + targetID + '"]');
                if (!scope.length) scope = '';
                if ($('.ToolkitButtonWrapper', scope).length) return false;
                App.selections.buttonBar = $('[id^="wmd-button-bar"]', scope);
                App.selections.buttonBar.unbind();
                App.selections.redoButton = $('[id^="wmd-redo-button"]', scope);
                App.selections.body = $('[id^="wmd-input"]', scope);
                App.selections.title = $('[class*="title-field"]', scope);
                App.selections.summary = $('[id^="edit-comment"]', scope);
                App.selections.tagField = $(".tag-editor", scope);
                App.selections.submitButton = $('[id^="submit-button"]', scope);
                App.selections.helpButton = $('[id^="wmd-help-button"]', scope);
                App.selections.editor = $('.post-editor', scope);
                console.log(App.selections);
                return !!App.selections.redoButton.length;
            };

            // Populate edit item sets from DOM selections
            App.funcs.popItems = function() {
                var i = App.items, s = App.selections;
                ['title', 'body', 'summary'].forEach(function(v) {
                    i[v] = String(s[v].val()).trim();
                });
            };

            // Populate original item sets from DOM selections
            App.funcs.popOriginals = function() {
                var i = App.originals, s = App.selections;
                ['title', 'body', 'summary'].forEach(function(v) {
                    i[v] = String(s[v].val()).trim();
                });
            };

            // Insert editing button(s)
            App.funcs.createButton = function() {
                if(!App.selections.redoButton.length) return false;
                
                App.selections.buttonWrapper = $('<div class="ToolkitButtonWrapper"/>');
                App.selections.buttonFix = $('<button class="wmd-button ToolkitFix" title="Fix the content!" />');
                App.selections.buttonInfo = $('<div class="ToolkitInfo">');

                // Build the button
                App.selections.buttonWrapper.append(App.selections.buttonFix);
                App.selections.buttonWrapper.append(App.selections.buttonInfo);

                // Insert button
                App.selections.redoButton.after(App.selections.buttonWrapper);
                // Insert spacer
                App.selections.redoButton.after(App.globals.spacerHTML);

                // Attach the event listener to the button
                App.selections.buttonFix.click(App.funcs.fixEvent);

                App.selections.helpButton.css({
                    'padding': '0px'
                });
                App.selections.buttonWrapper.css({
                    'position': 'relative',
                    'left': '430px',
                    'padding-top': '2%'
                });
                App.selections.buttonFix.css({
                    'position': 'static',
                    'float': 'left',
                    'border-width': '0px',
                    'background-color': 'white',
                    'background-image': 'url("//i.imgur.com/79qYzkQ.png")',
                    'background-size': '100% 100%',
                    'width': '18px',
                    'height': '18px',
                    'outline': 'none',
                    'box-shadow': 'none'
                });
                App.selections.buttonInfo.css({
                    'position': 'static',
                    'float': 'left',
                    'margin-left': '5px',
                    'font-size': '12px',
                    'color': '#424242',
                    'line-height': '19px'
                });
            };

            App.funcs.makeDiffTable = function() {
                App.selections.diffTable = $('<table class="diffTable"/>');
                App.selections.editor.append(App.selections.diffTable);
            };

            App.funcs.fixEvent = function(e) {
                if(e) e.preventDefault();
                // Refresh item population
                App.funcs.popOriginals();
                App.funcs.popItems();
                // Pipe data through editing modules
                App.pipe(App.items, App.globals.pipeMods, App.globals.order);
            };

            App.funcs.diff = function() { 
                App.selections.diffTable.empty();

                function maakRij(x, y, type, rij){

                    var tr = $('<tr/>');
                    
                    if(type===' ') return false;
                    if(type==='+') tr.addClass('add');
                    if(type==='-') tr.addClass('del');

                    tr.append($('<td class="codekolom">' + y + '</td>'));
                    tr.append($('<td class="codekolom">' + x + '</td>'));
                    tr.append($('<td class="bredecode">' + type + ' ' + rij.replace(/\</g,'&lt;') + '</td>'));

                    App.selections.diffTable.append(tr);
                }

                function getDiff(matrix, a1, a2, x, y){
                    if(x>0 && y>0 && a1[y-1]===a2[x-1]){
                        getDiff(matrix, a1, a2, x-1, y-1);
                        maakRij(x, y, ' ', a1[y-1]);
                    } else {
                        if(x>0 && (y===0 || matrix[y][x-1] >= matrix[y-1][x])){
                            getDiff(matrix, a1, a2, x-1, y);
                            maakRij(x, '', '+', a2[x-1]);
                        } else if(y>0 && (x===0 || matrix[y][x-1] < matrix[y-1][x])){
                            getDiff(matrix, a1, a2, x, y-1);
                            maakRij('', y, '-', a1[y-1], '');
                        } else {
                            return;
                        }
                    }

                }

                a1 = App.originals.body.split('\n');
                a2 = App.items.body.split('\n');

                var matrix = new Array(a1.length+1);
                var x, y;
                for(y=0; y<matrix.length; y++){
                    matrix[y] = new Array(a2.length+1);

                    for(x=0; x<matrix[y].length; x++){
                        matrix[y][x] = 0;
                    }
                }

                for(y=1; y<matrix.length; y++){
                    for(x=1; x<matrix[y].length; x++){
                        if(a1[y-1]===a2[x-1]){
                            matrix[y][x] = 1 + matrix[y-1][x-1];
                        } else {
                            matrix[y][x] = Math.max(matrix[y-1][x], matrix[y][x-1]);
                        }
                    }
                }

                try {
                    getDiff(matrix, a1, a2, x-1, y-1);
                } catch(e){
                    alert(e);
                }
            };

            // Handle pipe output
            App.funcs.output = function(data) {
                if(data) { 
                    App.selections.title.val(data.title);
                    App.selections.body.val(data.body);
                    App.selections.summary.val(data.summary);
                    App.selections.summary.focus();
                    App.selections.editor.append(App.funcs.diff());
                }

                App.selections.buttonInfo.text(App.globals.reasons.length + ' changes made');
            };
        };

        // Pipe data through modules in proper order, returning the result
        App.pipe = function(data, mods, order) {
            var modName;
            for (var i in order) {
                if (order.hasOwnProperty(i)) {
                    modName = order[i];
                    data = mods[modName](data);
                }
            }
            App.funcs.output(data);
        };

        // Init app
        App.init = function() {
            App.popFuncs();
            App.funcs.dynamicDelay(function() {
                if(!App.funcs.popSelections()) return false;
                App.funcs.createButton();
                App.funcs.applyListeners();
                App.funcs.makeDiffTable();
            });
        };

        App.globals.pipeMods.omit = function(data) {
            data.body = App.funcs.omitCode(data.body, "block");
            data.body = App.funcs.omitCode(data.body, "inline");
            return data;
        };

        App.globals.pipeMods.replace = function(data) {
            data.body = App.funcs.replaceCode(data.body, "block");
            data.body = App.funcs.replaceCode(data.body, "inline");
            return data;
        };

        App.globals.pipeMods.casing = function(data) {
            for(var i in data) {
                var input = data[i];
                // No need to yell
                if(/^((?=.*[A-Z])[^a-z]*)$/g.exec(input)) {
                    input = input.trim().substr(0,1).toUpperCase() + input.trim().substr(1).toLowerCase();
                    App.globals.reasons.push('no need to yell');
                } else {
                    // Sentence casing
                    var lines = input.split(/\./g), line;
                    for(var l in lines) {
                        line = lines[l].trim();
                        line = line.substr(0,1).toUpperCase() + line.substr(1).toLowerCase();
                        if (lines[l] !== line) {
                            lines[l] = line;
                            App.globals.reasons.push('punctuation & spacing');
                        }
                    }
                    input = lines.join('. ');
                }
                data[i] = input;
            }
            return data;
        };
        
        App.globals.pipeMods.edit = function(data) {
            // Visually confirm edit - SE makes it easy because the jQuery color animation plugin seems to be there by default
            App.selections.body.animate({
                backgroundColor: '#c8ffa7'
            }, 10);
            App.selections.body.animate({
                backgroundColor: '#fff'
            }, 1000);

            // Loop through all editing rules
            for (var j in App.edits) {
                if (App.edits.hasOwnProperty(j)) {
                    // Check body
                    var fix = App.funcs.fixIt(data.body, App.edits[j].expr,
                                              App.edits[j].replacement, App.edits[j].reason);
                    if (fix) {
                        App.globals.reasons[App.globals.reasons.length] = fix.reason;
                        data.body = fix.fixed;
                        App.edits[j].fixed = true;
                    }

                    // Check title
                    fix = App.funcs.fixIt(data.title, App.edits[j].expr,
                                          App.edits[j].replacement, App.edits[j].reason);
                    if (fix) {
                        data.title = fix.fixed;
                        if (!App.edits[j].fixed) {
                            App.globals.reasons[App.globals.reasons.length] = fix.reason;
                            App.edits[j].fixed = true;
                        }
                    }
                }
            }

            // If there are no reasons, exit
            if (!App.globals.reasons.length) return false;

            // We need a place to store the reasons being applied to the summary. 
            var reasons = [];

            for (var z = App.globals.reasons.length - 1, x = 0; z >= 0; --z) {
                // Check that summary is not getting too long
                if (data.summary.length + reasons.join('; ').length + App.globals.reasons[z].length + 2 > 300) break;

                // If the reason is already in the summary, or we've put it in the reasons array already, skip it.
                if (data.summary.indexOf(App.globals.reasons[z].substr(1)) !== -1 || reasons.join('; ').indexOf(App.globals.reasons[z].substr(1)) !== -1) continue;

                // Capitalize first letter
                if (!data.summary && x === 0) App.globals.reasons[z] = App.globals.reasons[z][0].toUpperCase() + App.globals.reasons[z].substring(1);

                // Append the reason to our temporary reason array
                reasons.push(App.globals.reasons[z]);
                ++x;
            }

            // If no reasons have been applied, exit
            if (!reasons.length) return false;

            // Store the summary for readability
            var summary = data.summary;

            // This whole ternary mess is for if the summary is not empty, and if this is the first time around or not.                 vvv Join the reasons with a semicolon and append a period.
            data.summary = (summary ? (summary.substr(-1) !== -1 ? summary.substr(0, summary.length - 1) : summary) + '; ' : '') + reasons.join('; ') + '.';

            return data;
        };

        App.init();
    }
    try {
        var Apps = [];
        var addApp = function(targetID) {
            if (!targetID) console.log('[!!] No targetID');
            else Apps[targetID] = new EditorToolkit(targetID);
        };
        var selector = '.edit-post, [value*="Edit"]:not([value="Save Edits"])';
        var targetID;
        var jqcheck = setInterval(function(){
            if(typeof($) !== "undefined") {
                clearInterval(jqcheck);
                $(document).on('click', selector, function(e) {
                    addApp(e.target.href ? e.target.href.match(/\d/g).join("") : targetID);
                });
                $(window).load(function(){
                    GM_addStyle('.diff { max-width: 100%; overflow: auto; } td.bredecode, td.codekolom { padding: 1px 2px; } td.bredecode { width: 100%; padding-left: 4px; white-space: pre-wrap; word-wrap: break-word; } td.codekolom { text-align: right; min-width: 3em; background-color: #ECECEC; border-right: 1px solid #DDD; color: #AAA; } tr.add { background: #DFD; } tr.del { background: #FDD; }');
                    targetID = $('#post-id').val();
                    if (targetID && !Apps.length) addApp(targetID);
                    else targetID = $('.post-id').text();
                });
            }
        },100);
    } catch (e) {
        console.log(e);
    }
})();
