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
// @version        1.5.2.8
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
// @exclude        *://meta.serverfault.com/questions/*
// @exclude        *://superuser.com/questions/tagged/*
// @exclude        *://meta.superuser.com/questions/tagged/*
// @exclude        *://askubuntu.com/questions/tagged/*
// @exclude        *://meta.askubuntu.com/questions/tagged/*
// @exclude        *://stackapps.com/questions/tagged/*
// ==/UserScript==

var sheet = document.createElement('style');
sheet.textContent = 'td.bredecode, td.codekolom { padding: 1px 2px; } td.bredecode { width: 100%; padding-left: 4px; white-space: pre-wrap } td.codekolom { text-align: right; min-width: 3em; background-color: #ECECEC; border-right: 1px solid #DDD; color: #AAA; } tr.add { background: #DFD; } tr.del { background: #FDD; }';
document.body.appendChild(sheet);

var main = function() {
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
        App.globals.checks = {
            "block": /(    )+.*/gm,
            "inline": /`.*`/gm
        };

        // Assign modules here
        App.globals.pipeMods = {};

        // Define order in which mods affect  here
        App.globals.order = ["omit", "edit", "replace"];


        // Define edit rules
        App.edits = {
            yell: {
                expr: /^((?=.*[A-Z])[^a-z]*)$/g,
                replacement: "$1",
                reason: "no need to yell"
            },
            tags: {
                expr: /\</gm,
                replacement: "&lt;",
                reason: "formatting"
            },
            folks: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)folks?\b(\S|)(?!\S)/gmi,
                replacement: "$1$2",
                reason: "formatting"
            },
            so: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)[Ss]tack\s*overflow|StackOverflow(.|$)/gm,
                replacement: "$1Stack Overflow$2",
                reason: "'Stack Overflow' is the legal name"
            },
            se: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)[Ss]tack\s*exchange|StackExchange(.|$)/gm,
                replacement: "$1Stack Exchange$2",
                reason: "'Stack Exchange' is the legal name"
            },
            expansionSO: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)SO(\s|,|\.|!|\?|;|\/|\)|$)/gm,
                replacement: "$1Stack Overflow$2",
                reason: "'SO' expansion"
            },
            expansionSE: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)SE(\s|,|\.|!|\?|;|\/|\)|$)/gm,
                replacement: "$1Stack Exchange$2",
                reason: "'SE' expansion"
            },
            javascript: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)[Jj]ava\s+?script(.|$)/gm,
                replacement: "$1JavaScript$2",
                reason: "'JavaScript' is the proper capitalization"
            },
            periods: {
                expr: /\.\.+/gm,
                replacement: ".",
                reason: "punctuation & spacing"
            },
            jsfiddle: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)[Jj][Ss]\s*[Ff]iddle(.|$)/gm,
                replacement: "$1JSFiddle$2",
                reason: "'JSFiddle' is the currently accepted capitalization"
            },
            caps: {
                expr: /^(?!https?)([a-z])/gm,
                replacement: "$1",
                reason: "copy edited"
            },
            jquery: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)[Jj][Qq]uery(.|$)/gm,
                replacement: "$1jQuery$2",
                reason: "'jQuery' is the proper capitalization"
            },
            html: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)[Hh]tml([5]?)\b(\S|)(?!\S)/gm,
                replacement: "$1HTML$2$3",
                reason: "HTML stands for HyperText Markup Language"
            },
            css: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)[Cc]ss\b(\S|)(?!\S)/gm,
                replacement: "$1CSS$2",
                reason: "CSS stands for Cascading Style Sheets"
            },
            json: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)[Jj]son\b(\S|)(?!\S)/gm,
                replacement: "$1JSON$2",
                reason: "JSON stands for JavaScript Object Notation"
            },
            ajax: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)[Aa]jax\b(\S|)(?!\S)/gm,
                replacement: "$1AJAX$2",
                reason: "AJAX stands for Asynchronous JavaScript and XML"
            },
            angular: {
                expr: /[Aa]ngular[Jj][Ss]/g,
                replacement: "AngularJS",
                reason: "'AngularJS is the proper capitalization"
            },
            thanks: {
                expr: /(this\s*(is)?\s*)?(thanks|pl(?:ease|z|s)\s+h[ea]lp|cheers|(kind(est)?\ +?)?regards|thx|thank\s+you|my\s+first\s+question|kindly\shelp)/gmi,
                replacement: "",
                reason: "'$1' is unnecessary noise"
            },
            commas: {
                expr: /,([^\s])/g,
                replacement: ", $1",
                reason: "punctuation & spacing"
            },
            php: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)[Pp]hp\b(\S|)(?!\S)/gm,
                replacement: "$1PHP$2",
                reason: "PHP stands for PHP: Hypertext Preprocessor"
            },
            hello: {
                expr: /(?:^|\s)(hi\s+guys|hi|hello|good\s(?:evening|morning|day|afternoon))(?:\.|!|\ )/gmi,
                replacement: "",
                reason: "greetings like '$1' are unnecessary noise"
            },
            edit: {
                expr: /(?:^\**)(edit|update):?(?:\**):?/gmi,
                replacement: "",
                reason: "Stack Exchange has an advanced revision history system: 'Edit' or 'Update' is unnecessary"
            },
            voting: {
                expr: /([Dd]own|[Uu]p)[\s*\-]vot/g,
                replacement: "$1vote",
                reason: "the proper spelling (despite the tag name) is '$1vote' (one word)"
            },
            mysite: {
                expr: /mysite\./g,
                replacement: "example.",
                reason: "links to mysite.domain are not allowed: use example.domain instead"
            },
            c: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)c(#|\++|\s|$)/gm,
                replacement: "$1C$2",
                reason: "C$2 is the proper capitalization"
            },
            java: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)java\b(\S|)(?!\S)/gmi,
                replacement: "$1Java$2",
                reason: "Java should be capitalized"
            },
            sql: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)[Ss]ql\b(\S|)(?!\S)/gm,
                replacement: "$1SQL$2",
                reason: "SQL is the proper capitalization"
            },
            sqlite: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)[Ss]qlite([0-9]*)\b(\S|)(?!\S)/gm,
                replacement: "$1SQLite$2$3",
                reason: "SQLite is the proper capitalization"
            },
            android: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)android\b(\S|)(?!\S)/gmi,
                replacement: "$1Android$2",
                reason: "Android should be capitalized"
            },
            oracle: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)oracle\b(\S|)(?!\S)/gmi,
                replacement: "$1Oracle$2",
                reason: "Oracle should be capitalized"
            },
            windows: {
                expr: /(win|windows(?:\ ?)(\s[0-9]+))\b(\S|)(?!\S)/igm,
                replacement: "Windows$2$3",
                reason: "Windows should be capitalized"
            },
            windowsXP: {
                expr: /(win|windows(?:\ ?)(\sxp))\b(\S|)(?!\S)/igm,
                replacement: "Windows XP$3",
                reason: "Windows XP should be capitalized"
            },
            windowsVista: {
                expr: /(win|windows(?:\ ?)(\svista))\b(\S|)(?!\S)/igm,
                replacement: "Windows Vista$3",
                reason: "Windows Vista should be capitalized"
            },
            ubuntu: {
                expr: /(ubunto|ubunut|ubunutu|ubunu|ubntu|ubutnu|ubanto[o]+|unbuntu|ubunt|ubutu)\b(\S|)(?!\S)/igm,
                replacement: "Ubuntu$2",
                reason: "corrected Ubuntu spelling"
            },
            linux: {
                expr: /(linux)\b(\S|)(?!\S)/igm,
                replacement: "Linux$2",
                reason: "Linux should be capitalized"
            },
            apostrophes: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)(can|doesn|don|won|hasn|isn|didn)t(\s|\*|\-,|\.|!|\?|;|\/|\'|\)|$)/gmi,
                replacement: "$1$2't$3",
                reason: "English contractions use apostrophes"
            },
            ios: {
                expr: /\b(?:ios|iOs|ioS|IOS|Ios|IoS|ioS)\b(\S|)(?!\S)/gm,
                replacement: "iOS$1",
                reason: "the proper usage is 'iOS'"
            },
            iosnum: {
                expr: /\b(?:ios|iOs|ioS|IOS|Ios|IoS|ioS)([0-9]?)\b(\S|)(?!\S)/gm,
                replacement: "iOS $1$2",
                reason: "the proper usage is 'iOS' followed by a space and the version number"
            },
            wordpress: {
                expr: /[Ww]ordpress/ig,
                replacement: "WordPress",
                reason: "'WordPress' is the proper capitalization"
            },
            google: {
                expr: /(google)\b(\S|)(?!\S)/igm,
                replacement: "Google$2",
                reason: "Google is the proper capitalization"
            },
            mysql: {
                expr: /(mysql)\b(\S|)(?!\S)/igm,
                replacement: "MySQL$2",
                reason: "MySQL is the proper capitalization"
            },
            apache: {
                expr: /(apache)\b(\S|)(?!\S)/igm,
                replacement: "Apache$2",
                reason: "Apache is the proper capitalization"
            },
            git: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)(git|GIT)\b(\S|)(?!\S)/igm,
                replacement: "$1Git$3",
                reason: "Git is the proper capitalization"
            },
            harddisk: {
                expr: /(hdd|harddisk)\b(\S|)(?!\S)/igm,
                replacement: "hard disk$2",
                reason: "Hard disk is the proper capitalization"
            },
            github: {
                expr: /\b([gG]ithub|GITHUB)\b(\S|)(?!\S)/igm,
                replacement: "GitHub$2",
                reason: "GitHub is the proper capitalization"
            },
            facebook: {
                expr: /\b([fF]acebook|FACEBOOK)\b(\S|)(?!\S)/igm,
                replacement: "Facebook$2",
                reason: "Facebook is the proper capitalization"
            },
            python: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)[Pp]ython\b(\S|)(?!\S)/igm,
                replacement: "$1Python$2",
                reason: "'Python' is the proper capitalization"
            },
            url_uri: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)(ur[li])\b(\S|)(?!\S)/igm,
                replacement: function(match, p1, p2, p3) {
                    return p1 + p2.toUpperCase() + p3;
                },
                reason: "URL or URI is the proper capitalization"
            },
            js: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)js\b(\S|)(?!\S)/gmi,
                replacement: "$1JavaScript$2",
                reason: "JS expansion"
            },
            prolly: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)proll?y\b(\S|)(?!\S)/gmi,
                replacement: "$1probably$2",
                reason: "probably"
            },
            i: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)i(\s|$)/gm,
                replacement: "$1I$2",
                reason: "in English, the personal pronoun is 'I'"
            },
            im: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)(im|iam)\b(\S|)(?!\S)/gmi,
                replacement: "$1I'm$3",
                reason: "in English, the personal pronoun is 'I'"
            },
            ive: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)ive\b(\S|)(?!\S)/gmi,
                replacement: "$1I've$2",
                reason: "in English, the personal pronoun is 'I'"
            },
            ur: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)ur\b(\S|)(?!\S)/gmi,
                replacement: "$1you are$2",
                reason: "de-text"
            },
            u: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)u\b(\S|)(?!\S)/gm,
                replacement: "$1you$2",
                reason: "de-text"
            },
            allways: {
                expr: /(\.|\,|\'|\"|\*|\-|\(|\s|^)(a)llways\b(\S|)(?!\S)/gmi,
                replacement: "$1$2lways$3",
                reason: "spelling"
            },
            appreciated: {
                expr: /(?:[\s-,']\w*)*(help|suggestion|advice).*(?:appreciated)\b(\S|)(?!\S)/gmi,
                replacement: "$2",
                reason: "$1 requests are unnecessary noise"
            },
            hopeMaybeHelps: {
                expr: /(?:[\s-,']\w*)*(maybe|hope)+(?:[\s-,']\w*)*\s(help[s]*)(?:[\s-,']\w*)*[\.!?]/gmi,
                replacement: "",
                reason: "$1...$2 is unnecessary noise"
            },
            regex: {
                expr: /regex(p)?/gmi,
                replacement: function(match, p) {
                    return "RegEx" + ((p === undefined) ? "" : p).toLowerCase();
                },
                reason: "RegEx or RegExp are the correct capitalizations"
            },
            multiplesymbols: {
                expr: /\?\?+/gm,
                replacement: "?",
                reason: "One question mark for one question"
            },
            // Whitespace compression comes last
            multiplespaces: {
                expr: /(\S)  +(\S)/gm,
                replacement: "$1 $2",
                reason: "One space at a time"
            },
            spacesbeforepunctuation: {
                //expr: / +([.,:;?!])/g,
                expr: / +([.,:;?!])[^\w]/g,
                replacement: "$1 ",
                reason: "punctuation & spacing"
            },
            spacesafterpunctuation: {
                expr: /([.,:;?!])  +/g,
                replacement: "$1 ",
                reason: "punctuation & spacing"
            },
            blanklines: {
                expr: /(?:\s*[\r\n]){3,}/gm,
                replacement: "\n\n",
                reason: "punctuation & spacing"
            },
            endblanklines: {
                expr: /[\s\r\n]+$/g,
                replacement: "",
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
                var matches = input.match(expression);
                var tmpinput = input;
                input = input.replace(expression, replacement);
                if(input !== tmpinput) {
                    while((match = /\$(\d)/g.exec(reasoning))) reasoning = reasoning.replace(match[0], matches[match[1]-1]);
                    return {
                        reason: reasoning,
                        fixed: input
                    };
                } else return false;
            };

            // Omit code
            App.funcs.omitCode = function(str, type) {
                str = str.replace(App.globals.checks[type], function(match) {
                    App.globals.replacedStrings[type].push(match);
                    return App.globals.placeHolders[type];
                });
                return str;
            };

            // Replace code
            App.funcs.replaceCode = function(str, type) {
                for (var i = 0; i < App.globals.replacedStrings[type].length; i++) {
                    str = str.replace(App.globals.placeHolders[type],
                                      App.globals.replacedStrings[type][i]);
                }
                return str;
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
                setTimeout(callback, 500);
            };

            // Populate or refresh DOM selections
            App.funcs.popSelections = function() {
                var targetID = App.globals.targetID;
                var scope = $('div[data-questionid="' + targetID + '"]');
                if (!scope.length) scope = $('div[data-answerid="' + targetID + '"]');
                if (!scope.length) scope = '';
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
            }

            App.funcs.fixEvent = function(e) {
                if(e) e.preventDefault();
                // Refresh item population
                App.funcs.popItems();
                // Pipe data through editing modules
                App.pipe(App.items, App.globals.pipeMods, App.globals.order);
            }

            App.funcs.diff = function() { 
                App.selections.diffTable.empty();
                
                function maakRij(x, y, type, rij){
                    
                    var tr = $('<tr/>');
                    
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

                for(var y=0; y<matrix.length; y++){
                    matrix[y] = new Array(a2.length+1);

                    for(var x=0; x<matrix[y].length; x++){
                        matrix[y][x] = 0;
                    }
                }

                for(var y=1; y<matrix.length; y++){
                    for(var x=1; x<matrix[y].length; x++){
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
            }

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
                App.funcs.popSelections();
                App.funcs.createButton();
                App.funcs.popOriginals();
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
    var Apps = [];

    // It will be this if you are in the queue
    var targetID = $('.post-id').text();

    var selector = '.edit-post, [value*="Edit"]:not([value="Save Edits"])';
    var clickables = $(selector);
    if (clickables.length) {
        // ^^^ Inline editing.
        clickables.click(function(e) {
            if (e.target.href) targetID = e.target.href.match(/\d/g).join("");
            Apps[targetID] = new EditorToolkit(targetID);
        });
        // vvv On the edit page.
    } else Apps[$('#post-id').val()] = new EditorToolkit($('#post-id').val());
}

// Inject the main script
var script = document.createElement('script');
script.type = "text/javascript";
script.textContent = '(' + main.toString() + ')();';
document.body.appendChild(script);
