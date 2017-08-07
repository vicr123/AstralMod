/****************************************
 * 
 *   AstralMod: Moderation bot for AstralPhaser Central and other Discord servers
 *   Copyright (C) 2017 Victor Tran
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

const amVersion = "2.1.0";

const Discord = require('discord.js');
const consts = require('./consts.js');
const fs = require('fs');
const readline = require('readline');
const events = require('events');
const blessed = require('blessed');
const moment = require('moment');
const client = new Discord.Client();

const commandEmitter = new events.EventEmitter();
var plugins = {};

/** @type{Object} */
global.settings = null;
var listening = true;

var nickTimeouts = {};

//Variables for the deal command
var actionMember = {};
var actioningMember = {};
var actionStage = {};
var actionToPerform = {};

var finalStdout = "";

global.logType = {
    debug: 0,
    info: 1,
    warning: 2,
    critical: 3,
    good: 4
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
    height: "100%-2",
    tags: true,
    style: {
        fg: 'white',
        bg: 'black',
        scrollbar: {
            bg: 'white'
        }
    },
    padding: {
        left: 1,
        bottom: 2
    },
    scrollable: true,
    alwaysScroll: true,
    scrollOnInput: true,
    scrollbar: true
});
screen.append(logBox);

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
textBox.focus();

