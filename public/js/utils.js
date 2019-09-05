var pressed={};
document.body.onkeydown=function(e){
    e = e || window.event;
    pressed[e.keyCode] = true;
}

document.body.onkeyup=function(e){
    e = e || window.event;
    delete pressed[e.keyCode];
}

function getW(){
    return pressed[87] || false;
}

function getA(){
    return pressed[65] || false;
}

function getS(){
    return pressed[83] || false; 
}

function getD(){
    return pressed[68] || false;
}