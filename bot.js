/****************************************
 * 
 *   AstralMod: Moderation bot for AstralPhaser Central and other Discord servers
 *   Copyright (C) 2017 Victor Tran and Rylan Arbour
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
const api = require('./keys.js');
const fs = require('fs');
const client = new Discord.Client();

var expletiveFilter = false;
var doModeration = {};
var panicMode = {};
var lastMessages = {};
var sameMessageCount = {};
var smallMessageCount = {};
var poweroff = false;
var jailMember = null;
var bulletinTimeout;

function setGame() {
    var presence = {};
    presence.game = {};
    presence.status = "online";
    presence.afk = false;
    
    
    switch (Math.floor(Math.random() * 1000) % 16) {
        case 0:
            presence.game.name = "with ban buttons";
            break; //SCRUATCHO
        case 1:
            presence.game.name = "ShiftOS";
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
            presence.game.name = "being a stepswitcher";
            break;
        case 8:
            presence.game.name = "activating supa weapon";
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
            presence.game.name = "eating honeyfries";
            break;
        case 13:
            presence.game.name = "calling the NSA";
            break;
        case 14:
            presence.game.name = "with node.js"
            break;
        case 15:
            presence.game.name = "thinking of games"
            break;

    }
    client.user.setPresence(presence);
}

client.on('ready', () => {
    console.log("AstralMod is now ready!");
    client.setInterval(setGame, 300000);
    setGame();
});

function getBoshyTime(guild) {
    if (guild.id == 277922530973581312) { //AstralPhaser
        return "<:vtBoshyTime:280178631886635008>";
    } else if (guild.id == 234414439330349056) {
        return "<:vtBoshyTime:280542032261545984>";
    } else if (guild.id == 278824407743463424) {
        return "<:vtBoshyTime:283186465020706818>";
    } else {
        return ":warning:";
    }
}

//var prank = true;

function postBulletin() {
    var channel = client.channels.get("277922530973581312");
    
    switch (Math.floor(Math.random() * 1000) % 6) {
        case 0:
            channel.send("<:vtBoshyTime:280178631886635008> PING! Don't forget, the **no expletive** rule is now in effect. Thanks!");
            break;
        case 1:
            channel.send("<:vtBoshyTime:280178631886635008> PING! If you missed out, don't forget to check out the AstralPhaser channel for a review of the chat!");
            break;
        case 2:
            channel.send("<:vtBoshyTime:280178631886635008> PING! Thanks for coming to the chat everyone!");
            break;
        case 3:
            channel.send("<:vtBoshyTime:280178631886635008> PING! Welcome to AstralPhaser Central!");
            break;
        case 4:
            channel.send("<:vtBoshyTime:280178631886635008> PING! For anyone who asks: we're not doing rotations!");
            break;
        case 5:
            channel.send("<:vtBoshyTime:280178631886635008> PING! Hip Hip Hooray for the mods!");
            break;
    }
}

function messageChecker(oldMessage, newMessage) {
    var message;
    if (newMessage == null) {
        message = oldMessage;
    } else {
        message = newMessage;
    }
    var msg = message.content;
    
    if (message.guild == null) return;
    
    if (doModeration[message.guild.id] == null) {
        doModeration[message.guild.id] = true;
    }
    
    if (panicMode[message.guild.id] == null) {
        panicMode[message.guild.id] = false;
    }
    
    if (panicMode[message.guild.id]) {
        if (msg == "mod:panic" && (message.member.roles.find("name", "Admin")  || message.member.roles.find("name", "Upper Council of Explorers"))) {
            message.channel.send(':rotating_light: Panic mode is now off.');
            panicMode[message.guild.id] = false;
            console.log("Panic is now off.");
            message.delete();
            return;
        }
        message.delete();
    }
    
    /*if (message.channel.id == 277943393231831040) {
        var line = "[" + message.createdAt.toUTCString() + " - " + message.member.displayName + "] " + msg + "\n";
        fs.appendFile("brokerules.txt", line, function(err) {
            
        });
    }*/
    
    if (message.author.id != 280495817901473793 && message.author.id != 282048599574052864) {
        //Server Detection:
        //AstralPhaser Central: 277922530973581312
        //Michael's Stuff     : 234414439330349056
        //AKidFromTheUK       : 285740807854751754

        if (doModeration[message.guild.id] && message.guild.id != 140241956843290625) { //Check if we should do moderation on this server
            if ((expletiveFilter && message.guild.id == 277922530973581312) || message.guild.id == 278824407743463424) { //Check for expletives only if on AstralPhaser Central or theShell
                //Check for expletives
                var exp = msg.search(/(\b|\s|^|\.|\,)(shit|shite|shitty|bullshit|fuck|fucking|ass|penis|cunt|faggot|damn|wank|wanker|nigger|bastard|shut up|thisisnotarealwordbutatestword)(\b|\s|$|\.|\,)/i);
                if (exp != -1) { //Gah! They're not supposed to say that!
                    console.log("Expletive caught at " + parseInt(exp));
                    switch (Math.floor(Math.random() * 1000) % 6) {
                        case 0:
                            message.reply("I'm very disappointed in you. This is me <:angryvt:282006699802361856>");
                            break;
                        case 1:
                            message.reply("Hey! Let's not have any of that please.");
                            break;
                        case 2:
                            message.reply("Did you just...");
                            break;
                        case 3:
                            message.reply("Cool. Now let's not forget the rules.");
                            break;
                        case 4:
                            message.reply("If I'm not going to delete it, a mod will. Let's save them some work.");
                            break;
                        case 5:
                            message.reply("Hey! That was a swear! No!");
                            break;
                    }
                    
                    message.delete();
                    return;
                }
                
                
                //Continue only if on AstralPhaser
                if (message.guild.id == 277922530973581312) {
                    //Check for links
                    
                    if (message.member != null && !(message.member.roles.find("name", "Patron Tier 1ne") || message.member.roles.find("name", "Patron Tier 2wo") || message.member.roles.find("name", "Patron Tier 3hree") ||message.member.roles.find("name", "Patron Tier 4our"))) {
                        exp = msg.search(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/i);
                        if (exp != -1) { //This is a link.
                            console.log("Link caught at " + parseInt(exp));
                            switch (Math.floor(Math.random() * 1000) % 6) {
                                case 0:
                                    message.reply("I've replaced your link with a not-so-link-like link: click here");
                                    break;
                                case 1:
                                    message.reply("Whatever that link was... I hope it didn't contain some bad stuff...");
                                    break;
                                case 2:
                                    message.reply("Did you just...");
                                    break;
                                case 3:
                                    message.reply("Cool. Now let's not forget the rules.");
                                    break;
                                case 4:
                                    message.reply("If I'm not going to delete it, a mod will. Let's save them some work.");
                                    break;
                                case 5:
                                    message.reply("We dont want to download your FREE RAM.");
                                    break;
                            }
                            
                            message.delete();
                            return;
                        }
                    }
                    
                    //Check for images.
                    //Other attachments are ok.
                    if (message.attachments != null) {
                        var block = false;
                        for (let [key, attachment] of message.attachments) {
                            if (attachment.height != null) {
                                block = true;
                                break;
                            }
                        }
                        
                        if (block) {
                            console.log("Image caught");
                            switch (Math.floor(Math.random() * 1000) % 5) {
                                case 0:
                                    message.reply("A picture says a thousand words. That picture said about fifteen words. These exact words.");
                                    break;
                                case 1:
                                    message.reply("Let's not make all the other things disappear...");
                                    break;
                                case 2:
                                    message.reply("Did you just...");
                                    break;
                                case 3:
                                    message.reply("Cool. Now let's not forget the rules.");
                                    break;
                                case 4:
                                    message.reply("If I'm not going to delete it, a mod will. Let's save them some work.");
                                    break;
                            }
                            message.delete();
                            return;
                        }
                    }
                    
                    //Check for caps
                    if (msg.match(/[A-Z]/gm) != null && msg.match(/[A-Z]/gm).length > (parseFloat(msg.length) * 0.8)) {
                        console.log("Caps filter kicking in!");
                        switch (Math.floor(Math.random() * 1000) % 5) {
                            case 0:
                                message.reply("Shh...");
                                break;
                            case 1:
                                message.reply("The community likes peace and quiet.");
                                break;
                            case 2:
                                message.reply("Isn't it weird when you're reading... and then you see a bunch of caps?");
                                break;
                            case 3:
                                message.reply("If you're going to type that, why not get out a pen and paper and do it yourself?");
                                break;
                            case 4:
                                message.reply("DONT SHOUT IN HERE K");
                                break;
                        }
                        message.delete();
                        return;
                    }
                }
            }
            
            //Universal friendly checks:
            //BotWarnings:
            //AstralPhaser Central: 282513354118004747
            //ShiftOS             : 282513112257658880
            //theShell            : 283184634400079872
            //AKidFromTheUK       : 285740807854751754
            if (message.author.id != 282048599574052864 && msg.search(/\bkys\b/i) != -1) {
                var auth = message.author;
                if (message.guild.id == 277922530973581312) { //AstralPhaser
                    client.channels.get("282513354118004747").sendMessage(getBoshyTime(message.guild) + " PING! <@" + auth.id + "> wrote \"kys\" on " + message.channel.name + ".");
                } else if (message.guild.id == 234414439330349056) { //ShiftOS
                    client.channels.get("282513112257658880").sendMessage(getBoshyTime(message.guild) + " PING! <@" + auth.id + "> wrote \"kys\" on " + message.channel.name + ".");
                } else if (message.guild.id == 278824407743463424) { //theShell {
                    client.channels.get("283184634400079872").sendMessage(getBoshyTime(message.guild) + " PING! <@" + auth.id + "> wrote \"kys\" on " + message.channel.name + ".");
                } else if (message.guild.id == 285722047060115456) { //AKidFromTheUK
                    client.channels.get("285740807854751754").sendMessage(getBoshyTime(message.guild) + " PING! <@" + auth.id + "> wrote \"kys\" on " + message.channel.name + ".");
                } else if (message.guild.id == 281066689892974592) { //LE
                    client.channels.get("288272065109295104").sendMessage(getBoshyTime(message.guild) + " PING! <@" + auth.id + "> wrote \"kys\" on " + message.channel.name + ".");
                }
                message.reply("Right. We don't appreciate that here. (A notification has been sent to the mods.)");
                message.delete();
            }
        }
        
        var commandProcessed = false;
        if (msg.toLowerCase().startsWith("mod:") || msg.toLowerCase().startsWith("bot:")) {
            var command = msg.substr(4);
            switch (command) {
                case "ping":
                    switch (Math.floor(Math.random() * 1000) % 4) {
                        case 0:
                            message.channel.send(getBoshyTime(message.guild) + ' PONG! I want to play pong too... :\'(');
                            break;
                        case 1:
                            message.channel.send(getBoshyTime(message.guild) + ' PONG! I love playing pong!'); 
                            break;
                        case 2:
                            message.channel.send(getBoshyTime(message.guild) + ' PONG! Thanks for playing pong with me!');
                            break;
                        case 3:
                            message.channel.send(getBoshyTime(message.guild) + ' PONG!');
                            break;
                    }
                    commandProcessed = true;
                    break;
                case "pong":
                    switch (Math.floor(Math.random() * 1000) % 4) {
                        case 0:
                            message.channel.send(getBoshyTime(message.guild) + ' PING! Pings are also cool!');
                            break;
                        case 1:
                            message.channel.send(getBoshyTime(message.guild) + ' PING! Do you like playing pong?'); 
                            break;
                        case 2:
                            message.channel.send(getBoshyTime(message.guild) + ' PING! Here\'s the test message you wanted!');
                            break;
                        case 3:
                            message.channel.send(getBoshyTime(message.guild) + ' PING!');
                            break;
                    }
                    commandProcessed = true;
                    break;
                case "time":
                    message.channel.send(':arrow_forward: The time now is ' + new Date().toUTCString());
                    message.delete();
                    commandProcessed = true;
                    break;
                case "help":
                    message.channel.send(
                        "Here are some things you can try:\n```\n" +
                        "time   [tz]       Gets the time at UTC +00:00.\n" + 
                        "                  Useful for checking jail time.\n" +
                        "                  PARAMETER 1 (OPTIONAL)\n" + 
                        "                  A timezone to query, for example, +10 or -5.\n\n" +
                        "about             Tells you about AstralMod\n" + 
                        "copyright         Tells you about AstralMod\n" + 
                        "license           Tells you about AstralMod\n" + 
                        "warranty          Tells you about AstralMod\n\n" + 
                        "ping|pong         Asks AstralMod to reply with a message\n\n" +
                        "These commands need to be prefixed with bot:\n" +
                        "```")
                    break;
                case "about":
                case "license":
                    message.author.sendMessage(
                        "AstralMod - Copyright © Victor Tran and Rylan Arbour 2017. Licensed under the GNU General Public License, version 3 (or any later version). For more info, type in bot:copyright in a channel with AstralMod.\n" +
                        "https://github.com/vicr123/AstralMod"
                    );
                    commandProcessed = true;
                    break;
                case "copyright":
                    message.author.sendMessage(
                        "Copyright (C) 2017 Victor Tran and Rylan Arbour\n\n" +

                        "This program is free software: you can redistribute it and/or modify\n" +
                        "it under the terms of the GNU General Public License as published by\n" +
                        "the Free Software Foundation, either version 3 of the License, or\n" +
                        "(at your option) any later version.\n\n" +
                        
                        "This program is distributed in the hope that it will be useful,\n" +
                        "but WITHOUT ANY WARRANTY; without even the implied warranty of\n" +
                        "MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the\n" +
                        "GNU General Public License for more details.\n\n" +

                        "You should have received a copy of the GNU General Public License\n" +
                        "along with this program.  If not, see <http://www.gnu.org/licenses/>"
                    );
                    commandProcessed = true;
                    break;
                case "warranty":
                    message.author.sendMessage(
                        "This program is distributed in the hope that it will be useful,\n" +
                        "but WITHOUT ANY WARRANTY; without even the implied warranty of\n" +
                        "MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the\n" +
                        "GNU General Public License for more details.\n"
                    );
                    commandProcessed = true;
                    break;
                case "honeyfry":
                case "honeyfries":
                    if (message.guild.id == 277922530973581312) {
                        message.channel.send('<:honeyfry:291805507428286475> The verdict is YES. GO HONEYFRIES! WOO!\nDon\'t you dare react with a negative emoji Stefan. *I\'m watching you...*');
                    } else {
                        message.channel.send(':no_entry_sign: Honeyfries have nothing to do with this server. Carry on...');
                    }
                    message.delete();
                    commandProcessed = true;
                    break;
                default:
                     if (command.startsWith("time")) {
                        command = command.substr(5);
                        
                        var hours;
                        
                        switch (command.toLowerCase()) {
                            case "nzdt":
                            case "auckland":
                            case "christchurch":
                            case "new zealand":
                            case "nz":
                                hours = +13;
                                break;
                            case "sydney":
                            case "canberra":
                            case "vicr123":
                            case "victor":
                            case "victor tran":
                            case "vicr":
                            case "philip":
                            case "phil":
                            case "mightyeagle73":
                            case "mighty_eagle073":
                            case "oscar":
                            case "eagle":
                            case "aedt":
                            case "onyx":
                                hours = +11;
                                break;
                            case "aest:":
                                hours = +10;
                                break;
                            case "acdt":
                            case "adelaide":
                                hours = +10.5;
                                break;
                            case "sgt":
                            case "singapore":
                                hours = +8;
                                break;
                            case "alpha":
                                hours = +2;
                                break;
                            case "aren":
                            case "amsterdam":
                            case "berlin":
                                hours = +1;
                                break;
                            case "gmt":
                            case "utc":
                            case "london":
                            case "uk":
                            case "jed":
                            case "lance":
                            case "lancededcena":
                            case "stupidgame2":
                                hours = 0;
                                break;
                            case "brt":
                            case "vrabble":
                            case "vrabbers":
                                hours = -3;
                                break;
                            case "michael":
                            case "wowmom98":
                            case "rylan":
                            case "edt":
                            case "neb":
                            case "nebble":
                            case "new york":
                                hours = -4;
                                break;
                            case "est":
                            case "cdt":
                            case "wisconsin":
                            case "texas":
                            case "dallas":
                            case "fort worth":
                            case "austin":
                            case "houston":
                            case "memes":
                            case "trav":
                            case "travis":
                            case "travisnc":
                                hours = -5;
                                break;
                            case "cst":
                            case "mdt":
                            case "alkesta":
                                hours = -6;
                                break;
                            case "mst":
                            case "pdt":
                            case "neppy":
                            case "neptune":
                            case "cameron":
                            case "seattle":
                            case "alk":
                                hours = -7;
                                break;
                            case "pst":
                                hours = -8;
                                break;
                            default:
                                hours = parseFloat(command);
                                command = "UTC " + command + ":00";
                        }
                        
                        if (hours > -14 && hours < 14) {
                            var localtime = new Date();
                            var date = new Date(localtime.valueOf() + (localtime.getTimezoneOffset() + hours * 60) * 60000);
                            var dateString = date.toString();
                            if (dateString == "Invalid Date") {
                                message.channel.send(":no_entry_sign: ERROR: That ain't a valid timezone, my honeyfry. Don't try to confuse me... *or else...*");
                            } else {
                                dateString = dateString.substring(0, dateString.lastIndexOf(" "));
                                dateString = dateString.substring(0, dateString.lastIndexOf(" "));
                                message.channel.send(':arrow_forward: The time now at ' + command + ' is ' + dateString);
                            }
                        } else {
                            message.channel.send(":no_entry_sign: ERROR: That ain't a valid timezone, my honeyfry. Don't try to confuse me... *or else...*");
                        }
                        message.delete();
                        commandProcessed = true;
                    }
            }
        } 
        
        if (message.guild.id != 140241956843290625) { //Check we're not on TGL
            if (msg.toLowerCase().startsWith("mod:") && !commandProcessed) {
                //Check for moderator/admin permission
                
                //Moderator ID: 282068037664768001
                //Admin ID:     282068065619804160
                if (message.member.roles.find("name", "Admin") || message.member.roles.find("name", "Moderator") || message.member.roles.find("name", "Upper Council of Explorers") || message.member.roles.find("name", "Lower Council of Explorers")) { //Thanks Aren! :D
                    var command = msg.substr(4);
                    switch (command) {
                        case "filter":
                            if (message.guild.id != 277922530973581312) {
                                message.reply(':no_entry_sign: ERROR: Unable to use that command in this server.');
                            } else {
                                if (expletiveFilter) {
                                    message.channel.send(':arrow_forward: Expletive Filter: on');
                                } else {
                                    message.channel.send(':arrow_forward: Expletive Filter: off');
                                }
                                message.delete();
                            }
                            break;
                        case "filter on":
                            if (message.guild.id != 277922530973581312) {
                                message.reply(':no_entry_sign: ERROR: Unable to use that command in this server.');
                            } else {
                                if (expletiveFilter) {
                                    message.channel.send(':arrow_forward: Expletive Filter is already on.');
                                } else {
                                    expletiveFilter = true;
                                    message.channel.send(':white_check_mark: Expletive Filter is now turned on.');
                                    console.log("Expletive Filter is now on.");
                                    bulletinTimeout = client.setInterval(postBulletin, 60000);
                                }
                                message.delete();
                            }
                            break;
                        case "filter off":
                            if (message.guild.id != 277922530973581312) {
                                message.reply(':no_entry_sign: ERROR: Unable to use that command in this server.');
                            } else {
                                if (expletiveFilter) {
                                    expletiveFilter = false;
                                    message.channel.send(':white_check_mark: Expletive Filter is now turned off.');
                                    console.log("Expletive Filter is now off.");
                                    client.clearInterval(bulletinTimeout);
                                } else {
                                    message.channel.send(':arrow_forward: Expletive Filter is already off.');
                                }
                                message.delete();
                            }
                            break;
                        case "mod":
                            if (doModeration[message.guild.id]) {
                                message.channel.send(':arrow_forward: Moderation: on');
                            } else {
                                message.channel.send(':arrow_forward: Moderation: off');
                            }
                            message.delete();
                            break;
                        case "mod on":
                            if (doModeration[message.guild.id]) {
                                message.channel.send(':arrow_forward: Moderation is already on.');
                            } else {
                                doModeration[message.guild.id] = true;
                                message.channel.send(':white_check_mark: Moderation is now turned on.');
                                console.log("Moderation is now on.");
                            }
                            message.delete();
                            break;
                        case "mod off":
                            if (doModeration[message.guild.id]) {
                                doModeration[message.guild.id] = false;
                                message.channel.send(':white_check_mark: Moderation is now turned off. All messages on this server, spam, profane or whatever will be allowed through.');
                                console.log("Moderation is now off.");
                            } else {
                                message.channel.send(':arrow_forward: Moderation is already off.');
                            }
                            message.delete();
                            break;
                        case "panic":
                            if (message.member.roles.find("name", "Admin") || message.member.roles.find("name", "Upper Council of Explorers")) {
                                message.channel.send(':rotating_light: Panic mode is now on. All message sending for this server has been turned off.').then(function() {
                                    panicMode[message.guild.id] = true;
                                });
                                console.log("Panic is now on.");
                                message.delete();
                            } else {
                                message.reply(':no_entry_sign: NO: This is an admin only command.');
                                message.delete();
                            }
                            break;
                        case "reboot":
                            message.channel.send(":white_check_mark: We'll be back in a bit.").then(function() {
                                client.destroy();
                                client.login(api.key).then(function() {
                                    message.channel.send(":white_check_mark: AstralMod is back online!");
                                }).catch(function() {
                                    console.log("[ERROR] Login failed.");
                                });
                            });
                            break;
                        case "jail":
                            if (message.guild.id != 277922530973581312) {
                                message.reply(':no_entry_sign: ERROR: Unable to use that command in this server.');
                            } else {
                                if (jailMember == null) {
                                    message.reply(':no_entry_sign: ERROR: No user to jail. See mod:help for more information.');
                                } else {
                                    jailMember.addRole(jailMember.guild.roles.get("277942939915780099"));
                                    jailMember.setVoiceChannel(jailMember.guild.channels.get(jailMember.guild.afkChannelID));
                                    message.channel.send(':oncoming_police_car: JAILED!');
                                    jailMember = null;
                                }
                            }
                            message.delete();

                            break;
                        case "help":
                            message.channel.send(
                                "And here are the mod only commands:\n```\n" +
                                "mod    [on|off]   Queries moderation status.\n" +
                                "                  PARAMETER 1 (OPTIONAL)\n" + 
                                "                  Type on to start moderating the server.\n" +
                                "                  Type off to stop moderating the server.\n\n" +
                                "filter [on|off]   Queries the chat filter.\n" +
                                "                  PARAMETER 1 (OPTIONAL)\n" + 
                                "                  Type on to set the filter on.\n" +
                                "                  Type off to set the filter off.\n\n" +
                                "rm num            Deletes a number of messages.\n" +
                                "                  PARAMETER 1\n" +
                                "                  Number of messages to delete.\n\n" +
                                "uinfo user        Gets information about a user.\n" +
                                "                  PARAMETER 1\n" +
                                "                  User ID. This can be obtained by tagging\n" +
                                "                  the user.\n\n" +
                                "jail user         Places a user in jail.\n" +
                                "panic       -     Toggles panic mode.\n" +
                                "cancel            Cancels a pending operation.\n" +
                                "help              Prints this help message.\n" +
                                "reboot            Asks AstralMod to reconnect.\n" +
                                "poweroff          Asks AstralMod to leave the server.\n" +
                                "\n" +
                                "- denotes an admin only command\n" +
                                "These commands need to be prefixed with mod:\n" +
                                "```")
                            break;
                        case "cancel":
                            if (poweroff) {
                                poweroff = false;
                                message.channel.send(':white_check_mark: OK, I won\'t leave... yet.')
                            } else if (jailMember != null) {
                                message.channel.send(':white_check_mark: OK, I won\'t jail ' + jailMember.displayName);
                                jailMember = null;
                            } else {
                                message.reply(':no_entry_sign: ERROR: Nothing to cancel.');
                            }
                            message.delete();
                            return;
                        default:
                            if (command.startsWith("uinfo")) {
                                command = command.substr(6);
                                command = command.replace("<", "").replace(">", "").replace("@", "").replace("!", "");
                                
                                message.guild.fetchMember(command).then(function(member) {
                                    embed = new Discord.RichEmbed();
                                    embed.setAuthor(member.displayName, member.user.displayAvatarURL);
                                    embed.setColor("#FF0000");
                                    var msg = "Discriminator: " + member.user.discriminator + "\n" + 
                                                "Created at: " + member.user.createdAt.toUTCString() + "\n";
                                    if (member.joinedAt.getTime() == 0) {
                                        msg += "Joined at: -∞... and beyond! Discord seems to be giving incorrect info... :(";
                                    } else {
                                        msg += "Joined at: " + member.joinedAt.toUTCString();
                                    }
                                    embed.setDescription(msg);
                                    message.channel.sendEmbed(embed);
                                }).catch(function(reason) {
                                    message.channel.send(':no_entry_sign: ERROR: That didn\'t work. You might want to try again.');
                                });
                            } else if (command.startsWith("jail")) {
                                if (message.guild.id != 277922530973581312) {
                                    message.reply(':no_entry_sign: ERROR: Unable to use that command in this server.');
                                } else {
                                    command = command.substr(6);
                                    command = command.replace("<", "").replace(">", "").replace("@", "").replace("!", "");
                                    
                                    message.guild.fetchMember(command).then(function(member) {
                                        if (member.roles.find("name", "I Broke The Rules!")) {
                                            message.channel.send(':no_entry_sign: ERROR: That user is already in jail.');
                                        } else {
                                            jailMember = member;
                                            message.channel.send(':oncoming_police_car: Placing ' + member.displayName + ' in jail. To confirm, type in mod:jail.');
                                        }
                                    }).catch(function(reason) {
                                        message.channel.send(':no_entry_sign: That didn\'t work. You might want to try again.');
                                    });
                                }
                                message.delete();
                            } else if (command.startsWith("rm")) {
                                command = command.substr(3);
                                var num = parseInt(command);
                                if (num != command) {
                                    message.channel.send(":no_entry_sign: ERROR: That's not a number...");
                                } else {
                                    num = num + 1; //Also remove the mod:rm command
                                    message.channel.bulkDelete(command).then(function() {
                                        message.channel.send(":white_check_mark: OK: I successfully deleted " + command + " messages.");
                                    }).catch(function() {
                                        message.channel.send(":no_entry_sign: ERROR: That didn't work... You might want to try again.");
                                    });
                                }
                            }
                    }
                    
                    if (command == "poweroff") {
                        if (message.author.id == 278805875978928128 || message.author.id == 175760550070845451) {
                            if (poweroff) {
                                message.channel.send(':white_check_mark: AstralMod is now exiting. Goodbye!').then(function() {
                                    process.exit(0);
                                }).catch(function() {
                                    process.exit(0);
                                });
                            } else {
                                message.channel.send(':information_source: If you\'re just trying to stop AstralMod from moderating, use `mod:mod off` instead. Otherwise, to power off AstralMod, type in `mod:poweroff` again.');
                                poweroff = true;
                            }
                        } else {
                            message.reply(':no_entry_sign: NO: Only 2 special people are allowed to power off the bot. To turn off moderation, use `mod:mod off`.');
                        }
                    } else {
                        poweroff = false;
                    }
                    
                    if (!command.startsWith("jail")) {
                        jailMember = null;
                    }
                } else {
                    message.reply(':no_entry_sign: NO: What? You\'re not a member of the staff! Why would you be allowed to type that!?');
                    message.delete();
                }
            }
        }
        
        if (doModeration[message.guild.id] && message.guild.id != 140241956843290625) { //Check if we should do moderation on this server
            //Spam limiting
            if (lastMessages[message.author.id] != msg) {
                sameMessageCount[message.author.id] = 0;
            }
            lastMessages[message.author.id] = msg
            sameMessageCount[message.author.id] += 1;
            
            /*if (smallMessageCount[message.author.id] == null) {
                smallMessageCount[message.author.id] = 0;
            }
            
            if (msg.length < 5 || msg.indexOf(" ") == -1) {
                smallMessageCount[message.author.id] += 1;
            } else {
                smallMessageCount[message.author.id] = 0;
            }*/
            
            if (lastMessages[message.author.id] == msg && sameMessageCount[message.author.id] == 10) {
                var auth = message.author;
                if (message.guild.id == 277922530973581312) { //AstralPhaser
                    client.channels.get("282513354118004747").sendMessage(getBoshyTime(message.guild) + " PING! <@" + auth.id + "> was spamming on " + message.channel.name + ".");
                } else if (message.guild.id == 234414439330349056) { //ShiftOS
                    client.channels.get("282513112257658880").sendMessage(getBoshyTime(message.guild) + " PING! <@" + auth.id + "> was spamming on " + message.channel.name + ".");
                } else if (message.guild.id == 278824407743463424) { //theShell
                    client.channels.get("283184634400079872").sendMessage(getBoshyTime(message.guild) + " PING! <@" + auth.id + "> was spamming on " + message.channel.name + ".");
                } else if (message.guild.id == 285722047060115456) { //AKidFromTheUK
                    client.channels.get("285722047060115456").sendMessage(getBoshyTime(message.guild) + " PING! <@" + auth.id + "> was spamming on " + message.channel.name + ".");
                } else if (message.guild.id == 281066689892974592) { //LE
                    client.channels.get("288272065109295104").sendMessage(getBoshyTime(message.guild) + " PING! <@" + auth.id + "> was spamming on " + message.channel.name + ".");
                }
                
                message.reply("Quite enough of this. I'm not warning you any more. (A notification has been sent to the mods.)");
                message.delete();
            } else if (lastMessages[message.author.id] == msg && sameMessageCount[message.author.id] > 10) {
                message.delete();
            } else if (lastMessages[message.author.id] == msg && sameMessageCount[message.author.id] > 3) {
                console.log("Spam limits kicking in!");
                switch (Math.floor(Math.random() * 1000) % 4) {
                    case 0:
                        message.reply("Well... We all heard you.");
                        break;
                    case 1:
                        message.reply("Stop typing the same thing! You're like a broken record!");
                        break;
                    case 2:
                        message.reply("Hmm... Not sure if you'd actually say the same thing more than three times in public.");
                        break;
                    case 3:
                        message.reply("Is that the only phrase you know? Can you try typing something else?");
                        break;
                }
                
                message.delete();
                return;
            } else if (smallMessageCount[message.author.id] == 10) {
                var auth = message.author;
                if (message.guild.id == 277922530973581312) { //AstralPhaser
                    client.channels.get("282513354118004747").sendMessage(getBoshyTime(message.guild) + " PING! <@" + auth.id + "> was spamming on " + message.channel.name + ".");
                } else if (message.guild.id == 234414439330349056) { //ShiftOS
                    client.channels.get("282513112257658880").sendMessage(getBoshyTime(message.guild) + " PING! <@" + auth.id + "> was spamming on " + message.channel.name + ".");
                } else if (message.guild.id == 278824407743463424) { //theShell
                    client.channels.get("283184634400079872").sendMessage(getBoshyTime(message.guild) + " PING! <@" + auth.id + "> was spamming on " + message.channel.name + ".");
                } else if (message.guild.id == 285722047060115456) { //AKidFromTheUK
                    client.channels.get("285722047060115456").sendMessage(getBoshyTime(message.guild) + " PING! <@" + auth.id + "> was spamming on " + message.channel.name + ".");
                } else if (message.guild.id == 281066689892974592) { //LE
                    client.channels.get("288272065109295104").sendMessage(getBoshyTime(message.guild) + " PING! <@" + auth.id + "> was spamming on " + message.channel.name + ".");
                }
                message.reply("Quite enough of this. I'm not warning you any more. (A notification has been sent to the mods.)");
                message.delete();
            } else if (smallMessageCount[message.author.id] > 10) {
                message.delete();
            } else if (smallMessageCount[message.author.id] > 5) {
                console.log("Spam limits kicking in!");
                switch (Math.floor(Math.random() * 1000) % 4) {
                    case 0:
                        message.reply("This looks like spam. And we don't like spam.");
                        break;
                    case 1:
                        message.reply("Cut it out.");
                        break;
                    case 2:
                        message.reply("Very... scribbly...");
                        break;
                    case 3:
                        message.reply("If you're going to type that, why not get out a pen and paper and do it yourself?");
                        break;
                }
                
                message.delete();
                return;
            }
        }
    }
}

