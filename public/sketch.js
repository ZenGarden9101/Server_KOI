/*
 * MQTT Server - Display (peer) side sketch
 * Author: mlai4943, qxie3495, yuwu0411, zcui2280
 * Date: May 2023
 *
 * Adapted and modified based on IDEA9101 IDEA Lab
 * WEEK 04 - Example - MQTT Receiver by Luke Hespanhol
 */

//////////////////////////////////////////////////
//FIXED SECTION: DO NOT CHANGE THESE VARIABLES
//////////////////////////////////////////////////
var HOST = window.location.origin;
var socket;
let xmlHttpRequest = new XMLHttpRequest();

////////////////////////////////////////////////////
// CUSTOMIZABLE SECTION - BEGIN: ENTER OUR CODE HERE
////////////////////////////////////////////////////

// pose net
let video;
let poseNet;
let poses = [];

let clientId = [];
let clientNum = 0;
let sendMobileMsg = false;
let triggerCountdown = 120; // countdown for triggering a petal firework

// initialise variables to handle messages
let touchID;
let ratioX = 0.5;
let ratioY = 0.5;

let mode; //water ripple or flower
let passiveMode = true;
let lastActiveTime = 0;
let textAlpha = 0;

// full colour palette and each touch's flower palette
let flowerPalette = [];

let flowers = [];
let leaves = [];

let flock = [];
let ripples = [];
let koiNumber = 3; // create 3 koi to start with
let noseAttractor = [];

let rippleX;
let rippleY;
let rippleR;

// sounds
let roundBrush;
let bgm;
let rippleSfx;
let touchSfx = [];

function preload() {
    roundBrush = loadFont("assets/roundBrush.ttf");
    bgm = loadSound("assets/background.mp3");
    rippleSfx = loadSound("assets/ripple.mp3");
    // load the whole series of touch sfx
    for (let i = 1; i <= 7; i++) {
        touchSfx.push(loadSound("assets/touch" + i + ".wav"));
    }
}

function modelReady() {
    console.log("Model Loaded");
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    setupMqtt();

    noStroke();
    angleMode(DEGREES);

    textFont(roundBrush);
    textSize(32);
    bgm.loop();

    // ai generated colour palette from colormind
    generateColPalette((palette) => {
        flowerPalette = palette;
        console.log(flowerPalette);
    });

    // initialise the koi fish
    for (let i = 0; i < koiNumber; i++) {
        createKoi(random(width), random(height, height + 50));
    }
    // initialise leaves
    if (passiveMode) {
        generateLeaves(0.4);
    }

    // pose detection
    // capture video source
    video = createCapture(VIDEO);
    // Create a new poseNet object and listen for pose detection results
    poseNet = ml5.poseNet(video, modelReady);
    poseNet.on("pose", (results) => {
        poses = results;
    });
    // Hide the video element
    video.hide();
}

// Add a koi to the flock at the designated position
function createKoi(posX, posY) {
    const color = random(koiColors);
    flock.push(new Koi(posX, posY, color));
}

// generate leaves based on 2D noise space
// parameter proportion (between 0 - 1) indicating the proportion of empty space when generating leaves
// proportion = 0.4 means 40% of the canvas will be left empty
function generateLeaves(proportion) {
    for (let x = 60; x < width; x += 100) {
        for (let y = 60; y < height; y += 100) {
            let noiseVal = noise(x, y);
            if (noiseVal > proportion) {
                let leafNum = map(noiseVal, proportion, 1, 3, 8);
                for (let i = 0; i < leafNum; i++) {
                    let posX = x + random(-50, 50);
                    let posY = y + random(-50, 50);
                    // avoid too much overlapping with existing leaves
                    for (leaf of leaves) {
                        let iteration = 0;
                        while (
                            dist(posX, posY, leaf.position.x, leaf.position.y) <
                            leaf.r + min(width, height) / (12 + i * 3)
                        ) {
                            posX =
                                x +
                                random(
                                    -50 - iteration * 10,
                                    50 + iteration * 10
                                );
                            posY =
                                y +
                                random(
                                    -50 - iteration * 10,
                                    50 + iteration * 10
                                );
                            iteration++; // continuously lower the density
                        }
                    }
                    leaves.push(
                        // leaves get smaller
                        new Leaf(posX, posY, min(width, height) / (12 + i * 4))
                    ); 
                }
            }
        }
    }
}

