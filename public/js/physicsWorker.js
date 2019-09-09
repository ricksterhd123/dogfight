let eventType = {
    control: 'control',
    start: 'start'
}

class physicsWorker {

    constructor(Ammo, noCubes) {


        this.meanDt = 0;
        this.meanDt2 = 0;
        this.frame = 1;
        this.bodies = [];
        this.jetPlane = null;
        this.NUM = noCubes;
        this.NUMRANGE = [];

        // Bullet-interfacing code
        let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        let dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
        let overlappingPairCache = new Ammo.btDbvtBroadphase();
        let solver = new Ammo.btSequentialImpulseConstraintSolver();
        this.dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
        this.dynamicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));

        // THREE 1 = 0.5 in bullet physics
        // define shapes
        this.boxShape = new Ammo.btBoxShape(new Ammo.btVector3(0.5, 0.5, 0.5));
        this.planeShape = new Ammo.btBoxShape(new Ammo.btVector3(3, 1.5, 5));

        this.transform = new Ammo.btTransform(); // taking this out of readBulletObject reduces the leaking

    }

    resetPositions() {
        let side = Math.ceil(Math.pow(this.NUM, 1 / 3));
        let i = 1;
        for (let x = 0; x < side; x++) {
            for (let y = 0; y < side; y++) {
                for (let z = 0; z < side; z++) {
                    if (i == this.bodies.length) break;
                    let body = this.bodies[i++];
                    let origin = body.getWorldTransform().getOrigin();
                    origin.setX((x - side / 2) * (3 + Math.random()));
                    origin.setY(y * (10 + Math.random()));
                    origin.setZ((z - side / 2) * (3 + Math.random()) - side - 3);
                    body.activate();
                    let rotation = body.getWorldTransform().getRotation();
                    rotation.setX(1);
                    rotation.setY(0);
                    rotation.setZ(0);
                    rotation.setW(1);
                    //body.applyForce(new Ammo.btVector3(0,0,100), origin)
                }
            }
        }

        let origin = this.jetPlane.getWorldTransform().getOrigin();
        origin.setX(0);
        origin.setY(100);
        origin.setZ(0);

        this.jetPlane.activate();
        let rotation = this.jetPlane.getWorldTransform().getRotation();
        rotation.setX(1);
        rotation.setY(0);
        rotation.setZ(0);
        rotation.setW(1);
    }

    startUp() {
        this.frame = 1;
        this.meanDt = this.meanDt2 = 0;
        this.NUMRANGE = [];
        while (this.NUMRANGE.length < this.NUM) this.NUMRANGE.push(this.NUMRANGE.length + 1);

        // Add ground to dynamicWorld
        let groundTransform = new Ammo.btTransform();
        groundTransform.setIdentity();
        groundTransform.setOrigin(new Ammo.btVector3(0, -10, 0));
        let groundShape = new Ammo.btBoxShape(new Ammo.btVector3(1000, 10, 1000));
        let localInertia = new Ammo.btVector3(0, 0, 0);
        let myMotionState = new Ammo.btDefaultMotionState(groundTransform);
        let rbInfo = new Ammo.btRigidBodyConstructionInfo(0, myMotionState, groundShape, localInertia);
        rbInfo.m_friction = 1.2;
        let body = new Ammo.btRigidBody(rbInfo);
        this.dynamicsWorld.addRigidBody(body);
        this.bodies.push(body);

        for (let i = 0; i < this.NUM; i++){
            let startTransform = new Ammo.btTransform();
            startTransform.setIdentity();
            let mass = 0.1;
            let localInertia = new Ammo.btVector3(0, 0, 0);
            this.boxShape.calculateLocalInertia(mass, localInertia);

            let myMotionState = new Ammo.btDefaultMotionState(startTransform);
            let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, this.boxShape, localInertia);
            let body = new Ammo.btRigidBody(rbInfo);
            //body.setRestitution(0.5)
            this.dynamicsWorld.addRigidBody(body);
            this.bodies.push(body);
        }

        let startTransform = new Ammo.btTransform();
        startTransform.setIdentity();
        let mass = 5;
        //let localInertia = new Ammo.btVector3(0, 0, 0);
        this.planeShape.calculateLocalInertia(mass, localInertia);
        myMotionState = new Ammo.btDefaultMotionState(startTransform);
        rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, this.planeShape, localInertia);
        body = new Ammo.btRigidBody(rbInfo);
        body.m_linearDamping = 0;
        body.m_angularDamping = 0;
        this.dynamicsWorld.addRigidBody(body);
        this.jetPlane = body;
        this.resetPositions();
    }


    readBulletObject(i, object) {
        let body = this.bodies[i];
        body.getMotionState().getWorldTransform(this.transform);
        let origin = this.transform.getOrigin();
        object[0] = origin.x();
        object[1] = origin.y();
        object[2] = origin.z();
        let rotation = this.transform.getRotation();
        object[3] = rotation.x();
        object[4] = rotation.y();
        object[5] = rotation.z();
        object[6] = rotation.w();
    }


    timeToRestart() { // restart if at least one is inactive - the scene is starting to get boring
        if (this.nextTimeToRestart) {
            if (Date.now() >= this.nextTimeToRestart) {
                this.nextTimeToRestart = 0;
                return true;
            }
            return false;
        }

        for (let i = 1; i <= this.NUM; i++) {
            let body = bodies[i];
            if (!body.isActive()) {
                this.nextTimeToRestart = Date.now() + 10000; // add another second after first is inactive
                break;
            }
        }
        return false;
    }


    simulate(dt) {
        dt = dt || 1;

        this.dynamicsWorld.stepSimulation(dt);

        let alpha = 0;
        if (this.meanDt > 0) {
            alpha = Math.min(0.1, dt / 1000);
        } else {
            alpha = 0.1; // first run
        }
        this.meanDt = alpha * dt + (1 - alpha) * this.meanDt;

        let alpha2 = 1 / this.frame++;
        this.meanDt2 = alpha2 * dt + (1 - alpha2) * this.meanDt2;

        this.data = {
            objects: [],
            jetPlane: {
                x: 0,
                y: 0,
                z: 0
            },
            currFPS: Math.round(1000 / this.meanDt),
            allFPS: Math.round(1000 / this.meanDt2)
        };

        // Read bullet data into JS objects
        for (let i = 0; i < this.NUM; i++) {
            let object = [];
            this.readBulletObject(i, object);
            this.data.objects[i] = object;
        }
        //console.log(jetPlane);
        //console.log(transform);
        let jetPlaneOrigin = this.jetPlane.getMotionState().getWorldTransform(this.transform);


        //console.log(transform.getOrigin());
        //console.log(transform.getRotation());
        this.data.jetPlane.x = this.transform.getOrigin().x();
        this.data.jetPlane.y = this.transform.getOrigin().y();
        this.data.jetPlane.z = this.transform.getOrigin().z();
        this.data.jetPlane.rx = this.transform.getRotation().x();
        this.data.jetPlane.ry = this.transform.getRotation().y();
        this.data.jetPlane.rz = this.transform.getRotation().z();
        this.data.jetPlane.rw = this.transform.getRotation().w();
        //if (timeToRestart()) resetPositions();
    }

    postControl(key) {
        this.jetPlane.getMotionState().getWorldTransform(this.transform);
        if (key == "W") {
            console.log("E")
            let relativeForce = new Ammo.btVector3(1, 0, 0);
            let relativeTransform = new Ammo.btTransform();
            relativeTransform.setOrigin(relativeForce);
            let test = (this.transform.op_mul(relativeTransform)).getOrigin()
            this.jetPlane.applyTorqueImpulse(relativeForce)// this.transform.getOrigin())
        }
        if (key == "S"){
            console.log("E")
            let relativeForce = new Ammo.btVector3(-1, 0, 0);
            let relativeTransform = new Ammo.btTransform();
            relativeTransform.setOrigin(relativeForce);
            let test = (this.transform.op_mul(relativeTransform)).getOrigin()
            this.jetPlane.applyTorqueImpulse(relativeForce)// this.transform.getOrigin())
        }
        if (key == "A"){
            console.log("E")
            let relativeForce = new Ammo.btVector3(0, 0, -1);
            let relativeTransform = new Ammo.btTransform();
            relativeTransform.setOrigin(relativeForce);
            let test = (this.transform.op_mul(relativeTransform)).getOrigin()
            this.jetPlane.applyTorqueImpulse(relativeForce)// this.transform.getOrigin())
        }
        if (key == "D"){
            console.log("E")
            let relativeForce = new Ammo.btVector3(0, 0, 1);
            let relativeTransform = new Ammo.btTransform();
            relativeTransform.setOrigin(relativeForce);
            let test = (this.transform.op_mul(relativeTransform)).getOrigin()
            this.jetPlane.applyTorqueImpulse(relativeForce)// this.transform.getOrigin())
        }

        if (key == "Q"){
            console.log("E")
            let relativeForce = new Ammo.btVector3(0, 0.2, 0);
            let relativeTransform = new Ammo.btTransform();
            relativeTransform.setOrigin(relativeForce);
            let test = (this.transform.op_mul(relativeTransform)).getOrigin()
            this.jetPlane.applyTorqueImpulse(relativeForce)// this.transform.getOrigin())
        }
        if (key == "E"){
            console.log("E")
            let relativeForce = new Ammo.btVector3(0, -0.2, 0);
            let relativeTransform = new Ammo.btTransform();
            relativeTransform.setOrigin(relativeForce);
            let test = (this.transform.op_mul(relativeTransform)).getOrigin()
            this.jetPlane.applyTorqueImpulse(relativeForce)// this.transform.getOrigin())
        }
        if (key == "shift"){
            console.log("forward");
            let relativeForce = new Ammo.btVector3(0,0, 1000);
            let relativeTransform = new Ammo.btTransform();
            relativeTransform.setOrigin(relativeForce);
            let test = (this.transform.op_mul(relativeTransform)).getOrigin()
            this.jetPlane.applyForce(test, this.transform.getOrigin())// this.transform.getOrigin())
            //this.jetPlane.applyForce(new Ammo.btVector3(0, 0, 1000), new Ammo.btVector3(0,0,0));
        }
        if (key == "ctrl"){
            console.log("backward");
            let relativeForce = new Ammo.btVector3(0,0, -1000);
            let relativeTransform = new Ammo.btTransform();
            relativeTransform.setOrigin(relativeForce);
            let test = (this.transform.op_mul(relativeTransform)).getOrigin()
            this.jetPlane.applyForce(test, this.transform.getOrigin())// this.transform.getOrigin())
            //this.jetPlane.applyForce(new Ammo.btVector3(0, 0, 1000), new Ammo.btVector3(0,0,0));
        }
        this.jetPlane.getMotionState().getWorldTransform(this.transform);

        var jetMatrix = this.jetPlane.getWorldTransform().getBasis();
        var velocity = this.jetPlane.getLinearVelocity();

        // TODO: make velocity local to planes rigid body
        velocity = velocity.length();
        //  DEBUG 
        console.log("velocity length: " + velocity)
        // drawLine(new Ammo.btVector3(0,0,0), velocity, new Ammo.btVector3(255, 0, 0))
        //console.log(new Ammo.DebugDrawer().drawLine());

        let relativeForce = new Ammo.btVector3(0,velocity,0);
        let relativeTransform = new Ammo.btTransform();
        relativeTransform.setOrigin(relativeForce);
        let test = (this.transform.op_mul(relativeTransform)).getOrigin()
        console.log("x: " + test.x());
        console.log("y: " + test.y());
        console.log("z: " + test.z());
        this.jetPlane.applyForce(test, this.transform.getOrigin())// this.transform.getOrigin())
        //this.jetPlane.applyForce(new Ammo.btVector3(0, 0, 1000), new Ammo.btVector3(0,0,0));
    }

    /*
      Do one simulation tick
    */
    tick() {
        if (!this.last) {
            this.last = Date.now();
        }
        let now = Date.now();
        this.simulate(now - this.last);
        this.last = now;
    }

    getData(){
        return this.data;
    }
}