client.on('message', messageChecker);
client.on('messageUpdate', messageChecker);

client.on('guildMemberAdd', function(guildMember) {
    if (guildMember.guild.id == 234414439330349056 || guildMember.guild.id == 277922530973581312) {
        var channel;
        if (guildMember.guild.id == 277922530973581312) {
            channel = client.channels.get("284837615830695936");
            console.log(guildMember.displayName + " joined AstralPhaser Central");
        } else {
            channel = client.channels.get("284826899413467136");
            console.log(guildMember.displayName + " joined ShiftOS");
        }
        
        channel.sendMessage(":arrow_right: <@" + guildMember.user.id + ">");
        
        embed = new Discord.RichEmbed();
        embed.setAuthor(guildMember.displayName, guildMember.user.displayAvatarURL);
        embed.setColor("#FF0000");
        var msg = "Discriminator: " + guildMember.user.discriminator + "\n" + 
                    "Created at: " + guildMember.user.createdAt.toUTCString() + "\n";
        if (guildMember.joinedAt.toUTCString() == "Thu, 01 Jan 1970 00:00:00 GMT") {
            msg += "Joined at: -∞... and beyond! Discord seems to be giving incorrect info... :(";
        } else {
            msg += "Joined at: " + guildMember.joinedAt.toUTCString();
        }
        embed.setDescription(msg);
        channel.sendEmbed(embed);
        
        /*if (guildMember.user.createdAt.getTime() < 1487962800000) {
            channel.sendMessage("This user was created **before** the suspected raid and a ban is probably not necessary.");
        } else {
            channel.sendMessage("This user was created **after** the suspected raid.");
        }*/
        
        //if (guildMember.joinedAt - guildMember.createdAt
    }
});

