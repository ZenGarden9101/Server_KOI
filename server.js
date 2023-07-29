/*
 * MQTT Server - Display (peer 01) side sketch
 * Author: mlai4943, qxie3495, yuwu0411, zcui2280
 * Date: May 2023
 *
 * Adapted and modified based on IDEA9101 IDEA Lab
 * WEEK 04 - Example - MQTT Receiver by Luke Hespanhol
 */

// Port for the Express web server (receiver)
var WEB_SERVER_PORT = 4000;

// Import Express and initialise the web server
var express = require("express");
var app = express();
var server = app.listen(WEB_SERVER_PORT);
app.use(express.static("public"));
console.log("Node.js Express server running on port " + WEB_SERVER_PORT);

// Import and configure body-parser for Express
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Import socket.io and create a socket to talk to the client
var socket = require("socket.io");
var io = socket(server);
io.sockets.on("connection", newSocketConnection);

function newSocketConnection(socket) {
    console.log("*** New connection to server web socket " + socket.id);
}

// Import MQTT
var mqtt = require("mqtt");
const mqttHost = "public.mqtthq.com";
const mqttPort = "1883";
const mqttClientId = `mqtt_${Math.random().toString(16).slice(3)}`; // generating unique user id
const mqttConnectUrl = `mqtt://${mqttHost}:${mqttPort}`;
var mqttOptions = {
    mqttClientId,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
};

const mqttClient = mqtt.connect(mqttConnectUrl, mqttOptions);
mqttClient.on("connect", newMqttConnectionSuccess);
mqttClient.on("error", mqttConnectionrError);
mqttClient.on("message", receiveMqttMessage);

// UNCOMMENT!
var publishingMqttTopic = "IDEA9101ZenGarden_02"; 
var receivingMqttTopic = "IDEA9101ZenGarden_01"; 

// If the connection to the MQTT broker is successful, subscribe to the topic
function newMqttConnectionSuccess() {
    console.log(
        "*** MQTT connected to host  " +
            mqttHost +
            ":" +
            mqttPort +
            "(client id: " +
            mqttClientId +
            ")"
    );

    // Subscribe to topic 'Subscribe to topic'
    const topicList = [receivingMqttTopic];
    mqttClient.subscribe(topicList, { qos: 1 }, () => {
        console.log(`Subscribed to topics '${topicList}'`);
    });
}

// If the connection to the broker fails, display error message to the terminal
function mqttConnectionrError(error) {
    console.log("Cannot connect to MQTT:" + error);
}

// Handles incoming MQTT messages from the broker, by building a dat array and sending it to the browser via the WebSocket connection.
function receiveMqttMessage(topic, message, packet) {
    console.log("topic is " + topic);
    console.log("message is " + message);
    var data = [topic, "" + message];
    io.sockets.emit("mqttMessage", data);
}

// Handle POST requests
app.post("/sendMessage", function (request, response) {
    var message = request.body.message;
    sendMQTT(publishingMqttTopic, message);
    response.end("");
});

// Send MQTT messages
function sendMQTT(topic, message) {
    var options = {
        retain: true,
        qos: 0,
    };

    if (mqttClient.connected) {
        mqttClient.publish(topic, message, options);
    }
    console.log(
        "##### MQTT message posted to topic: " + topic + ", message: " + message
    );
}

// Handles termination of this process, i.e. this is run when
// we type 'Ctrl+C' on the Terminal window to close thew server.
process.on("SIGINT", () => {
    console.log("===> SIGINT signal received.");
    mqttClient.end();
    console.log("===> MQTT connection closed.");
    udpPort.close();
    console.log("===> OSC connection closed.");
    io.close();
    console.log("===> WebSocket connection closed.");
    console.log("===> Node server exit complete.");
    process.exit(1);
});
