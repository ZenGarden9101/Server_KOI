/*
 * MQTT Server - Client side sketch
 * Author: mlai4943, qxie3495, yuwu0411, zcui2280
 * Date: April 2023
 *
 * Adapted and modified based on IDEA9101 IDEA Lab
 * WEEK 04 - Example - MQTT Receiver by Luke Hespanhol
 */

// import e = require("express");

// document.addEventListener('touchstart', function(e) {
//   document.documentElement.style.overflow = 'hidden';
// });

// document.addEventListener('touchend', function(e) {
//   document.documentElement.style.overflow = 'auto';
// });

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

// initialise variables to handle messages
let touchID;
let ratioX = 0.5;
let ratioY = 0.5;

let mode; //water ripple or flower
let passiveMode = true;
let lastActiveTime = 0;
let textAlpha = 0;

// full colour palette and each touch's flower palette
let colPalette = [];
let flowerPalett = [];

let flowers = [];
let leaves = [];

let rippleX;
let rippleY;
let rippleR;

// sounds
let roundBrush;
let bgm;
let rippleSfx;
let touchSfx = [];

let flock = [];
let ripples = [];
let koiNumber = 3; // create 3 koi to start with
let noseAttractor = [];


let clientNum = 0;

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

    // initialise colour palette
    colPalette = [
        [
            "rgba( 65, 143, 191,0.3)",
            "rgba( 108, 175, 217, 0.3)",
            "rgba(119, 189, 217, 0.3)",
            "rgba(155, 218, 242, 0.3)",
        ], // light blue palette
        [
            "rgba(18,100,130,0.3)",
            "rgba(5,67,111, 0.3)",
            "rgba(137,171,218, 0.3)",
            "rgba(53, 78, 107, 0.3)",
        ], // blue palette
        // [
        //     "rgba(237,109,70,0.3)",
        //     "rgba(210,58,24, 0.3)",
        //     "rgba(171,29,33, 0.3)",
        //     "rgba(193,44,31, 0.3)",
        // ], // red palette
        // [
        //     "rgba(176,69,82,0.3)",
        //     "rgba(200,150,169, 0.3)",
        //     "rgba(220,107,130, 0.3)",
        //     "rgba(184,26,53, 0.3)",
        // ], // pink palette
        // [
        //     "rgba(219, 196, 255,0.3)",
        //     "rgba(180, 160, 230, 0.3)",
        //     "rgba(242, 200, 242, 0.4)",
        //     "rgba(59, 2, 115, 0.3)",
        // ], // purple palette
        // [
        //     "rgba(250, 173, 20,0.3)",
        //     "rgba(251, 185, 141, 0.3)",
        //     "rgba(240,100,70, 0.3)",
        //     "rgba(220, 145, 60, 0.3)",
        // ], // orange palette
    ];
    flowerPalette = random(colPalette);

    // UNCOMMTENT TO ENABLE POSE DETECTION
    // detect video source
    video = createCapture(VIDEO);

    // Create a new poseNet object and listen for pose detection results
    poseNet = ml5.poseNet(video, modelReady);
    poseNet.on("pose", (results) => {
        poses = results;
    });

    // Hide the video element, and just show the canvas
    video.hide();

    // initialise first koi // TODO: only when user has joined
    // from the bottom of the screen
    for (let i = 0; i < koiNumber; i++) {
        createKoi(random(width), random(height, height + 50));
    }

    if (passiveMode) generateLeaves(0.5);
}

// TODO?: currently each fish is in its own flock - multiple fish in the same flock
// check if the userId exist
// if not, create a new flock with single koi
// else add a new fish

// Create a koi at the designated position
function createKoi(posX, posY) {
    const color = random(koiColors);

    flock.push(new Koi(posX, posY, color));
}

