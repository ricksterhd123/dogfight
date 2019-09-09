let worker = null;


/*
	Create scene
*/
let currFPS = 0;
let allFPS = 0;
let scene = new THREE.Scene();
// TODO: orbit Camera
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.y = 5;
let controls = new THREE.PointerLockControls(camera);
console.log(controls);
controls.lock();

var light = new THREE.PointLight( 0xffffff, 1, 1000 );
light.position.set( 0, 50, 0 );
scene.add( light );

let planeGeometry = new THREE.PlaneGeometry(2000, 2000, 2000);
let toonMaterial = new THREE.MeshToonMaterial({
    color: 0x00ff00
});

let plane = new THREE.Mesh(planeGeometry, toonMaterial);
plane.rotateX(-Math.PI * 0.5);
plane.position.y = -0.5;
scene.add(plane);

/*
    Create some random boxes
*/
function getRandomColor() {
    let letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

let boxGeometry = new THREE.BoxBufferGeometry(1, 1, 1);
let NUM = 1000;
let boxes = [];
for (let i = 0; i < NUM; i++) {
    boxes[i] = new THREE.Mesh(boxGeometry, new THREE.MeshToonMaterial({
        color: Math.floor(Math.random() * 16777215)
    }));
    scene.add(boxes[i]);
}

// instantiate a loader
let loader = new THREE.OBJLoader();
let renderer = null;
let clock = null;

// load a resource
loader.load(
    // resource URL
    'assets/jetfighter001.obj',
    // called when resource is loaded
    function(object) {
        // scene.add(object);
        // jetfighter = object;

        let planeApprox = new THREE.BoxBufferGeometry(6, 3, 10);
        jetfighter = new THREE.Mesh(planeApprox, new THREE.MeshToonMaterial({
            color: 0xff0000
        }));
        //cube.position = jetfighter.position;
        scene.add(jetfighter);
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


let outElement = null;
let lastFPS = 0;
/*
	Debug FPS
*/
function showFPS() {
    if (!outElement) outElement = document.getElementById('out');
    let now = Date.now();
    if (now - lastFPS > 333) {
        outElement.innerHTML = currFPS + ' / ' + allFPS;
        lastFPS = now;
    }
}

function update(data) {
    let jetPlane = data.jetPlane;

    // console.log(jetPlane);
    jetfighter.position.x = jetPlane.x;
    jetfighter.position.y = jetPlane.y;
    jetfighter.position.z = jetPlane.z;
    jetfighter.quaternion.x = jetPlane.rx;
    jetfighter.quaternion.y = jetPlane.ry;
    jetfighter.quaternion.z = jetPlane.rz;
    jetfighter.quaternion.w = jetPlane.rw;

    if (data.objects.length != NUM) return;
    for (let i = 0; i < NUM; i++) {
        let physicsObject = data.objects[i];
        let renderObject = boxes[i];
        renderObject.position.x = physicsObject[0];
        renderObject.position.y = physicsObject[1];
        renderObject.position.z = physicsObject[2];
        renderObject.quaternion.x = physicsObject[3];
        renderObject.quaternion.y = physicsObject[4];
        renderObject.quaternion.z = physicsObject[5];
        renderObject.quaternion.w = physicsObject[6];
    }
    currFPS = data.currFPS;
    allFPS = data.allFPS;
};

let keyboard = new THREEx.KeyboardState();
let jetfighter = null;
let jetfighterPoints = [];
let prevTick = 0;

let animate = function(tick) {
    requestAnimationFrame(animate);
    if (!jetfighter) return;
    showFPS();


    // get INPUT and post
    if (keyboard.pressed("W"))
        worker.postControl("W");
    if (keyboard.pressed("S"))
        worker.postControl("S");
    if (keyboard.pressed("A"))
        worker.postControl("A");
    if (keyboard.pressed("D"))
        worker.postControl("D");
    if (keyboard.pressed("Q"))
        worker.postControl("Q");
    if (keyboard.pressed("E"))
        worker.postControl("E");
    if (keyboard.pressed("shift"))
        worker.postControl("shift");
    if (keyboard.pressed("ctrl"))
        worker.postControl("ctrl");

    // UPDATE positions from physics
    worker.tick();
    update(worker.getData());

    // UPDATE camera
    let relativeCameraOffset = new THREE.Vector3(0, 10, -20);
    let cameraOffset = relativeCameraOffset.applyMatrix4(jetfighter.matrixWorld);
    camera.position.x = cameraOffset.x;
    camera.position.y = cameraOffset.y;
    camera.position.z = cameraOffset.z;

    let relativeJetOffset = new THREE.Vector3(0, 0, 0);
    let jetOffset = relativeJetOffset.applyMatrix4(jetfighter.matrixWorld);
    camera.lookAt(jetOffset);

    // DRAW
    //camera.updateMatrix();
    //camera.updateProjectionMatrix();
    renderer.render(scene, camera);
};


/*
	Start physics
*/

document.body.onload = function() {
    Ammo().then(function(ammo) {
        worker = new physicsWorker(ammo, 1000)
        worker.startUp();
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
    });






};
