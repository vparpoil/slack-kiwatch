// Copyright 2012-2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

const configFile = require("./config.js");
const config = configFile.config;

const http = require("http");
const url = require("url");
const querystring = require("querystring");
const opn = require("opn");
const destroyer = require("server-destroy");

const {google} = require("googleapis");
const plus = google.plus("v1");
const gmail = google.gmail("v1");

/**
 * To use OAuth2 authentication, we need access to a a CLIENT_ID, CLIENT_SECRET, AND REDIRECT_URI.  To get these credentials for your application, visit https://console.cloud.google.com/apis/credentials.
 */
const keys = config.oauth.web;

if (config.PUBSUB_TOPIC == "projects/PROJECT_ID/topics/TOPIC_NAME") {
    console.error("ERROR - Please define PUBSUB_TOPIC in config.js first")
    return;
}

/**
 * Create a new OAuth2 client with the configured keys.
 */
const oauth2Client = new google.auth.OAuth2(
    keys.client_id,
    keys.client_secret,
    keys.redirect_uris[0]
);

/**
 * This is one of the many ways you can configure googleapis to use authentication credentials.  In this method, we're setting a global reference for all APIs.  Any other API you use here, like google.drive('v3'), will now use this auth client. You can also override the auth client at the service and method call levels.
 */
google.options({auth: oauth2Client});

/**
 * Open an http server to accept the oauth callback. In this simple example, the only request to our webserver is to /callback?code=<code>
 */
async function authenticate(scopes) {
    return new Promise((resolve, reject) => {
        // grab the url that will be used for authorization
        const authorizeUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            approval_prompt: "force",
            scope: scopes.join(" ")
        });
        const server = http
            .createServer(async (req, res) => {
                try {
                    if (req.url.indexOf("/oauth2callback") > -1) {
                        const qs = querystring.parse(url.parse(req.url).query);
                        res.end("Authentication successful! Please return to the console.");
                        server.destroy();
                        const {tokens} = await oauth2Client.getToken(qs.code);
                        console.log("HERE ARE THE TOKENS");
                        console.log(tokens)
                        oauth2Client.credentials = tokens;
                        oauth2Client;
                        resolve(oauth2Client);
                    }
                }
                catch (e) {
                    reject(e);
                }
            })
            .listen(3000, () => {
                //console.log("listen");
                // open the browser to the authorize url to start the workflow
                opn(authorizeUrl, {wait: false}).then(cp => {
                    //console.log(cp);
                    cp.unref();
                });
            });
        //console.log(server);
        destroyer(server);
    });
}

async function runSample() {
    var options = {
        userId: "me",
        resource: {
            labelIds: ["INBOX"],
            topicName: config.PUBSUB_TOPIC
        }
    };
    // watch notifications
    const res = await gmail.users.watch(options);
}

const scopes = ["https://www.googleapis.com/auth/gmail.modify"];
runSample(oauth2Client).catch(console.error);

authenticate(scopes)
    .then(client => runSample(client))
    .catch(console.error);