// generate leaves based on 2D noise space
// takes 1 parameter proportion (between 0 - 1) indicating the proportion of empty space when generating leaves
// proportion = 0.7 means 70% of the canvas will be left empty
function generateLeaves(proportion) {
    for (let x = 60; x < width; x += 100) {
        for (let y = 60; y < height; y += 100) {
            let noiseVal = noise(x, y);
            if (noiseVal > proportion) {
                let leafNum = map(noiseVal, proportion, 1, 3, 8);
                for (let i = 0; i < leafNum; i++) {
                    let posX = x + random(-50, 50);
                    let posY = y + random(-50, 50);
                    // avoid overlapping with existing leaves
                    for (leaf of leaves) {
                        let iteration = 0;
                        while (
                            dist(posX, posY, leaf.position.x, leaf.position.y) <
                            leaf.r + min(width, height) / (12 + i * 3)
                        ) {
                            posX =
                                x + random(-50 - iteration * 10, 50 + iteration * 10);
                            posY =
                                y + random(-50 - iteration * 10, 50 + iteration * 10);
                            iteration++; // continuously lower the density
                        }
                    }
                    leaves.push(
                        new Leaf(posX, posY, min(width, height) / (12 + i * 4))
                    ); // leaf get smaller
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
    else if(textAlpha > 0){
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
        if (!passiveMode && noseAttractor.length){
            // koi will be attracted towards the nearest nose attractor
            let minDis = max(width, height);
            let closestPt;
            for(let i = 0; i < noseAttractor.length; i++) {
                let distance = dist(koi.position.x, koi.position.y, noseAttractor[i].x, noseAttractor[i].y);
                if(distance < minDis) {
                    minDis = distance;
                    closestPt = noseAttractor[i];
                }
            }
            koi.flock(flock, closestPt); 
        }
        else { //if(passiveMode)
            koi.flock(flock, undefined);
        }
            
        koi.update();
        koi.show();
    });

    // TODO: inside the range -> trigger collision once
    // collision trigger new flower
    for (let koi of flock) {
        for (let leaf of leaves) {
            // Create flower when koi approaches leaves
            // which evokes a new koi
            // if leaf can grow flower
            if (!passiveMode &&
                noseAttractor.length &&
                leaf.canBloom &&
                dist(koi.position.x, koi.position.y, leaf.position.x + leaf.iniX, leaf.position.y + leaf.iniY) <
                    leaf.r &&
                random() < 0.1 / flock.length //0.9 + 0.005 * flock.length 1% chance of creating flower
            ) {
                if (--leaf.flowerCap <= 0) {
                    leaf.canBloom = false;
                }
                flowers.push(
                    new Flower(
                        koi.position.x,
                        koi.position.y,
                        colPalette[1], //TODO: update to flowerPalette
                        min(width, height) / 15
                    )
                );
                // createKoi(koi.position.x, koi.position.y,);
            }
        }
    }

    // small ripple every second
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

    // use touchID to control colour palette
    // make sure each continuous touch will generate flowers with similar colour
    // let colPalIdx = touchID % colPalette.length;
    // flowerPalette = colPalette[colPalIdx];

    // generate flowers and leaves
    // if (mode == "flower") {
    //     // 1/5 chance of creating a new flower
    //     let createFlower = random() < 0.2 ? true : false;
    //     if (createFlower) {
    //         flowers.push(
    //             new Flower(
    //                 ratioX * width,
    //                 ratioY * height,
    //                 flowerPalette,
    //                 min(width, height) / 15
    //             )
    //         );
    //         // a random bell sound will be triggered when a flower is created
    //         random(touchSfx).play();
    //     } else {
    //         // create a new leaf
    //         leaves.push(
    //             new Leaf(
    //                 ratioX * width,
    //                 ratioY * height,
    //                 min(width, height) / 20
    //             )
    //         );
    //     }

    //     mode = "";
    // }

    // // create a ripple to blow away all the objects
    if (mode == "water" ) { //&& canTrigger TODO 4. allow once per ..seconds push away!
        // blown away sound effect
        rippleSfx.play();

        // store the data about the ripple
        rippleX = ratioX * width;
        rippleY = ratioY * height;
        rippleR = min(width, height) / 15;

        // blow all the flowers, flowers can grow from the leaves again
        for (let leaf of leaves) {
            leaf.canBloom = true;
            // if (clientNum && random() < 1/clientNum) {
            //     leaf.blow(rippleX, rippleY, rippleR);
                
            // }
        }
        for (let flower of flowers) {
            // if (clientNum && random() < 1/clientNum) 
            flower.blow(rippleX, rippleY, rippleR);
        }

        mode = "";
    }

    // limit the maximum number of flowers can be drawn to avoid lagging
    // while (flowers.length > 30) {
    //     flowers.shift();
    // }
    // while (leaves.length > 150) {
    //     leaves.shift();
    // }
    while (flock.length > 20) {
        flock.shift();
    }

    //draw all the leaves
    for (let leaf of leaves) {
        if(!leaf.isBlown) {
            let globalPos = createVector(leaf.position.x + leaf.iniX, leaf.position.y + leaf.iniY);
            // only feed in the attractor vector during passive mode
            if (passiveMode && noseAttractor.length) {
                // koi will be attracted towards the nearest nose attractor
                let minDis = max(width, height);
                let closestPt;
                for(let i = 0; i < noseAttractor.length; i++) {
                    let distance = dist(globalPos.x, globalPos.y, noseAttractor[i].x, noseAttractor[i].y);
                    if(distance < minDis) {
                        minDis = distance;
                        closestPt = noseAttractor[i];
                    }
                }
                leaf.update(closestPt);
            }
            
            else {
                leaf.update(undefined);
            }
        }

        leaf.display();
    }
    //draw all the flowers
    for (let flower of flowers) {
        flower.display();
    }

    mapNose(); // pose net
    updateMode();
}

// A function to draw ellipses over the detected keypoints
function mapNose() {
    noseAttractor = [];
    // Loop through all the poses detected
    for (let i = 0; i < poses.length; i += 1) {
        
        // For each pose detected, loop through all the keypoints
        const pose = poses[i].pose;

        // only draw nose
        // TODO: map value to flip horizontally
        const nose = pose.keypoints[0];
        if (nose.score > 0.5) {
            fill(255, 0, 0, (i + 1) * 100);
            noStroke();
            let mapX = map(nose.position.x, 0, video.width, width, 0);
            let mapY = map(nose.position.y, 0, video.height, 0, height);
            // TODO: single nose attractor???
            noseAttractor.push(createVector(mapX, mapY));
            ellipse(mapX, mapY, 10, 10);
        }
    }
}

function updateMode() {
    // no detection
    if (!poses.length) {
        if(noseAttractor.length){
            noseAttractor = [];
        }

        // set to passive mode if no active user for 2 minutes 
        if (!passiveMode && Date.now() - lastActiveTime >= 1000) {// 120000
            passiveMode = true;
            // TODO: log off all the clients joined for more than 2 minutes
            // send MQTT message?
            // clientNum = 0;
            // console.log("back to passive mode");
        }
    } 
    // detected movement
    else {
        lastActiveTime = Date.now();

        // only change mode if the user has joined from client
        if(passiveMode && clientNum > 0) {
            passiveMode = false;
            // console.log("interactive mode");
        }

        else if(!passiveMode && clientNum == 0) {
            passiveMode = true;
            // console.log("all user logged off");
        }

        
    }
}

////////////////////////////////////////////////////
// DESKTOP EVENT HANDLING
////////////////////////////////////////////////////

// events for mouse testing
function mousePressed() {
    // touchID = floor(random(500));
    // mode = "flower";
    ratioX = mouseX / width;
    ratioY = mouseY / height;
    ripples.push(new Ripple(mouseX, mouseY));
    // sendMessage("testttt from server")
}

// function mouseDragged() {
//     mode = "flower";
//     ratioX = mouseX / width;
//     ratioY = mouseY / height;
// }

// trigger ripple
function keyPressed() {
    if (keyCode === 32) {
        console.log("space");
        mode = "water";
        ratioX = mouseX / width;
        ratioY = mouseY / height;
        // ratioX = poses[0].pose.nose.x / width;
        // ratioY = poses[0].pose.nose.y / height;
    } else if (keyCode === 70) {// "f"
        // trigger a new fish
        createKoi();
    }
}

// function windowResized() {
//   resizeCanvas(windowWidth, windowHeight);
// }


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
        userID = messageAry[0].trim(); // Date.now() value
        join = boolean(messageAry[1].trim()); // boolean
        // ratioX = messageAry[1].trim(); // 0-1, indicating mouseX relative position
        // ratioY = messageAry[2].trim(); // 0-1, indicating mouseY relative position
        // mode = messageAry[3].trim(); // string: grow flower or trigger ripple

        if(join) {
            clientNum++ // number of mobile being connected/joined. userId count
        }
        else {
            // clientNum--;
        }
        console.log(clientNum);
    }
}
