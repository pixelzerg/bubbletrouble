// consts
const K_LEFT = 37;
const K_UP = 38;
const K_RIGHT = 39;
const K_DOWN = 40;

// colours
const C_BACKG = '#222';
var ballColours = [
    '#F25F5C',
    '#FFE066',
    '#70C1B3',
    '#DD9892',
]

// engine vars
var t = 0; // gametime
var speed = 1; // gamespeed
var fps = 120;// max is 1000
var f = 1000.0/fps*speed;
var freeze = false;


// control vars
var downKeys = {}; // key: Key code, value: down/up

// ball/physics vars
var balls = [];// list of ball objects
var g = 0.001; // gravity
var splitp = 0.5; // proportion of parent's radius children balls' radiuses should be

// player vars
var playerx = 0; // x coord middle of player
var playerw = 0; // total width player
var playerh = 0;

// shot vars
var shotx = -1;
var shoth = -1;

// stage vars
var stageDiff = 5; // difficulty heuristic for stage
var sizeFactor = 935; // factor for increasing difficulty with size (standard size)
var minBalls = 1;
var maxBalls = 4;

// game vars
var lives = 4;
var stageNo = 1;

var c = document.getElementById('c'),
cx = c.getContext('2d');

//#region game
function newStage(){
    clearAll();

    balls = []; // clear balls
    playerx = c.width/2; // center player

    //reset shot
    shoth = -1;
    shotx = -1;

    //update min no of balls if need be (req radius for difficulty too big)
    if((100*stageDiff)/(15*minBalls)*(c.width/sizeFactor)>320){
        minBalls+=1;
        maxBalls+=1;
    }

    var n = Math.floor(Math.random()*(maxBalls-minBalls+1))+minBalls; // no balls: random int min-max
    // work out radiuses of balls so as to achieve req difficulty heuristic
    var r = (100*stageDiff)/(15*n);
    r*=(c.width/sizeFactor); // factor in screen width

    var dd = c.width/(n+1); // delta d: space between each ball
    //spawn balls
    for (var i=0;i<n;i++){
        balls.push(newBall((i+1)*dd,c.height/2,0.2,0,r,getRandomBallColour()));
    }
}
//#endregion

//#region updating
function updateBalls(){

    if(balls.length<=0){
        // won stage
        stageDiff+=5;
        stageNo+=1;
        newStage();
        return;
    }

    var et = 0.9; //not 100% efficient energy transfer
    for(var i=0; i<balls.length; i++){
        var ball=balls[i];

        // player collision
        if(ballHits(ball.x,ball.y,ball.r,playerx-playerw/2,c.height,playerw,playerh)){
            // died
            lives-=1;
            if(lives==0){
                // out of lives (reset)
                lives = 4;
                stageDiff = 5;
                stageNo = 1;
            }

            ball.colour = '#fff';
            drawBall(ball);

            freeze=true;
            setTimeout(function(){
                freeze=false;
                newStage();
            },1000);
        }

        var minvel = Math.min(-Math.log(ball.r)/5,-0.5);
        //wall collisions
        if(ball.y+ball.vy*f+ball.r>c.height){
            ball.y=c.height-ball.r;
            ball.vy=Math.min(ball.vy*-1*et,minvel);
        }
        else if(ball.y-ball.r<0){
            ball.y=ball.r+5;
            ball.vy=Math.min(ball.vy*-1*et,-1*minvel);
        }
        if(ball.x+ball.vx*f+ball.r>c.width){
            ball.x=c.width-ball.r;
            ball.vx*=-1;
        }else if(ball.x-ball.r<0){
            ball.x=ball.r;
            ball.vx*=-1;
        }

        //updt vels
        ball.x=ball.x+ball.vx*f;
        ball.y=ball.y+ball.vy*f;

        ball.vy=ball.vy+g*f;
    }
}

function updatePlayer(){
    // controls
    if(downKeys[K_RIGHT]){
        playerx+=f/3;
    }
    if(downKeys[K_LEFT]){
        playerx-=f/3;
    }
    if(downKeys[K_UP]){
        //shoot
        if(shoth<=-1 && shotx<=-1){
            shotx = playerx;
            shoth = playerh;
        }
    }

    // bounds
    if(playerx+playerw/2>c.width){
        playerx=c.width-playerw/2;
    }
    if(playerx-playerw/2<0){
        playerx=playerw/2;
    }

}

function updateShots(){
    if(shoth<=-1 && shotx<=-1){
        return;
    }

    // grow
    if(shoth<c.height){
        shoth+=f;
    }else{
        shoth = -1;
        shotx = -1;
        return; // maybe impl sticky here
    }

    // collision work
    for (var i=balls.length-1;i>=0;i--){
        const ball = balls[i];
        if(shotHits(ball.x,ball.y,ball.r,shotx,shoth)){
            // reset shot
            shoth = -1;
            shotx = -1;


            if(ball.r>16*(c.width/sizeFactor)){
                //(factors in screen width) ^
                ball.vy*=splitp;
                ball.vy-=0.4;
                ball.r*=splitp;

                // clone
                var child = JSON.parse(JSON.stringify(ball));
                child.vx*=-1;
                
                balls.push(child);
            }else{
                balls.splice(i,1);
            }
        }
    }

}
//#endregion

//#region calculation
function shotHits(cx,cy,r,sx,sh) {
    h=c.height-sh;
    if(sx-cx<=r && cx-sx<=r){
        if(h<cy){
            // above centre = easy case
            return true;
        }else{
            return Math.pow(cx-sx,2)+Math.pow(cy-h,2)<=Math.pow(r,2);
        }
    }
    return false;
}

function clamp(value, min, max){
    //limits value to range min..max
    return Math.max(Math.min(value,max),min);
}

