'use strict';

const red = "#E84855";
const blue = '#3367d6';
const green = "#20BF55";

const configFile = require("./config.js");
const config = configFile.config;
const CAMERAS = configFile.cameras;

const https = require('https');
const zlib = require("zlib");
const Slack = require('slack-node');
const {google} = require("googleapis");
const gmail = google.gmail("v1");


let sessionToken;

function formatSlackMessage(query, response) {
    // Prepare a rich Slack message
    // See https://api.slack.com/docs/message-formatting
    const slackMessage = {
        response_type: 'in_channel',
        //text: `Message automatique`,
        attachments: []
    };

    let color = blue;
    if (query === "on") {
        color = red;
    }
    else if (query === "off") {
        color = green;
    }
    const attachment = {
        color: color,
    };
    if (response.name) {
        attachment.title = response.name;
        if (response.description) {
            attachment.title = `${attachment.title}: ${response.description}`;
        }
    }

    slackMessage.attachments.push(attachment);

    return slackMessage;
}


function verifyWebhook(body) {
    if (!body || (body.token !== config.SLACK_TOKEN)) {
        const error = new Error('Invalid credentials');
        error.code = 401;
        throw error;
    }
    if (body.token === config.SLACK_TOKEN) {
        return "slack";
    }
}

async function sendRequestToKiwatch(options, body) {
    return new Promise((resolve, reject) => {
        let buffer = [];
        let request = https.request(options, function (res) {
            let contentEncoding = res.headers["content-encoding"];
            if (contentEncoding === "gzip") {
                let gunzip = zlib.createGunzip();
                res.pipe(gunzip);

                gunzip.on('data', function (data) {
                    // decompression chunk ready, add it to the buffer
                    buffer.push(data.toString())

                }).on("end", function () {
                    // response and decompression complete, join the buffer and return
                    resolve(JSON.parse(buffer.join("")));

                }).on("error", function (e) {
                    reject(e);
                })
            }
            else {
                let body = '';
                res.on('data', function (data) {
                    body += data.toString();
                });
                res.on('end', function () {
                    resolve(body)
                })
            }
        }).on("error", (err) => {
            console.log("Error: " + err.message);
            reject(err)
        });
        if (options.method === "POST" || options.method === "PUT") {
            request.write(JSON.stringify(body));
        }
        request.end()
    });
}

async function logInOnKiwatch() {
    const credentials = {
        "login": config.KIWATCH_LOGIN,
        "password": config.KIWATCH_PASSWORD,
    };

    const post_options = {
        host: 'my.kiwatch.com',
        port: '443',
        path: '/restapi/services/login/credentials',
        method: 'POST',
        headers: {
            "Accept": "application/json",
            'Content-Type': 'application/json',
            'apiVersion': "2.0"
        }
    };
    const response = await sendRequestToKiwatch(post_options, credentials);
    sessionToken = response.sessionToken;
    return sessionToken
}

async function setDetectionService(cameraId, detectionMode) {
    const post_options = {
        host: 'my.kiwatch.com',
        port: '443',
        path: `/restapi/services/cameras/${cameraId}/set_detection_service`,
        method: 'PUT',
        headers: {
            "Accept": "application/json",
            'Content-Type': 'application/json',
            'apiVersion': "2.0",
            "sessionToken": sessionToken,
        }
    };
    const response = await sendRequestToKiwatch(post_options, detectionMode);
    // basic verification that the detectionServiceMode effectively changed
    if (response.detectionServiceMode !== detectionMode) {
        const error = new Error(`Detection mode failed to set to ${detectionMode}`);
        error.code = 500;
        throw error;
    }
    return response.detectionServiceMode;
}

async function toggleAlarme(detectionMode, name, query, responseUrl) {
    const data = await logInOnKiwatch();
    if (detectionMode) {
        for (let index in CAMERAS) {
            const camera = CAMERAS[index];
            await setDetectionService(camera.ressourceId, detectionMode)
        }
    }

    // push here answer to slack
    let response = formatSlackMessage(query, {name: name})
    const slack = new Slack();
    slack.setWebhook(responseUrl);
    slack.webhook(response, function (err, response) {
        console.log("err", err);
        console.log("response", response);
    });

}

async function gestionAlarme(query, requestBody) {
    //console.log("request", requestBody);
    let detectionMode, name;
    if (query === "on") {
        detectionMode = "INTRUSION";
        name = `Alarme activée par ${requestBody.user_name}`;
    }
    else if (query === "off") {
        detectionMode = "NONE";
        name = `Alarme désactivée par ${requestBody.user_name}`;
    }
    else {
        return {
            "response_type": "ephemeral",
            "text": "Mode d'emploi /alarme",
            "attachments": [
                {
                    "text": "Utilisations que je comprends :  `/alarme on` pour allumer l'alarme et `/alarme off` pour l'éteindre. Ces commandes ne fonctionnent que dans le channel #alarme"
                }
            ]
        }
    }

    // hack to allow me to use it outside of channel for tests
    if (requestBody.channel_id !== 'CD98UPRQB' && requestBody.user_id !== "U2QKVVA4Q") {
        return {
            "response_type": "ephemeral",
            "text": "Mode d'emploi /alarme",
            "attachments": [
                {
                    "text": "La commande `/alarme` ne fonctionne que dans le channel #alarme"
                }
            ]
        }
    }

    // do not await here ! send a direct response !
    toggleAlarme(detectionMode, name, query, requestBody.response_url).then((error, result) => {
        // do not act
    });


    return {
        response_type: 'ephemeral',
        text: `Je suis en train de m'en occuper, attendez quelques secondes...`,
        attachments: []
    };
}


