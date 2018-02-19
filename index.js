
var http = require('http');

exports.handler = function (event, context) {
    try {
        //console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

// session starts
function onSessionStarted(sessionStartedRequest, session) {
    //console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId);
}

// when not specified what to do
function onLaunch(launchRequest, session, callback) {
    // console.log("onLaunch requestId=" + launchRequest.requestId);

    // skill launch
    getWelcomeResponse(callback);
}

// user specifies intent
function onIntent(intentRequest, session, callback) {
    // console.log("onIntent requestId=" + intentRequest.requestId);
    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // skill's intent handlers
    if ("WordMasterintent" === intentName) {
        getSyn(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getHelpResponse(callback);
    } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) {
        handleSessionEndRequest(callback);
    } else {
        throw "Invalid intent";
    }
}

// user ends session
function onSessionEnded(sessionEndedRequest, session) {
    //console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId);
}

// skill's behaviour

function getWelcomeResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to Word Master. " +
        "I can find synonyms for words. Please use only single words, for example dog, but not German shepherd.";
    var repromptText = "You can get help by saying help and stop by saying stop and cancel by saying cancel.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getHelpResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Help";
    var speechOutput = "To use Word Master you say a word you would like a synonym for. Only single words, for example dog, but not German shepherd.";
    var repromptText = "Go ahead, say a singular word.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    var cardTitle = "Session Ended";
    var speechOutput = "Thank you for using Word Master. Keep learning. Have a nice day!";
    var shouldEndSession = true;//exiting the skill

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function makeTheoRequest(word, theoResponseCallback) {

   if (word===undefined) {
     theoResponseCallback(new Error('undefined'));
   }
  // api here
  var query_url ='http://words.bighugelabs.com/api/2/dd7538424e122a7e1188aa55fe67454e/' + word + '/json';
  var body = '';
  var jsonObject;

  http.get(query_url, (res) => {
    if (res.statusCode==200) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          body += chunk;
        });
        res.on('end', () => {
          jsonObject = JSON.parse(body);

           theoResponseCallback(null, body);

        });
    }
    else if (res.statusCode==303) {
        query_url ='http://words.bighugelabs.com/api/2/dd7538424e122a7e1188aa55fe67454e/' +res.statusMessage + '/json';
        http.get(query_url, (res2) => {
            res2.setEncoding('utf8');
            res2.on('data', function (chunk) {
              body += chunk;
            });
            res2.on('end', () => {
              jsonObject = JSON.parse(body);
               theoResponseCallback(null, body);
            });
        });
    }
    else {
      theoResponseCallback(new Error(res.statusCode));
    }
  }).on('error', (e) => {
     theoResponseCallback(new Error(e.message));
  });
}

function getSyn(intent, session, callback) {
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";
    var maxLength = 0;

    makeTheoRequest( intent.slots.queryword.value, function theoResponseCallback(err, theoResponseBody) {
        var speechOutput;

        if (err) {
            if (err=='undefined'){
                 speechOutput = "Sorry, this service can only handle single word, for example dog. Multiple words such as German shepherd will not work.";
            }
            else {
                speechOutput = "Sorry, this service is experiencing a problem with your request. Try again or try a different singular word. Multiple words such as German shepherd will not work.";
            }

        } else {

            var theoResponse = JSON.parse(theoResponseBody);

            speechOutput = "Here's what I found: ";

            if (theoResponse.hasOwnProperty('noun')) {
                speechOutput += intent.slots.queryword.value + ', used as a noun, ';
                maxLength = Object.keys(theoResponse.noun.syn).length;
                if (Object.keys(theoResponse.noun.syn).length>5)
                {
                    maxLength = 5;
                }

                for(var i=0;i<maxLength;i++) {
                if (i>0){
                    speechOutput += ", or ";
                }
                speechOutput +=  theoResponse.noun.syn[i];

                }
                speechOutput += '. '
            }

            if (theoResponse.hasOwnProperty('verb')){
                speechOutput += intent.slots.queryword.value + ', used as a verb, ';
                maxLength = Object.keys(theoResponse.verb.syn).length;
                if (Object.keys(theoResponse.verb.syn).length>5)
                {
                    maxLength = 5;
                }

                for(var i=0;i<maxLength;i++) {
                if (i>0){
                    speechOutput += ", or ";
                }
                speechOutput +=  theoResponse.verb.syn[i];

                }
                speechOutput += '. '
            }

            if (theoResponse.hasOwnProperty('adverb')){
                speechOutput += intent.slots.queryword.value + ', used as an adverb, ';
                maxLength = Object.keys(theoResponse.adverb.syn).length;
                if (Object.keys(theoResponse.adverb.syn).length>5)
                {
                    maxLength = 5;
                }

                for(var i=0;i<maxLength;i++) {
                if (i>0){
                    speechOutput += ", or ";
                }
                speechOutput +=  theoResponse.adverb.syn[i];

                }
                speechOutput += '. '
            }

            if (theoResponse.hasOwnProperty('adjective')){
                speechOutput += intent.slots.queryword.value + ', used as an adjective, ';
                maxLength = Object.keys(theoResponse.adjective.syn).length;
                if (Object.keys(theoResponse.adjective.syn).length>5)
                {
                    maxLength = 5;
                }

                for(var i=0;i<maxLength;i++) {
                if (i>0){
                    speechOutput += ", or ";
                }
                speechOutput +=  theoResponse.adjective.syn[i];

                }
                speechOutput += '. '
            }

        }
        callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
    });

}


//Helper functions

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "Word Master",
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
