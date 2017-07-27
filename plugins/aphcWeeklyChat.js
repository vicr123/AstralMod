/****************************************
 * 
 *   AstralPhaser Central Plugin for AstralMod: Plugin for AstralMod that handles AstralPhaser Central
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

var client;
var consts;

var allowPrepChat = true;
var membersPlaced = [];
var numberOfMembersTried = 0;

var dispatcher;
var connection;

function playAudio() {
    try {
        dispatcher = connection.playFile("forecastvoice.mp3");
        dispatcher.on('end', playAudio);
    } catch (err) {
        log("Disconnected from the waiting room.", logType.critical);
    }
}

function startup() {
    try {
        if (client.guilds.has(consts.aphc.id)) {
            log("AstralPhaser Central has been detected.");
            log("Now connecting to the waiting room.");
            //Jump into waiting room
            client.channels.get(consts.aphc.waitingRoomChannel).join().then(function(conn) {
                log("Now playing audio in the AstralPhaser Central Waiting Room.", logType.good);
                connection = conn;
                playAudio();
            });
        }
    } catch (err) {
        log("Couldn't connect to APHC.", logType.critical);
    }
}

function processCommand(message, isMod, command) {
    if (isMod) {
        if (command == "prepchat") { //APHC specific command
            var numberOfMembers = 15;
            if (message.guild.id != consts.aphc.id) {
                message.reply(':no_entry_sign: ERROR: Unable to use that command in this server.');
            } else if (!allowPrepChat) {
                message.reply(':no_entry_sign: ERROR: Command was run less than a minute ago. To override this, use `mod:forceprepchat`');
            } else {
                var waitingRoom = client.channels.get(consts.aphc.waitingRoomChannel);

                membersInWaitingRoom = Array.from(waitingRoom.members.values());

                for (var i = 0; i < membersInWaitingRoom.length; i++) {
                    var member = membersInWaitingRoom[i];
                    if (member.selfMute || member.serverMute || member.id == 282048599574052864 || isMod(member)) {
                        membersInWaitingRoom.splice(i, 1);
                        i--;
                    }
                }

                var placeMemberFunction = function() {
                    numberOfMembersTried++;
                    if (membersInWaitingRoom.length != 0) {
                        //Choose a random member
                        var chosenMember = membersInWaitingRoom.splice(Math.floor(Math.random() * 1000) % membersInWaitingRoom.length, 1)[0];
                        chosenMember.setVoiceChannel(consts.aphc.weeklyChatChannel).then(function() {
                            chosenMember.addRole(message.guild.roles.get(consts.aphc.weeklyChateesRole));
                            log("Member placed in weekly chat");
                            membersPlaced.push(chosenMember);
                            message.channel.send(":speech_balloon: `" + getUserString(chosenMember) + "` was placed into the Weekly Chat")
                            //postFeedbackFunction();
                        }).catch(function() {
                            log("Member couldn't be placed in weekly chat", logType.warning);
                            message.channel.send(":speech_balloon: `" + getUserString(chosenMember) + "` was unable to be placed into the Weekly Chat")
                            //postFeedbackFunction();
                        });
                        return true;
                    } else {
                        log("No more members to place in weekly chat");
                        return false;
                        //postFeedbackFunction();
                    }
                }

                var changeAllowPrepChat = true;

                for (var i = 0; i < numberOfMembers; i++) {
                    if (placeMemberFunction()) {
                        if (i == numberOfMembers - 1) {
                            //TODO: Turn on expletive filter
                            message.channel.send(":speech_balloon: " + parseInt(numberOfMembers) + " people have been queued to be moved to the weekly chat.")
                        }
                    } else {
                        if (i == 0) {
                            message.channel.send(":speech_balloon: No eligible members were found in the waiting room.")
                            changeAllowPrepChat = false;
                        } else {
                            message.channel.send(":speech_balloon: There are only " + parseInt(i) + " eligible members in the weekly chat and all of them have been queued to be moved in.")
                            //TODO: Turn on expletive filter
                        }
                        i = numberOfMembers;
                    }
                }

                message.delete();
                
                if (changeAllowPrepChat) {
                    allowPrepChat = false;
                    setTimeout(function() {
                        allowPrepChat = true;
                    }, 60000);
                }
            }
        } else if (command == "stopchat") {
            if (message.guild.id != consts.aphc.id) {
                message.reply(':no_entry_sign: ERROR: Unable to use that command in this server.');
            } else {
                message.guild.roles.get(consts.aphc.weeklyChateesRole).members.forEach(function(cmember) {
                    cmember.removeRole(message.guild.roles.get(consts.aphc.weeklyChateesRole));
                });
                message.channel.send(":speech_balloon: All weekly chat-ees have the Chatroom Phil permissions revoked.");
            }
            message.delete();
        }
    }

    if (command == "inviteaphc") {
        message.author.send("Here's an invite to AstralPhaser Central: https://discord.gg/invite/aJf76fW");
    }
}

module.exports = {
    name: "AstralPhaser Central Commands",
    constructor: function(discordClient, commandEmitter, constants) {
        client = discordClient;
        consts = constants;

        commandEmitter.on('startup', startup);
        commandEmitter.on('processCommand', processCommand);
    },
    destructor: function(commandEmitter) {
        commandEmitter.removeListener('startup', startup);
        commandEmitter.removeListener('processCommand', processCommand);
    },
    availableCommands: {
        general: {
            commands: [
                "inviteaphc"
            ]
        },
        "277922530973581312": {
            modCommands: [
                "prepchat",
                "stopchat"
            ]
        }
    },
    acquireHelp: function(helpCmd) {
        var help = {};

        switch (helpCmd) {
            case "inviteaphc":
                help.title = "am:inviteaphc";
                help.helpText = "Obtain an invite link to AstralPhaser Central.";
                break;
            case "prepchat":
                help.title = "mod:prepchat";
                help.helpText = "Prepares the AstralPhaser Weekly Chat by moving 15 people from the Waiting Room to the Weekly Chat room, and applying the Weekly Chat permission to those people. **This command can only be used in AstralPhaser Central.**";
                break;
            case "stopchat":
                help.title = "mod:stopchat";
                help.helpText = "Revokes Weekly Chat role from everyone who has the role. **This command can only be used in AstralPhaser Central.**";
                break;
        }

        return help;
    }
}