client.on('guildMemberUpdate', function(oldUser, newUser) {
    if (newUser.guild.id == 277922530973581312) {
        if (/*!oldUser.roles.find("name", "I Broke The Rules!") &&*/ newUser.roles.find("name", "I Broke The Rules!")) {
            console.log("Someone broke the rules!");
            client.channels.get("277943393231831040").sendMessage("<@" + newUser.id + "> :oncoming_police_car: You are now in jail. Appeal here to get out of jail. If you do not appeal successfully within 24 hours, an admin will **ban** you from the server.\n\n" + 
            "Additionally, if you leave and rejoin this server in an attempt to break out of jail, you will be **banned.**\n\n" + 
            "Timestamp: " + new Date().toUTCString());
        }
        
        if (newUser.nickname != oldUser.nickname) {
            var channel = client.channels.get("285668975390621697"); //Admin Bot warnings
            if (newUser.nickname == null) {
                channel.send(oldUser.user.username + " has cleared his nickname");
            } else {
                channel.send(oldUser.user.username + " has changed his nickname to " + newUser.nickname);
            }
        }
    }
});

client.on('userUpdate', function(oldUser, newUser) {
    if (newUser.guild != null) {
        if (newUser.guild.id == 277922530973581312) {
            if (newUser.username != oldUser.username) {
                var channel = client.channels.get("285668975390621697"); //Admin Bot warnings
                channel.send(oldUser.user.username + " has changed his username in all servers to " + newUser.username);
            }
        }
    }
});

