var currFPS = 0;
var allFPS = 0;

/* 
	Create scene 
*/
var scene = new THREE.Scene();

// TODO: orbit Camera
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.y = 5;
var controls = new THREE.PointerLockControls(camera);
console.log(controls);
controls.lock();

// White directional light at half intensity shining from the top.
var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
scene.add( directionalLight );

var planeGeometry = new THREE.PlaneGeometry(1000, 1000, 1000);
var toonMaterial = new THREE.MeshToonMaterial({
    color: 0x00ff00
});

var plane = new THREE.Mesh(planeGeometry, toonMaterial);
plane.rotateX(-Math.PI * 0.5);
plane.position.y = -0.5;
scene.add(plane);


var outElement = null;
var lastFPS = 0;
/*
	Debug FPS
*/
function showFPS() {
    if (!outElement) outElement = document.getElementById('out');
    var now = Date.now();
    if (now - lastFPS > 333) {
        outElement.innerHTML = currFPS + ' / ' + allFPS;
        lastFPS = now;
    }
}


var keyboard = new THREEx.KeyboardState();
var jetfighter = null;
var jetfighterPoints = [];
var prevTick = 0;
var animate = function(tick) {
    requestAnimationFrame(animate);
    showFPS();
    if (!jetfighter) return;
    var elapsedTime = tick - prevTick;
    var delta = clock.getDelta(); // seconds.
    var moveDistance = 20 * delta; // 200 pixels per second
    var rotateAngle = Math.PI / 2 * delta; // pi/2 radians (90 degrees) per second

    // local transformations
    // move forwards/backwards/left/right
    if (keyboard.pressed("W")) {
        jetfighter.rotateOnAxis(new THREE.Vector3(1, 0, 0), -rotateAngle);
    }
    if (keyboard.pressed("S"))
        jetfighter.rotateOnAxis(new THREE.Vector3(1, 0, 0), rotateAngle);
    // rotate left/right/up/down
    var rotation_matrix = new THREE.Matrix4().identity();
    if (keyboard.pressed("A"))
        jetfighter.rotateOnAxis(new THREE.Vector3(0, 0, 1), rotateAngle);
    if (keyboard.pressed("D"))
        jetfighter.rotateOnAxis(new THREE.Vector3(0, 0, 1), -rotateAngle);
    if (keyboard.pressed("R"))
        jetfighter.rotateOnAxis(new THREE.Vector3(1, 0, 0), rotateAngle);
    if (keyboard.pressed("F"))
        jetfighter.rotateOnAxis(new THREE.Vector3(1, 0, 0), -rotateAngle);

    if (keyboard.pressed("Z")) {
        jetfighter.position.set(0, 25.1, 0);
        jetfighter.rotation.set(0, -Math.PI * 0.5, 0);
    }

    //jetfighter.translateZ(-moveDistance);
    var relativeCameraOffset = new THREE.Vector3(0, 10, 20);
    var cameraOffset = relativeCameraOffset.applyMatrix4(jetfighter.matrixWorld);
    camera.position.x = cameraOffset.x;
    camera.position.y = cameraOffset.y;
    camera.position.z = cameraOffset.z;


    var relativeJetOffset = new THREE.Vector3(0, 0, 0);
    var jetOffset = relativeJetOffset.applyMatrix4(jetfighter.matrixWorld);
    camera.lookAt(jetOffset);
    //camera.updateMatrix();
    //camera.updateProjectionMatrix();
    renderer.render(scene, camera);
};

// instantiate a loader
var loader = new THREE.OBJLoader();
var renderer = null;
var clock = null;

// load a resource
loader.load(
    // resource URL
    'assets/jetfighter001.obj',
    // called when resource is loaded
    function(object) {
        object.scale = new THREE.Vector3(100, 0.1, 0.1);
        scene.add(object);
        jetfighter = object;
    },
    // called when loading is in progresses
    function(xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    // called when loading has errors
    function(error) {
        console.log('An error happened');
    }
);

var boxGeometry = new THREE.BoxBufferGeometry(1, 1, 1);
var basicMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00
});

let NUM = 1000;
let boxes = [];
for (let i = 0; i < NUM; i++) {
    boxes[i] = new THREE.Mesh(boxGeometry, toonMaterial);
    scene.add(boxes[i]);
}




/*
	Start physics
*/
var physicsWorker = null;
var nextPhysicsWorker = new Worker('js/physicsWorker.js');

if (physicsWorker) physicsWorker.terminate();
physicsWorker = nextPhysicsWorker;
nextPhysicsWorker = null;

if (!physicsWorker) physicsWorker = new Worker('worker.js');
var quaternion = new THREE.Quaternion();

physicsWorker.onmessage = function(event) {
    var data = event.data;
    if (data.objects.length != NUM) return;
    for (var i = 0; i < NUM; i++) {
        var physicsObject = data.objects[i];
        var renderObject = boxes[i];
        renderObject.position.x = physicsObject[0];
        renderObject.position.y = physicsObject[1];
        renderObject.position.z = physicsObject[2];
        quaternion.x = physicsObject[3];
        quaternion.y = physicsObject[4];
        quaternion.z = physicsObject[5];
        quaternion.w = physicsObject[6];
        renderObject.rotation = new THREE.Euler().setFromQuaternion(quaternion);
    }
    currFPS = data.currFPS;
    allFPS = data.allFPS;
};
physicsWorker.postMessage(NUM);

/*
	Start rendering
*/
clock = new THREE.Clock();
renderer = new THREE.WebGLRenderer({
    alpha: true
});
renderer.setClearColor(0x000000, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
animate(0);