# slack-kiwatch
Api to answer Slack slash commands and interact with Kiwatch API (cameras monitoring)

## Disclaimer

This repository uses google cloud function with nodeJS 8 runtime, which is in Beta state but allow the use of async/await keywords

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

#### Set up Zapier

Use Zapier to create a zap that take every incoming message in your alert mailbox to send it to the google function: create a step 1 that get the email using the gmail connector (or other), then create a step 2 : webhook that sends a POST request to your google function URL with the following data : 
  * token (that is whatever you want), 
  * bodyHtml (from step 1)
  * email (from step 1)
  
Add the token that you chose to `config.js`
 
#### Upload the function

run `npm run deploy` to deploy the function to google cloud platform

## How it works

From slack, calls to `/alarme on` set the mode to INTRUSION, and `/alarme off` set the mode to NONE

Emails sent by kiwatch as alerts are processed by zapier and sent to the alarme function (using the `ZAPIER_TOKEN` configuration token as `body.token`), which responds and sends a message to slack (using the `SLACK_WEBHOOKURL`) with action buttons.


## Very useful resources to get started

* [Cloud Functions Slack tutorial][tutorial]
* [Cloud Functions Slack sample source code][code]

[tutorial]: https://cloud.google.com/functions/docs/tutorials/slack
[code]: https://github.com/GoogleCloudPlatform/nodejs-docs-samples/tree/master/functions/slack