function draw() {
    background(244, 240, 230, 100);

    if (passiveMode) {
        if (noseAttractor.length && textAlpha < 255) {
            textAlpha++;
        } else if (!noseAttractor.length && textAlpha > 0) {
            textAlpha--;
        }

        push();
        textAlign(CENTER);
        fill(19, 69, 51, textAlpha);
        text(
            "Join from mobile to\nunlock more interaction modes",
            width / 2,
            height / 2
        );
        pop();
    }
    // once someone joined, the text will gradually disappear
    else if (textAlpha > 0) {
        textAlpha--;
        push();
        textAlign(CENTER);
        fill(19, 69, 51, textAlpha);
        text(
            "Join from mobile to\nunlock more interaction modes",
            width / 2,
            height / 2
        );
        pop();
    }

    // draw koi fish shadow
    flock.forEach((koi) => {
        koi.showShadow();
    });

    // update and draw koi fish
    flock.forEach((koi) => {
        koi.wrap();
        // only feed in the attractor vector when the user has joined from client side
        if (!passiveMode && noseAttractor.length) {
            // koi will be attracted towards the nearest nose attractor
            let minDis = max(width, height);
            let closestPt;
            for (let i = 0; i < noseAttractor.length; i++) {
                let distance = dist(
                    koi.position.x,
                    koi.position.y,
                    noseAttractor[i].x,
                    noseAttractor[i].y
                );
                if (distance < minDis) {
                    minDis = distance;
                    closestPt = noseAttractor[i];
                }
            }
            koi.flock(flock, closestPt);
        } else {
            koi.flock(flock, undefined);
        }

        koi.update();
        koi.show();
    });

    // collision between koi and leaf has chance to trigger new flower
    for (let koi of flock) {
        for (let leaf of leaves) {
            // Create flower when koi approaches leaves

            // if leaf can grow flower
            if (
                !passiveMode &&
                noseAttractor.length &&
                leaf.canBloom &&
                dist(
                    koi.position.x,
                    koi.position.y,
                    leaf.position.x + leaf.iniX,
                    leaf.position.y + leaf.iniY
                ) < leaf.r &&
                random() < 0.1 / flock.length
            ) {
                if (--leaf.flowerCap <= 0) {
                    leaf.canBloom = false;
                }
                flowers.push(
                    new Flower(
                        koi.position.x,
                        koi.position.y,
                        flowerPalette,
                        min(width, height) / 15
                    )
                );
            }
        }
    }

    // small random ripple every second
    if (frameCount % 60 === 0) {
        ripples.push(
            new Ripple(random(-50, width + 50), random(-50, height + 50))
        );
    }

    // update and draw ripple
    ripples.forEach((ripple, i) => {
        ripple.update();
        ripple.show();
        if (ripple.lifespan < 0) ripples.splice(i, 1);
    });

    // create a ripple to blow away all the flowers
    if (mode == "water" && triggerCountdown == 0) {
        // blown away sound effect
        rippleSfx.play();

        // store the data about the ripple
        rippleX = ratioX * width;
        rippleY = ratioY * height;
        rippleR = min(width, height) / 15;

        // blow all the flowers, flowers can grow from the leaves again
        for (let leaf of leaves) {
            leaf.canBloom = true;
        }
        for (let flower of flowers) {
            flower.blow(rippleX, rippleY, rippleR);
        }

        mode = "";
        triggerCountdown = 120;

        // when a ripple is triggered, get new colour palette
        generateColPalette((palette) => {
            flowerPalette = palette;
            console.log(flowerPalette);
        });
    }

    if (triggerCountdown > 0) {
        triggerCountdown--;
    }

    // when there's no client, remove extra koi
    if (
        flock.length > 3 * (clientNum + 1) &&
        (flock[0].position.x < -20 ||
            flock[0].position.x > width + 20 ||
            flock[0].position.y < -20 ||
            flock[0].position.y > height + 20)
    ) {
        flock.shift();
    }

    //draw all the leaves
    for (let leaf of leaves) {
        if (!leaf.isBlown) {
            let globalPos = createVector(
                leaf.position.x + leaf.iniX,
                leaf.position.y + leaf.iniY
            );
            // only feed in the attractor vector during passive mode
            if (passiveMode && noseAttractor.length) {
                // koi will be attracted towards the nearest nose attractor
                let minDis = max(width, height);
                let closestPt;
                for (let i = 0; i < noseAttractor.length; i++) {
                    let distance = dist(
                        globalPos.x,
                        globalPos.y,
                        noseAttractor[i].x,
                        noseAttractor[i].y
                    );
                    if (distance < minDis) {
                        minDis = distance;
                        closestPt = noseAttractor[i];
                    }
                }
                leaf.update(closestPt);
            } else {
                leaf.update(undefined);
            }
        }

        leaf.display();
    }
    //draw all the flowers
    for (let i = flowers.length - 1; i >= 0; i--) {
        let flower = flowers[i];

        // if a flower has no petal left, remove the flower
        if (!flower.petals.length) {
            flowers.splice(i, 1);
        } else {
            flower.display();
        }
    }

    mapNose(); // pose net
    updateMode();

    if (sendMobileMsg && flowers.length) {
        sendMessage(flowers.length.toString());
        sendMobileMsg = false;
    }
}

