exports.config = {
    "SLACK_TOKEN": "",
    "SLACK_WEBHOOKURL": "",
    "ZAPIER_TOKEN": "",
    "KIWATCH_LOGIN": "",
    "KIWATCH_PASSWORD": "",
    "GOOGLE_ACCESS_TOKEN": "",
    "GOOGLE_REFRESH_TOKEN": "",
    "oauth": {
        "web": {
            "client_id": "",
            "project_id": "",
            "auth_uri": "",
            "token_uri": "",
            "auth_provider_x509_cert_url": "",
            "client_secret": "",
            "redirect_uris": [
                ""
            ]
        }
    },
    "PUBSUB_TOPIC": "projects/PROJECT_ID/topics/TOPIC_NAME"

};

/**
 * an array of cameras
 * name: useless for now
 * ressourceId : cameraUUID
 */
exports.cameras = [
    {
        name: "",
        ressourceId: "",
    },
    /*{
        name: "",
        ressourceId: "",
    }*/
];