function ballHits(cx,cy,r,x,y,w,h){
    var closestX = clamp(cx,x,x+w);
    var closestY = clamp(cy,y-h,y);

    var distanceX = cx-closestX;
    var distanceY = cy-closestY;

    return (distanceX*distanceX)+(distanceY*distanceY)<(r*r);
}
//#endregion

//#region drawing
function drawBall(ball){
    cx.fillStyle = ball.colour;
    cx.beginPath();
    cx.arc(ball.x, ball.y, ball.r, 0, 2 * Math.PI);
    cx.closePath();
    cx.fill();
}

function drawBalls(){
    for(var i=0; i<balls.length; i++){
        drawBall(balls[i]);
    }
}

function drawPlayer(){
    cx.strokeStyle = C_BACKG;

    cx.beginPath();
    cx.lineWidth = 3;

    var body = c.height; // y coord base of body
    var bodh = 60; // body height
    var bodw = 15; // body width

    // head
    var headw = 15;
    var headh = 10;

    cx.moveTo(playerx+headw,body-bodh-headh/2);
    cx.fillStyle = '#C9ADA7';
    cx.beginPath();
    cx.ellipse(playerx,body-bodh-headh/2,headw,headh,0,0,7);
    cx.closePath();
    cx.fill();
    cx.stroke();

    // body
    cx.fillStyle = '#9A8C98';
    cx.beginPath();
    cx.moveTo(playerx-bodw,body);
    cx.ellipse(playerx,body-bodh/2,bodw,bodh/2,0,Math.PI,2*Math.PI);
    cx.lineTo(playerx+bodw,body);
    cx.closePath();
    cx.fill();
    cx.stroke();

    // hat
    var hatw = bodw*1.3; // half hat width
    var hatt = 10; // hat thickness
    var hath = 8; // hat height
    var haty = body-bodh-2*headh/2; // y coord base of hat

    // hat base line
    cx.moveTo(playerx+hatw,haty);
    cx.fillStyle = '#4A4E69';
    cx.beginPath();
    cx.lineTo(playerx-hatw,haty);
    
    // hat above
    var div = 1.5; // determines width of triangle tip
    cx.lineTo(playerx-hatw,haty-hatt) // up
    cx.lineTo(playerx-hatw/div,haty-hatt); // right
    cx.lineTo(playerx,haty-hatt-hath); // tip
    cx.lineTo(playerx+hatw/div,haty-hatt); //down
    cx.lineTo(playerx+hatw,haty-hatt); //right
    cx.lineTo(playerx+hatw,haty); // down
    cx.closePath();
    cx.fill();
    cx.stroke();

    playerh = bodh + 2*headh + hath + 3;
    playerw = 2*hatw + 4;
}

function drawShots(){
    cx.strokeStyle = '#9FA09F';
    cx.lineWidth = 3;
    cx.beginPath();
    cx.moveTo(shotx,c.height);
    cx.lineTo(shotx,c.height-shoth);
    cx.stroke();
}

function drawOverlay(){
    cx.font = '40px Arial';
    cx.fillStyle = '#eee';

    // lives
    var livesString = '';
    for(var i=0; i<lives; i++){
        livesString+='❤';
    }
    cx.fillText(livesString,10,40);

    // stage
    cx.font = '40px Arial';
    var stageString = '⚑ '+stageNo.toString();
    cx.fillText(stageString,c.width/2,40);
}
//#endregion

//#region clearing
function clearAll(){
    //background
    cx.fillStyle = C_BACKG;
    cx.fillRect(0, 0, c.width, c.height);
}

function clearBall(ball){
    cx.fillStyle = C_BACKG;
    cx.fillRect(ball.x-ball.r-3,ball.y-ball.r-3,(ball.r+3)*2,(ball.r+3)*2);
}

function clearBalls(){
    for(var i=0; i< balls.length; i++){
        clearBall(balls[i]);
    }
}

function clearPlayer(){
    cx.fillStyle = C_BACKG;
    cx.fillRect(playerx-playerw/2,c.height-playerh,
                playerw,playerh);
}

function clearShots(){
    cx.fillStyle = C_BACKG;
    cx.fillRect(shotx-3,0,
                6,c.height);
}

function clearOverlay(){
    cx.fillStyle = C_BACKG;
    cx.fillRect(0,0,
                c.width,43);
}
//#endregion

function newBall(x,y,vx=0,vy=0,r=70,colour='#fff'){
    return {
      x:x,
      y:y,
      r:r,
      vx:vx,
      vy:vy,
      colour:colour,
      m:20,//mass
    }
}

function getRandomBallColour(){
    return ballColours[Math.floor(Math.random()*ballColours.length)];
}



(function() {        
  	function resizeCanvas() {
        c.width = window.innerWidth;
        c.height = window.innerHeight;

        clearAll();
    }
    window.addEventListener('resize', resizeCanvas, false);
    resizeCanvas();
    
    init();
    var timer=setInterval(function(){
        if(freeze){
            // nothing ...
        }else{
            clear();
            update();
            draw();
        }
        t+=f;
    },f);
    
    function init(){
        // key listening
        window.addEventListener("keydown",function(e){
            downKeys[e.keyCode]=true;
        }, false);
        window.addEventListener("keyup",function(e){
            downKeys[e.keyCode]=false;
        }, false);

        clearAll();

        newStage();
    }
    
    function update(){
        updatePlayer();
        updateShots();
        updateBalls();
    }
    
    function draw(){
        drawBalls();
        drawShots();
        drawPlayer();
        drawOverlay();
    }
    
    function clear(){
        clearOverlay();
        clearShots();
        clearPlayer();
        clearBalls();
    }
})();