// extract all the detected nose keypoints into an array
function mapNose() {
    noseAttractor = [];
    // Loop through all the poses detected
    for (let i = 0; i < poses.length; i += 1) {
        // For each pose detected, find the nose keypoint
        const pose = poses[i].pose;

        const nose = pose.keypoints[0];
        if (nose.score > 0.5) {
            fill(255, 0, 0, (i + 1) * 100);
            noStroke();
            // flip horizontally so it's mirroring the movement
            let mapX = map(nose.position.x, 0, video.width, width, 0);
            let mapY = map(nose.position.y, 0, video.height, 0, height);
            noseAttractor.push(createVector(mapX, mapY));
            ellipse(mapX, mapY, 10, 10);
        }
    }
}

// decide if switch between passive and interactive mode
function updateMode() {
    // no detection
    if (!poses.length) {
        if (noseAttractor.length) {
            noseAttractor = [];
        }

        // set to passive mode if no active user for 2 minutes
        if (!passiveMode && Date.now() - lastActiveTime >= 12000) {
            // 120000 millis = 2 min
            passiveMode = true;
            clientNum = 0;
        }
    }
    // detected movement
    else {
        lastActiveTime = Date.now();
        // only change to interactive mode if the user has joined from client
        if (passiveMode && clientNum > 0) {
            passiveMode = false;
        }
    }
}

////////////////////////////////////////////////////
// DESKTOP EVENT HANDLING
////////////////////////////////////////////////////

// generate small ripples
function mousePressed() {
    ratioX = mouseX / width;
    ratioY = mouseY / height;
    ripples.push(new Ripple(mouseX, mouseY));
}

// trigger ripple
function keyPressed() {
    if (keyCode === 32) { // space
        mode = "water";
        ratioX = mouseX / width;
        ratioY = mouseY / height;

    } else if (keyCode === 70) { // "f"
        // trigger a new fish
        createKoi();
    }
}

////////////////////////////////////////////////////
// MQTT MESSAGE HANDLING
////////////////////////////////////////////////////
function setupMqtt() {
    socket = io.connect(HOST);
    socket.on("mqttMessage", receiveMqtt);
}

// send message
function sendMessage(message) {
    let postData = JSON.stringify({ id: 1, message: message });

    xmlHttpRequest.open("POST", HOST + "/sendMessage", false);
    xmlHttpRequest.setRequestHeader("Content-Type", "application/json");
    xmlHttpRequest.send(postData);
}

// receive and parse message
function receiveMqtt(data) {
    var topic = data[0];
    var message = data[1];
    console.log("Topic: " + topic + ", message: " + message);

    if (topic.includes("IDEA9101ZenGarden_01")) {
        // handle the received message
        messageAry = message.split(",");
        requestType = messageAry[0].trim(); // "join" or "water"
        userID = messageAry[1].trim();
        // send msg with flower count, indicating if the user can trigger petal firework
        if (requestType == "join") {
            sendMobileMsg = true;
            if (!clientId.includes(userID)) {
                clientId.push(userID);
                clientNum++; // number of mobiles connected
                // create 3 new koi fish when a new user joins
                for (let i = 0; i < 3; i++) {
                    createKoi(random(width), random(height, height + 50));
                }
            }
        } else if (requestType == "water") {
            if (clientId.includes(userID)) {
                ratioX = Number(messageAry[2].trim()); // 0-1, indicating mouseX relative position
                ratioY = Number(messageAry[3].trim()); // 0-1, indicating mouseY relative position
                if (triggerCountdown == 0) mode = "water";
            }
        }
    }
}

////////////////////////////////////////////////////
// GENERATE COLOUR PALETTE FROM COLORMIND
////////////////////////////////////////////////////

// Colormind REST API to generate random colour palette
// http://colormind.io/api-access/

function generateColPalette(callback) {
    var url = "http://colormind.io/api/";
    var data = {
        model: "default",
    };

    var http = new XMLHttpRequest();

    http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status == 200) {
            var palette = JSON.parse(http.responseText).result;

            // assign alpha for each colour, make it transparent
            for (let i = 0; i < palette.length; i++) {
                palette[i].push(random(80, 150));
            }
            // return the palette using a callback function to handel async issue
            // remove the first and last colours as they tend to be too dark or too bright
            callback(palette.slice(1, 4)); // an array of 3 arrays each with rgba values
        }
    };

    http.open("POST", url, true);
    http.send(JSON.stringify(data));
}