async function handleInteractiveMessage(body) {
    if (body.callback_id === "buttonsAlerteEmail") {

        let originalMessage = body.original_message;
        let text, color;
        if (body.actions[0].value === "ok") {
            text = `Alarme désactivée par ${body.user.name}`;
            color = green
            await logInOnKiwatch();
            for (let index in CAMERAS) {
                const camera = CAMERAS[index];
                await setDetectionService(camera.ressourceId, "NONE");
            }
        }
        else if (body.actions[0].value === "alert") {
            text = `Demande d'alerte par ${body.user.name} - SANS EFFET POUR LE MOMENT (à venir)`;
            color = red
        }
        // replace the buttons with the following
        originalMessage.attachments[0].actions = [];
        originalMessage.attachments.push({title: text, color: color});
        //originalMessage.response_type = 'in_channel';

        return originalMessage;
    }
}

exports.alarme = (req, res) => {
    return Promise.resolve()
        .then(() => {
            if (req.method !== 'POST') {
                const error = new Error('Only POST requests are accepted');
                error.code = 405;
                throw error;
            }

            // handle interactive messages payloads
            let body = req.body;
            if (body.payload) {
                body = JSON.parse(body.payload)
            }

            // Verify that this request came from Slack or Zappier
            const client = verifyWebhook(body);
            //console.log("body", body);
            if (client === "slack") {
                console.log("body", body);


                if (body.type === "interactive_message") {
                    return handleInteractiveMessage(body);
                }
                else {
                    return gestionAlarme(body.text, body);
                }
            }
        })
        .then((response) => {
            // Send the formatted message back to Slack
            //console.log("response")
            //console.log(response)
            res.json(response);
        })
        .catch((err) => {
            console.error(err);
            res.status(err.code || 500).send(err);
            return Promise.reject(err);
        });
};


function parseMessage(message) {
    let text = message.snippet.split(".")[0];
    let body = message.payload.body.data;
    let bodyDecode = Buffer.from(body, 'base64').toString();
    let url = bodyDecode.match(/src=\"https:\/\/my.kiwatch.com\/get_snapshot_alert.gif.*"/)[0].split('"')[1];
    return {text: text, gifUrl: url};
};

/**
 * Background Cloud Function to be triggered by Pub/Sub.
 * This function is exported by index.js, and executed when
 * the trigger topic receives a message.
 * This execution is determined by the parameters of the deploy function (see package.js)
 *
 * @param {object} data The event payload.
 * @param {object} context The event metadata.
 */
exports.handleNewEmail = async function (data, context) {
    //const dataPayload = data.textPayload.data;

    console.log("======handleNewEmail======V15");
    //let details = Buffer.from(data.data, 'base64').toString();
    //let historyId = JSON.parse(details).historyId;
    // actually historyID does not help...
    // see https://stackoverflow.com/questions/31797416/gmail-api-users-watch-no-details-for-historyid

    // we need now to find the emails

    // let's auth
    const keys = config.oauth.web;
    /**
     * Create a new OAuth2 client with the configured keys.
     */
    const oauth2Client = new google.auth.OAuth2(
        keys.client_id,
        keys.client_secret,
        keys.redirect_uris[0]
    );
    oauth2Client.credentials = {
        access_token: config.GOOGLE_ACCESS_TOKEN,
        refresh_token: config.GOOGLE_REFRESH_TOKEN
    };
    oauth2Client;
    google.options({auth: oauth2Client});

    // get the last email in mailbox
    const res = await gmail.users.messages.list({
        userId: "alarmesquare@gmail.com",
        maxResults: 1,
        q: "is:unread",
    });

    //console.log("=== RESULT== ");
    //console.log(JSON.stringify(res.data));
    if (!res.data.messages) {
        console.log("ABORT, NO MESSAGE");
        return;
    }
    // we get here the ids of the incoming messages
    let messages = res.data.messages;
    for (let index in messages) {
        let message = messages[index];
        // we use gmail API to know more about it
        let fullMessage = await gmail.users.messages.get({
            userId: "alarmesquare@gmail.com",
            id: message.id,
            format: 'full',
        });
        // extraction of the relevant content
        //console.log("FULL message", JSON.stringify(fullMessage.data))
        let parsed = parseMessage(fullMessage.data);
        //console.log("parsed email", parsed)
        if (parsed.text) {
            // we send the result to slack if needed
            const slack = new Slack();
            slack.setWebhook(config.SLACK_WEBHOOKURL);
            slack.webhook({
                attachments: [
                    {
                        title: "DIRECT - " + parsed.text,
                        fallback: "DIRECT - " + parsed.text,
                        color: red,
                        attachment_type: "default",
                        callback_id: "buttonsAlerteEmail",
                        image_url: parsed.gifUrl,
                        actions: [
                            {
                                name: "ok",
                                value: "ok",
                                type: "button",
                                style: "primary",
                                text: "Je suis sur place, désactive l'alarme",
                            },
                            {
                                name: "alert",
                                value: "alert",
                                type: "button",
                                style: "danger",
                                text: "C'est suspect, donne l'alerte",
                            }
                        ]
                    }
                ]

            }, function (err, response) {
                console.log("err", err);
                console.log("response", response);
            });
        }


    }

};
