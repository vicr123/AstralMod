/****************************************
 *
 *   AstralMod: Moderation bot for bits & Bytes and other Discord servers
 *   Copyright (C) 2018 Victor Tran, John Tur
 *
 *   This program is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   This program is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *   You should have received a copy of the GNU General Public License
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * *************************************/


const Discord = require('discord.js');
const consts = require('./consts.js');
const fs = require('fs');
const readline = require('readline');
const events = require('events');
const blessed = require('blessed');
const moment = require('moment');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const client = new Discord.Client({
    restTimeOffset: 10,
    disableEveryone: true
});
const i18next = require('i18next');
let i18nextbackend = require('i18next-node-fs-backend');

var amVersion;
if (process.argv.indexOf("--blueprint") == -1) {
    amVersion = "2.10";
    global.prefix = consts.config.prefix;
} else {
    amVersion = "Blueprint";
    global.prefix = consts.config.bprefix;
}

global.ownerId = undefined;

let doNotDeleteGuilds = [];

let availableTranslations = fs.readdirSync("translations");
i18next.use(i18nextbackend).init({
    fallbackLng: false,
    preload: availableTranslations,
    saveMissing: true,
    backend: {
        loadPath: "./translations/{{lng}}/{{ns}}.json",
        addPath: "./translations/{{lng}}/{{ns}}.json",
        jsonIndent: 4
    },
    interpolation: {
        format: function(value, format, lng) {
            if (format == "bold") return "**" + value + "**";
            return value;
        }
    }
});

global._ = {};
for (let index in availableTranslations) {
    let translationName = availableTranslations[index];
    _[translationName] = i18next.getFixedT(translationName, "translation");
}

global.tr = function() {
    
    return arguments[0];
}

const cipherAlg = "aes-256-ctr";
const sha256 = crypto.createHash("sha256");
const settingsKey = consts.keys.settingsKey.slice(0, 32);

const commandEmitter = new events.EventEmitter();
commandEmitter.setMaxListeners(100);
var plugins = {};

/** @type{Object} */
global.settings = null;
var listening = true;
var nickChanges = {};
var lockBox = [];
var banCounts = {};
var knownInvites = {};
var finalStdout = "";
global.banDescriptor = {};

let logFile = fs.createWriteStream("./log.log", {flags: 'a'});
logFile.write("\n\n-----NEW SESSION START-----\n");
logFile.write("ASTRALMOD " + amVersion + "\n");

global.UserInputError = function() {
    var temp = Error.apply(this, arguments);
    temp.name = "UserInputError";
    this.name = "UserInputError";
    this.message = temp.message;
}

UserInputError.prototype = Object.create(Error.prototype, {
    constructor: {
        value: UserInputError,
        writable: true,
        configurable: true
    }
});

global.CommandError = function() {
    var temp = Error.apply(this, arguments);
    temp.name = "CommandError";
    this.name = "CommandError";
    this.message = temp.message;
}

CommandError.prototype = Object.create(Error.prototype, {
    constructor: {
        value: CommandError,
        writable: true,
        configurable: true
    }
});

global.getRandom = function() {
    if (arguments.length == 1) {
        if (typeof arguments[0] == Array) {
            var random = Math.floor(Math.random() * 1000) % arguments[0].length;
            return arguments[0][random];
        }
    } else {
        var random = Math.floor(Math.random() * 1000) % arguments.length;
        return arguments[random];
    }
}

global.filterOffensive = function(offensive) {
    offensive = offensive.replace("shit", "s•••");
    offensive = offensive.replace("fuck", "f•••");
    return offensive;
}

global.getEmoji = function(emojiName) {
    if (consts.config.emojiServer == null) return ":arrow_right:"; //No emoji server configured
    try {
        return client.guilds.get(consts.config.emojiServer).emojis.find("name", emojiName).toString();
    } catch (err) {
        return ":arrow_right:";
    }
}

global.sendPreloader = function(text, channel) {
    return channel.send(getEmoji("loader") + " " + text);
}

global.logType = {
    debug: 0,
    info: 1,
    warning: 2,
    critical: 3,
    good: 4
}

var capture = {};
global.captureInput = function(func, guild, author) {
    capture[guild] = {
        function: func,
        guild: guild,
        author: author
    };
}

global.releaseInput = function(guild) {
    capture[guild] = null;
}

global.awaitUserConfirmation = function(options) {
    return new Promise(function(resolve, reject) {
        if (options.time == null || options.time < 1) options.time = 5; //Default to 5 seconds

        let embed = new Discord.RichEmbed();
        embed.setTitle(options.title);
        embed.setDescription(options.msg);
        embed.setColor("#3C3C96");
        embed.setFooter("Use 🚫 within " + options.time + " seconds to cancel");
        if (options.extraFields != null) {
            for (let field in options.extraFields) {
                let currentField = options.extraFields[field];
                embed.addField(currentField[0], currentField[1]);
            }
        }

        options.channel.send(embed).then(function(message) {
            message.react('🚫');

            let timeout = setTimeout(function() {
                message.clearReactions();

                if (options.msgOnSuccess != "") {
                    embed.setDescription(options.msgOnSuccess);
                }
                embed.setColor("#00C000");
                embed.setFooter("Fulfilled Request");
                message.edit(embed);
                resolve();
            }, options.time * 1000);
            message.awaitReactions(function(reaction) {
                if (reaction.count > 1 && reaction.users.has(options.author.id)) return true;
                return false;
            }, {
                max: 1
            }).then(function() {
                //Cancel the function
                clearTimeout(timeout);
                message.clearReactions();

                if (options.msgOnFail != "") {
                    embed.setDescription(options.msgOnFail);
                }
                embed.setColor("#FF0000");
                embed.setFooter("Cancelled Request");
                message.edit(embed);
                reject();
            });
        });
    });
}

//Set up screen
var screen = blessed.screen({
    smartCSR: true,
    dockBorders: true
});
screen.title = 'AstralMod ' + amVersion;

var titleBox = blessed.text({
    top: "0",
    left: "0",
    width: "100%",
    height: "1",
    content: "AstralMod " + amVersion + " Console",
    tags: true,
    style: {
        fg: 'black',
        bg: 'white'
    },
    padding: {
        left: 1
    }
});
screen.append(titleBox);

var logBox = blessed.log({
    top: 1,
    left: 0,
    width: "100%",
    height: "100%-4",
    tags: true,
    style: {
        fg: 'white',
        bg: 'black',
        scrollbar: {
            bg: 'white'
        }
    },
    padding: {
        left: 1 // ,
        // bottom: 2
    },
    scrollable: true,
    alwaysScroll: true,
    scrollOnInput: true,
    scrollbar: true //,
    //clickable: true
});
screen.append(logBox);

function clearBoxes() {
    while (lockBox.length > 0) {
        var box = lockBox.pop();
        box.hide();
        box.destroy();
    }

}

logBox.on('click', function(mouse) {
    var x = mouse.x;
    var y = mouse.y;

    //var line = logBox.getScreenLines()[y + 1];
    var line = logBox.getBaseLine(y - 1);

    //Remove escapes
    while (line.indexOf("\x1b") != -1) {
        var removeStart = line.indexOf("\x1b");
        var removeEnd = line.indexOf("m", removeStart);
        line = line.replace(line.slice(removeStart, removeEnd + 1), "");
    }
    //logBox.log(line);

    //Get word around line
    var previousSpace = line.lastIndexOf(" ", x - 2);
    var nextSpace = line.indexOf(" ", x - 2);

    previousSpace++;

    if (nextSpace == -1) {
        nextSpace = line.length;// - previousSpace;
    }
    var word = line.substring(previousSpace, nextSpace);

    if (word.startsWith("[")) word = word.substr(1);
    if (word.endsWith("]")) word = word.substr(0, word.length - 2);

    var goUpwards = false;
    var top = y + 1;
    if (top + 7 > screen.height) {
        top = y - 7;
        goUpwards = true;
    }

    var left = x - 10;
    if (left + 50 > screen.width) {
        left = screen.width - 50;
    } else if (left < 0) {
        left = 0;
    }

    var boxOptions = {
        top: top,
        left: left,
        width: 50,
        style: {
            fg: "black",
            bg: "white",
            border: {
                fg: 'white',
                bg: 'black'
            }
        },
        border: {
            type: "line"
        },
        padding: {
            left: 2,
            top: 1,
            right: 2,
            bottom: 1
        }
    };

    clearBoxes();

    //Determine type of object clicked
    if (client.guilds.has(word)) {
        //This is a guild
        var guild = client.guilds.get(word);
        var box = blessed.box(JSON.parse(JSON.stringify(boxOptions)));
        box.content = "For Guild " + word + "\n" +
                      "Name: " + guild.name;
        box.height = 7;
        screen.append(box);

        if (goUpwards) {
            boxOptions.top -= 6;
        } else {
            boxOptions.top += 6;
        }

        var moreInfoButton = blessed.button({
            style: {
                fg: "yellow",
                bg: "blue"
            }
        });
        moreInfoButton.content = "More Info";
        moreInfoButton.left = 0;
        moreInfoButton.top = 2;
        moreInfoButton.width = 9;
        moreInfoButton.height = 1;
        moreInfoButton.on('click', function() {
            clearBoxes();
            renderScreen();

            processConsoleInput("ginfo " + word);
        });
        box.append(moreInfoButton);

        var membersButton = blessed.button({
            style: {
                fg: "yellow",
                bg: "blue"
            }
        });
        membersButton.content = "Members";
        membersButton.left = 10;
        membersButton.top = 2;
        membersButton.width = 7;
        membersButton.height = 1;
        membersButton.on('click', function() {
            clearBoxes();
            renderScreen();

            processConsoleInput("ginfom " + word);
        });
        box.append(membersButton);

        var channelsButton = blessed.button({
            style: {
                fg: "yellow",
                bg: "blue"
            }
        });
        channelsButton.content = "Channels";
        channelsButton.left = 18;
        channelsButton.top = 2;
        channelsButton.width = 8;
        channelsButton.height = 1;
        channelsButton.on('click', function() {
            clearBoxes();
            renderScreen();

            processConsoleInput("ginfoc " + word);
        });
        box.append(channelsButton);

        var bansButton = blessed.button({
            style: {
                fg: "yellow",
                bg: "blue"
            }
        });
        bansButton.content = "Bans";
        bansButton.left = 27;
        bansButton.top = 2;
        bansButton.width = 4;
        bansButton.height = 1;
        bansButton.on('click', function() {
            clearBoxes();
            renderScreen();

            processConsoleInput("ginfob " + word);
        });
        box.append(bansButton);

        lockBox.push(box);
    }

    if (client.channels.has(word)) {
        //This is a channel
        var channel = client.channels.get(word);
        var box = blessed.box(JSON.parse(JSON.stringify(boxOptions)));
        box.content = "For Channel " + word + "\n" +
                      "Name: " + channel.name;
        box.height = 7;
        screen.append(box);

        if (goUpwards) {
            boxOptions.top -= 6;
        } else {
            boxOptions.top += 6;
        }

        var moreInfoButton = blessed.button({
            style: {
                fg: "yellow",
                bg: "blue"
            }
        });
        moreInfoButton.content = "More Info";
        moreInfoButton.left = 0;
        moreInfoButton.top = 2;
        moreInfoButton.width = 9;
        moreInfoButton.height = 1;
        moreInfoButton.on('click', function() {
            clearBoxes();
            renderScreen();

            processConsoleInput("cinfo " + word);
        });
        box.append(moreInfoButton);

        var sendButton = blessed.button({
            style: {
                fg: "yellow",
                bg: "blue"
            }
        });
        sendButton.content = "Send";
        sendButton.left = 10;
        sendButton.top = 2;
        sendButton.width = 4;
        sendButton.height = 1;
        sendButton.on('click', function() {
            clearBoxes();
            renderScreen();

            //processConsoleInput("cinfo " + word);
            showTextBox();
            textBox.setValue("> send " + word + " ");
            renderScreen();
        });
        box.append(sendButton);

        lockBox.push(box);
    }

    if (client.users.has(word)) {
        //This is a user
        var user = client.users.get(word);
        var box = blessed.box(JSON.parse(JSON.stringify(boxOptions)));
        box.content = "For User " + word + "\n" +
                      "Name: " + user.username;
        box.height = 7;
        screen.append(box);

        if (goUpwards) {
            boxOptions.top -= 6;
        } else {
            boxOptions.top += 6;
        }

        lockBox.push(box);
    }

    if (plugins.hasOwnProperty(word)) {
        //This is a plugin
        var plugin = plugins[word];
        var box = blessed.box(JSON.parse(JSON.stringify(boxOptions)));
        box.content = "For Plugin \"" + plugin.name + "\"\n" +
                      "Filename: " + word;
        box.height = 7;
        screen.append(box);

        if (goUpwards) {
            boxOptions.top -= 6;
        } else {
            boxOptions.top += 6;
        }

        var unloadButton = blessed.button({
            style: {
                fg: "yellow",
                bg: "blue"
            }
        });
        unloadButton.content = "Unload";
        unloadButton.left = 0;
        unloadButton.top = 2;
        unloadButton.width = 6;
        unloadButton.height = 1;
        unloadButton.on('click', function() {
            clearBoxes();
            renderScreen();

            processConsoleInput("unload " + word);
        });
        box.append(unloadButton);

        var reloadButton = blessed.button({
            style: {
                fg: "yellow",
                bg: "blue"
            }
        });
        reloadButton.content = "Reload";
        reloadButton.left = 7;
        reloadButton.top = 2;
        reloadButton.width = 6;
        reloadButton.height = 1;
        reloadButton.on('click', function() {
            clearBoxes();
            renderScreen();

            processConsoleInput("reload " + word);
        });
        box.append(reloadButton);

        lockBox.push(box);
    }

    if (word == "save" || word == "plugins" || word == "vacuum" || word == "guilds" || word == "exit") {
        processConsoleInput(word);
    }

    screen.render();
});

var textBox = blessed.textbox({
    top: "100%-3",
    left: -1,
    width: "100%+2",
    height: 3,
    tags: true,
    value: "> ",
    border: {
        type: "line"
    },
    style: {
        fg: 'white',
        bg: 'black',
        border: {
            fg: 'white',
            bg: 'black'
        }
    },
    inputOnFocus: true
});
screen.append(textBox);