client.on('guildMemberRemove', function(user) {
    if (user.roles.find("name", "I Broke The Rules!")) {
        console.log("Someone left jail!");
        client.channels.get("277943393231831040").sendMessage(":arrow_left: <@" + user.id + "> has left the server in jail.");
    }
    
    if (user.guild != null) {
        if (user.guild.id == 277922530973581312 || user.guild.id == 234414439330349056) {
            var channel;
            if (user.guild.id == 277922530973581312) {
                channel = client.channels.get("284837615830695936");
                console.log(user.displayName + " left AstralPhaser Central");
            } else {
                channel = client.channels.get("284826899413467136");
                console.log(user.displayName + " left ShiftOS");
            }
            
            channel.sendMessage(":arrow_left: <@" + user.user.id + "> (" + user.displayName + ")");
        }
    }
});

client.on('messageDelete', function(message) {
    if (message.content.startsWith("bot:") || message.content.startsWith("mod:")) return; //Don't want to warn about AstralMod deleted messages
    if (message.author.id == 277949276540239873) return; //Ignore AstralPlayer
    if (message.guild.id != 140241956843290625) return; //Ignore TGL
    var channel = null;
    if (message.guild != null) {
        if (panicMode[message.guild.id]) return; //Don't want to be doing this in panic mode!
          
        if (message.guild.id == 277922530973581312) { //AstralPhaser Central
            channel = client.channels.get("290439711258968065");
        } else if (message.guild.id == 234414439330349056) { //ShiftOS
            channel = client.channels.get("290442327158292480");
        } else if (message.guild.id == 278824407743463424) { //theShell
            channel = client.channels.get("290444399731671040");
        }
    }
    
    if (channel != null) {
        channel.sendMessage(":wastebasket: Message by <@" + message.author.id + "> in <#" + message.channel.id + "> at " + message.createdAt.toUTCString() + " was deleted.\n" +
            "```\n" +
            message.cleanContent + "\n" +
            "```"
        );
    }
});

client.on('messageUpdate', function(oldMessage, newMessage) {
    if (oldMessage.cleanContent == newMessage.cleanContent) return; //Ignore
    var channel = null;
    if (oldMessage.guild != null) {
        if (oldMessage.guild.id == 277922530973581312) { //AstralPhaser Central
            channel = client.channels.get("290439711258968065");
        } else if (oldMessage.guild.id == 234414439330349056) { //ShiftOS
            channel = client.channels.get("290442327158292480");
        } else if (oldMessage.guild.id == 278824407743463424) { //theShell
            channel = client.channels.get("290444399731671040");
        }
    }
    
    if (channel != null) {
        channel.sendMessage(":pencil2: Message by <@" + oldMessage.author.id + "> in <#" + oldMessage.channel.id + "> at " + oldMessage.createdAt.toUTCString() + " was edited.\n" +
            "```\n" +
            oldMessage.cleanContent + "\n" +
            "```" +
            "```\n" +
            newMessage.cleanContent + "\n" +
            "```\n"
        );
    }
});

client.login(api.key).catch(function() {
    console.log("[ERROR] Login failed.");
});
