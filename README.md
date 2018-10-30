# slack-kiwatch
Api to answer Slack slash commands and interact with Kiwatch API (cameras monitoring)

## Disclaimer

This repository uses google cloud function with nodeJS 8 runtime, which is in Beta state but allow the use of async/await keywords

## TODO 

* [ ] add ability to call watch on the mailbox every 7 days
* [ ] respond to messages in slack in a quick way and use response url to tell the user when it's done in order to avoid timeout


### Setting up  


#### Get the code

Clone the repo

Copy the config file before editing it with your entries

`cp config.default.js config.js`

#### Create a google cloud function

Set up your account to be ready to use the google cloud platform (see [here](https://cloud.google.com/functions/docs/tutorials/slack#functions-prepare-environment-node8) the step _Before you begin_ )

[Create a function on google cloud platform](https://console.cloud.google.com/functions). 

Name it `alarme`

Choose the node V8 runtime

Keep the function URL trigger somewhere, you will need it when configuring slack

#### Add a slack application
 
[Create an app in Slack](https://api.slack.com/apps?new_app=1)

Set up the following:
 * Turn on Incoming Webhook
 * Turn on Interactive Components, with the request URL of your google function
 * Turn on Slash Commands and create `/alarme` command to send reqest to your google function URL
 
Get the slack token, slack webhook url, slack signing secret to put in `config.js` file


#### Using direct gmail push notification

Set up a topic named `alarme` to push notifications from gmail to the pubsub api (Follow this tutorial https://developers.google.com/gmail/api/guides/push)

Enter the setting of your topic in `config.js` for key `PUBSUB_TOPIC`

Create a client for the oauth authorisation flow [here](https://console.cloud.google.com/apis/credentials). And download the key file. Use the content of the key file to fill in `config.js` file with the `oauth` key.
Set the account redirect url to `http://locahost:3000/oauth2callback`


Obtain an `access_token` and a `refresh_token` for your gmail account which is receiving kiwatch alerts using. This command also set up the gmail inbox to send push notifications to the PubSub API
```
node oauth2.js 
```

Set the tokens in `config.js`

 
#### Upload the function

run `npm run deploy` to deploy the function to google cloud platform

run `npm run deployBack` to deploy the backend function to google cloud platform using a subscription to the topic `alarme`

## How it works

From slack, calls to `/alarme on` set the mode to INTRUSION, and `/alarme off` set the mode to NONE

Emails sent by kiwatch as alerts are processed by gmail and sent to the handleNewEmail function, which responds and sends a message to slack (using the `SLACK_WEBHOOKURL`) with action buttons.


## Very useful resources to get started

* [Cloud Functions Slack tutorial][tutorial]
* [Cloud Functions Slack sample source code][code]

[tutorial]: https://cloud.google.com/functions/docs/tutorials/slack
[code]: https://github.com/GoogleCloudPlatform/nodejs-docs-samples/tree/master/functions/slack