var keyBox = blessed.box({
    top: "100%-1",
    left: "0",
    width: "100%",
    height: 1,
    tags: true,
    style: {
        fg: 'black',
        bg: 'white'
    },
    padding: {
        left: 1
    }
});
screen.append(keyBox);

var guildsButton = blessed.button({
    style: {
        fg: "yellow",
        bg: "blue"
    },
    content: "^G Guilds",
    left: 10,
    width: 9,
    height: 1,
    top: "100%-1"
});
guildsButton.on('click', function() {
    processConsoleInput("guilds");
});
screen.append(guildsButton);

var pluginsButton = blessed.button({
    style: {
        fg: "yellow",
        bg: "blue"
    },
    content: "^P Plugins",
    left: 20,
    width: 10,
    height: 1,
    top: "100%-1"
});
pluginsButton.on('click', function() {
    processConsoleInput("plugins");
});
screen.append(pluginsButton);

textBox.key('C-c', function(ch, key) {
    shutdown();
});

screen.key('C-c', function() {
    shutdown();
});

screen.key('C-g', function() {
    processConsoleInput("guilds");
});

screen.key('C-p', function() {
    processConsoleInput("plugins");
});

screen.key('up', function() {
    logBox.scroll(-1);
    renderScreen();
});

screen.on('keypress', function(key) {
    if (lockBox.length != 0) {
        clearBoxes();
    } else if (key != undefined && !textBox.focused && key != "\r") {
        showTextBox();

        if (key != ":") {
            textBox.setValue("> " + key);
        }
    }
});

screen.key('pageup', function() {
    logBox.scroll(-logBox.height);
    renderScreen();
});

screen.key('down', function() {
    logBox.scroll(1);
    renderScreen();
});

screen.key('pagedown', function() {
    logBox.scroll(logBox.height);
    renderScreen();
});

function showTextBox() {
    logBox.height = "100%-4";
    keyBox.content = "ESC Cancel Command   ENTER Issue Command";
    textBox.show();
    textBox.focus();
    guildsButton.hide();
    pluginsButton.hide();

    renderScreen();
}

var currentHistoryEntry = -1;
function hideTextBox() {
    textBox.setValue("> ");
    logBox.height = "100%-2";
    keyBox.content = "^C Exit                          To issue a command, just start typing away.";
    textBox.hide();
    logBox.focus();
    guildsButton.show();
    pluginsButton.show();
    currentHistoryEntry = -1;

    renderScreen();
}

textBox.key("up", function() {
    currentHistoryEntry++;
    if (commandHistory[currentHistoryEntry] != null) {
        textBox.setValue("> " + commandHistory[currentHistoryEntry]);
    } else {
        currentHistoryEntry = -1;
        textBox.setValue("> ");
    }
    renderScreen();
});

textBox.key("down", function() {
    currentHistoryEntry--
    if (commandHistory[currentHistoryEntry] != null) {
        textBox.setValue("> " + commandHistory[currentHistoryEntry]);
    } else {
        currentHistoryEntry = -1;
        textBox.setValue("> ");
    }
    renderScreen();
});

textBox.on("cancel", function() {
    hideTextBox();
});

function renderScreen() {
    screen.render();
}

renderScreen();
hideTextBox();

console.error = function(data, ...args){
    log(data, logType.warning);
};

global.log = function(logMessage, type = logType.debug) {
    if (logMessage == null) {
        return;
    }

    if (logMessage instanceof Error) {
        logMessage = logMessage.toString() + "\n" + logMessage.stack;
    } else {
        logMessage = logMessage.toString();
    }

    //Log a message to the console
    if (type == logType.debug) {
        if (process.argv.indexOf("--debug") == -1) {
            return;
        }
    }

    var logFormatting;
    var logString;

    var lines = logMessage.split("\n");


    for (i = 0; i < lines.length; i++) {
        switch (type) {
            case logType.debug:
                if (i == 0) {
                    logString = "[ ] ";
                } else if (i == lines.length - 1) {
                    logString = " └─ ";
                } else {
                    logString = " ├─ ";
                }
                logString += lines[i];
                logFormatting = "\x1b[1m\x1b[34m";
                break;
            case logType.info:
                if (i == 0) {
                    logString = "[i] ";
                } else if (i == lines.length - 1) {
                    logString = " └─ ";
                } else {
                    logString = " ├─ ";
                }
                logString += lines[i];
                logFormatting = "\x1b[1m\x1b[37m";
                break;
            case logType.warning:
                if (i == 0) {
                    logString = "[!] ";
                } else if (i == lines.length - 1) {
                    logString = " └─ ";
                } else {
                    logString = " ├─ ";
                }
                logString += lines[i];
                logFormatting = "\x1b[1m\x1b[33m";
                break;
            case logType.critical:
                if (i == 0) {
                    logString = "[X] ";
                } else if (i == lines.length - 1) {
                    logString = " └─ ";
                } else {
                    logString = " ├─ ";
                }
                logString += lines[i];
                logFormatting = "\x1b[1m\x1b[31m";
                break;
            case logType.good:
                if (i == 0) {
                    logString = "[>] ";
                } else if (i == lines.length - 1) {
                    logString = " └─ ";
                } else {
                    logString = " ├─ ";
                }
                logString += lines[i];
                logFormatting = "\x1b[1m\x1b[32m";
                break;
        }

        var logOutput = logFormatting + logString + "\x1b[0m";

        logBox.log("[" + new Date().toLocaleTimeString("us", {
            hour12: false
        }) + "] " + logOutput);

        logFile.write("[" + new Date().toLocaleTimeString("us", {
            hour12: false
        }) + "] " + logString + "\n");
        
        renderScreen();
    }
}

global.logPromiseRejection = function(object, action) {
    log("Couldn't delete message " + object.id + " in channel " + object.channel.id, logType.warning);
};

process.on('unhandledRejection', function(err, p) {
    log(err.stack, logType.critical);
});

process.on('uncaughtException', function(err) {
    //Uncaught Exception

    if (err.code == "ECONNRESET") {
        log("Uncaught Exception: ECONNRESET", logType.critical);
        log(err.stack, logType.critical);
    } else {
        log("Uncaught Exception:", logType.critical);
        log(err.stack, logType.critical);
    }
});

var stdinInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

global.parseTime = function(time) {
    if (time.endsWith("m")) {
        return parseInt(time.substr(0, time.length - 1)) * 60;
    } else if (time.endsWith("h")) {
        return parseInt(time.substr(0, time.length - 1)) * 60 * 60;
    } else if (time.endsWith("d")) {
        return parseInt(time.substr(0, time.length - 1)) * 60 * 60 * 24;
    } else if (time.endsWith("w")) {
        return parseInt(time.substr(0, time.length - 1)) * 60 * 60 * 24 * 7;
    } else if (time.endsWith("s")) {
        return parseInt(time.substr(0, time.length - 1));
    } else {
        return parseInt(time) * 60;
    }
}

var commandHistory = [];

function processConsoleInput(line) {
    commandHistory.unshift(line);

    logBox.log(line);

    const memberLine = function(member) {
        var line = member.id + "  " + member.user.tag;
        if (member.nickname != null) {
            line += " [" + member.nickname + "]";
        }
        if (member.user.bot) {
            line += " \x1b[46m[BOT]";
        }
        return line;
    };

    var lLine = line.toLowerCase();
    if (lLine == "help") {
        var help = "AstralMod Console Commands:\n" +
                   "save                    Saves AstralMod configuration settings to disk. This happens every 30 seconds.\n" +
                   "loadunenc [filename]    Loads an unencrypted settings.json file from disk.\n" +
                   "dumpsettings            Prints the settings file contents, unencrypted, to the console\n" +
                   "plugins                 List loaded plugins\n" +
                   "load [plugin]           Loads a plugin into AstralMod\n" +
                   "unload [plugin]         Unloads a plugin from AstralMod\n" +
                   "reload [plugin]         Unloads and then loads a plugin into AstralMod\n" +
                   "broadcast [message]     Broadcasts a message to every server AstralMod is connected to\n" +
                   "vacuum                  Check the AstralMod Configuration File for errors\n" +
                   "reconnect               Attempts to disconnect and reconnect to Discord\n" +
                   "guilds                  Lists guilds AstralMod knows about\n" +
                   "ginfo [guildid]         Shows information about a guild\n" +
                   "ginfom [guildid]        Shows members inside a guild\n" +
                   "ginfoc [guildid]        Shows channels inside a guild\n" +
                   "ginfob [guildid]        Shows bans of a guild\n" +
                   "cinfo [channelid]       Finds a channel by its ID\n" +
                   "exit                    Exits AstralMod";
        log(help, logType.info);
    } else if (lLine == "exit") {
        shutdown();
    } else if (lLine == "loadunenc") {
        log("Usage: loadunenc [filename]", logType.critical);
    } else if (lLine.startsWith("loadunenc ")) {
        var file = line.substr(10);
        try {
            var json = fs.readFileSync(file, "utf8");
            var object = JSON.parse(json);
            if (object != null) {
                settings = object;
                fs.unlink(file);
                log("Settings loaded successfully, and the file has been deleted from disk. Please use the vacuum command now.", logType.good);
            }
        } catch (err) {
            log("Couldn't load settings", logType.critical);
        }
    } else if (lLine == "dumpsettings") {
        log(JSON.stringify(settings, null, 4), logType.info);
    } else if (lLine == "plugins") {
        var pluginsList = "Loaded plugins:";
        for (plugin in plugins) {
            pluginsList += "\n" + plugin;
        }
        log(pluginsList, logType.info);
    } else if (lLine.startsWith("unload ")) {
        unloadPlugin(line.substr(7));
        log("Plugin " + line.substr(7) + " unloaded.", logType.good);
    } else if (lLine == "unload") {
        log("Usage: unload [filename]", logType.critical);
    } else if (lLine.startsWith("load ")) {
        if (loadPlugin(line.substr(5))) {
            log("Plugin " + line.substr(5) + " loaded.", logType.good);
        }
    } else if (lLine == "load") {
        log("Usage: load [filename]", logType.critical);
    } else if (lLine.startsWith("reload ")) {
        unloadPlugin(line.substr(7));
        log("Plugin " + line.substr(7) + " unloaded.", logType.good);
        if (loadPlugin(line.substr(7))) {
            log("Plugin " + line.substr(7) + " loaded.", logType.good);
        }
    } else if (lLine == "reload") {
        log("Usage: reload [filename]", logType.critical);
    } else if (lLine == "save") {
        saveSettings(true);
    } else if (lLine == "reconnect") {
        if (consts.keys.token != null) {
            client.login(consts.keys.token).catch(function() {
                log("Couldn't establish a connection to Discord.", logType.critical);
            });
        } else {
            log("Couldn't find token", logType.critical);
        }
    } else if (lLine.startsWith("broadcast ")) {
        //Broadcast message to each server in either #general or the bot warnings general
        var broadcast = line.substr(10);
        log("Broadcasting message: " + broadcast, logType.info);

        //Iterate over each server
        for (key in settings.guilds) {
            var guildSetting = settings.guilds[key];
            var guild = client.guilds.get(key);

            if (guildSetting != null) {
                var channel = null;
                if (guildSetting.botWarnings != null) {
                    if (guild != null) {
                        channel = guild.channels.get(guildSetting.botWarnings);
                    }
                }

                if (channel == null && guild != null && guild.channels.size > 0) {
                    //channel = guild.defaultChannel;
                    channel = guild.channels.array()[0];
                }

                if (channel != null) {
                    channel.send("SERVICE ANNOUNCEMENT: " + broadcast);
                }
            }
        }
        log("Broadcasting message complete", logType.good);
    } else if (lLine == "broadcast") {
        log("Usage: broadcast message", logType.critical);
    } else if (lLine == "vacuum") {
        vacuumSettings();
    } else if (lLine.startsWith("cinfo ")) {
        var channelId = line.substr(6);
        var channel = client.channels.get(channelId);
        if (channel == null) {
            log("Unknown channel.", logType.info);
        } else {
            var info = "Information for channel " + channelId + ":\n" +
                       "Name: " + channel.name + "\n" +
                       "Guild: " + channel.guild.name + " [" + channel.guild.id + "]";
            log(info, logType.info);
        }
    } else if (lLine == "cinfo") {
        log("Usage: cinfo [channelid]", logType.critical);
    } else if (lLine == "guilds") {
        var response = "Guilds AstralMod is connected to:";

        for ([id, guild] of client.guilds) {
            response += "\n" + guild.id + "  " + guild.name + "";
        }

        log(response, logType.info);
    } else if (lLine.startsWith("ginfo ")) {
        var guildLine = line.substr(6);
        var guild = client.guilds.get(guildLine);
        if (guild == null) {
            log("Unknown guild.", logType.info);
        } else {
            var info = "Information for guild " + guildLine + ":\n" +
                       "Name: " + guild.name + "\n" +
                       "Owner: " + memberLine(guild.owner) + "\n" +
                       "Members: " + parseInt(guild.memberCount) + "\n" +
                       "Channels: " + parseInt(guild.channels.size);
            log(info, logType.info);
        }
    } else if (lLine.startsWith("ginfom ")) {
        var guildLine = line.substr(7);
        var guild = client.guilds.get(guildLine);
        if (guild == null) {
            log("Unknown guild.", logType.info);
        } else {
            var info = "Information for guild " + guildLine + ":\n" +
                       "Members: " + parseInt(guild.memberCount);

            for ([id, member] of guild.members) {
                info += "\n" + memberLine(member);
            }

            log(info, logType.info);
        }
    } else if (lLine.startsWith("ginfoc ")) {
        var guildLine = line.substr(7);
        var guild = client.guilds.get(guildLine);
        if (guild == null) {
            log("Unknown guild.", logType.info);
        } else {
            var info = "Information for guild " + guildLine + ":\n" +
                       "Members: " + parseInt(guild.channels.size);

            for ([id, channel] of guild.channels) {
                info += "\n" + channel.id + " " + (channel.type == "text" ? "#" : " ") + channel.name;
            }

            log(info, logType.info);
        }
    } else if (lLine.startsWith("ginfob ")) {
        var guildLine = line.substr(7);
        var guild = client.guilds.get(guildLine);
        if (guild == null) {
            log("Unknown guild.", logType.info);
        } else {
            guild.fetchBans().then(function(bans) {
                var info = "Information for guild " + guildLine + ":\n" +
                        "Bans: " + parseInt(bans.size);

                for ([id, user] of bans) {
                    info += "\n" + user.id + " " + user.username + "#" + user.discriminator;
                }

                log(info, logType.info);
            }).catch(function() {
                log("Couldn't fetch bans for that guild.", logType.critical);
            });
        }
    } else if (lLine.startsWith("send ")) {
        var args = line.substr(5);

        var split = args.indexOf(" ");
        if (split == -1) {
            log("Usage: send [channelid] [message]", logType.critical);
        } else {
            var message = args.substr(split + 1);
            var channel = args.substr(0, split);

            var dChannel = client.channels.get(channel);
            if (dChannel == null) {
                log("Couldn't find that channel.", logType.critical);
            } else {
                dChannel.send(message);
                log("Sent.", logType.good);
            }
        }
    } else if (lLine == "send") {
        log("Usage: send [channelid] [message]", logType.critical);
    } else if (lLine == "ginfo") {
        log("Usage: ginfo [guildid]", logType.critical);
    } else {
        log("Unknown command. For help, type \"help\" into the console.", logType.critical);
    }
}

