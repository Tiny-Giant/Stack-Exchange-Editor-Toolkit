// ==UserScript==
// @name           Stack-Exchange-Editor-Toolkit
// @author         Cameron Bernhardt (AstroCB)
// @developer      Jonathan Todd (jt0dd)
// @developer      sathyabhat
// @contributor    Unihedron
// @contributor    Tiny Giant
// @contributor    Mogsdad
// @grant          none
// @license        MIT
// @namespace      http://github.com/AstroCB
// @version        1.5.2.18
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

(function() {
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
            "auto": [],
            "inline": [],
            "block": [],
            "links": []
        };
        App.globals.placeHolders = {
            "auto":   "_xAutoxInsertxTextxPlacexHolder_",
            "inline": "_xCodexInlinexPlacexHolderx_",
            "block":  "_xCodexBlockxPlacexHolderx_",
            "links":  "_xLinkxPlacexHolderx_"
        };
        App.globals.placeHolderChecks = {
            "auto":   /_xAutoxInsertxTextxPlacexHolder_/gi,
            "inline": /_xCodexInlinexPlacexHolderx_/gi,
            "block":  /_xCodexBlockxPlacexHolderx_/gi,
            "links":  /_xLinkxPlacexHolderx_/gi
        };
        App.globals.checks = {
            //        https://regex101.com/r/cI6oK2/1 automatically inserted text
            "auto":   /[^]*\<\!\-\- End of automatically inserted text \-\-\>/g,
            //        https://regex101.com/r/lL6fH3/1 single-line inline code, tags and html comments
            "inline": /`[^`\n]+`|\<[\/a-z]+\>|\<\!\-\-[^>]+\-\-\>/gi,
            //        https://regex101.com/r/eC7mF7/1 Code blocks and multiline inline code.
            "block":  /`[^`]+`|(?:(?:[ ]{4}|[ ]{0,3}\t).+(?:[\r\n]?(?!\n\S)(?:[ ]+\n)*)+)+/g,
            //        https://regex101.com/r/tZ4eY3/5 links and link-sections
            "links":  /\[[^\]\n]+\](?:\([^\)\n]+\)|\[[^\]\n]+\])|(?:  (?:\[\d\]): \w*:+\/\/.*\n*)+|(?!.net)(?:\/|.:\\|\.[^ \n\r]|\w*:\/\/)(?:\S)*/g
        };

        // Assign modules here
        App.globals.pipeMods = {};

        // Define order in which mods affect  here
        App.globals.order = ["omit", "codefix", "edit", "replace"];

        // Define edit rules
        App.edits = {
            noneedtoyell: {
                expr: /^((?=.*[A-Z])[^a-z]*)$/g,
                replacement: function(input) {
                    return input.trim().substr(0, 1).toUpperCase() + input.trim().substr(1).toLowerCase();
                },
                reason: 'no need to yell'
            },
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
                expr: /([^\b\w.]|^)SO\b/g,
                replacement: "$1Stack Overflow",
                reason: "'Stack Overflow' is the legal name"
            },
            expansionSE: {
                expr: /([^\b\w.]|^)SE\b/g,
                replacement: "$1Stack Exchange",
                reason: "'Stack Exchange' is the legal name"
            },
            javascript: {
                expr: /([^\b\w.]|^)(javascript|js)\b/gi,
                replacement: "$1JavaScript",
                reason: "trademark capitalization"
            },
            jsfiddle: {
                expr: /\bjsfiddle\b/gi,
                replacement: "JSFiddle",
                reason: "trademark capitalization"
            },
            jquery: {
                expr: /\bjquery\b/gi,
                replacement: "jQuery",
                reason: "trademark capitalization"
            },
            angular: {
                expr: /\bangular(?:js)?\b/gi,
                replacement: "AngularJS",
                reason: "trademark capitalization"
            },
            html: {
                expr: /([^\b\w.]|^)html(\d)?\b/gi,
                replacement: "$1HTML$2",
                reason: "trademark capitalization"
            },
            css: {
                expr: /([^\b\w.]|^)css\b/gi,
                replacement: "$1CSS",
                reason: "trademark capitalization"
            },
            json: {
                expr: /\bjson\b/gi,
                replacement: "JSON",
                reason: "trademark capitalization"
            },
            ajax: {
                expr: /\bajax\b/gi,
                replacement: "AJAX",
                reason: "trademark capitalization"
            },
            php: {
                expr: /([^\b\w.]|^)php\b/gi,
                replacement: "$1PHP",
                reason: "trademark capitalization"
            },
            voting: {
                expr: /\b(down|up)\Wvot/gi,
                replacement: "$1vote",
                reason: "the proper spelling (despite the tag name) is '$1vote' (one word)"
            },
            c: {
                expr: /([^\b\w.]|^)c([#+]+)|([^\b.])\bc\b/gi,
                replacement: "$1C$2",
                reason: "trademark capitalization"
            },
            java: {
                expr: /\bjava\b/gi,
                replacement: "Java",
                reason: "trademark capitalization"
            },
            sql: {
                expr: /([^\b\w.]|^)sql\b/gi,
                replacement: "$1SQL",
                reason: "trademark capitalization"
            },
            sqlite: {
                expr: /\bsqlite\s*([0-9]*)\b/gi,
                replacement: "SQLite $2",
                reason: "trademark capitalization"
            },
            android: {
                expr: /\bandroid\b/gi,
                replacement: "Android",
                reason: "trademark capitalization"
            },
            oracle: {
                expr: /\boracle\b/gi,
                replacement: "Oracle",
                reason: "trademark capitalization"
            },
            windows: {
                // https://regex101.com/r/jF9zK1/5
                expr: /\b(?:win|windows)\s+(2k|[0-9.]+|ce|me|nt|xp|vista|server)|(?:win|windows)\b/gi,
                replacement: function(match, ver) {
                    ver = !ver ? '' : ver.replace(/ce/i, ' CE')
                                         .replace(/me/i, ' ME')
                                         .replace(/nt/i, ' NT')
                                         .replace(/xp/i, ' XP')
                                         .replace(/2k/i, ' 2000')
                                         .replace(/vista/i, ' Vista')
                                         .replace(/server/i, ' Server');
                    return 'Windows' + ver;
                },
                reason: "trademark capitalization"
            },
            linux: {
                expr: /\blinux\b/gi,
                replacement: "Linux",
                reason: "trademark capitalization"
            },
            wordpress: {
                expr: /\bwordpress\b/gi,
                replacement: "WordPress",
                reason: "trademark capitalization"
            },
            google: {
                expr: /\bgoogle\b/gi,
                replacement: "Google",
                reason: "trademark capitalization"
            },
            mysql: {
                expr: /\bmysql\b/gi,
                replacement: "MySQL",
                reason: "trademark capitalization"
            },
            apache: {
                expr: /\bapache\b/gi,
                replacement: "Apache",
                reason: "trademark capitalization"
            },
            git: {
                expr: /\bgit\b/gi,
                replacement: "Git",
                reason: "trademark capitalization"
            },
            github: {
                expr: /\bgithub\b/gi,
                replacement: "GitHub",
                reason: "trademark capitalization"
            },
            facebook: {
                expr: /\bfacebook\b/gi,
                replacement: "Facebook",
                reason: "Facebook is the proper reference"
            },
            python: {
                expr: /\bpython\b/gi,
                replacement: "Python",
                reason: "trademark capitalization"
            },
            urli: {
                expr: /\bur([li])\b/gi,
                replacement: "UR$1",
                reason: "trademark capitalization"
            },
            ios: {
                expr: /\bios\b/gi,
                replacement: "iOS",
                reason: "trademark capitalization"
            },
            iosnum: {
                expr: /\bios([0-9])\b/gi,
                replacement: "iOS $1",
                reason: "trademark capitalization"
            },
            ubunto: {
                expr: /\b[uoa]*b[uoa]*[tn][oua]*[tnu][oua]*\b/gi,
                replacement: "Ubuntu",
                reason: "trademark capitalization"
            },
            vbnet: {
                expr: /(?:vb)?(?:\.net|\s?[0-9]+)\s?(?:framework|core)?/gi,
                replacement: function(str) {
                    return str.replace(/vb/i, 'VB')
                              .replace(/net/i, 'NET')
                              .replace(/framework/i, 'Framework')
                              .replace(/core/i, 'Core');
                },
                reason: "trademark capitalization"
            },
            regex: {
                expr: /\bregex(p)?/gi,
                replacement: "RegEx$1",
                reason: "trademark capitalization"
            },
            editupdate: {
                // https://regex101.com/r/tT2pK6/2
                expr: /(?!(?:edit|update)\s*[^:]*$)(?:^\**)(edit|update)(\s*#?[0-9]+)?:?(?:\**):?/gmi,
                replacement: "",
                reason: "'$1' is unnecessary noise"
            },
            hello: { // TODO: Update badsentences (new) to catch everything hello (old) did.
                expr: /(?:^|\s)(hi\s+guys|hi|hello|good\s(?:evening|morning|day|afternoon))(?:\.|!|\ )/gmi,
                replacement: "",
                reason: "greetings like '$1' are unnecessary noise"
            },
            badsentences: {
                expr: /[^\n.!?:]*\b(th?anks?|th(?:an)?x|tanx|suggestion|advice|folks?|hi|hello|ki‌nd(‌?:est|ly)|first\s*question|appreciate[^.!\n]*help)\b[^,.!?\n]*[,.!?]*/gi,
                replacement: "",
                reason: "'$1' is unnecessary noise"
            },
            badwords: {
                expr: /(pl(?:ease|z|s)|(?:any\s*)?h[ae]?lp)[,.!?]*/gi,
                replacement: "",
                reason: "'$1' is unnecessary noise"
            },
            imnew: {
                expr: /(i[' ]?a?m\s*new\w*\s*(?:to|in)\s*\w*)\s*(?:and|[.!?])?\s*/gi,
                replacement: "",
                reason: "'$1' is unnecessary noise"
            },
            salutations: {
                expr: /[\r\n]*(regards|cheers?),?[\t\f ]*[\r\n]?\w*\.?/gi,
                replacement: "",
                reason: "salutations are unnecessary noise"
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
            firstcaps: {
                //    https://regex101.com/r/qR5fO9/10
                expr: /(?:(?!\n\n)[^.!?])+([.!?])?\s*/g, 
                replacement: function(str, endpunc) { 
                    if (str === "undefined") return '';
                    //                 https://regex101.com/r/bL9xD7/1 find and capitalize first letter
                    return str.replace(/^(\W*)([a-z])(.*)/g, function(sentence, pre, first, post) {
                        if (!pre) pre = '';
                        if (!post) post = '';
                        return pre + first.toUpperCase() + post + (endpunc && /\w/.test(post.substr(-1)) ? '' : '.');
                    });
                },
                reason: "Caps at start of sentences"
            },
            multiplesymbols: {
                expr: /([^\w\s*\-_])\1{1,}/g,
                replacement: "$1",
                reason: "punctuation & spacing"
            },
            spacesbeforesymbols: {
                expr: /\s+([^\w\s*\-_])(?!\w)/g,
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
                    var matches = [].slice.call(arguments, 0, -2);
                    reasoning = reasoning.replace(/[$](\d)+/g, function() {
                        var phrases = [].slice.call(arguments, 0, -2);
                        var phrase = matches[phrases[1]];
                        return phrase ? phrase : '';
                    });
                    return arguments[0].replace(expression, replacement);
                });
                if (input !== tmpinput) {
                    return {
                        reason: reasoning,
                        fixed: String(input).trim()
                    };
                } else return false;
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
                if (!App.selections.redoButton.length) return false;

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
                if (e) e.preventDefault();
                // Refresh item population
                App.funcs.popOriginals();
                App.funcs.popItems();
                // Pipe data through editing modules
                App.pipe(App.items, App.globals.pipeMods, App.globals.order);
            };

            App.funcs.diff = function() {
                App.selections.diffTable.empty();

                function maakRij(x, y, type, rij) {

                    var tr = $('<tr/>');

                    if (type === ' ') return false;
                    if (type === '+') tr.addClass('add');
                    if (type === '-') tr.addClass('del');

                    tr.append($('<td class="codekolom">' + y + '</td>'));
                    tr.append($('<td class="codekolom">' + x + '</td>'));
                    tr.append($('<td class="bredecode">' + type + ' ' + rij.replace(/\</g, '&lt;') + '</td>'));

                    App.selections.diffTable.append(tr);
                }

                function getDiff(matrix, a1, a2, x, y) {
                    if (x > 0 && y > 0 && a1[y - 1] === a2[x - 1]) {
                        getDiff(matrix, a1, a2, x - 1, y - 1);
                        maakRij(x, y, ' ', a1[y - 1]);
                    } else {
                        if (x > 0 && (y === 0 || matrix[y][x - 1] >= matrix[y - 1][x])) {
                            getDiff(matrix, a1, a2, x - 1, y);
                            maakRij(x, '', '+', a2[x - 1]);
                        } else if (y > 0 && (x === 0 || matrix[y][x - 1] < matrix[y - 1][x])) {
                            getDiff(matrix, a1, a2, x, y - 1);
                            maakRij('', y, '-', a1[y - 1], '');
                        } else {
                            return;
                        }
                    }

                }

                a1 = App.originals.body.split('\n');
                a2 = App.items.body.split('\n');

                var matrix = new Array(a1.length + 1);
                var x, y;
                for (y = 0; y < matrix.length; y++) {
                    matrix[y] = new Array(a2.length + 1);

                    for (x = 0; x < matrix[y].length; x++) {
                        matrix[y][x] = 0;
                    }
                }

                for (y = 1; y < matrix.length; y++) {
                    for (x = 1; x < matrix[y].length; x++) {
                        if (a1[y - 1] === a2[x - 1]) {
                            matrix[y][x] = 1 + matrix[y - 1][x - 1];
                        } else {
                            matrix[y][x] = Math.max(matrix[y - 1][x], matrix[y][x - 1]);
                        }
                    }
                }

                try {
                    getDiff(matrix, a1, a2, x - 1, y - 1);
                } catch (e) {
                    alert(e);
                }
            };

            // Handle pipe output
            App.funcs.output = function(data) {
                if (data) {
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
                if (!App.funcs.popSelections()) return false;
                App.funcs.createButton();
                App.funcs.applyListeners();
                App.funcs.makeDiffTable();
            });
        };

        App.globals.pipeMods.omit = function(data) {
            if (!data.body) return false;
            for (var type in App.globals.checks) {
                data.body = data.body.replace(App.globals.checks[type], function(match) {
                    App.globals.replacedStrings[type].push(match);
                    return App.globals.placeHolders[type];
                });
            }
            return data;
        };

        App.globals.pipeMods.codefix = function(data) {
            var replaced = App.globals.replacedStrings.block,
                str;
            for (var i in replaced) {
                // https://regex101.com/r/tX9pM3/1       https://regex101.com/r/tX9pM3/2                 https://regex101.com/r/tX9pM3/3
                if (/^`/.test(replaced[i])) replaced[i] = /(?!`)((?!`)[^])+/.exec(replaced[i])[1].replace(/(.+)/g, '    $1');
            }
            return data;
        };

        App.globals.pipeMods.replace = function(data) {
            if (!data.body) return false;
            for (var type in App.globals.checks) {
                var i = 0;
                data.body = data.body.replace(App.globals.placeHolderChecks[type], function(match) {
                    return App.globals.replacedStrings[type][i++];
                });
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
            Apps[targetID] = new EditorToolkit(targetID);
        };
        var selector = '.edit-post, [value*="Edit"]:not([value="Save Edits"])';
        var targetID;
        var jqcheck = setInterval(function() {
            if (typeof($) !== "undefined") {
                clearInterval(jqcheck);
                $(document).on('click', selector, function(e) {
                    addApp(e.target.href ? e.target.href.match(/\d/g).join("") : targetID);
                });
                $(window).load(function() {
                    $('body').append('<style>.diff { max-width: 100%; overflow: auto; } td.bredecode, td.codekolom { padding: 1px 2px; } td.bredecode { width: 100%; padding-left: 4px; white-space: pre-wrap; word-wrap: break-word; } td.codekolom { text-align: right; min-width: 3em; background-color: #ECECEC; border-right: 1px solid #DDD; color: #AAA; } tr.add { background: #DFD; } tr.del { background: #FDD; }</style>');
                    targetID = $('#post-id').val();
                    if (targetID && !Apps.length) addApp(targetID);
                    else targetID = $('.post-id').text();
                });
            }
        }, 100);
    } catch (e) {
        console.log(e);
    }
})();
