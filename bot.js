const Discord = require('discord.js');
const client = new Discord.Client();

var expletiveFilter = false;
var lastMessages = {};
var sameMessageCount = {};
var smallMessageCount = {};
var poweroff = false;
var jailMember = null;

function randomnum(min, max) { 
    return Math.random() * (max - min) + min;
}

client.on('ready', () => {
    console.log("AstralMod is now ready!");
});

function messageChecker(oldMessage, newMessage) {
    var message;
    if (newMessage == null) {
        message = oldMessage;
    } else {
        message = newMessage;
    }
    var msg = message.content;
    
    if (message.author.id != 280495817901473793 && message.author.id != 282048599574052864) {
        //Server Detection:
        //AstralPhaser Central: 277922530973581312
        //Michael's Stuff     : 234414439330349056
        
        if (expletiveFilter && message.guild.id == 277922530973581312) { //Check for expletives only if on AstralPhaser Central
            //Check for expletives
            var exp = msg.search(/(\b|\s|^|\.|\,)(shit|shite|shitty|bullshit|fuck|fucking|ass|penis|cunt|faggot|damn|wank|wanker|nigger|bastard|thisisnotarealwordbutatestword)(\b|\s|$|\.|\,)/i);
            if (exp != -1) { //Gah! They're not supposed to say that!
                console.log("Expletive caught at " + parseInt(exp));
                switch (Math.floor(Math.random() * 1000) % 5) {
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
                }
                
                message.delete();
                return;
            }
            
            //Check for links
            exp = msg.search(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/i);
            if (exp != -1) { //This is a link.
                console.log("Link caught at " + parseInt(exp));
                switch (Math.floor(Math.random() * 1000) % 5) {
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
                }
                
                message.delete();
                return;
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
        }
        
        //Universal friendly checks:
        //BotWarnings:
        //AstralPhaser Central: 282513354118004747
        //ShiftOS             : 282513112257658880
        if (message.author.id != 282048599574052864 && msg.search(/\bkys\b/i) != -1) {
            var auth = message.author;
            if (message.guild.id == 277922530973581312) { //AstralPhaser
                client.channels.get("282513354118004747").sendMessage("<:vtBoshyTime:280178631886635008> PING! <@" + auth.id + "> wrote \"kys\" on " + message.channel.name + ".");
            } else { //ShiftOS
                client.channels.get("282513112257658880").sendMessage("<:vtBoshyTime:280542032261545984> PING! <@" + auth.id + "> wrote \"kys\" on " + message.channel.name + ".");
            }
            message.reply("Right. We don't appreciate that here. (A notification has been sent to the mods.)");
            message.delete();
        }
        
        if (msg.startsWith("mod:")) {
            //Check for moderator/admin permission
            
            //Moderator ID: 282068037664768001
            //Admin ID:     282068065619804160
            if (message.member.roles.find("name", "Admin") || message.member.roles.find("name", "Moderator")) { //Thanks Aren! :D
                var command = msg.substr(4);
                switch (command) {
                    case "ping":
                        message.channel.send('<:vtBoshyTime:280178631886635008> PONG! I want to play pong too... :\'(');
                        break;
                    case "pong":
                        message.channel.send('<:vtBoshyTime:280178631886635008> PING!');
                        break;
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
                            } else {
                                message.channel.send(':arrow_forward: Expletive Filter is already off.');
                            }
                            message.delete();
                        }
                        break;
                    case "time":
                        message.channel.send(':arrow_forward: The time now is ' + new Date().toUTCString());
                        message.delete();
                        break;
                    case "reboot":
                        message.channel.send(":white_check_mark: We'll be back in a bit.").then(function() {
                            client.destroy();
                            client.login('MjgyMDQ4NTk5NTc0MDUyODY0.C4g2Pw.yFGdUuMlZITH99tWEic0JxIUGJ4').then(function() {
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
                            "```\n" +
                            "ping|pong         Asks AstralMod to reply with a message\n" +
                            "time              Gets the time at UTC +00:00.\n" + 
                            "                  Useful for checking jail time.\n" +
                            "filter [on|off]   Queries the chat filter.\n" +
                            "                  PARAMETER 1 (OPTIONAL)\n" + 
                            "                  Type on to set the filter on.\n" +
                            "                  Type off to set the filter off.\n" +
                            "uinfo user        Gets information about a user.\n" +
                            "                  PARAMETER 1\n" +
                            "                  User ID. This can be obtained by tagging\n" +
                            "                  the user.\n" +
                            "jail user         Places a user in jail.\n" +
                            "help              Prints this help message.\n" +
                            "reboot            Asks AstralMod to reconnect.\n" +
                            "poweroff          Asks AstralMod to leave the server.\n" +
                            "```")
                        break;
                    default:
                        if (command.startsWith("uinfo")) {
                            command = command.substr(6);
                            command = command.replace("<", "").replace(">", "").replace("@", "").replace("!", "");
                            
                            client.fetchUser(command).then(function(user) {
                                embed = new Discord.RichEmbed();
                                embed.setAuthor(user.username, user.displayAvatarURL);
                                embed.setColor("#FF0000");
                                var msg = "Discriminator: " + user.discriminator + "\n" + 
                                            "Created at: " + user.createdAt.toUTCString();
                                embed.setDescription(msg);
                                message.channel.sendEmbed(embed);
                            }).catch(function(reason) {
                                message.channel.send(':no_entry_sign: That didn\'t work. You might want to try again.');
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
                        }
                }
                
                if (command == "poweroff") {
                    if (poweroff) {
                        message.channel.send(':white_check_mark: WAIT! Please! What have I ever done!? NOOO...').then(function() {
                            process.exit(0);
                        }).catch(function() {
                            process.exit(0);
                        });
                    } else {
                        message.channel.send(':information_source: To power off AstralMod, type in mod:poweroff again.');
                        poweroff = true;
                    }
                } else {
                    poweroff = false;
                }
                
                if (!command.startsWith("jail")) {
                    jailMember = null;
                }
            } else {
                message.reply(':no_entry_sign: NO: What? You\'re not a member of the staff! Why would you be allowed to type that!?');
            }
        }
        
        //Spam limiting
        if (lastMessages[message.author.id] != msg) {
            sameMessageCount[message.author.id] = 0;
        }
        lastMessages[message.author.id] = msg
        sameMessageCount[message.author.id] += 1;
        
        if (smallMessageCount[message.author.id] == null) {
            smallMessageCount[message.author.id] = 0;
        }
        
        if (msg.length < 5 || msg.indexOf(" ") == -1) {
            smallMessageCount[message.author.id] += 1;
        } else {
            smallMessageCount[message.author.id] = 0;
        }
        
        if (lastMessages[message.author.id] == msg && sameMessageCount[message.author.id] == 10) {
            var auth = message.author;
            if (message.guild.id == 277922530973581312) { //AstralPhaser
                client.channels.get("282513354118004747").sendMessage("<:vtBoshyTime:280178631886635008> PING! <@" + auth.id + "> was spamming on " + message.channel.name + ".");
            } else { //ShiftOS
                client.channels.get("282513112257658880").sendMessage("<:vtBoshyTime:280542032261545984> PING! <@" + auth.id + "> was spamming on " + message.channel.name + ".");
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
                client.channels.get("282513354118004747").sendMessage("<:vtBoshyTime:280178631886635008> PING! <@" + auth.id + "> was spamming on " + message.channel.name + ".");
            } else { //ShiftOS
                client.channels.get("282513112257658880").sendMessage("<:vtBoshyTime:280542032261545984> PING! <@" + auth.id + "> was spamming on " + message.channel.name + ".");
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

client.on('message', messageChecker);
client.on('messageUpdate', messageChecker);

client.on('guildMemberUpdate', function(oldUser, newUser) {
    if (newUser.guild.id == 277922530973581312) {
        if (!oldUser.roles.find("name", "I Broke The Rules!") && newUser.roles.find("name", "I Broke The Rules!")) {
            client.channels.get("277943393231831040").sendMessage("<@" + newUser.id + "> :oncoming_police_car: You are now in jail. Appeal here to get out of jail. If you do not appeal successfully within 24 hours, an admin will **ban** you from the server.\n\n" + 
            "Additionally, if you leave and rejoin this server in an attempt to break out of jail, you will be **banned.**\n\n" + 
            "Timestamp: " + new Date().toUTCString());
        }
    }
});

client.login('MjgyMDQ4NTk5NTc0MDUyODY0.C4g2Pw.yFGdUuMlZITH99tWEic0JxIUGJ4').catch(function() {
    console.log("[ERROR] Login failed.");
});
