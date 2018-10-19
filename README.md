# slack-kiwatch
Api to answer Slack slash commands and interact with Kiwatch API (cameras monitoring)

## Disclaimer

This repository uses google cloud function with nodeJS 8 runtime, which is in Beta state but allow the use of async/await keywords

## How to use

Clone the repo

Copy the config file before editing it with your entries

`cp config.default.js config.js`

## How it works

From slack, calls to `/alarme on` set the mode to INTRUSION, and `/alarme off` set the mode to NONE

Emails sent by kiwatch as alerts are processed by zapier and sent to the alarme function (using the `ZAPIER_TOKEN` configuration token as `body.token`), which responds and sends a message to slack (using the `SLACK_WEBHOOKURL) with action buttons.


## Very useful resources to get started

* [Cloud Functions Slack tutorial][tutorial]
* [Cloud Functions Slack sample source code][code]

[tutorial]: https://cloud.google.com/functions/docs/tutorials/slack
[code]: https://github.com/GoogleCloudPlatform/nodejs-docs-samples/tree/master/functions/slack
``