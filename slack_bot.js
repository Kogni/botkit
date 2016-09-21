/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


This is a sample Slack bot built with Botkit.

This bot demonstrates many of the core features of Botkit:

* Connect to Slack using the real time API
* Receive messages based on "spoken" patterns
* Reply to messages
* Use the conversation system to ask questions
* Use the built in storage system to store and retrieve information
  for a user.

# RUN THE BOT:

  Get a Bot token from Slack:

    -> http://my.slack.com/services/new/bot

  Run your bot from the command line:

    token=<MY TOKEN> node slack_bot.js

# USE THE BOT:

  Find your bot inside Slack to send it a direct message.

  Say: "Hello"

  The bot will reply "Hello!"

  Say: "who are you?"

  The bot will tell you its name, where it is running, and for how long.

  Say: "Call me <nickname>"

  Tell the bot your nickname. Now you are friends.

  Say: "who am I?"

  The bot will tell you your nickname, if it knows one for you.

  Say: "shutdown"

  The bot will ask if you are sure, and then shut itself down.

  Make sure to invite your bot into other channels using /invite @<my bot>!

# EXTEND THE BOT:

  Botkit has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/



if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('./lib/Botkit.js');
var os = require('os');

var controller = Botkit.slackbot({
    debug: true
});

var bot = controller.spawn({
    token: process.env.token
}).startRTM();

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}

// Ting å fikse:
// Lagring av sitater per bruker
//

var fullTeamList = [];
var fullChannelList = [];
var channelList = [];


controller.hears(['hello', 'hi'], 'direct_message,direct_mention,mention', function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });


    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
        } else {
            bot.reply(message, 'Hello.');
        }
    });
});

controller.hears(['call me (.*)', 'my name is (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
    var name = message.match[1];
    controller.storage.users.get(message.user, function(err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.name = name;
        controller.storage.users.save(user, function(err, id) {
            bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
        });
    });
});

controller.hears(['what is my name', 'who am i'], 'direct_message,direct_mention,mention', function(bot, message) {

    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Your name is ' + user.name);
        } else {
            bot.startConversation(message, function(err, convo) {
                if (!err) {
                    convo.say('I do not know your name yet!');
                    convo.ask('What should I call you?', function(response, convo) {
                        convo.ask('You want me to call you `' + response.text + '`?', [
                            {
                                pattern: 'yes',
                                callback: function(response, convo) {
                                    // since no further messages are queued
									// after
									// this,
                                    // the conversation will end naturally with
									// status
									// ==
									// 'completed'
                                    convo.next();
                                }
                            },
                            {
                                pattern: 'no',
                                callback: function(response, convo) {
                                    // stop the conversation. this will cause it
									// to
									// end
									// with
									// status
									// ==
									// 'stopped'
                                    convo.stop();
                                }
                            },
                            {
                                default: true,
                                callback: function(response, convo) {
                                    convo.repeat();
                                    convo.next();
                                }
                            }
                        ]);

                        convo.next();

                    }, {'key': 'nickname'}); // store the results in a field
												// called
												// nickname

                    convo.on('end', function(convo) {
                        if (convo.status == 'completed') {
                            bot.reply(message, 'OK! I will update my dossier...');

                            controller.storage.users.get(message.user, function(err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.name = convo.extractResponse('nickname');
                                controller.storage.users.save(user, function(err, id) {
                                    bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
                                });
                            });



                        } else {
                            // this happens if the conversation ended
							// prematurely for some
							// reason
                            bot.reply(message, 'OK, nevermind!');
                        }
                    });
                }
            });
        }
    });
});


controller.hears(['shutdown'], 'direct_message,direct_mention,mention', function(bot, message) {

    bot.startConversation(message, function(err, convo) {

        convo.ask('Are you sure you want me to shutdown?', [
            {
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    convo.say('Bye!');
                    convo.next();
                    setTimeout(function() {
                        process.exit();
                    }, 3000);
                }
            },
        {
            pattern: bot.utterances.no,
            default: true,
            callback: function(response, convo) {
                convo.say('*Phew!*');
                convo.next();
            }
        }
        ]);
    });
});


controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention,mention', function(bot, message) {

        var hostname = os.hostname();
        var uptime = formatUptime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
             '>. I have been running for ' + uptime + ' on ' + hostname + '.');

    });

controller.hears(['hvordan går det?'],
	    'direct_message,direct_mention,mention', function(bot, message) {

	        var hostname = os.hostname();
	        var uptime = formatUptime(process.uptime());

	        bot.reply(message,
	            'Jeg har det fint!');

	    });

// channel BitRaf general, C03G9SFKR
controller.hears(['hva koster medlemsskap', '(.*)koster medlemsskap(.*)'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Medlemsskap er ikke nødvendig for å være på Bitraf, men det vil gi deg egen elektronisk nøkkel. Medlemsskap i Bitraf koster 300 for støttemedlemmer og 500 for vanlige medlemmer :)');

});