var keyBox = blessed.box({
    top: "100%-1",
    left: "0",
    width: "100%",
    height: 1,
    content: "^C Exit   ENTER Issue Command",
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

// Quit on Control-C.
textBox.key('C-c', function(ch, key) {
    shutdown();
});

textBox.key('up', function() {
    logBox.scroll(-1);
    renderScreen();
});

textBox.key('pageup', function() {
    logBox.scroll(-logBox.height);
    renderScreen();
});

textBox.key('down', function() {
    logBox.scroll(1);
    renderScreen();
});

textBox.key('pagedown', function() {
    logBox.scroll(logBox.height);
    renderScreen();
});

textBox.on("cancel", function() {
    textBox.setValue("> ");
    textBox.focus();
});

function renderScreen() {
    screen.render();
}

renderScreen();

console.error = function(data, ...args){
    log(data, logType.warning);
};

global.log = function(logMessage, type = logType.debug) {
    if (logMessage == null) {
        return;
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
        renderScreen();
    }
}

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

textBox.on("submit", function() {
    //Input received!
    var line = textBox.getText().substr(2);

    logBox.log(line);
    textBox.setValue("> ");
    textBox.focus();

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
                   "plugins                 List loaded plugins\n" +
                   "load [plugin]           Loads a plugin into AstralMod\n" +
                   "unload [plugin]         Unloads a plugin from AstralMod\n" +
                   "reload [plugin]         Unloads and then loads a plugin into AstralMod\n" +
                   "broadcast [message]     Broadcasts a message to every server AstralMod is connected to\n" +
                   "vacuum                  Check the AstralMod Configuration File for errors\n" +
                   "reconnect               Attempts to disconnect and reconnect to Discord\n" +
                   "guilds                  Lists guilds AstralMod knows about\n" +
                   "ginfo [guildid]       - Shows information about a guild\n" +
                   "findc [channelid]       Finds a channel by its ID\n" +
                   "exit                    Exits AstralMod\n\n" +
                   "For any commands denoted with a - modifiers on the end can show more information.\n" +
                   "m - Show members\n" +
                   "c - Show channels\n\n" +
                   "Here's an example: ginfom 123456789012345678";
        log(help, logType.info);
    } else if (lLine == "exit") {
        shutdown();
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
        const api = require('./keys.js');
        client.sock
        if (api.key != null) {
            client.login(api.key).catch(function() {
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

                if (channel == null) {
                    if (guild != null) {
                        channel = guild.defaultChannel;
                    }
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
    } else if (lLine == "throw") {
        throw new Error();
    } else if (lLine.startsWith("findc ")) {
        var channelId = line.substr(6);
        var channel = client.channels.get(channelId);
        if (channel == null) {
            log("Unknown channel.", logType.info);
        } else {
            log("That channel belongs to " + channel.guild.name + ".", logType.info);
        }
    } else if (lLine == "findc") {
        log("Usage: findc [channelid]", logType.critical);
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
    } else if (lLine == "ginfo") {
        log("Usage: ginfo [guildid]", logType.critical);
    } else {
        log("Unknown command. For help, type \"help\" into the console.", logType.critical);
    }
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
    } else if (lLine.startsWith("ginfom ") || lLine.startsWith("ginfoc ")) {
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
    } else {
        log("Command autocompletion coming soon.", logType.info);
        //TODO: Command autocompletion
    }
});

function shutdown() {
    if (global.settings != null) {
        log("Saving settings...");
        try {
            fs.writeFileSync("settings.json", JSON.stringify(settings, null, 4), "utf8");
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

function setGame() {
    var presence = {};
    presence.game = {};
    presence.status = "online";
    presence.afk = false;
    
    switch (Math.floor(Math.random() * 1000) % 35) {
        case 0:
            presence.game.name = "with ban buttons";
            break;
        case 1:
            presence.game.name = "Fighting JXBot";
            break;
        case 2:
            presence.game.name = "Annoy Victor";
            break;
        case 3:
            presence.game.name = "with an internal bug";
            break;
        case 4:
            presence.game.name = "around";
            break;
        case 5:
            presence.game.name = "bot games";
            break;
        case 6:
            presence.game.name = "with ones and zeroes";
            break;
        case 7:
            presence.game.name = "thyShell";
            break;
        case 8:
            presence.game.name = "with supa weapon";
            break;
        case 9:
            presence.game.name = "solving puzzles";
            break;
        case 10:
            presence.game.name = "rewinding time";
            break;
        case 11:
            presence.game.name = "checking archives";
            break;
        case 12:
            presence.game.name = "being unbreakable";
            break;
        case 13:
            presence.game.name = "sandwiches";
            break;
        case 14:
            presence.game.name = "drawing pokemon";
            break;
        case 15:
            presence.game.name = "obsessing";
            break;
        case 16:
            presence.game.name = "the waiting game";
            break;
        case 17:
            presence.game.name = "bending space";
            break;
        case 18:
            presence.game.name = "with hexagons";
            break;
        case 19:
            presence.game.name = "with music";
            break;
        case 20:
            presence.game.name = "being a ninja";
            break;
        case 21:
            presence.game.name = "with Unicode characters";
            break;
        case 22:
            presence.game.name = "am:help for more info";
            break;
        case 26:
            presence.game.name = "trying to DJ";
            break;
        case 27:
	        presence.game.name = "Sausages";
	        break;
        case 28:
	        presence.game.name = "59 6f 75 20 64 65 63 6f 64 65 64 20 74 68 69 73 20 6d 65 73 73 61 67 65 21";
	        break;
        case 29:
        case 23:
        case 24:
        case 25:
            presence.game.name = "v." + amVersion;
            break;
        case 30:
            presence.game.name = "Locked and loaded!";
            break;
        case 31:
            presence.game.name = "Android Pay";
            break;
        case 32:
            presence.game.name = "translating English into Dutch";
            break;
        case 33:
            presence.game.name = "translating Dutch into English";
            break;
        case 34:
            presence.game.name = "Hallo hoe gaat het vandaag?";
	    break;
    }
    client.user.setPresence(presence);
}

function isMod(member) {
    var modRoles = settings.guilds[member.guild.id].modRoles;
    if (modRoles != null) {
        for (role of modRoles) {
            if (member.roles.has(role)) {
                return true;
            }
        }
    }
    return false;
}

function uinfo(member, channel, compact = false) {
    var embed = new Discord.RichEmbed("uinfo");
    embed.setAuthor(member.displayName, member.user.displayAvatarURL);
    embed.setAuthor(getUserString(member), member.user.displayAvatarURL);
    embed.setColor("#00FF00");
    embed.setFooter("User ID: " + member.user.id);

    if (compact) {
        var msg = "Discriminator: " + member.user.discriminator + "\n" + 
                    "Created at: " + member.user.createdAt.toUTCString() + "\n";
        if (member.joinedAt.toUTCString() == "Thu, 01 Jan 1970 00:00:00 GMT") {
            msg += "Joined at: -∞... and beyond! Discord seems to be giving incorrect info... :(";
        } else {
            msg += "Joined at: " + member.joinedAt.toUTCString();
        }
        embed.setDescription(msg);
    } else {
        embed.setDescription("User Information");

        {
            var msg = "**Created** " + member.user.createdAt.toUTCString() + "\n";
            if (member.joinedAt.getTime() == 0) {
                msg += "**Joined** -∞... and beyond! Discord seems to be giving incorrect info... :(";
            } else {
                msg += "**Joined** " + member.joinedAt.toUTCString();
            }

            embed.addField("Timestamps", msg);
        }

        {
            var msg = "**Current Display Name** " + member.displayName + "\n";
            msg += "**Username** " + member.user.username + "\n";
            if (member.nickname != null) {
                msg += "**Nickname** " + member.nickname;
            } else {
                msg += "**Nickname** No nickname";
            }

            embed.addField("Names", msg);
        }
    }
    channel.send("", {embed: embed});
}

function processModCommand(message) {
    var text = message.content;
    var lText = text.toLowerCase();

    //Special cases
    if (lText == "mod:config") {
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
            if (message.author.id == consts.users.vicr123 || message.author.id == message.guild.owner.user.id) {
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
            if (message.author.id == consts.users.vicr123 || message.author.id == message.guild.owner.user.id || message.member.hasPermission("ADMINISTRATOR")) {
                settings.guilds[message.guild.id].configuringUser = message.author.id;
                settings.guilds[message.guild.id].configuringStage = 0;
                message.author.send(getSingleConfigureWelcomeText(message.guild));

                message.reply(":arrow_left: Continue in DMs.");
            }
        }
    } else if (lText == "mod:poweroff") {
        if (message.author.id == consts.users.vicr123 || message.author.id == consts.users.nebble) {
            message.reply("AstralMod is now exiting.").then(function() {
                shutdown();
            });
        }
    }

    if (isMod(message.member)) {
        var command;
        if (text.startsWith("mod:")) {
            command = text.toLowerCase().substr(4);
        } else {
            command = text.toLowerCase().substr(3);
        }
        if (command.startsWith("uinfo ")) {
            var user = command.substr(6);
            user = user.replace("<", "").replace(">", "").replace("@", "").replace("!", "");
            message.guild.fetchMember(user).then(function(member) {
                uinfo(member, message.channel);
            }).catch(function() {
                switch (Math.floor(Math.random() * 1000) % 3) {
                    case 0:
                        message.channel.send(':no_entry_sign: ERROR: That didn\'t work. You might want to try again.');
                        break;
                    case 1:
                        message.channel.send(':no_entry_sign: ERROR: Something\'s blocking us! You might want to try again.');
                        break;
                    case 2:
                        message.channel.send(':no_entry_sign: ERROR: Too much cosmic interference! You might want to try again.');
                        break;
                }
            });

            return true;
        } else if (command == "shoo") {
            if (message.author.id == consts.users.vicr123 || message.author.id == message.guild.owner.user.id) {
                message.reply(":arrow_left: And with that, POW! I'm gone!").then(function() {
                    message.guild.leave();
                    saveSettings();
                });
            } else {
                message.reply(":arrow_left: Only the owner or vicr123 can use this command. Alternatively, if you have permissions to kick me, just do that.");
            }
            return true;
        } else if (command.startsWith("declnick")) {
            var userId = command.substr(9);
            if (nickTimeouts[message.guild.id] != null) {
                if (nickTimeouts[message.guild.id][userId] != null) {
                    clearTimeout(nickTimeouts[message.guild.id][userId]);
                    nickTimeouts[message.guild.id][userId] = null;
                    message.channel.send(':white_check_mark: OK: User nickname change has been cancelled.');
                } else {
                    message.channel.send(':no_entry_sign: ERROR: That didn\'t work. Has 5 minutes passed?');
                }
            }
            return true;
        } else if (command.startsWith("deal ") || command.startsWith("manage ")) {
            if (actioningMember[message.guild.id] != null) {
                message.channel.send(':no_entry_sign: ERROR: ' + getUserString(actioningMember[message.guild.id]) + " is already managing another user.");
            } else {
                if (command.startsWith("deal")) {
                    command = command.substr(5);
                } else if (command.startsWith("manage")) {
                    command = command.substr(7);
                }
                var memberID = command.replace("<", "").replace(">", "").replace("@", "").replace("!", "");

                message.guild.fetchMember(memberID).then(function (member) {
                    if (member.highestRole.comparePositionTo(message.member.highestRole) >= 0) {
                        message.channel.send(":gear: Cannot manage " + getUserString(member) + ".");
                    } else {
                        var canDoActions = false;
                        var msg = ':gear: ' + getUserString(member) + ": `cancel` ";
                        if (member.kickable) {
                            msg += '`(k)ick` ';
                            canDoActions = true;
                        }
                        
                        if (member.bannable) {
                            msg += '`(b)an` ';
                            canDoActions = true;
                        }

                        if (!member.highestRole.comparePositionTo(message.guild.me.highestRole) >= 0 && message.guild.me.hasPermission("MANAGE_NICKNAMES")) {
                            msg += '`(n)ick` ';
                            canDoActions = true;
                        }
                        
                        if (message.guild.id == 287937616685301762 || message.guild.id == consts.aphc.id) {
                            msg += "`(i)nterrogate` ";
                            canDoActions = true;
                        }
                        
                        if (message.guild.id == consts.aphc.id || message.guild.id == 263368501928919040) {
                            msg += "`(j)ail` ";
                            canDoActions = true;
                        }
                        
                        if (message.guild.id == consts.aphc.id) {
                            msg += "`(m)ute` ";
                            canDoActions = true;
                        }
                        
                        if (canDoActions) {
                            actionMember[message.guild.id] = member;
                            actioningMember[message.guild.id] = message.author;
                            actionStage[message.guild.id] = 0;
                            message.channel.send(msg);
                        } else {
                            message.channel.send(":gear: Cannot manage " + getUserString(member) + ".");
                        }
                    }
                }).catch(function (reason) {
                    switch (Math.floor(Math.random() * 1000) % 3) {
                        case 0:
                            message.channel.send(':no_entry_sign: ERROR: That didn\'t work. You might want to try again.');
                            break;
                        case 1:
                            message.channel.send(':no_entry_sign: ERROR: Something\'s blocking us! You might want to try again.');
                            break;
                        case 2:
                            message.channel.send(':no_entry_sign: ERROR: Too much cosmic interference! You might want to try again.');
                            break;
                    }
                });
            }
            message.delete();
            return true;
        } else if (command == "find") {
            message.reply("Usage: `mod:find user`. For more information, `mod:help find`");
            return true;
        } else if (command.startsWith("find" )) {
            var query = command.substr(5);
            var searchResults = [];

            for (let [snowflake, user] of client.users) {
                if (user.username.toLowerCase().indexOf(query.toLowerCase()) != -1) {
                    searchResults.push({
                        tag: user.tag,
                        id: user.id
                    });
                }
            }

            if (searchResults.length == 0) {
                message.reply("No results.");
            } else {
                var reply = "Here's who I found.```";

                var currentNumber = 0;
                for (user of searchResults) {
                    reply += user.tag + ": " + user.id + "\n";
                    if (currentNumber == 10) {
                        reply += "\n----- " + parseInt(searchResults.length - currentNumber) + " more. -----\n";
                        reply += "Please narrow your query.";
                        break;
                    }
                    currentNumber++;
                }
                reply += "```";
                message.channel.send(reply);
            }
            return true;
        }
    }
    return false;
}

function processAmCommand(message) {
    var text = message.content;

    //Make sure configuration is not required
    if (settings.guilds[message.guild.id].requiresConfig) {
        message.reply("AstralMod setup isn't complete. You'll need to wait for " + message.guild.owner.displayName + " to type `mod:config` and set up AstralMod before you can use it.");
    } else {
        var command;
        if (text.startsWith("am:")) {
            command = text.toLowerCase().substr(3);
        } else {
            command = text.toLowerCase().substr(4);
        }

        if (command == "ping") {
            switch (Math.floor(Math.random() * 1000) % 4) {
                case 0:
                    message.channel.send('PONG! I want to play pong too... :\'(');
                    break;
                case 1:
                    message.channel.send('PONG! I love playing pong!'); 
                    break;
                case 2:
                    message.channel.send('PONG! Thanks for playing pong with me!');
                    break;
                case 3:
                    message.channel.send('PONG!');
                    break;
            }
            message.delete();
            return true;
        } else if (command == "uinfo") {
            uinfo(message.member, message.channel);
            return true;
        } else if (command == "nick") {
            if (settings.guilds[message.guild.id].nickModeration) {
                var nickResult = setNicknameTentative(message.member, "", message.guild);
                if (nickResult == "cooldown") {
                    message.reply("There is a one day cooldown between use of this command.");
                } else if (nickResult == "length") {
                    message.reply("Nicknames need to be less than 32 characters.");
                } else {
                    message.reply("Ok, give us a bit to make sure the mods are ok with that.");
                }
            } else {
                message.reply("Nickname changes are not accepted on this server via AstralMod.");
            }
            return true;
        } else if (command.startsWith("nick ")) {
            if (settings.guilds[message.guild.id].nickModeration) {
                var nickResult = setNicknameTentative(message.member, text.substr(8), message.guild);
                if (nickResult == "cooldown") {
                    message.reply("There is a one day cooldown between use of this command.");
                } else if (nickResult == "length") {
                    message.reply("Nicknames need to be less than 32 characters.");
                } else {
                    message.reply("Ok, give us a bit to make sure the mods are ok with that.");
                }
            } else {
                message.reply("Nickname changes are not accepted on this server via AstralMod.");
            }
            return true;
        } else if (command == "suggest") {
            message.reply("Suggestions are coming soon. Stay tuned!");
            return true;
        } else if (command.startsWith("suggest ")) {
            message.reply("Suggestions are coming soon. Stay tuned!");
            return true;
        } else if (command == "version") {
            message.channel.send("**AstralMod " + amVersion + "**\nDiscord Bot");
            return true;
        } else if (command == "help") { //General help
            var embed = new Discord.RichEmbed();
            embed.setColor("#3C3C96");
            embed.setAuthor("AstralMod Help Contents");
            embed.setDescription("Here are some things you can try. For more information, just `am:help [command]`");

            embed.addField("AstralMod Core Commands", "**config**\n**shoo**\n**declnick**\n**deal**\n**find**\nping\nuinfo\nnick\nversion\nhelp", true);

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

            embed.setFooter("AstralMod " + amVersion + ". mod: commands denoted with bold text.");
            message.channel.send("", { embed: embed });
            return true;
        } else if (command.startsWith("help ")) { //Contextual help
            //Get help for specific command
            var embed = new Discord.RichEmbed();
            embed.setAuthor("AstralMod Help Contents");

            var helpCmd = command.substr(5);

            var help = {};
            switch (helpCmd) {
                case "config":
                    help.title = "mod:config";
                    help.helpText = "Configures AstralMod for this server";
                    break;
                case "shoo":
                    help.title = "mod:shoo";
                    help.helpText = "Leave the server, purging all configuration";
                    break;
                case "declnick":
                    help.title = "mod:declnick";
                    help.helpText = "Declines a nickname";
                    break;
                case "deal":
                    help.title = "mod:deal";
                    help.usageText = "mod:deal user";
                    help.helpText = "Manages a user";
                    help.param1 = "- The User ID of the user to manage\n" +
                                  "- Mention of the user to manage";
                    break;
                case "ping":
                    help.title = "am:ping";
                    help.helpText = "Asks AstralMod to reply with a message";
                    break;
                case "version":
                    help.title = "am:version";
                    help.helpText = "Queries the current AstralMod version";
                    break;
                case "uinfo":
                    if (isMod(message.member)) {
                        help.title = "mod:uinfo";
                        help.usageText = "mod:uinfo user";
                        help.helpText = "Acquire information about a user";
                        help.param1 = "- The User ID of the user to acquire information\n" +
                                      "- Mention of the user to acquire information";
                    } else {
                        help.title = "am:uinfo";
                        help.helpText = "Asks AstralMod to reply with information about you";
                    }
                    break;
                case "nick":
                    help.title = "am:nick";
                    help.usageText = "am:nick nickname";
                    help.helpText = "Sets your nickname after staff have a chance to review it";
                    help.param1 = "The nickname you wish to be known as";
                    break;
                case "find":
                    help.title = "mod:find";
                    help.usageText = "mod:find user";
                    help.helpText = "Finds a user and returns their ID";
                    help.param1 = "The user you want to find.";
                    help.remarks = "AstralMod will search for users from all connected servers."
                    break;
                case "help":
                    help.title = "am:help";
                    help.usageText = "am:help [command]";
                    help.helpText = "Acquire information about how to use AstralMod and any available commands";
                    help.param1 = "*Optional Parameter*\n" +
                                  "The command to acquire information about.\n" +
                                  "If this parameter is not present, we'll list the available commands.";
                    break;
                default:
                    //Look thorough plugins for help
                    for (key in plugins) {
                        var plugin = plugins[key];
                        if (plugin.acquireHelp != null) {
                            if (plugin.availableCommands != null) {
                                if (plugin.availableCommands.general != null) {
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
        }
    }
    return false;
}

function setNicknameTentative(member, nickname, guild) {
    if (nickname.length >= 32) {
        settings.guilds[guild.id].pendingNicks = pendingNicks;
        return "length";
    }

    var pendingNicks = {};
    if (settings.guilds[guild.id].pendingNicks != null) {
        pendingNicks = settings.guilds[guild.id].pendingNicks;
    }

    if (pendingNicks.cooldowns == null) {
        pendingNicks.cooldowns = {};
    }

    if (pendingNicks.cooldowns[member.user.id] == null) {
        pendingNicks.cooldowns[member.user.id] = new Date().getTime() - 86400000;
    }

    if (new Date().getTime() > pendingNicks.cooldowns[member.user.id]) {
        pendingNicks.cooldowns[member.user.id] = new Date().getTime() + 86400000;

        if (nickTimeouts[guild.id] == null) {
            nickTimeouts[guild.id] = {};
        }

        nickTimeouts[guild.id][member.user.id] = setTimeout(function() {
            member.setNickname(nickname);
            nickTimeouts[guild.id][member.user.id] = null;
        }, 300000, null);

        if (nickname == "") {
            client.channels.get(settings.guilds[guild.id].botWarnings).send(":arrows_counterclockwise: <@" + member.user.id + "> :arrow_right: `[clear]`. `mod:declnick " + member.user.id + "`");
        } else {
            client.channels.get(settings.guilds[guild.id].botWarnings).send(":arrows_counterclockwise: <@" + member.user.id + "> :arrow_right: `" + nickname + "`. `mod:declnick " + member.user.id + "`");
        }
        settings.guilds[guild.id].pendingNicks = pendingNicks;
        return "ok";
    } else {
        settings.guilds[guild.id].pendingNicks = pendingNicks;
        return "cooldown";
    }
}

function processConfigure(message, guild) {
    var text = message.content.toLowerCase();

    var guildSetting = settings.guilds[guild.id];

    if (guildSetting.requiresConfig) {
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

                    message.author.send("Thanks. Next, I'll need the ID of the channel where I can post member alerts. Alternatively, enter \"none\" if you want to disable member alerts.");
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

    string += "1 Staff Roles        " + guildSetting.modRoles.length + " roles\n";

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
                    requiresConfig: true
                };
                log("Configuration for " + guild.id + " purged.", logType.good);
                message.author.send("AstralMod configuration for this server has been reset. To set up AstralMod, just `mod:config` in the server.");
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
                    message.author.send("Enter the roles of mods on this server, seperated by a space. To cancel, just type \"cancel\"");
                    
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

                    message.author.send("Ok, I've changed that.");
                    message.author.send(getSingleConfigureWelcomeText(guild));
                    break;
                case "<": //Reset AstralMod
                    message.author.send("**Reset AstralMod**\n" +
                                        "Resetting AstralMod for this server. This will clear all settings for this server and you'll need to set up AstralMod again to use it.\n" +
                                        "To reset AstralMod, respond with `Reset AstralMod`.");
                    guildSetting.configuringStage = -10;
                    break;
                default:
                    message.author.send("That's not an option.");
                    message.author.send(getSingleConfigureWelcomeText(guild));
            }
            break;
        }
        case 10: { //Staff Roles
            if (text == "cancel") {
                message.author.send(getSingleConfigureWelcomeText(guild));
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

function processDeal(message) {
    //Handle the deal command
    var msg = message.content;
    var member = actionMember[message.guild.id];
    if (actionStage[message.guild.id] == 0) { //Select Action
        if (msg == "cancel") { //Cancel Action
            message.channel.send(':gear: Cancelled. Exiting action menu.');
            member = null;
            actioningMember[message.guild.id] = null;
        } else if ((msg.toLowerCase() == "interrogate" || msg.toLowerCase() == "i") && (message.guild.id == consts.aphc.id || message.guild.id == 287937616685301762 || message.guild.id == 305039436490735627)) {
            if (message.guild.id == consts.aphc.id) {
                member.addRole(member.guild.roles.get(consts.aphc.interrogationRole));
            } else if (message.guild.id == 287937616685301762) {
                member.addRole(member.guild.roles.get("319847521440497666"));
            } else if (message.guild.id == 305039436490735627) {
                member.addRole(member.guild.roles.get("326250571692769281"));
            }
            member.setVoiceChannel(member.guild.channels.get(member.guild.afkChannelID));
            message.channel.send(':gear: ' + getUserString(member) + " has been placed in interrogation.");
            member = null;
            actioningMember[message.guild.id] = null;
        } else if ((msg.toLowerCase() == "jail" || msg.toLowerCase() == "j") && (message.guild.id == consts.aphc.id || message.guild.id == 263368501928919040 || message.guild.id == 305039436490735627)) {
            if (message.guild.id == consts.aphc.id) {
                member.addRole(member.guild.roles.get(consts.aphc.jailRole));
            } else if (message.guild.id == 305039436490735627) {
                member.addRole(member.guild.roles.get("310196007919157250"));
            } else {
                member.addRole(member.guild.roles.get("267731524734943233"));
            }
            member.setVoiceChannel(member.guild.channels.get(member.guild.afkChannelID));
            message.channel.send(':gear: ' + getUserString(member) + " has been placed in jail.");
            member = null;
            actioningMember[message.guild.id] = null;
        } else if ((msg.toLowerCase() == "mute" || msg.toLowerCase() == "m") && (message.guild.id == consts.aphc.id || message.guild.id == 305039436490735627)) {
            var roleId;
            if (message.guild.id == consts.aphc.id) {
                roleId = consts.aphc.jailRole;
            } else if (message.guild.id == 305039436490735627) {
                roleId = "309883481024888842";
            }
            
            if (member.roles.get(roleId)) {
                member.removeRole(member.roles.get(roleId));
                message.channel.send(':gear: ' + getUserString(member) + " has been removed from time out.");
                member = null;
                actioningMember[message.guild.id] = null;
            } else {
                member.addRole(member.guild.roles.get(roleId));
                message.channel.send(':gear: ' + getUserString(member) + " has been placed on time out.");
                member = null;
                actioningMember[message.guild.id] = null;
            }
        } else if (msg.toLowerCase() == "kick" || msg.toLowerCase() == "k") {
            actionStage[message.guild.id] = 1;
            message.channel.send(":gear: Enter reason for kicking " + getUserString(member) + " or `cancel`.");
            actionToPerform[message.guild.id] = "kick";
        } else if (msg.toLowerCase() == "ban" || msg.toLowerCase() == "b") {
            actionStage[message.guild.id] = 1;
            message.channel.send(":gear: Enter reason for banning " + getUserString(member) + " or `cancel`.");
            actionToPerform[message.guild.id] = "ban";
        } else if (msg.toLowerCase() == "nick" || msg.toLowerCase == "nickname" || msg.toLowerCase() == "n") {
            actionStage[message.guild.id] = 1;
            message.channel.send(":gear: Enter new nickname for " + getUserString(member) + ". Alternatively type `clear` or `cancel`.");
            actionToPerform[message.guild.id] = "nick";
        } else {
            message.channel.send(':gear: Unknown command. Exiting action menu.');
            member = null;
            actioningMember[message.guild.id] = null;
        }
        message.delete();
    } else if (actionStage[message.guild.id] == 1) {
        if (msg == "cancel") {
            message.channel.send(':gear: Cancelled. Exiting action menu.');
            member = null;
            actioningMember[message.guild.id] = null;
        } else if (actionToPerform[message.guild.id] == "kick") {
            member.kick(msg).then(function(member) {
                message.channel.send(':gear: ' + getUserString(member) + " has been kicked from the server.");
                member = null;
                actioningMember[message.guild.id] = null;
            }).catch(function() {
                message.channel.send(':gear: ' + getUserString(member) + " couldn't be kicked from the server. Exiting action menu");
                member = null;
                actioningMember[message.guild.id] = null;
            });
        } else if (actionToPerform[message.guild.id] == "ban") {
            member.ban(msg).then(function(member) {
                message.channel.send(':gear: ' + getUserString(member) + " has been banned from the server.");
                member = null;
                actioningMember[message.guild.id] = null;
            }).catch(function() {
                message.channel.send(':gear: ' + getUserString(member) + " couldn't be banned from the server. Exiting action menu");
                member = null;
                actioningMember[message.guild.id] = null;
            });
        } else if (actionToPerform[message.guild.id] == "nick") {
            if (msg == "clear") {
                msg = "";
            }
            
            member.setNickname(msg).then(function(member) {
                message.channel.send(':gear: ' + getUserString(member) + " has changed his nickname.");
                member = null;
                actioningMember[message.guild.id] = null;
            }).catch(function() {
                message.channel.send(':gear: ' + getUserString(member) + " couldn't have his nickname changed. Exiting action menu");
                member = null;
                actioningMember[message.guild.id] = null;
            });
        }
        message.delete();
    }
    actionMember[message.guild.id] = member;
}

function processMessage(message) {
    //Ignore self
    if (message.author.id == client.user.id) return;

    var text = message.content;

    //Determine if this is in a guild
    if (message.guild != null) {
        //Determine if we are in a workflow
        if (actioningMember[message.guild.id] == message.author) {
            //We are currently in the deal workflow
            processDeal(message);
            return;
        }

        //Determine if this is a command
        if (text.startsWith("mod:") || text.startsWith("am")) { //This is a mod command
            if (!processModCommand(message)) {
                if (!processAmCommand(message)) {
                    //Pass command onto plugins
                    if (text.startsWith("mod:")) {
                        commandEmitter.emit('processCommand', message, true, text.substr(4).toLowerCase());
                    } else {
                        commandEmitter.emit('processCommand', message, true, text.substr(3).toLowerCase());
                    }
                }
            }
        } else if (text.startsWith("am:")) {
                if (!processAmCommand(message)) {
                    //Pass command onto plugins
                    commandEmitter.emit('processCommand', message, false, text.substr(3).toLowerCase());
                }
        } else {
            //Neither workflow or command
            //Pass onto plugins
            commandEmitter.emit('newMessage', message);
        }
    } else {
        //Determine if this is within a workflow or if this is unsolicited
        for (key in settings.guilds) {
            var guildSetting = settings.guilds[key];
            if (guildSetting != null) {
                //First check if user is currently configuring
                if (guildSetting.configuringUser == message.author.id) {
                    //Check if this is during first time setup
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
}

function newGuild(guild) {
    log("New Guild: " + guild.id);
    settings.guilds[guild.id] = {
        requiresConfig: true
    };
    
    
    if (process.argv.indexOf("--nowelcome") == -1) {
        guild.defaultChannel.send(":wave: Welcome to AstralMod! To get started, " + guild.owner.displayName + " or vicr123 needs to type `mod:config`.");
    }
}

function removeGuild(guild) {
    //Delete guild from database
    settings.guilds[guild.id] = null;
    delete settings.guilds[guild.id];
    log("Removed Guild: " + guild.id);
}

function saveSettings(showOkMessage = false) {
    log("Saving settings...");
    fs.writeFile("settings.json", JSON.stringify(settings, null, 4), "utf8", function(error) {
        if (error) {
            log("Settings couldn't be saved.", logType.critical);
        } else {
            if (showOkMessage) {
                log("Settings saved!", logType.good);
            } else {
                log("Settings saved!");
            }
        }

        setTimeout(saveSettings, 30000);
    });
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
                message.cleanContent + "\n" +
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
        channel.send(":arrow_right: <@" + member.user.id + ">");
        
        uinfo(member, channel, true);

        if (member.guild.id == 287937616685301762) {
            var now = new Date();
            var joinDate = member.user.createdAt;
            if (joinDate.getDate() == now.getDate() && joinDate.getMonth() == now.getMonth() && joinDate.getFullYear() == now.getFullYear()) {
                if (member.guild.id == 287937616685301762) {
                    channel.send(":calendar: <@&326915978392764426> This member was created today.");
                }
            }
        }
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
                            channel.send(":ab: " + getUserString(oldUser) + " :arrow_right: " + newUser.username + ".");
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
        log("Plugin \"" + plugin.name + "\" has been loaded successfully.", logType.good);
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
}


function guildMemberUpdate(oldUser, newUser) {
    if (newUser.nickname != oldUser.nickname) {
        var guildSetting = settings.guilds[oldUser.guild.id];
        if (guildSetting.botWarnings != null) {
            if (oldUser.guild != null) {
                channel = oldUser.guild.channels.get(guildSetting.botWarnings);
                if (channel != null) {
                    if (newUser.nickname == null) {
                        channel.send(":abcd: " + getUserString(oldUser) + " :arrow_right: [cleared]");
                    } else {
                        channel.send(":abcd: " + getUserString(oldUser) + " :arrow_right: " + newUser.nickname);
                    }
                }
            }
        }
    }
}

function readyAgain() {
    log("AstralMod has reconnected to Discord.", logType.good);

    client.setInterval(setGame, 300000);
    setGame();

    commandEmitter.emit('reconnect');
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
        global.settings = JSON.parse(fs.readFileSync("settings.json", "utf8"));
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
        log("Plugin " + file + " detected. Attempting to load now.");
        loadPlugin(file);
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

    setTimeout(saveSettings, 30000);

    log("AstralMod " + amVersion + " - locked and loaded!", logType.good);

    setInterval(function() {
        titleBox.content = "AstralMod " + amVersion + " Console  │  Uptime: " + moment.duration(client.uptime).humanize() +
        "  │  Guilds: " + parseInt(client.guilds.size);
        renderScreen();
    }, 1000);
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

log("Establishing connection to Discord...", logType.info);
try {
    const api = require('./keys.js');
    if (api.key != null) {
        client.login(api.key).catch(function() {
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