textBox.on("submit", function() {
    //Input received!
    var line = textBox.getText().substr(2);
    hideTextBox();

    processConsoleInput(line);
});

textBox.key('backspace', function() {
    var line = textBox.getText();
    if (!line.startsWith("> ")) {
        if (line == ">") {
            line = "> ";
        } else if (line.startsWith(" ")) {
            line = "> " + line.substring(1);
        } else {
            line = "> " + line;
        }
        textBox.setValue(line);
    }
});

textBox.key('tab', function() {
    //Autocomplete!

    var line = textBox.getText().substr(2, textBox.getText().length - 6);
    textBox.setValue("> " + line);
    var lLine = line.toLowerCase();

    if (lLine.startsWith("ginfo ")) {
        var guildLine = line.substr(6);
        var guilds = [];
        for ([id, guild] of client.guilds) {
            var id = guild.id;
            if (id.startsWith(guildLine)) {
                guilds.push(guild.id);
            }
        }

        if (guilds.length == 1) {
            textBox.setValue("> ginfo " + guilds[0]);
        } else if (guilds.length == 0) {
            log("No results.", logType.info)
        } else {
            var acOutput = "";
            for (guild of guilds) {
                acOutput += guild + " ";
            }
            log(acOutput, logType.info);
        }
    } else if (lLine.startsWith("ginfom ")) {
        var guildLine = line.substr(7);
        var guilds = [];
        for ([id, guild] of client.guilds) {
            var id = guild.id;
            if (id.startsWith(guildLine)) {
                guilds.push(guild.id);
            }
        }

        if (guilds.length == 1) {
            textBox.setValue("> ginfom " + guilds[0]);
        } else if (guilds.length == 0) {
            log("No results.", logType.info)
        } else {
            var acOutput = "";
            for (guild of guilds) {
                acOutput += guild + " ";
            }
            log(acOutput, logType.info);
        }
    } else if (lLine.startsWith("ginfoc ")) {
        var guildLine = line.substr(7);
        var guilds = [];
        for ([id, guild] of client.guilds) {
            var id = guild.id;
            if (id.startsWith(guildLine)) {
                guilds.push(guild.id);
            }
        }

        if (guilds.length == 1) {
            textBox.setValue("> ginfoc " + guilds[0]);
        } else if (guilds.length == 0) {
            log("No results.", logType.info)
        } else {
            var acOutput = "";
            for (guild of guilds) {
                acOutput += guild + " ";
            }
            log(acOutput, logType.info);
        }
    } else if (lLine.startsWith("ginfob ")) {
        var guildLine = line.substr(7);
        var guilds = [];
        for ([id, guild] of client.guilds) {
            var id = guild.id;
            if (id.startsWith(guildLine)) {
                guilds.push(guild.id);
            }
        }

        if (guilds.length == 1) {
            textBox.setValue("> ginfob " + guilds[0]);
        } else if (guilds.length == 0) {
            log("No results.", logType.info)
        } else {
            var acOutput = "";
            for (guild of guilds) {
                acOutput += guild + " ";
            }
            log(acOutput, logType.info);
        }
    } else if (lLine.startsWith("send ")) {
        var channelLine = line.substr(5);
        if (channelLine.indexOf(" ") == -1) {
            var channels = [];
            for ([id, channel] of client.channels) {
                var id = channel.id;
                if (id.startsWith(channelLine)) {
                    channels.push(channel.id);
                }
            }

            if (channels.length == 1) {
                textBox.setValue("> send " + channels[0] + " ");
            } else if (channels.length == 0) {
                log("No results.", logType.info)
            } else {
                var acOutput = "";
                for (channel of channels) {
                    acOutput += channel + " ";
                }
                log(acOutput, logType.info);
            }
        }
    } else if (lLine.startsWith("cinfo ")) {
        var channelLine = line.substr(6);
        if (channelLine.indexOf(" ") == -1) {
            var channels = [];
            for ([id, channel] of client.channels) {
                var id = channel.id;
                if (id.startsWith(channelLine)) {
                    channels.push(channel.id);
                }
            }

            if (channels.length == 1) {
                textBox.setValue("> cinfo " + channels[0]);
            } else if (channels.length == 0) {
                log("No results.", logType.info)
            } else {
                var acOutput = "";
                for (channel of channels) {
                    acOutput += channel + " ";
                }
                log(acOutput, logType.info);
            }
        }
    } else {
        log("Command autocompletion coming soon.", logType.info);
        //TODO: Command autocompletion
    }
});