controller.hears(['hvordan(.*)tilgang(.*)tredje etasje(.*)\\?'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Bruk innvendig trapp mellom 2. og 3. etasje :)');

});

controller.hears(['hvordan(.*)lagringsplass(.*)\\?', '(.*)hvordan(.*)lagringsplass(.*)\\?', 'hvordan(.*)lagringsplass\\?', '(.*) lagre prosjekter'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Lagringsplass på Bitraf: Kjøp deg en passende boks på Clas Ohlson, og plassèr i rommet mellom kjøkken og kjøleskap :)');

});

controller.hears(['bitraf(.*)bitraf24(.*)\\?','bitraf24(.*)bitraf(.*)\\?'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Forskjellen på Bitraf og Bitraf24 i wifi: Bitraf er 5GHZ, Bitraf24 er 2.4GHZ');

});

controller.hears(['(.*)Link Error\\?','(.*)link error\\?'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Feilmeldingen "Link Error" i AutoLaser software skyldes at Com ikke er satt. Click "Search" på høyre side i Work-taben. Com resetter seg stadig vekk.');

});

controller.hears(['(.*)laserkutter(.*)steel\\?','(.*)laserkutter(.*)stål\\?','(.*)laser kutter(.*)steel\\?','(.*)laser kutter(.*)stål\\?'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Bitrafs laserkutter tar ikke metall. CNC må brukes isteden.');

});

controller.hears(['(.*)kontorplass\\?', '(.*)kontorplass(.*)\\?'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Kontorplasser hos Bitraf: Hør med Thomas. For øyeblikket er alle kontorer opptatte.');

});

controller.hears(['galleri(.*)bitraf\\?','bitraf(.*)galleri\\?'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Galleri på Biotraf.no: Send 1 bilde per mail til galleri@bitraf.no. Mailens topic blir brukt som undertekst til bildet. Bildet publiseres straks.');

});

controller.hears(['funker printer\\?','printer funker\\?','printeren funker\\?','2d(.*)printer(.*)bitraf\\?','printer(.*)bitraf\\?'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'For øyeblikket er det ingen fungerende 2D-printer på BitRaf');

});

// Fallbackk for udefinerte spørsmål
controller.hears(['(.*)lagringsplass(.*)\\?', '(.*)lagerplass(.*)\\?'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Spørsmålet om lagringsplass ble dessverre ikke gjenkjent');

});
controller.hears(['(.*)cnc(.*)\\?'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Spørsmålet om CNC ble dessverre ikke gjenkjent');

});
controller.hears(['(.*)laser(.*)\\?'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Spørsmålet om laser ble dessverre ikke gjenkjent');

});
controller.hears(['(.*)printer(.*)\\?'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Spørsmålet om printer ble dessverre ikke gjenkjent');

});
controller.hears(['(.*)galleri(.*)\\?'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Spørsmålet om galleri ble dessverre ikke gjenkjent');

});
controller.hears(['(.*)bitraf(.*)\\?'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Spørsmålet om bitraf ble dessverre ikke gjenkjent');

});

// channel random, C03G9SFKV
controller.hears(['Trolol'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Trulul! '+message.channel);
    if ( message.channel.indexOf("C2961L0U9") > 0){ // test
	bot.reply(message, 'Trulul #1!');
    } else if ( message.channel.indexOf("D28M8LFMX") > 0){ // faq-bot priv
	bot.reply(message, 'Trulul #2!');
    }  else if ( message.channel.indexOf("C03G9SFKV") > 0){ // random
	bot.reply(message, 'Trulul #3!');
    } else {
	bot.reply(message, 'Fail!');
    }
});

// channel test, C2961L0U9
controller.hears(['(.*)\\?'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Dumdidum? '+message.channel );
    if ( message.channel.indexOf("C2961L0U9") > 0){//test
	bot.reply(message, 'Dumdidum 1');
    } else if ( message.channel.indexOf("C03G9SFKR") > 0){//general
	//bot.reply(message, 'Spørsmålet ble ikke gjenkjent');
    } else {//other
	bot.reply(message, 'Dumdidum 2');
    }
});
controller.hears(['(.*)\\!'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Dumdidum! '+message.channel);
    if ( message.channel.indexOf('C296') > 0){//test
	bot.reply(message, 'Dumdidum 1!');
    } else if ( message.channel.indexOf('C2961L0U9') > 0){//test
	bot.reply(message, 'Dumdidum 2!');
    } else {
	bot.reply(message, 'Feil chan? '+message.channel+" C2961L0U9");
    }
});
controller.hears(['abc'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'ABC! '+message.channel);
    if ( message.channel.indexOf("C2961L0U9") > 0){//test
	bot.reply(message, 'ABC!');
    }
});

// channel faq-bot priv, D28M8LFMX!

controller.hears(['kanal\\?'], 'ambient,direct_message,direct_mention,mention', function(bot, message) {

    bot.reply(message, 'Denne kanalens ID er '+message.channel);

});

function printObject(o) {
    var out = '';
    for (var p in o) {
      out += p + ': ' + o[p] + '\n';
    }
    return out;
  }