function shutdown() {
    if (global.settings != null) {
        log("Saving settings...");
        try {
            var contents = JSON.stringify(settings, null, 4);

            //Encrypt the contents
            let iv = Buffer.from(crypto.randomBytes(16)).toString("hex").slice(0, 16);

            var cipher = crypto.createCipheriv(cipherAlg, settingsKey, iv);
            var settingsJson = Buffer.concat([cipher.update(Buffer.from(contents, "utf8"), cipher.final())]);

            fs.writeFileSync("settings.json", settingsJson, "utf8");
            fs.writeFileSync("iv", iv);
            log("Settings saved!", logType.good);
        } catch (exception) {
            log("Settings couldn't be saved. You may lose some settings.", logType.critical);
        }
    }

    log("Now exiting AstralMod.", logType.good);
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

log("Welcome to AstralMod!", logType.good);

global.getUserString = function(user) {
    var u = user;
    if (user.user != null) {
        u = user.user;
    }
    return u.tag;
}

global.parseUser = function(query, guild = null) {
    if (query.startsWith("<@!") && query.endsWith(">")) {
        query = query.substr(3);
        query = query.slice(0, -1);
    } else if (query.startsWith("<@") && query.endsWith(">")) {
        query = query.substr(2);
        query = query.slice(0, -1);
    }
    var searchResults = [];

    for (let [snowflake, user] of client.users) {
        if (user.username.toLowerCase() == query.toLowerCase()) {
            searchResults.unshift(user);
        } else if (user.username.toLowerCase().indexOf(query.toLowerCase()) != -1) {
            searchResults.push(user);
        } else if ((user.username.toLowerCase() + "#" + user.discriminator).indexOf(query.toLowerCase()) != -1) {
            searchResults.push(user);
        } else if (user.id == query) {
            searchResults.unshift(user);
        }
    }

    if (guild != null) {
        var guildSpecificResults = [];
        for (let [snowflake, member] of guild.members) {
            if (member.nickname != null) {
                if (member.nickname.toLowerCase() == query.toLowerCase()) {
                    guildSpecificResults.unshift(member.user);
                } else if (member.nickname.toLowerCase().indexOf(query.toLowerCase()) != -1) {
                    guildSpecificResults.push(member.user);
                }
            }
        }

        var pop = guildSpecificResults.pop();
        while (pop != undefined) {
            searchResults.unshift(pop);
            pop = guildSpecificResults.pop();
        }
    }

    return searchResults;
}

function setGame() {
    /*var presence = {
        game: {
            type: 0
        },
        status: "online",
        afk: false
    };

    presence.game.name = getRandom("with ban buttons",
                                   "Annoying Victor",
                                   prefix + "help",
                                   "v." + amVersion,
                                   "v." + amVersion,
                                   "Android Pay");
    client.user.setPresence(presence);*/

    client.user.setActivity(getRandom("with ban buttons",
                                      "Annoying Victor",
                                      prefix + "help",
                                      "v." + amVersion,
                                      "v." + amVersion,
                                      "Google Pay",
                                      "theShell",
                                      "Monopoly",
                                      "Final Fantastic Card",
                                      "Ski jacket shopping"),
                                {
                                    type: "PLAYING"
                                }
                            );
}

function isMod(member) {
    var modRoles = settings.guilds[member.guild.id].modRoles;
    if (modRoles == null) {
        if (member.permissions.has(Discord.Permissions.FLAGS.BAN_MEMBERS, true)) {
            return true;
        }
    } else {
        for (role of modRoles) {
            if (member.roles.has(role)) {
                return true;
            }
        }
    }
    return false;
}

global.uinfo = function(user, channel, locale, guild = null, compact = false) {
    sendPreloader("Retrieving user information...", channel).then(function(messageToEdit) {
        var member = null;
        if (guild != null) {
            for ([id, gMember] of guild.members) {
                if (gMember.user.id == user.id) {
                    member = gMember;
                    break;
                }
            }

            if (member == null) {
                member = {
                    displayName: user.username,
                    tag: user.tag,
                    noGuild: true,
                    noGuildMessage: _[locale]("UINFO_NOT_PART_OF_SERVER")
                }
            }
        } else {
            member = {
                displayName: user.username,
                tag: user.tag,
                noGuild: true,
                noGuildMessage: "You are not allowed to view server specific information in this server."
            }
        }

        var embed = new Discord.RichEmbed("uinfo");
        embed.setAuthor(member.displayName, user.displayAvatarURL);
        embed.setAuthor(getUserString(member), user.displayAvatarURL);
        embed.setColor("#00FF00");
        embed.setFooter(_[locale]("UINFO_USER_ID", {id:user.id}));

        if (compact) {
            var msg = _[locale]("UINFO_DISCRIMINATOR", {discriminator:user.discriminator}) + "\n" +
                        _[locale]("UINFO_CREATEDAT", {createdat:user.createdAt.toString()}) + "\n";

            if (member.noGuild != true) {
                if (member.joinedAt.getTime() == 0) {
                    msg += _[locale]("UINFO_JOINEDAT", {joinedat:_[locale]("UINFO_INVALID_JOIN")});
                } else {
                    msg += _[locale]("UINFO_JOINEDAT", {joinedat:member.joinedTimestamp.toString()});
                }
            }
            embed.setDescription(msg);
        } else {
            if (member.noGuild != true) {
                embed.setDescription(_[locale]("UINFO_USER_INFORMATION"));
            } else {
                embed.setDescription(member.noGuildMessage);
            }

            {
                var msg = _[locale]("UINFO_CREATEDAT", {createdat:user.createdAt.toString()}) + "\n";

                if (member.noGuild != true) {
                    if (member.joinedAt.getTime() == 0) {
                        msg += _[locale]("UINFO_JOINEDAT", {joinedat:_[locale]("UINFO_INVALID_JOIN")});
                    } else {
                        msg += _[locale]("UINFO_JOINEDAT", {joinedat:member.joinedTimestamp.toString()});
                    }
                }

                embed.addField(_[locale]("UINFO_TIMESTAMPS"), msg);
            }

            var msg;
            if (member.noGuild) {
                msg = _[locale]("UINFO_USERNAME", {username:user.username});

                embed.addField(_[locale]("UINFO_NAMES"), msg);
            } else {
                msg = _[locale]("UINFO_DISPLAYNAME", {displayname:member.displayName}) + "\n";
                msg +=  _[locale]("UINFO_USERNAME", {username:user.username}) + "\n";
                msg += _[locale]("UINFO_NICKNAME",{nickname: (member.nickname == null ? _[locale]("UINFO_NONICKNAME") : member.nickname)});

                embed.addField(_[locale]("UINFO_NAMES"), msg);
            }

            {
                var msg = "";

                if (user.bot) {
                    msg += "- " + _[locale]("UINFO_BOT_ACCOUNT_WARNING") + "\n";
                }

                if (banCounts[user.id] != 0 && banCounts[user.id] != null) {
                    msg += "- " + _[locale]("UINFO_BANNED_FROM", {count:parseInt(banCounts[user.id])});
                }

                if (msg != "") {
                    embed.addField(_[locale]("UINFO_ALERTS"), msg);
                }
            }
        }
        messageToEdit.edit(embed);
    });
}

function processModCommand(message) {
    var text = message.content;
    var lText = text.toLowerCase();

    //Special cases
    if (lText == prefix + "config") {
        //Make sure person isn't configuring any other guild
        for (key in settings.guilds) {
            var guildSetting = settings.guilds[key];
            if (guildSetting != null) {
                if (guildSetting.configuringStage != 0) {
                    if (guildSetting.configuringUser == message.author.id) {
                        message.reply("You're already trying to configure `" + client.guilds.get(key).name + "`. Finish configuring that server first, and then you can configure this server.");
                        return true;
                    }
                }
            }
        }

        //Clear all user configuring for this user
        for (key in settings.guilds) {
            var guildSetting = settings.guilds[key];
            if (guildSetting != null) {
                if (guildSetting.configuringUser == message.author.id) {
                    settings.guilds[key].configuringUser = null;
                }
            }
        }

        if (settings.guilds[message.guild.id].requiresConfig) {
            if (message.author.id == global.ownerId.id || message.author.id == message.guild.owner.user.id) {
                settings.guilds[message.guild.id].configuringUser = message.author.id;
                settings.guilds[message.guild.id].configuringStage = 0;
                message.author.send("Welcome to AstralMod! To start, let's get the roles of mods on the server. Enter the roles of mods on this server, seperated by a space.")

                var roles = "```";
                for (let [id, role] of message.guild.roles) {
                    roles += role.id + " = " + role.name + "\n";
                }
                roles += "```";
                message.author.send(roles);

                message.reply(":arrow_left: Continue in DMs.");
                return true;
            } else {
                message.reply("You're not " + message.guild.owner.displayName);
                return true;
            }
        } else {
            //Configuration menu

            //Make sure person has neccessary permissions
            if (message.author.id == global.ownerId.id || message.author.id == message.guild.owner.user.id || message.member.hasPermission("ADMINISTRATOR")) {
                settings.guilds[message.guild.id].configuringUser = message.author.id;
                settings.guilds[message.guild.id].configuringStage = 0;
                message.author.send(getSingleConfigureWelcomeText(message.guild));

                message.reply(":arrow_left: Continue in DMs.");
            }
        }
    } else if (lText == prefix + "poweroff") {
        if (message.author.id == global.ownerId.id) {
            message.reply("AstralMod is now exiting.").then(function () {
                shutdown();
            });
        }
    }

    if (isMod(message.member)) {
        var command;
        command = text.toLowerCase().substr(prefix.length);
        if (command.startsWith("oknick")) {
            var userId = command.substr(7);
            acceptNicknameChange(message.guild.id, userId, message.channel.id, message.author.tag);
            return true;
        }
    }
    return false;
}

function requestNickname(member, nickname, guild) {
    if (nickname.length > 32) {
        return "length";
    }

    if (settings.guilds[guild.id].pendingNicks == null) {
        settings.guilds[guild.id].pendingNicks = {};
    }

    let pendingNicks = settings.guilds[guild.id].pendingNicks; //save us some typing
    if (pendingNicks.cooldowns == null) {
        pendingNicks.cooldowns = {};
    }

    let botwarningsChannel = client.channels.get(settings.guilds[guild.id].botWarnings);
    if (botwarningsChannel == null) {
        return "configuration";
    }

    if (pendingNicks.cooldowns[member.user.id] == null || moment.utc().isSameOrAfter(moment(pendingNicks.cooldowns[member.user.id]).utc().add(1, 'd'))) {
        pendingNicks.cooldowns[member.user.id] = moment.utc().toDate();

        if (nickChanges[guild.id] == null) {
            nickChanges[guild.id] = {};
        }

        nickChanges[guild.id][member.user.id] = nickname;

        let botwarningsChannelMessage;
        if (nickname == "") {
            botwarningsChannelMessage = ":arrows_counterclockwise: <@" + member.user.id + "> :arrow_right: `[clear]`. `" + prefix + "oknick " + member.user.id + "`";
        } else {
            botwarningsChannelMessage = ":arrows_counterclockwise: <@" + member.user.id + "> :arrow_right: `" + nickname + "`. `" + prefix + "oknick " + member.user.id + "`";
        }
        botwarningsChannel.send(botwarningsChannelMessage).then(function(message) {
            message.react("✅").then(function() {
                let acceptor;
                message.awaitReactions(function(reaction) {
                    if (reaction.count <= 1) return false;
                    for (let user of reaction.users) {
                        if (isMod(message.guild.members.get(user[0]))) {
                            return true;
                        }
                    }
                    return false;
                }, {
                    max: 1
                }).then(function() {
                    //Accept the nickname
                    acceptNicknameChange(message.guild.id, member.user.id, message.channel.id);
                });
            });
        });

        settings.guilds[guild.id].pendingNicks = pendingNicks;
        return "ok";
    } else {
        settings.guilds[guild.id].pendingNicks = pendingNicks;
        return moment(pendingNicks.cooldowns[member.user.id]).utc().add(1, 'd');
    }
}

function acceptNicknameChange(guildId, userId, channelId) {
    let guild = client.guilds.get(guildId);
    if (nickChanges[guildId] != null) {
        if (nickChanges[guildId][userId] != null) {
            client.fetchUser(userId).then(function(user) {
                return guild.fetchMember(user);
            }).then(function(member) {
                return member.setNickname(nickChanges[guildId][userId]);
            }).then(function() {
                nickChanges[guildId][userId] = null;
                guild.channels.get(channelId).send(':white_check_mark: ' + tr('User nickname has been accepted'));
            }).catch(function() {
                guild.channels.get(channelId).send(':no_entry_sign: ERROR: ' + tr('That didn\'t work.'));
            });
        } else {
            guild.channels.get(channelId).send(':no_entry_sign: ERROR: ' + tr('That didn\'t work.'));
        }
    }
}

function getNickStatus(member, nickname, guild) {
    if (nickname.length > 32) {
        return "length";
    }

    let botwarningsChannel = client.channels.get(settings.guilds[guild.id].botWarnings);
    if (botwarningsChannel == null) {
        return "configuration";
    }

    let pendingNicks = settings.guilds[guild.id].pendingNicks; //save us some typing
    if (pendingNicks == null || pendingNicks.cooldowns[member.user.id] == null || moment.utc().isSameOrAfter(moment(pendingNicks.cooldowns[member.user.id]).utc().add(1, 'd'))) {
        return "ok";
    }

    return moment(pendingNicks.cooldowns[member.user.id]).utc().add(1, 'd');
}

function processAmCommand(message) {
    var text = message.content;
    var command;

    command = text.toLowerCase().substr(prefix.length);

    if (command == "ping") {
        let pingDate = Date.now();
        message.channel.send(getEmoji("signal0") + " I'm here!").then(function(message) {
            let time = Date.now() - pingDate;

            /* Times:
                0 - 100ms:    signal5
                100 - 200ms:  signal4
                200 - 300ms:  signal3
                300 - 500ms:  signal2
                500 - 1000ms: signal1
                1000ms+:      signal0
            */

            if (time == 420) {
                message.edit(getEmoji("signal2") + " I'm here! It took either 419ms or 421ms to respond.");
            } else {
                let e;
                if (time < 100) {
                    e = getEmoji("signal5");
                } else if (time <= 200) {
                    e = getEmoji("signal4");
                } else if (time <= 300) {
                    e = getEmoji("signal3");
                } else if (time <= 500) {
                    e = getEmoji("signal2");
                } else if (time <= 1000) {
                    e = getEmoji("signal1");
                } else {
                    e = getEmoji("signal0");
                }
                message.edit(e + " I'm here! It took " + parseInt(time) + "ms to respond.");
            }
        }).catch(function(error) {
            log("Uncaught Exception:", logType.critical);
            log(error.stack, logType.critical);
        });
        return true;
    } else if (command == "nick") {
        if (settings.guilds[message.guild.id].nickModeration) {
            let nickResult = getNickStatus(message.member, "", message.guild);
            if (nickResult instanceof moment) {
                message.reply(`There is a one day cooldown between uses of this command; you have ${moment.utc().to(nickResult, true)} remaining.`);
            } else if (nickResult == "length") {
                message.reply(_[locale]("Nicknames need to be less than 32 characters."));
            } else {
                /*
                message.channel.send("Ok, requesting a nickname reset. React with '🚫' within 5 seconds to cancel.").then(m => {
                    var rename = true;
                    m.react('🚫').then(() => {
                        const filter = (reaction, user) => reaction.emoji.name === '🚫' && user.id === message.member.id;
                        const collector = m.createReactionCollector(filter, {time: 5000});
                        collector.on('collect', (_ => {
                            rename = false;
                            m.edit("Ok, I've cancelled that.");
                            m.clearReactions();
                        }));
                        collector.on('end', (_ => {
                            if(rename) {
                                m.edit("Ok, a nickname reset has been requested.");
                                requestNickname(message.member, text.substr(8), message.guild);
                            }
                            m.clearReactions();
                        }));
                    }).catch(err => log(err, logType.critical));
                }).catch(err => log(err, logType.critical));*/

                awaitUserConfirmation({
                    title: "Request to reset nickname", 
                    msg: "Ready to reset your nickname?", 
                    msgOnSuccess: "A request has been sent to reset your nickname.", 
                    msgOnFail: "Alright, scratch that.", 
                    channel: message.channel,
                    author: message.author
                }).then(function() {
                    requestNickname(message.member, text.substr(8), message.guild);
                }).catch(function() {
                    //Don't do anything
                });
            }
        } else {
            message.reply(_[locale]("Nickname changes are not accepted on this server via AstralMod."));
        }

        return true;
    } else if (command.startsWith("nick ")) {
        if (settings.guilds[message.guild.id].nickModeration) {
            let nickResult = getNickStatus(message.member, text.substr(8), message.guild);
            if (nickResult instanceof moment) {
                message.reply(`There is a one day cooldown between uses of this command; you have ${moment.utc().to(nickResult, true)} remaining.`);
            } else if (nickResult == "length") {
                message.reply(_[locale]("Nicknames need to be less than 32 characters."));
            } else if (nickResult == "configuration") {
                message.reply(_[locale]("This server is not configured properly for nickname moderation. Get a server administrator to run `" + prefix + "config` and set a Bot Warnings channel."));
            } else {
                /*message.channel.send(`Ok, requesting a nickname change to "${text.substr(8)}". React with '🚫' within 5 seconds to cancel.`).then(m => {
                    var rename = true;
                    m.react('🚫').then(() => {
                        const filter = (reaction, user) => reaction.emoji.name === '🚫' && user.id === message.member.id;
                        const collector = m.createReactionCollector(filter, {time: 5000});
                        collector.on('collect', (_ => {
                            rename = false;
                            m.edit("Ok, I've cancelled that.");
                            m.clearReactions();
                        }));
                        collector.on('end', (_ => {
                            if(rename) {
                                m.edit("Ok, we've requested your nickname be changed to " + text.substr(8) + ".");
                                requestNickname(message.member, text.substr(8), message.guild);
                            }
                            m.clearReactions();
                        }));
                    }).catch(err => log(err, logType.critical));
                }).catch(err => log(err, logType.critical));*/

                awaitUserConfirmation({
                    title: "Request to change nickname", 
                    msg: "Ready to change your nickname?", 
                    msgOnSuccess: "A request has been sent to reset your nickname.", 
                    msgOnFail: "Alright, scratch that.", 
                    channel: message.channel,
                    author: message.author,
                    extraFields: [
                        ["Nickname", text.substr(8)]
                    ]
                }).then(function() {
                    requestNickname(message.member, text.substr(8), message.guild);
                }).catch(function() {
                    //Don't do anything
                });
            }
        } else {
            message.reply(_[locale]("Nickname changes are not accepted on this server via AstralMod."));
        }
        return true;
    } else if (command == "version") {
        message.channel.send("**AstralMod " + amVersion + "**\nDiscord Bot\n\nLicensed under the GNU General Public License, version 3 or later.");
        return true;
    } else if (command == "about") {
        let embed = new Discord.RichEmbed();
        embed.setColor("#00C000");
        embed.setAuthor(_[locale]("AstralMod " + amVersion), client.user.avatarURL);
        embed.setDescription(_[locale]("Discord Bot"));
        embed.addField("File Bug", "File a bug at the [GitHub Repository](https://github.com/vicr123/AstralMod/issues) for AstralMod.");
        embed.addField("Sources", "Source code for AstralMod is available at the [GitHub Repository](https://github.com/vicr123/AstralMod).");
        embed.addField("Contributors", "AstralMod is possible due to the work of these wonderful people:\n- Blake#0007\n- reflectronic#5190");
        embed.setFooter(_[locale]("AstralMod " + amVersion + ". Thanks for using AstralMod!"));
        message.channel.send(embed);
        return true;
    } else if (command.startsWith("setlocale ")) {
        let locale = command.substr(10);
        if (availableTranslations.includes(locale)) {
            settings.users[message.author.id].locale = locale;

            let embed = new Discord.RichEmbed();
            embed.setColor("#003CFF");
            embed.setAuthor(_[locale]("SETLOC_TITLE"));
            embed.setDescription(_[locale]("SETLOC_LANGUAGE"));
            embed.setFooter(_[locale]("SETLOC_DISCLAIMER"));
            message.channel.send(embed);
        } else {
            locale = settings.users[message.author.id].locale;
            if (locale == null) locale = "en";
            message.channel.send(_[locale]("SETLOC_UNAVAILABLE"));
        }
        return true;
    } else if (command == "help") { //General help
        var embed = new Discord.RichEmbed();
        embed.setColor("#3C3C96");
        embed.setAuthor("AstralMod Help Contents");
        embed.setDescription("Here are some things you can try. For more information, just `" + prefix + "help [command]`");

        embed.addField("AstralMod Core Commands", "**config**\n**shoo**\n**oknick**\nping\nnick\nfetchuser\nversion\nabout\nhelp", true);

        for (key in plugins) {
            var plugin = plugins[key];
            if (plugin.availableCommands != null) {
                var commandsList = "";

                if (plugin.availableCommands.general != null) {
                    if (plugin.availableCommands.general.modCommands != null) {
                        for (command of plugin.availableCommands.general.modCommands) {
                            commandsList += "**" + command + "**\n";
                        }
                    }

                    if (plugin.availableCommands.general.commands != null) {
                        for (command of plugin.availableCommands.general.commands) {
                            commandsList += command + "\n";
                        }
                    }
                }

                if (plugin.availableCommands[message.guild.id] != null) {
                    if (plugin.availableCommands[message.guild.id].modCommands != null) {
                        for (command of plugin.availableCommands[message.guild.id].modCommands) {
                            commandsList += "**" + command + "**\n";
                        }
                    }

                    if (plugin.availableCommands[message.guild.id].commands != null) {
                        for (command of plugin.availableCommands[message.guild.id].commands) {
                            commandsList += command + "\n";
                        }
                    }
                }

                if (commandsList != "") {
                    embed.addField(plugin.name, commandsList, true);
                }
            }
        }

        embed.setFooter("AstralMod " + amVersion + ". Moderator commands denoted with bold text.");
        message.channel.send("", { embed: embed });
        return true;
    } else if (command.startsWith("fetchuser ")) {
        var user = command.substr(10);
        client.fetchUser(user).then(function(dUser) {
            message.channel.send(_[locale]("User " + dUser.tag + " fetched and cached."));
        }).catch(function() {
            message.channel.send(_[locale]("Couldn't fetch user."));
        });
        return true;
    } else if (command.startsWith("help ")) { //Contextual help
        //Get help for specific command
        var embed = new Discord.RichEmbed();
        embed.setAuthor("AstralMod Help Contents");

        var helpCmd = command.substr(5);

        var help = {};
        switch (helpCmd) {
            case "config":
                help.title = prefix + "config";
                help.helpText = "Configures AstralMod for this server";
                break;
            case "shoo":
                help.title = prefix + "shoo";
                help.helpText = "Leave the server, purging all configuration";
                break;
            case "oknick":
                help.title = prefix + "oknick";
                help.helpText = "Accepts a nickname";
                break;
            case "ping":
                help.title = prefix + "ping";
                help.helpText = "Asks AstralMod to reply with a message";
                break;
            case "version":
                help.title = prefix + "version";
                help.helpText = "Queries the current AstralMod version";
                break;
            case "nick":
                help.title = prefix + "nick";
                help.usageText = prefix + "nick nickname";
                help.helpText = "Sets your nickname after staff have a chance to review it";
                help.param1 = "The nickname you wish to be known as";
                break;
            case "fetchuser":
                help.title = prefix + "fetchuser";
                help.usageText = prefix + "fetchuser [ID]";
                help.helpText = "Tells AstralMod about the existance of a user";
                help.param1 = "The user ID you want to tell AstralMod about.";
                help.remarks = "AstralMod will search for users from all of Discord."
                break;
            case "setlocale":
                help.title = prefix + "setlocale";
                help.usageText = prefix + "setlocale [locale]";
                help.helpText = "Sets the language AstralMod will use when processing your commands";
                break;
            case "help":
                help.title = prefix + "help";
                help.usageText = prefix + "help [command]";
                help.helpText = "Acquire information about how to use AstralMod and any available commands";
                help.param1 = "*Optional Parameter*\n" +
                                "The command to acquire information about.\n" +
                                "If this parameter is not present, we'll list the available commands.";
                break;
            case "about":
                help.title = prefix + "about";
                help.usageText = prefix + "about";
                help.helpText = "Acquire information about AstralMod";
                break;
            default:
                //Look thorough plugins for help
                for (key in plugins) {
                    var plugin = plugins[key];
                    if (plugin.acquireHelp != null) {
                        if (plugin.availableCommands != null) {
                            if (plugin.availableCommands.general != null) {
                                if (plugin.availableCommands.general.hiddenCommands != null) {
                                    if (plugin.availableCommands.general.hiddenCommands.indexOf(helpCmd) != -1) {
                                        help = plugin.acquireHelp(helpCmd);
                                        break;
                                    }
                                }

                                if (plugin.availableCommands.general.modCommands != null) {
                                    if (plugin.availableCommands.general.modCommands.indexOf(helpCmd) != -1) {
                                        help = plugin.acquireHelp(helpCmd);
                                        break;
                                    }
                                }

                                if (plugin.availableCommands.general.commands != null) {
                                    if (plugin.availableCommands.general.commands.indexOf(helpCmd) != -1) {
                                        help = plugin.acquireHelp(helpCmd);
                                        break;
                                    }
                                }
                            }

                            if (plugin.availableCommands[message.guild.id] != null) {
                                if (plugin.availableCommands[message.guild.id].modCommands != null) {
                                    if (plugin.availableCommands[message.guild.id].modCommands.indexOf(helpCmd) != -1) {
                                        help = plugin.acquireHelp(helpCmd);
                                        break;
                                    }
                                }

                                if (plugin.availableCommands[message.guild.id].commands != null) {
                                    if (plugin.availableCommands[message.guild.id].commands.indexOf(helpCmd) != -1) {
                                        help = plugin.acquireHelp(helpCmd);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
        }

        if (help.helpText == null) {
            embed.setColor("#FF0000");
            embed.setDescription("Couldn't obtain help for that command.");
        } else {
            embed.setColor("#3C3C96");
            if (help.title == null) {
                embed.setDescription("Command Help");
            } else {
                embed.setDescription("for " + help.title)
            }

            if (help.usageText != null) {
                embed.addField("Usage", help.usageText);
            }

            embed.addField("Description", help.helpText);


            if (help.options != null) {
                var options = "```";
                for (value of help.options) {
                    options += value + "\n";
                }
                options += "```";
                embed.addField("Options", options);
            }

            if (help.availableOptions != null) {
                embed.addField("Available Options", help.availableOptions);
            }

            if (help.param1 != null) {
                embed.addField("Parameter 1", help.param1);
            }

            if (help.param2 != null) {
                embed.addField("Parameter 2", help.param2);
            }

            if (help.param3 != null) {
                embed.addField("Parameter 3", help.param3);
            }

            if (help.remarks != null) {
                embed.addField("Remarks", help.remarks);
            }
        }
        embed.setFooter("AstralMod " + amVersion);
        message.channel.send("", { embed: embed });
        return true;
    } else if (command.startsWith("throw ")) {
        var msg = command.substr(6);
        throw new Error(msg);
        return true;
    } else if (command == "shoo") {
        if (message.author.id == global.ownerId.id | message.member.hasPermission(Discord.Permissions.FLAGS.KICK_MEMBERS, false, true, true)) {
            awaitUserConfirmation({
                title: "Kicking AstralMod :(",
                msg: "AstralMod is about to leave :(",
                msgOnSuccess: ":arrow_left: And with that, POW! I'm gone!",
                msgOnFail: "Alright, scratch that.",
                channel: message.channel,
                author: message.author,
                time: 10
            }).then(() => {
                message.guild.leave().catch(function() {
                    message.reply("I've been a bad bot; I can't actually seem to get myself out of here. Please kick me.");
                });
                saveSettings();
            }).catch(err => {
                //Do nothing
            });

        } else {
            message.reply(":arrow_left: Only the owner of this server (" + message.guild.owner.displayName + ") and people who have kicking powers can use this command.");
        }
        return true;
    }

    return false;
}

function processConfigure(message, guild) {
    var text = message.content.toLowerCase();

    var guildSetting = settings.guilds[guild.id];

    if (false /*guildSetting.requiresConfig*/) {
        switch (guildSetting.configuringStage) {
            case 0: { //Mod roles
                var roles = text.split(" ");
                var isValid = true;

                for (role of roles) {
                    if (guild.roles.has(role)) {
                        message.author.send(role + " = " + guild.roles.get(role).name);
                    } else {
                        message.author.send(role + " = ???");
                        isValid = false;
                    }
                }

                if (!isValid) {
                    message.author.send("Let's try this again. Enter the roles of mods on this server, seperated by a space.");
                    return;
                } else {
                    guildSetting.tentativeModRoles = roles;

                    message.author.send("Is this correct?");
                    guildSetting.configuringStage = 1;
                }

                break;
            }
            case 1: { //Mod roles - confirm
                if (text == "yes" || text == "y") {
                    guildSetting.modRoles = guildSetting.tentativeModRoles;
                    guildSetting.tentativeModRoles = null;

                    message.author.send("Thanks. Next, I'll need the ID of the channel where I can post member alerts. Alternatively, enter \"none\" if you want to disable member alerts. If you don't know how to get the ID, enable developer mode in user settings > Appearance, right click the channel on your server, then click \"Copy ID\".");
                    guildSetting.configuringStage = 2;
                } else if (text == "no" || text == "n") {
                    guildSetting.tentativeModRoles = null;
                    message.author.send("Let's try this again. Enter the roles of mods on this server, seperated by a space.");
                    guildSetting.configuringStage = 0;
                } else {
                    message.author.send("I didn't quite understand what you said. Try \"yes\" or \"no\".");
                }
                break;
            }
            case 2: { //Member Alerts Channel
                if (text == "none") {
                    message.author.send("You're disabling member alerts. Is that correct?");
                    guildSetting.tentativeMemberAlerts = null;
                    guildSetting.configuringStage = 3;
                } else {
                    if (!guild.channels.has(text)) {
                        message.author.send("That channel doesn't exist. Try again.");
                    } else {
                        var channel = guild.channels.get(text);
                        if (channel.type != "text") {
                            message.author.send("That's not a text channel. Try again.");
                        } else {
                            message.author.send("You're setting #" + channel.name + " as the member alerts channel. Is that correct?");
                            guildSetting.tentativeMemberAlerts = channel.id;
                            guildSetting.configuringStage = 3;
                        }
                    }
                }
                break;
            }
            case 3: { //Member Alerts Channel - Confirm
                if (text == "yes" || text == "y") {
                    guildSetting.memberAlerts = guildSetting.tentativeMemberAlerts;
                    guildSetting.tentativeMemberAlerts = null;

                    message.author.send("Thanks. Next, I'll need the ID of the channel where I can post chat logs.");
                    guildSetting.configuringStage = 4;
                } else if (text == "no" || text == "n") {
                    guildSetting.tentativeMemberAlerts = null;
                    message.author.send("Let's try this again. What's the ID of the channel where I can post member alerts?");
                    guildSetting.configuringStage = 2;
                } else {
                    message.author.send("I didn't quite understand what you said. Try \"yes\" or \"no\".");
                }
                break;
            }
            case 4: { //Chat Logs Channel
                if (text == "none") {
                    message.author.send("You're disabling chat logs. Is that correct?");
                    guildSetting.tentativeChatLogs = null;
                    guildSetting.configuringStage = 5;
                } else {
                    if (!guild.channels.has(text)) {
                        message.author.send("That channel doesn't exist. Try again.");
                    } else {
                        var channel = guild.channels.get(text);
                        if (channel.type != "text") {
                            message.author.send("That's not a text channel. Try again.");
                        } else {
                            message.author.send("You're setting #" + channel.name + " as the Chat logs channel. Is that correct?");
                            guildSetting.tentativeChatLogs = channel.id;
                            guildSetting.configuringStage = 5;
                        }
                    }
                }
                break;
            }
            case 5: { //Chat Logs Channel - Confirm
                if (text == "yes" || text == "y") {
                    guildSetting.chatLogs = guildSetting.tentativeChatLogs;
                    guildSetting.tentativeChatLogs = null;

                    message.author.send("Thanks. Next, I'll need the ID of the channel where I can post general warnings.");
                    guildSetting.configuringStage = 6;
                } else if (text == "no" || text == "n") {
                    guildSetting.tentativeChatLogs = null;
                    message.author.send("Let's try this again. What's the ID of the channel where I can post chat logs?");
                    guildSetting.configuringStage = 4;
                } else {
                    message.author.send("I didn't quite understand what you said. Try \"yes\" or \"no\".");
                }
                break;
            }
            case 6: { //Botwarnings Channel
                if (text == "none") {
                    message.author.send("You're disabling general warnings. Is that correct?");
                    guildSetting.tentativeBotWarnings = null;
                    guildSetting.configuringStage = 7;
                } else {
                    if (!guild.channels.has(text)) {
                        message.author.send("That channel doesn't exist. Try again.");
                    } else {
                        var channel = guild.channels.get(text);
                        if (channel.type != "text") {
                            message.author.send("That's not a text channel. Try again.");
                        } else {
                            message.author.send("You're setting #" + channel.name + " as the general warnings channel. Is that correct?");
                            guildSetting.tentativeBotWarnings = channel.id;
                            guildSetting.configuringStage = 7;
                        }
                    }
                }
                break;
            }
            case 7: { //Botwarnings Channel - Confirm
                if (text == "yes" || text == "y") {
                    guildSetting.botWarnings = guildSetting.tentativeBotWarnings;
                    guildSetting.tentativeBotWarnings = null;

                    message.author.send("Thanks. Do you want to enable suggestions?");
                    guildSetting.configuringStage = 8;
                } else if (text == "no" || text == "n") {
                    guildSetting.tentativeBotWarnings = null;
                    message.author.send("Let's try this again. What's the ID of the channel where I can post general warnings?");
                    guildSetting.configuringStage = 6;
                } else {
                    message.author.send("I didn't quite understand what you said. Try \"yes\" or \"no\".");
                }
                break;
            }
            case 8: { //Suggestions - Ask
                if (text == "yes" || text == "y") {
                    message.author.send("Ok, what's the ID of the channel?");
                    guildSetting.configuringStage = 9;
                } else if (text == "no" || text == "n") {
                    guildSetting.suggestions = null;
                    message.author.send("Thanks. AstralMod is now ready for use! Enjoy using AstralMod!");
                    guildSetting.requiresConfig = false;
                    guildSetting.configuringUser = null;
                } else {
                    message.author.send("I didn't quite understand what you said. Try \"yes\" or \"no\".");
                }
                break;
            }
            case 9: { //Suggestions Channel
                if (!guild.channels.has(text)) {
                    message.author.send("That channel doesn't exist. Try again.");
                } else {
                    var channel = guild.channels.get(text);
                    if (channel.type != "text") {
                        message.author.send("That's not a text channel. Try again.");
                    } else {
                        message.author.send("You're setting #" + channel.name + " as the suggestions channel. Is that correct?");
                        guildSetting.tentativeSuggestions = channel.id;
                        guildSetting.configuringStage = 10;
                    }
                }
                break;
            }
            case 10: { //Suggestions Channel - Confirm
                if (text == "yes" || text == "y") {
                    guildSetting.suggestions = guildSetting.tentativeSuggestions;
                    guildSetting.tentativeSuggestions = null;

                    message.author.send("Thanks. AstralMod is now ready for use! Enjoy using AstralMod!");
                    guildSetting.requiresConfig = false;
                    guildSetting.configuringUser = null;
                } else if (text == "no" || text == "n") {
                    guildSetting.tentativeSuggestions = null;
                    message.author.send("Let's try this again. What's the ID of the channel where I can post suggestions?");
                    guildSetting.configuringStage = 9;
                } else {
                    message.author.send("I didn't quite understand what you said. Try \"yes\" or \"no\".");
                }
                break;
            }
        }
    }

    settings.guilds[guild.id] = guildSetting;
}

function getSingleConfigureWelcomeText(guild) {
    var guildSetting = settings.guilds[guild.id];
    var string = "What would you like to configure? Type the number next to the option you want to set:```";

    if (guildSetting.modRoles == null) {
        string += "1 Staff Roles        Using Discord Permissions\n";
    } else {
        string += "1 Staff Roles        " + guildSetting.modRoles.length + " roles\n";
    }

    if (guild.channels.get(guildSetting.memberAlerts) == null) {
        string += "2 Member Alerts      Disabled\n";
    } else {
        string += "2 Member Alerts      #" + guild.channels.get(guildSetting.memberAlerts).name + "\n";
    }

    if (guild.channels.get(guildSetting.chatLogs) == null) {
        string += "3 Chat Logs          Disabled\n";
    } else {
        string += "3 Chat Logs          #" + guild.channels.get(guildSetting.chatLogs).name + "\n";
    }

    if (guild.channels.get(guildSetting.botWarnings) == null) {
        string += "4 Bot Warnings       Disabled\n";
    } else {
        string += "4 Bot Warnings       #" + guild.channels.get(guildSetting.botWarnings).name + "\n";
    }

    if (guild.channels.get(guildSetting.suggestions) == null) {
        string += "5 Suggestions        Disabled\n";
    } else {
        string += "5 Suggestions        #" + guild.channels.get(guildSetting.suggestions).name + "\n";
    }

    if (guildSetting.nickModeration == null || guildSetting.nickModeration == false) {
        string += "a Nick Moderation    Disabled\n";
    } else {
        string += "a Nick Moderation    Enabled\n";
    }


    if (guildSetting.echoOffensive == null || guildSetting.echoOffensive == false) {
        string += "b Offensive Words    Disabled\n";
    } else {
        string += "b Offensive Words    Enabled\n";
    }

    string += "\n";
    string += "0 Exit Configuration Menu\n";
    string += "< Reset AstralMod```"

    return string;
}

function processSingleConfigure(message, guild) {
    var text = message.content.toLowerCase();
    var guildSetting = settings.guilds[guild.id];

    switch (guildSetting.configuringStage) {
        case -10: { //Reset AstralMod
            if (message.content == "Reset AstralMod") { //Purge all configuration for this server
                log("Purging all configuration for " + guild.id);
                guildSetting = {
                    requiresConfig: false
                };
                log("Configuration for " + guild.id + " purged.", logType.good);
                message.author.send("AstralMod configuration for this server has been reset. To set up AstralMod, just `" + prefix + "config` in the server.");
            } else { //Cancel
                message.author.send("Returning to Main Menu.");
                message.author.send(getSingleConfigureWelcomeText(guild));
                guildSetting.configuringStage = 0;
            }
            break;
        }
        case 0: { //Main Menu
            switch (text) {
                case "1": //Staff Roles
                    settings.guilds[guild.id].configuringUser = message.author.id;
                    settings.guilds[guild.id].configuringStage = 0;
                    message.author.send("Enter the roles of mods on this server, seperated by a space. To cancel, just type `cancel`, and to clear, type `clear`.");

                    var roles = "```";
                    for (let [id, role] of guild.roles) {
                        roles += role.id + " = " + role.name + "\n";
                    }
                    roles += "```";
                    message.author.send(roles);

                    guildSetting.configuringStage = 10;
                    break;
                case "2": //Member Alerts
                    message.author.send("What's the ID of the channel where I can post member alerts? Alternatively, enter \"none\" if you want to disable member alerts, and type \"cancel\" to cancel.");
                    guildSetting.configuringStage = 20;
                    break;
                case "3": //Chat Logs
                    message.author.send("What's the ID of the channel where I can post chat logs? Alternatively, enter \"none\" if you want to disable chat logs, and type \"cancel\" to cancel.");
                    guildSetting.configuringStage = 30;
                    break;
                case "4": //Bot warnings
                    message.author.send("What's the ID of the channel where I can post general warnings? Alternatively, enter \"none\" if you want to disable general warnings, and type \"cancel\" to cancel.");
                    guildSetting.configuringStage = 40;
                    break;
                case "5": //Suggestions
                    message.author.send("What's the ID of the channel where I can post suggestions? Alternatively, enter \"none\" if you want to disable suggestions, and type \"cancel\" to cancel.");
                    guildSetting.configuringStage = 50;
                    break;
                case "0": //Exit
                    message.author.send("Configuration complete.");
                    guildSetting.configuringUser = null;
                    break;
                case "a": //Nick Moderation
                    if (guildSetting.nickModeration) {
                        guildSetting.nickModeration = false;
                    } else {
                        guildSetting.nickModeration = true;
                    }

                    message.author.send("Ok, I've toggled nickname moderation.");
                    message.author.send(getSingleConfigureWelcomeText(guild));
                    break;
                case "b": //Nick Moderation
                    if (guildSetting.echoOffensive) {
                        guildSetting.echoOffensive = false;
                    } else {
                        guildSetting.echoOffensive = true;
                    }

                    message.author.send("Ok, I've toggled offensive words.");
                    message.author.send(getSingleConfigureWelcomeText(guild));
                    break;
                case "<": //Reset AstralMod
                    message.author.send("**Reset AstralMod**\n" +
                                        "Resetting AstralMod for this server. This will clear all settings **and warnings** for this server and you'll need to set up AstralMod again to use it.\n" +
                                        "To reset AstralMod, respond with `Reset AstralMod`.");
                    guildSetting.configuringStage = -10;
                    break;
                default:
                    //message.author.send("That's not an option.");
                    message.author.send(getSingleConfigureWelcomeText(guild));
            }
            break;
        }
        case 10: { //Staff Roles
            if (text == "cancel") {
                message.author.send(getSingleConfigureWelcomeText(guild));
                guildSetting.configuringStage = 0;
            } else if (text == "clear") {
                guildSetting.modRoles = null;
                guildSetting.configuringStage = 0;
            } else {
                var roles = text.split(" ");
                var isValid = true;

                for (role of roles) {
                    if (guild.roles.has(role)) {
                        message.author.send(role + " = " + guild.roles.get(role).name);
                    } else {
                        message.author.send(role + " = ???");
                        isValid = false;
                    }
                }

                if (!isValid) {
                    message.author.send("Let's try this again. Enter the roles of mods on this server, seperated by a space.");
                    return;
                } else {
                    guildSetting.tentativeModRoles = roles;

                    message.author.send("Is this correct?");
                    guildSetting.configuringStage = 11;
                }
            }
            break;
        }
        case 11: { //Staff Roles Confirm
            if (text == "yes" || text == "y") {
                guildSetting.modRoles = guildSetting.tentativeModRoles;
                guildSetting.tentativeModRoles = null;

                message.author.send("Thanks, I'll save that.");
                message.author.send(getSingleConfigureWelcomeText(guild));
                guildSetting.configuringStage = 0;
            } else if (text == "no" || text == "n") {
                guildSetting.tentativeModRoles = null;
                message.author.send("Let's try this again. Enter the roles of mods on this server, seperated by a space.");
                guildSetting.configuringStage = 10;
            } else {
                message.author.send("I didn't quite understand what you said. Try \"yes\" or \"no\".");
            }
            break;
        }

        case 20: { //Member Alerts Channel
            if (text == "cancel") {
                message.author.send(getSingleConfigureWelcomeText(guild));
                guildSetting.configuringStage = 0;
            } else if (text == "none") {
                message.author.send("You're disabling member alerts. Is that correct?");
                guildSetting.tentativeMemberAlerts = null;
                guildSetting.configuringStage = 21;
            } else {
                if (!guild.channels.has(text)) {
                    message.author.send("That channel doesn't exist. Try again.");
                } else {
                    var channel = guild.channels.get(text);
                    if (channel.type != "text") {
                        message.author.send("That's not a text channel. Try again.");
                    } else {
                        message.author.send("You're setting #" + channel.name + " as the member alerts channel. Is that correct?");
                        guildSetting.tentativeMemberAlerts = channel.id;
                        guildSetting.configuringStage = 21;
                    }
                }
            }
            break;
        }
        case 21: { //Member Alerts Channel - Confirm
            if (text == "yes" || text == "y") {
                guildSetting.memberAlerts = guildSetting.tentativeMemberAlerts;
                guildSetting.tentativeMemberAlerts = null;

                message.author.send("Thanks, I'll save that.");
                message.author.send(getSingleConfigureWelcomeText(guild));
                guildSetting.configuringStage = 0;
            } else if (text == "no" || text == "n") {
                guildSetting.tentativeMemberAlerts = null;
                message.author.send("Let's try this again. What's the ID of the channel where I can post member alerts?");
                guildSetting.configuringStage = 20;
            } else {
                message.author.send("I didn't quite understand what you said. Try \"yes\" or \"no\".");
            }
            break;
        }

        case 30: { //Chat Logs Channel
            if (text == "cancel") {
                message.author.send(getSingleConfigureWelcomeText(guild));
                guildSetting.configuringStage = 0;
            } else if (text == "none") {
                message.author.send("You're disabling chat logs. Is that correct?");
                guildSetting.tentativeChatLogs = null;
                guildSetting.configuringStage = 31;
            } else {
                if (!guild.channels.has(text)) {
                    message.author.send("That channel doesn't exist. Try again.");
                } else {
                    var channel = guild.channels.get(text);
                    if (channel.type != "text") {
                        message.author.send("That's not a text channel. Try again.");
                    } else {
                        message.author.send("You're setting #" + channel.name + " as the Chat logs channel. Is that correct?");
                        guildSetting.tentativeChatLogs = channel.id;
                        guildSetting.configuringStage = 31;
                    }
                }
            }
            break;
        }
        case 31: { //Chat Logs Channel - Confirm
            if (text == "cancel") {
                message.author.send(getSingleConfigureWelcomeText(guild));
                guildSetting.configuringStage = 0;
            } else if (text == "yes" || text == "y") {
                guildSetting.chatLogs = guildSetting.tentativeChatLogs;
                guildSetting.tentativeChatLogs = null;

                message.author.send("Thanks, I'll save that.");
                message.author.send(getSingleConfigureWelcomeText(guild));
                guildSetting.configuringStage = 0;
            } else if (text == "no" || text == "n") {
                guildSetting.tentativeChatLogs = null;
                message.author.send("Let's try this again. What's the ID of the channel where I can post chat logs?");
                guildSetting.configuringStage = 30;
            } else {
                message.author.send("I didn't quite understand what you said. Try \"yes\" or \"no\".");
            }
            break;
        }
        case 40: { //Botwarnings Channel
            if (text == "none") {
                message.author.send("You're disabling general warnings. Is that correct?");
                guildSetting.tentativeBotWarnings = null;
                guildSetting.configuringStage = 41;
            } else {
                if (!guild.channels.has(text)) {
                    message.author.send("That channel doesn't exist. Try again.");
                } else {
                    var channel = guild.channels.get(text);
                    if (channel.type != "text") {
                        message.author.send("That's not a text channel. Try again.");
                    } else {
                        message.author.send("You're setting #" + channel.name + " as the general warnings channel. Is that correct?");
                        guildSetting.tentativeBotWarnings = channel.id;
                        guildSetting.configuringStage = 41;
                    }
                }
            }
            break;
        }
        case 41: { //Botwarnings Channel - Confirm
            if (text == "yes" || text == "y") {
                guildSetting.botWarnings = guildSetting.tentativeBotWarnings;
                guildSetting.tentativeBotWarnings = null;

                message.author.send("Thanks, I'll save that.");
                message.author.send(getSingleConfigureWelcomeText(guild));
                guildSetting.configuringStage = 0;
            } else if (text == "no" || text == "n") {
                guildSetting.tentativeBotWarnings = null;
                message.author.send("Let's try this again. What's the ID of the channel where I can post general warnings?");
                guildSetting.configuringStage = 40;
            } else {
                message.author.send("I didn't quite understand what you said. Try \"yes\" or \"no\".");
            }
            break;
        }

        case 50: { //Suggestions Channel
            if (text == "none") {
                message.author.send("You're disabling suggestions. Is that correct?");
                guildSetting.tentativeBotWarnings = null;
                guildSetting.configuringStage = 51;
            } else {
                if (!guild.channels.has(text)) {
                    message.author.send("That channel doesn't exist. Try again.");
                } else {
                    var channel = guild.channels.get(text);
                    if (channel.type != "text") {
                        message.author.send("That's not a text channel. Try again.");
                    } else {
                        message.author.send("You're setting #" + channel.name + " as the suggestions channel. Is that correct?");
                        guildSetting.tentativeSuggestions = channel.id;
                        guildSetting.configuringStage = 51;
                    }
                }
            }
            break;
        }
        case 51: { //Suggestions Channel - Confirm
            if (text == "yes" || text == "y") {
                guildSetting.suggestions = guildSetting.tentativeSuggestions;
                guildSetting.tentativeSuggestions = null;

                message.author.send("Thanks, I'll save that.");
                message.author.send(getSingleConfigureWelcomeText(guild));
                guildSetting.configuringStage = 0;
            } else if (text == "no" || text == "n") {
                guildSetting.tentativeSuggestions = null;
                message.author.send("Let's try this again. What's the ID of the channel where I can post suggestions?");
                guildSetting.configuringStage = 50;
            } else {
                message.author.send("I didn't quite understand what you said. Try \"yes\" or \"no\".");
            }
            break;
        }
    }

    settings.guilds[guild.id] = guildSetting;
}

async function processMessage(message) {
    try {
        //Ignore self
        if (message.author.id == client.user.id) return;

        //Ignore bots
        if (message.author.bot) return;

        let options = {};

        //Get language
        if (settings.users[message.author.id] == null) {
            settings.users[message.author.id] = {};
        }

        /*if (settings.users[message.author.id].locale == null) {
            settings.users[message.author.id].locale = locale;
        }*/
        //translator.setLocale(settings.users[message.author.id].locale);

        var text = message.content;

        //Determine if this is in a guild
        if (message.guild != null) {
            await message.guild.fetchMember(message.author);

            if (settings.guilds[message.guild.id].blocked == null) {
                settings.guilds[message.guild.id].blocked = [];
            }

            if (settings.guilds[message.guild.id].blocked[message.channel.id] == null) {
                settings.guilds[message.guild.id].blocked[message.channel.id] = [];
            }
            if (settings.guilds[message.guild.id].blocked.guild == null) {
                settings.guilds[message.guild.id].blocked.guild = [];
            }

            if (capture[message.guild.id] != null && capture[message.guild.id].author == message.author.id) {
                capture[message.guild.id].function(message);
            } else if (text.toLowerCase().startsWith(prefix)) {
                //Check if the command has been blocked
                for (let key in settings.guilds[message.guild.id].blocked[message.channel.id]) {
                    let c = settings.guilds[message.guild.id].blocked[message.channel.id][key];
                    let triedCommand = text.toLowerCase().substr(prefix.length);
                    if (triedCommand.startsWith(c) || triedCommand == c || 
                        (c == "all" && !triedCommand.startsWith("block") && !triedCommand.startsWith("unblock"))) {
                        //Block this command and treat it like a normal message
                        commandEmitter.emit('newMessage', message);
                        return;
                    }
                }

                for (let key in settings.guilds[message.guild.id].blocked.guild) {
                    let c = settings.guilds[message.guild.id].blocked.guild[key];
                    let triedCommand = text.toLowerCase().substr(prefix.length);
                    if (triedCommand.startsWith(c) || triedCommand == c || 
                        (c == "all" && !triedCommand.startsWith("block") && !triedCommand.startsWith("unblock"))) {
                        //Block this command and treat it like a normal message
                        commandEmitter.emit('newMessage', message);
                        return;
                    }
                }

                //Determine if this is a command
                if (isMod(message.member) || text == prefix + "config") { //This is a mod command
                    if (!processModCommand(message)) {
                        if (!processAmCommand(message)) {
                            //Pass command onto plugins
                            commandEmitter.emit('processCommand', message, true, text.substr(prefix.length).toLowerCase(), options);
                        }
                    }
                } else {
                    if (!processAmCommand(message)) {
                        //Pass command onto plugins
                        commandEmitter.emit('processCommand', message, false, text.substr(prefix.length).toLowerCase(), options);
                    }
                }
            } else {
                commandEmitter.emit('newMessage', message);
            }
        } else {
            //Determine if this is within a workflow or if this is unsolicited
            for (key in settings.guilds) {
                var guildSetting = settings.guilds[key];
                if (guildSetting != null) {
                    //First check if user is currently configuring
                    if (guildSetting.configuringUser == message.author.id) {
                        //Check if this is during first time keys
                        if (guildSetting.requiresConfig) {
                            processConfigure(message, client.guilds.get(key));
                        } else {
                            processSingleConfigure(message, client.guilds.get(key));
                        }
                        return;
                    }
                }
            }

            //Pass command onto plugins
            commandEmitter.emit('newDM', message);
        }
    } catch (err) {
        var embed = new Discord.RichEmbed;
        embed.setColor("#FF0000");
        embed.addField("Details", err.message);

        if (err.name == "UserInputError") {
            embed.setTitle(getEmoji("userexception") + " User Input Error");
            embed.setDescription("AstralMod didn't understand what you were trying to say.");
        } else if (err.name == "CommandError") {
            embed.setTitle(getEmoji("userexception") + " Command Error");
            embed.setDescription("AstralMod couldn't complete that command.");
        } else {
            log("Uncaught Exception:", logType.critical);
            log(err.stack, logType.critical);

            embed.setTitle(getEmoji("userexception") + " Internal Error");
            embed.setFooter("This error has been logged, and we'll look into it.");
            embed.setDescription("AstralMod has run into a problem trying to process that command.");
        }

        message.channel.send("", {embed: embed});
        message.channel.stopTyping(true);
    }
}

function newGuild(guild) {
    log("New Guild: " + guild.id, logType.info);

    if (settings.guilds[guild.id] != null) {
        log("Preserving information about guild!" + guild.id, logType.info);
        return;
    }

    settings.guilds[guild.id] = {
        requiresConfig: false
    };


    if (process.argv.indexOf("--nowelcome") == -1) {
        let channel = guild.channels.find("name", "general");
        if (channel == null) {
            channel = guild.channels.find("name", "lounge");
        }

        let message = ":wave: Welcome to AstralMod! To get started, set me up in `" + guild.name + "` by tying `" + prefix + "config`. To see the help index, use `" + prefix + "help`.";
        if (channel == null) {
            guild.owner.send(message);
        } else {
            channel.send(message);
        }
    }

    postDBL();
}

function removeGuild(guild) {
    if (doNotDeleteGuilds.indexOf(guild.id) == -1) {
        //Delete guild from database
        settings.guilds[guild.id] = null;
        delete settings.guilds[guild.id];
        log("Removed Guild: " + guild.id, logType.info);

        postDBL();
    } else {
        log("Attempted to delete unavailable guild: " + guild.id, logType.warning);
    }
}

function saveSettings(showOkMessage = false) {
    log("Saving settings...");
    var contents = JSON.stringify(settings, null, 4);

    //Encrypt the contents
    let iv = Buffer.from(crypto.randomBytes(16));

    var cipher = crypto.createCipheriv(cipherAlg, settingsKey, iv);
    var settingsJson = Buffer.concat([
        cipher.update(Buffer.from(contents, "utf8")),
        cipher.final()
    ]);

    //Write to secondary file first
    fs.writeFile("settings.prewrite.json", settingsJson, "utf8", function(error) {
        if (error) {
            log("Settings couldn't be saved", logType.critical);
            setTimeout(saveSettings, 30000);
        } else {
            fs.writeFile("iv", iv, "utf8", function(error) {
                if (error) {
                    log("IV couldn't be saved. Aborting save of normal settings file.", logType.critical);
                } else {
                    fs.writeFile("settings.json", settingsJson, "utf8", function(error) {
                        if (error) {
                            log("Settings couldn't be saved, but the prewrite settings were saved successfully.", logType.critical);
                        } else {
                            fs.unlinkSync("settings.prewrite.json");

                            if (showOkMessage) {
                                log("Settings saved!", logType.good);
                            } else {
                                log("Settings saved!");
                            }
                        }

                        setTimeout(saveSettings, 30000);
                    });
                }
            })
        }
    });
}

function parseCleanContent(content) {
    let inCode = false;
    for (let i = 0; i < content.length; i++) {
        let char = content[i];
        if (char == "`") {
            if (content[i + 1] == "`" && content[i + 2] == "`") {
                if (inCode) {
                    content = content.substr(0, i) + "]" + content.substr(i + 3, content.length - 2);
                } else {
                    content = content.substr(0, i) + "[" + content.substr(i + 3, content.length - 2);
                }
                inCode = !inCode;
            }
        }
    }
    //content.replace("```", "[");
    return content;
}

function messageDeleted(message) {
    var channel = null;
    if (message.guild != null) {
        if (settings.guilds[message.guild.id].chatLogs != null) {
            if (client.channels.has(settings.guilds[message.guild.id].chatLogs)) {
                channel = client.channels.get(settings.guilds[message.guild.id].chatLogs);
            } else {
                log("Chat Logs channel " + settings.guilds[message.guild.id].chatLogs + " not found", logType.critical);
            }
        }
    }

    if (channel != null && message.channel != channel) {
        var msg = ":wastebasket: **" + getUserString(message.author) + "** <#" + message.channel.id + "> `" + message.createdAt.toUTCString() + "`.";

        if (message.cleanContent.length) {
            msg += "\n```\n" +
                parseCleanContent(message.cleanContent) + "\n" +
                "```";
        }

        if (message.attachments.size > 0) {
            msg += "\nThe following files were attached to this message:";

            for (let [key, attachment] of message.attachments) {
                if (attachment.height == null) {
                    msg += "\n```" + attachment.filename + " @ " + parseInt(attachment.filesize) + " bytes long```";
                } else {
                    msg += "\n" + attachment.proxyURL;
                }
            }
        }

        channel.send(msg);
    }
}

function messageUpdated(oldMessage, newMessage) {
    if (oldMessage.cleanContent == newMessage.cleanContent) return; //Ignore
    var channel = null;
    if (oldMessage.guild != null) {
        if (settings.guilds[oldMessage.guild.id].chatLogs != null) {
            if (client.channels.has(settings.guilds[oldMessage.guild.id].chatLogs)) {
                channel = client.channels.get(settings.guilds[oldMessage.guild.id].chatLogs);
            } else {
                log("Chat Logs channel " + settings.guilds[oldMessage.guild.id].chatLogs + " not found", logType.critical);
            }
        }
    }

    if (channel != null && oldMessage.channel != channel) {
        var msg = ":pencil2: **" + getUserString(oldMessage.author) + "** <#" + oldMessage.channel.id + "> `" + oldMessage.createdAt.toUTCString() + "`.\n";


        if (oldMessage.cleanContent.length) {
            msg += "```\n" +
                oldMessage.cleanContent + "\n" +
                "```";
        } else {
            msg += "```\n[no content]\n```";
        }

        msg += "```\n" +
            newMessage.cleanContent + "\n" +
            "```";

        if (oldMessage.attachments.size > 0) {
            msg += "\nThe following files were attached to this message:";

            for (let [key, attachment] of oldMessage.attachments) {
                if (attachment.height == null) {
                    msg += "\n```" + attachment.filename + " @ " + parseInt(attachment.filesize) + " bytes long```";
                } else {
                    msg += "\n" + attachment.proxyURL;
                }
            }
        }

        channel.send(msg);
    }
}

function memberAdd(member) {
    var channel = null;
    if (member.guild != null) {
        if (settings.guilds[member.guild.id].memberAlerts != null) {
            if (client.channels.has(settings.guilds[member.guild.id].memberAlerts)) {
                channel = client.channels.get(settings.guilds[member.guild.id].memberAlerts);
            } else {
                log("Member Alerts channel " + settings.guilds[member.guild.id].memberAlerts + " not found", logType.critical);
            }
        }
    }

    if (channel != null) {
        let sendWelcome = function(inviteCode) {
            if (inviteCode == "") {
                channel.send(":arrow_right: <@" + member.user.id + ">");
            } else {
                channel.send(":arrow_right: <@" + member.user.id + "> + Invite " + inviteCode);
            }
    
            uinfo(member.user, channel, "en", member.guild, true);
    
            if (member.guild.id == 287937616685301762) {
                var now = new Date();
                var joinDate = member.user.createdAt;
                if (joinDate.getDate() == now.getDate() && joinDate.getMonth() == now.getMonth() && joinDate.getFullYear() == now.getFullYear()) {
                    if (member.guild.id == 287937616685301762) {
                        channel.send(":calendar: <@&326915978392764426> This member was created today.");
                    }
                }
            }
        };

        member.guild.fetchInvites().then(function(invites) {
            let inviteCode = "";
            for ([id, invite] of invites) {
                if (knownInvites[invite.code] < invite.uses) {
                    inviteCode = invite.code;
                    knownInvites[invite.code] = invite.uses;
                }
            }

            sendWelcome(inviteCode);
        }).catch(function() {
          sendWelcome("");
        });
    }
}

function banAdd(guild, user) {
    var channel = null;
    if (guild != null) {
        if (settings.guilds[guild.id].memberAlerts != null) {
            if (client.channels.has(settings.guilds[guild.id].memberAlerts)) {
                channel = client.channels.get(settings.guilds[guild.id].memberAlerts);
            } else {
                log("Member Alerts channel " + settings.guilds[guild.id].memberAlerts + " not found", logType.critical);
            }
        }
    }

    if (channel != null) {
        var embed = new Discord.RichEmbed();

        embed.setColor("#FF0000");
        embed.setTitle(":hammer: User Banned");
        embed.setDescription("A user was banned from this server.");

        embed.addField("User", user.tag, true);
        embed.addField("User ID", user.id, true);
        
        guild.fetchInvites().then(function(invites) {
            var inviteString = "";

            for ([code, invite] of invites) {
                if (invite.inviter != null && invite.inviter.id == user.id) {
                    inviteString += invite.code + "\n";
                }
            }

            if (inviteString != "") {
                embed.addField("Created Invites", inviteString);
            }

            if (banDescriptor[guild.id][user.id] != null) {
                return banDescriptor[guild.id][user.id];
            } else {
                return guild.fetchAuditLogs({
                    limit: 1,
                    type: "MEMBER_BAN_ADD"
                });
            }
        }).then(function(auditLogs) {
            if (auditLogs.author == null) {
                let log = auditLogs.entries.first();
                embed.addField("Banned by", log.executor.tag);

                if (log.reason != null) {
                    embed.addField("Reason", log.reason);
                }
            } else {
                embed.addField("Banned by", auditLogs.author.tag);
                embed.addField("Reason", auditLogs.reason);
            }
            
            channel.send("", {embed: embed});
        }).catch(function() {
            channel.send("", {embed: embed});
        });
    }
}

function memberRemove(member) {
    if (member.guild != null) {
        var channel = null;
        if (member.guild != null) {
            if (settings.guilds[member.guild.id].chatLogs != null) {
                if (client.channels.has(settings.guilds[member.guild.id].memberAlerts)) {
                    channel = client.channels.get(settings.guilds[member.guild.id].memberAlerts);
                } else {
                    log("Member Alerts channel " + settings.guilds[member.guild.id].memberAlerts + " not found", logType.critical);
                }
            }
        }

        if (channel != null) {
            channel.send(":arrow_left: <@" + member.user.id + "> (" + member.displayName + "#" + member.user.discriminator + ")");
        }
    }
}

function userUpdate(oldUser, newUser) {
    if (newUser.username != oldUser.username) {
        for (key in settings.guilds) {
            var bwChannel = settings.guilds[key].botWarnings;
            var guild = client.guilds.get(key);
            if (bwChannel != null) {
                //Check if member exists

                for ([id, member] of guild.members) {
                    if (member.user.id == newUser.id) {
                        var channel = client.channels.get(bwChannel); //282513354118004747
                        if (channel != null) {
                            channel.send(":ab: " + getUserString(oldUser).replace("@", "@​") + " :arrow_right: " + newUser.username.toString().replace("@", "@​"));
                        }
                    }
                }
            }
        }
    }
}

function loadPlugin(file) {
    try {
        if (plugins[file] != null) {
            throw new Error("Plugin is already loaded.");
        }

        var plugin = require('./plugins/' + file);

        if (plugin.name == null) {
            throw new Error("Plugin has no name");
        }

        if (plugin.constructor == null) {
            throw new Error("Plugin has no constructor");
        }

        plugin.constructor(client, commandEmitter, consts);
        plugins[file] = plugin;
        log("Plugin \"" + plugin.name + "\" from file " + file + " has been loaded successfully.", logType.good);
        return true;
    } catch (err) {
        log(err.message, logType.critical);
        log("Plugin " + file + " cannot be loaded.", logType.critical);
        return false;
    }
}

function unloadPlugin(file) {
    try {
        if (plugins[file] == null) {
            throw new Error("Plugin not loaded");
        }

        if (plugins[file].destructor != null) {
            plugins[file].destructor(commandEmitter);
        }

        var moduleResolve = require.resolve('./plugins/' + file);
        //var module = require.cache[moduleResolve];
        delete require.cache[moduleResolve];
        delete plugins[file];
        return true;
    } catch (err) {
        log(err.message, logType.critical);
        log("Plugin " + file + " is cannot be unloaded.", logType.critical);
        return false;
    }
}

function vacuumSettings() {
    if (process.argv.indexOf("--novacuum") == -1) {
        log("Checking the AstralMod Configuration file...", logType.info);
        fs.createReadStream('settings.json').pipe(fs.createWriteStream('.settings-backup.json'));

        var changesMade = false;
        var error = false;

        //Check settings file objects
        if (!settings.hasOwnProperty("guilds")) {
            log("Settings does not contain guilds.", logType.critical);
            error = true;
        }

        if (!settings.hasOwnProperty("users")) {
            log("Settings does not contain users.", logType.critical);
            error = true;
        }

        if (!settings.hasOwnProperty("generalConfiguration")) {
            log("Settings does not contain general configuration.", logType.critical);
            error = true;
        }

        if (error) {
            //Quit AstralMod
            log("AstralMod Configuration contains errors.", logType.critical);
            log("From here, you can either\n- Attempt to fix the AstralMod configuration file, settings.json\n- Delete the AstralMod configuration file and start again.", logType.info);
            log("AstralMod Configuration is corrupted. AstralMod cannot continue running. Exiting now.", logType.critical);
            debugger;
            process.exit(1);
        }

        //Check that each guild still exists
        var availableGuilds = [];
        for (let [id, guild] of client.guilds) {
            log("Checking Discord guild " + guild.id);
            availableGuilds.push(guild.id);

            if (!settings.guilds.hasOwnProperty(guild.id)) {
                //Add guild to database
                changesMade = true;
                log("Adding guild " + guild.id + " to the database.", logType.info);
                newGuild(guild);
            }

            if (settings.guilds[guild.id].requiresConfig == true) {
                settings.guilds[guild.id].requiresConfig = false;
            }
        }

        //Iterate over all guilds in settings
        for (key in settings.guilds) {
            log("Checking internal guild " + key);
            if (!availableGuilds.includes(key)) {
                //Delete guild from database
                changesMade = true;
                log("Deleting guild " + key + " as this guild is no longer recognised.", logType.info);
                settings.guilds[key] = null;
                delete settings.guilds[key];
            }
        }

        if (changesMade) {
            log("AstralMod Configuration was checked and changes were made. No other actions need to be taken.", logType.warning);
            log("Old settings backed up as .settings-backup.json", logType.info);
        } else {
            fs.unlinkSync(".settings-backup.json");
            log("AstralMod Configuration checked. No changes have been made", logType.good);
        }
        return true;
    } else {
        log("--novacuum argument was passed. Vacuuming has been disabled.", logType.info);
        return false;
    }
}

function guildUnavailable(guild) {
    log(guild.id + " has become unavailable.", logType.critical);
    doNotDeleteGuilds.push(guild.id);
}

function guildMemberUpdate(oldUser, newUser) {
    if (newUser.nickname != oldUser.nickname) {
        var guildSetting = settings.guilds[oldUser.guild.id];
        if (guildSetting.botWarnings != null) {
            if (oldUser.guild != null) {
                channel = oldUser.guild.channels.get(guildSetting.botWarnings);
                if (channel != null) {
                    if (newUser.nickname == null) {
                        channel.send(":abcd: " + getUserString(oldUser).replace("@", "@​") + " :arrow_right: [cleared]");
                    } else {
                        channel.send(":abcd: " + getUserString(oldUser).replace("@", "@​") + " :arrow_right: " + newUser.nickname.toString().replace("@", "@​"));
                    }
                }
            }
        }
    }
}

function readyAgain() {
    log("AstralMod is ready again.", logType.good);
}

function resume(replayed) {
    log("AstralMod has reconnected to Discord. " + parseInt(replayed) + " events were replayed.", logType.good);

    client.setInterval(setGame, 300000);
    setGame();

    commandEmitter.emit('reconnect');
}

function countBans() {
    banCounts = {};
    for (let [id, guild] of client.guilds) {
        guild.fetchBans().then(function(bans) {
            for ([uid, user] of bans) {
                if (banCounts[user.id] == null) {
                    banCounts[user.id] = 1;
                } else {
                    banCounts[user.id]++;
                }
            }
        }).catch(function() {
          
        });
    }
}

function loadInvites() {
    for (let [id, guild] of client.guilds) {
        knownInvites[guild.id] = {};
        guild.fetchInvites().then(function(invites) {
            for ([id, invite] of invites) {
                knownInvites[invite.code] = invite.uses;
            }
        }).catch(function() {
          
        });
    }
}

function loadSettingsFile(file) {
    if(fs.existsSync("iv.txt") && !fs.existsSync("iv")) {
        log("Converting legacy file 'iv.txt'...", logType.info);
        fs.copyFileSync("iv.txt", "iv");
    }

    if (file.startsWith("{")) {
        //File unencrypted
        var intermediarySettings = JSON.parse(file);

        log("settings.js file is unencrypted. Creating a backup copy...", logType.info);
        fs.createReadStream('settings.json').pipe(fs.createWriteStream('.settings-beforeEncrypt.json'));

        log("settings.js file will be encrypted on next save.", logType.warning);

        global.settings = intermediarySettings;
    } else if (!fs.existsSync("iv")) {
        //File encrypted
        log("Decrypting the settings.js file...", logType.info);

        var buf = fs.readFileSync("settings.json");
        var cipher = crypto.createDecipher(cipherAlg, consts.keys.settingsKey);
        var settingsJson = Buffer.concat([cipher.update(buf), cipher.final()]);
        settingsJson = settingsJson.toString("utf8");

        global.settings = JSON.parse(settingsJson);
        log("settings.js encryption will be upgraded on next save.", logType.warning);
    } else {
        //File encrypted with IV
        log("Decrypting the settings.js file...", logType.info);

        let iv = fs.readFileSync("iv");

        var buf = fs.readFileSync("settings.json");
        var cipher = crypto.createDecipheriv(cipherAlg, settingsKey, iv);
        var settingsJson = Buffer.concat([cipher.update(buf), cipher.final()]);
        settingsJson = settingsJson.toString("utf8");

        global.settings = JSON.parse(settingsJson);
    }
}

function clientError(err) {
    log(err.stack, logType.critical);
}

function readyOnce() {
    log("Now connected to Discord.", logType.good);
    log("Checking if configuration file exists...");

    if (!fs.existsSync("settings.json")) {
        log("AstralMod configuration file does not exist. Creating now.", logType.warning);
        global.settings = {
            guilds: {

            },
            users: {

            },
            generalConfiguration: {

            }
        };

        //Load in all guilds
        client.guilds.forEach(newGuild);
    } else {
        log("Loading AstralMod configuration file...", logType.info);

        try {
            var file = fs.readFileSync("settings.json", "utf8");

            loadSettingsFile(file);
        } catch (err) {
            try {
                //Try loading the prewrite file
                var file = fs.readFileSync("settings.prewrite.json", "utf8");
                loadSettingsFile(file);

                log("Settings file was corrupted, but prewrite file is good. Using prewrite file.", logType.warning);

                fs.createReadStream('settings.json').pipe(fs.createWriteStream('.settings-backup.json'));
                fs.createReadStream('settings.prewrite.json').pipe(fs.createWriteStream('settings.json'));
            } catch (err2) {
                log("Either the settings file is corrupted, or the encryption key is incorrect. AstralMod cannot start.", logType.critical);
                return;
            }
        }
    }

    if (vacuumSettings()) {
        log("AstralMod Configuration loaded.", logType.good);
    } else {
        log("AstralMod Configuration contains errors.", logType.critical);
    }

    client.setInterval(setGame, 300000);
    setGame();

    log("Loading suggestions channels...");
    for (key in settings.guilds) {
        var guildSetting = settings.guilds[key];
        if (guildSetting != null) {
            if (guildSetting.suggestions != null && guildSetting.suggestions != undefined) {
                //Get all messages in #suggestions
                var channel = client.channels.get(guildSetting.suggestions);
                if (channel == null) {
                    log("Suggestions channel " + guildSetting.suggestions + " not found", logType.critical);
                } else {
                    channel.fetchMessages({
                        limit: 100
                    });
                }
            }
        }
    }

    //Load plugins
    log("Loading plugins...");
    if (!fs.existsSync("plugins/")) {
        log("AstralMod plugins folder does not exist. Creating now.", logType.warning);
        fs.mkdirSync("plugins/");
    }

    fs.readdirSync('plugins').forEach(function(file, index) {//Load plugin
        if (!fs.lstatSync("./plugins/" + file).isDirectory()) {
            log("Plugin " + file + " detected. Attempting to load now.");
            loadPlugin(file);
        }
    });

    commandEmitter.emit('startup');

    client.on('message', processMessage);
    client.on('guildCreate', newGuild);
    client.on('guildDelete', removeGuild);
    client.on('messageDelete', messageDeleted);
    client.on('messageUpdate', messageUpdated);
    client.on('guildMemberAdd', memberAdd);
    client.on('guildMemberRemove', memberRemove);
    client.on('guildUnavailable', guildUnavailable);
    client.on('guildMemberUpdate', guildMemberUpdate);
    client.on('userUpdate', userUpdate);
    client.on('ready', readyAgain);
    client.on('resume', resume);
    client.on('guildBanAdd', banAdd);
    client.on('error', clientError);

    setTimeout(saveSettings, 30000);

    log("AstralMod " + amVersion + " - locked and loaded!", logType.good);

    countBans();
    loadInvites();
    setInterval(loadInvites, 300000);

    setInterval(function() {
        titleBox.content = "AstralMod " + amVersion + " Console  │  Uptime: " + moment.duration(client.uptime).humanize() +
        "  │  Guilds: " + parseInt(client.guilds.size);
        renderScreen();
    }, 1000);

    postDBL();

    client.fetchApplication().then(app => global.ownerId = app.owner);
}

client.once('ready', readyOnce);

client.on('disconnect', function(closeEvent) {
    log("AstralMod has disconnected from Discord and will not attempt to reconnect.", logType.critical);
    log("Close code: " + parseInt(closeEvent.code), logType.critical);
    log("At this point, you'll need to restart AstralMod.", logType.critical);

    commandEmitter.emit('disconnect');
});
client.on('reconnecting', function() {
    log("AstralMod has disconnected from Discord and is now attempting to reconnect.", logType.warning);

    commandEmitter.emit('disconnect');
});

function postDBL() {
    if (process.argv.indexOf("--nodbl") == -1) {
        //Post server count to DBL
        let payload;

        if (client.shard == null) {
            payload = JSON.stringify({
                server_count: client.guilds.size
            });
        } else {
            payload = JSON.stringify({
                server_count: client.guilds.size,
                shard_id: client.shard.id,
                shard_count: client.shard.count
            });
        }

        let request = https.request({
            host: "discordbots.org",
            port: 443,
            path: "/api/bots/" + client.user.id + "/stats",
            method: "POST",
            headers: {
                "User-Agent": "AstralMod/" + amVersion,
                "Authorization": consts.keys.dblKey,
                "Content-Type": "application/json"
            }
        }, function(res) {
            res.setEncoding("utf8");
            res.on("data", function(data) {
                try {
                    let response = JSON.parse(data);
                    if (response.hasOwnProperty("error")) {
                        log("DBL: " + response.error, logType.error);
                    }
                } catch (err) {
                    log("DBL: " + data, logType.error);
                }
            });
        })

        request.write(payload);
        request.end();
    }
}

if (process.argv.indexOf("--debug") == -1) {
    log("Running AstralMod without --debug command line flag. Debug output disabled.", logType.info);
} else {
    //Enable debugging output from discord.js

    client.on('debug', function(info) {
        log(info);
    });
    client.on('warn', function(info) {
        log(info, logType.warning);
    });
}

if (process.argv.indexOf("--httpserver") != -1) {
    log("Initializing HTTP server");
    var httpServer = http.createServer(function(req, res) {
        if (req.method == "GET") {
            if (req.url == "/") {
                res.writeHead(200, "OK");
                res.end(fs.readFileSync("webserver.html"));
            } else {
                res.writeHead(400, "Not Found");
                res.end();
            }
        } else if (req.method == "POST") {
            var body = "";
            req.on('data', function(chunk) {
                body += chunk;
            });
            req.on('end', function() {
                var command = body;
                textBox.setValue("> " + command);
                textBox.submit();

                res.writeHead(204, "No Content");
                res.end();
            });
        }
    });
    httpServer.listen(28931);
}

log("Checking configuration...", logType.info);

const requireDiscordVersion = "11.3.2";
if (Discord.version != requireDiscordVersion) {
    log("Invalid Discord.JS version", logType.critical);
    log("This version of AstralMod requires Discord.JS version " + requireDiscordVersion, logType.info);
    log("Execution halted.", logType.critical);
} else {
    if (consts.keys.settingsKey == null) {
        log("Settings Encryption Key not found.", logType.critical);
        log("To inform AstralMod about your settings encryption key,\n" +
            "1. Create a file called keys.js in the same directory as AstralMod\n" +
            "2. Save the file with the following:\n" +
            "   exports.settingsKey = \"[a random password]\"", logType.info);
    } else {
        log("Establishing connection to Discord...", logType.info);
        client.options.disabledEvents = [
            "TYPING_START"
        ]
        try {
            if (consts.keys.token != null) {
                client.login(consts.keys.token).catch(function() {
                    log("Couldn't establish a connection to Discord.", logType.critical);
                });
            } else {
                log("Login Token not found.", logType.critical);
                log("To inform AstralMod about your token,\n" +
                    "1. Create a file called keys.js in the same directory as AstralMod\n" +
                    "2. Save the file with the following:\n" +
                    "   exports.key = \"[your key here]\"", logType.info);
            }
        } catch (err) {
            log("Login Token not found.", logType.critical);
            log("To inform AstralMod about your token,\n" +
                "1. Create a file called keys.js in the same directory as AstralMod\n" +
                "2. Save the file with the following:\n" +
                "   exports.key = \"[your key here]\"", logType.info);
        }
    }
}
