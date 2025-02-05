let canvas;
let engine;
let scene;
// vars for handling inputs
let inputStates = {};

let objectives = [];
let enemies = [];

window.onload = startGame;

function startGame() {
    canvas = document.querySelector("#myCanvas");
    engine = new BABYLON.Engine(canvas, true);
    scene = createScene();

    // modify some default settings (i.e pointer events to prevent cursor to go 
    // out of the game window)
    modifySettings();

    let tank = scene.getMeshByName("heroTank");

    engine.runRenderLoop(() => {
        let deltaTime = engine.getDeltaTime(); // remind you something ?

        tank.move();

        let heroDude = scene.getMeshByName("heroDude");
        if(heroDude) heroDude.move();



        // Vérifier les collisions avec les objectifs
        checkObjectiveCollisions(tank, objectives);

        // Vérifier les collisions avec les ennemis
        checkEnemyCollisions(tank, enemies);

        // Mettre à jour les ennemis
        updateEnemies(enemies, tank);

        // Vérifier si le jeu est terminé
        checkGameOver(objectives);

        // Mettre à jour l'affichage du score
        scoreDisplay.textContent = "Score: " + score;


        scene.render();
    });
}


function checkCollisions(tank, scene) {
    let boxes = scene.getMeshesByTags("obstacle");
    for (let box of boxes) {
        if (tank.intersectsMesh(box)) {
            console.log("Collision detected!");
        }
    }
}

function createObstacles(scene) {
    for (let i = 0; i < 10; i++) {
        let box = BABYLON.MeshBuilder.CreateBox("obstacle" + i, {size: 5}, scene);
        box.position = new BABYLON.Vector3(Math.random() * 100 - 50, 2.5, Math.random() * 100 - 50);
        box.addTags("obstacle");
        let boxMaterial = new BABYLON.StandardMaterial("boxMaterial" + i, scene);
        boxMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        box.material = boxMaterial;
    }
}

let score = 0;
const scoreDisplay = document.getElementById("scoreDisplay");
function checkObjectiveCollisions(tank, objectives) {
    for (let objective of objectives) {
        if (!objective.isCollected && tank.intersectsMesh(objective, true)) {
            console.log("Collision détectée avec:", objective.name);

            objective.isCollected = true; // Marque l'objectif comme collecté
            score += 1; // Augmente le score
            scoreDisplay.textContent = "Score: " + score; // Met à jour l'affichage

            objective.setEnabled(false); // Désactive l'objectif après collecte
            //objective.dispose(); 
            console.log("Score:", score);
        }
    }
}

function checkEnemyCollisions(tank, enemies) {
    for (let enemy of enemies) {
        if (tank.intersectsMesh(enemy)) {
            console.log("Collision avec un ennemi !");
            score -= 1; // Perdre un point
            if (score < 0) score = 0; // Empêcher le score d'être négatif
            console.log("Score:", score);
        }
    }
    
}

function createScene() {
    let scene = new BABYLON.Scene(engine);
    let ground = createGround(scene);
    let freeCamera = createFreeCamera(scene);

    enemies = createEnemies(scene, 10); // Crée 5 ennemis
    objectives = createObjectives(scene, 100);// Crée 10 objectifs

    let tank = createTank(scene);

    // second parameter is the target to follow
    let followCamera = createFollowCamera(scene, tank);
    scene.activeCamera = followCamera;

    createLights(scene);
    createAdditionalLights(scene); // Ajout des lumières supplémentaires
    createSkyBox(scene); // Ajout de la SkyBox
    addFog(scene); // Ajout du brouillard
    createAdditionalObjects(scene); // Ajout des objets supplémentaires
    createHeroDude(scene);

    return scene;
}

function createGround(scene) {
    const groundOptions = { width:2000, height:2000, subdivisions:20, minHeight:0, maxHeight:100, onReady: onGroundCreated};
    //scene is optional and defaults to the current scene
    const ground = BABYLON.MeshBuilder.CreateGroundFromHeightMap("gdhm", 'images/hmap1.png', groundOptions, scene); 

    function onGroundCreated() {
        const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
        groundMaterial.diffuseTexture = new BABYLON.Texture("images/grass.jpg");
        ground.material = groundMaterial;
        // to be taken into account by collision detection
        ground.checkCollisions = true;
        //groundMaterial.wireframe=true;
    }
    return ground;
}

function createLights(scene) {
    // i.e sun light with all light rays parallels, the vector is the direction.
    let light0 = new BABYLON.DirectionalLight("dir0", new BABYLON.Vector3(-1, -1, 0), scene);

}

function createFreeCamera(scene) {
    let camera = new BABYLON.FreeCamera("freeCamera", new BABYLON.Vector3(0, 50, 0), scene);
    camera.attachControl(canvas);
    // prevent camera to cross ground
    camera.checkCollisions = true; 
    // avoid flying with the camera
    camera.applyGravity = true;

    // Add extra keys for camera movements
    // Need the ascii code of the extra key(s). We use a string method here to get the ascii code
    camera.keysUp.push('z'.charCodeAt(0));
    camera.keysDown.push('s'.charCodeAt(0));
    camera.keysLeft.push('q'.charCodeAt(0));
    camera.keysRight.push('d'.charCodeAt(0));
    camera.keysUp.push('Z'.charCodeAt(0));
    camera.keysDown.push('S'.charCodeAt(0));
    camera.keysLeft.push('Q'.charCodeAt(0));
    camera.keysRight.push('D'.charCodeAt(0));

    return camera;
}

function createFollowCamera(scene, target) {
    let camera = new BABYLON.FollowCamera("tankFollowCamera", target.position, scene, target);

    camera.radius = 40; // how far from the object to follow
	camera.heightOffset = 14; // how high above the object to place the camera
	camera.rotationOffset = 180; // the viewing angle
	camera.cameraAcceleration = .1; // how fast to move
	camera.maxCameraSpeed = 5; // speed limit

    return camera;
}

let zMovement = 5;
function createTank(scene) {
    let tank = new BABYLON.MeshBuilder.CreateBox("heroTank", {height:1, depth:6, width:6}, scene);
    let tankMaterial = new BABYLON.StandardMaterial("tankMaterial", scene);
    tankMaterial.diffuseColor = new BABYLON.Color3.Red;
    tankMaterial.emissiveColor = new BABYLON.Color3.Blue;
    tank.material = tankMaterial;

    // By default the box/tank is in 0, 0, 0, let's change that...
    tank.position.y = 0.6;
    tank.speed = 1;
    tank.frontVector = new BABYLON.Vector3(0, 0, 1);

    tank.checkCollisions = true;
    tank.move = () => {
                //tank.position.z += -1; // speed should be in unit/s, and depends on
                                 // deltaTime !

        // if we want to move while taking into account collision detections
        // collision uses by default "ellipsoids"

        let yMovement = 0;
       
        if (tank.position.y > 2) {
            zMovement = 0;
            yMovement = -2;
        } 
        //tank.moveWithCollisions(new BABYLON.Vector3(0, yMovement, zMovement));

        if(inputStates.up) {
            //tank.moveWithCollisions(new BABYLON.Vector3(0, 0, 1*tank.speed));
            tank.moveWithCollisions(tank.frontVector.multiplyByFloats(tank.speed, tank.speed, tank.speed));
        }    
        if(inputStates.down) {
            //tank.moveWithCollisions(new BABYLON.Vector3(0, 0, -1*tank.speed));
            tank.moveWithCollisions(tank.frontVector.multiplyByFloats(-tank.speed, -tank.speed, -tank.speed));

        }    
        if(inputStates.left) {
            //tank.moveWithCollisions(new BABYLON.Vector3(-1*tank.speed, 0, 0));
            tank.rotation.y -= 0.02;
            tank.frontVector = new BABYLON.Vector3(Math.sin(tank.rotation.y), 0, Math.cos(tank.rotation.y));
        }    
        if(inputStates.right) {
            //tank.moveWithCollisions(new BABYLON.Vector3(1*tank.speed, 0, 0));
            tank.rotation.y += 0.02;
            tank.frontVector = new BABYLON.Vector3(Math.sin(tank.rotation.y), 0, Math.cos(tank.rotation.y));
        }

    }

    return tank;
}

function createHeroDude(scene) {
   // load the Dude 3D animated model
    // name, folder, skeleton name 
    BABYLON.SceneLoader.ImportMesh("him", "models/Dude/", "Dude.babylon", scene,  (newMeshes, particleSystems, skeletons) => {
        let heroDude = newMeshes[0];
        heroDude.position = new BABYLON.Vector3(0, 0, 5);  // The original dude
        // make it smaller 
        heroDude.scaling = new BABYLON.Vector3(0.2 , 0.2, 0.2);
        heroDude.speed = 0.5;

        // give it a name so that we can query the scene to get it by name
        heroDude.name = "heroDude";

        // there might be more than one skeleton in an imported animated model. Try console.log(skeletons.length)
        // here we've got only 1. 
        // animation parameters are skeleton, starting frame, ending frame,  a boolean that indicate if we're gonna 
        // loop the animation, speed, 
       let a = scene.beginAnimation(skeletons[0], 0, 120, true, 1);

        heroDude.move = function() {
            // follow the tank
            let tank = scene.getMeshByName("heroTank");
            // let's compute the direction vector that goes from Dude to the tank
            let direction = tank.position.subtract(this.position);
            let distance = direction.length(); // we take the vector that is not normalized, not the dir vector
      
            console.log(distance);

            let dir = direction.normalize();
            // angle between Dude and tank, to set the new rotation.y of the Dude so that he will look towards the tank
            // make a drawing in the X/Z plan to uderstand....
            let alpha = Math.atan2(-dir.x, -dir.z);
            this.rotation.y = alpha;

            
            // let make the Dude move towards the tank
            if(distance > 30) {
                //a.restart();   
                this.moveWithCollisions(dir.multiplyByFloats(this.speed, this.speed, this.speed));
            } else {
                //a.pause();
            }
            
        }
    });
}
window.addEventListener("resize", () => {
    engine.resize()
});

function createSkyBox(scene) {
    let skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size: 1000}, scene);
    let skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/skybox/TropicalSunnyDay", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skybox.material = skyboxMaterial;
}

function addFog(scene) {
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    scene.fogDensity = 0.01;
    scene.fogColor = new BABYLON.Color3(0.9, 0.9, 0.85);
}

function createAdditionalObjects(scene) {
    // Créer une boîte
    let box = BABYLON.MeshBuilder.CreateBox("box", {size: 5}, scene);
    box.position = new BABYLON.Vector3(20, 2.5, 20);
    let boxMaterial = new BABYLON.StandardMaterial("boxMaterial", scene);
    boxMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0);
    box.material = boxMaterial;

    // Créer un cylindre
    let cylinder = BABYLON.MeshBuilder.CreateCylinder("cylinder", {height: 10, diameterTop: 4, diameterBottom: 4}, scene);
    cylinder.position = new BABYLON.Vector3(-20, 5, -20);
    let cylinderMaterial = new BABYLON.StandardMaterial("cylinderMaterial", scene);
    cylinderMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
    cylinder.material = cylinderMaterial;

    // Créer une sphère
    let sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 8}, scene);
    sphere.position = new BABYLON.Vector3(0, 4, -50);
    let sphereMaterial = new BABYLON.StandardMaterial("sphereMaterial", scene);
    sphereMaterial.diffuseColor = new BABYLON.Color3(0, 0, 1);
    sphere.material = sphereMaterial;
}

function createAdditionalLights(scene) {
    // Ajouter une lumière ponctuelle
    let pointLight = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(0, 50, 0), scene);
    pointLight.diffuse = new BABYLON.Color3(1, 0, 0);
    pointLight.specular = new BABYLON.Color3(1, 0, 0);

    // Ajouter une lumière spot
    let spotLight = new BABYLON.SpotLight("spotLight", new BABYLON.Vector3(0, 50, 0), new BABYLON.Vector3(0, -1, 0), Math.PI / 3, 10, scene);
    spotLight.diffuse = new BABYLON.Color3(0, 1, 0);
    spotLight.specular = new BABYLON.Color3(0, 1, 0);
}

function createEnemies(scene, numberOfEnemies = 5) {
    let enemies = [];
    for (let i = 0; i < numberOfEnemies; i++) {
        let enemy = BABYLON.MeshBuilder.CreateBox("enemy" + i, {size: 4}, scene);
        enemy.position = new BABYLON.Vector3(Math.random() * 100 - 50, 2, Math.random() * 100 - 50);
        enemy.speed = 0.5;
        enemy.direction = new BABYLON.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();

        let enemyMaterial = new BABYLON.StandardMaterial("enemyMaterial" + i, scene);
        enemyMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); // Rouge pour les ennemis
        enemy.material = enemyMaterial;

        enemy.move = function() {
            this.position.addInPlace(this.direction.multiplyByFloats(this.speed, this.speed, this.speed));

            if (this.position.x > 100 || this.position.x < -100) this.direction.x *= -1;
            if (this.position.z > 100 || this.position.z < -100) this.direction.z *= -1;
        };

        enemies.push(enemy);
    }
    return enemies;
}

function createObjectives(scene, numberOfObjectives = 10) {
    let objectives = [];

    for (let i = 0; i < numberOfObjectives; i++) {
        let objective = BABYLON.MeshBuilder.CreateSphere("objective" + i, {diameter: 3}, scene);
        objective.position = new BABYLON.Vector3(Math.random() * 100 - 50, 1.5, Math.random() * 100 - 50);
        objective.isCollected = false; // Marqueur pour éviter la double collecte

        let objectiveMaterial = new BABYLON.StandardMaterial("objectiveMaterial" + i, scene);
        objectiveMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0); // Jaune pour les objectifs
        objective.material = objectiveMaterial;

        objectives.push(objective);
    }
    return objectives;
}


function checkGameOver(objectives) {
    if (objectives.every(obj => obj.isCollected)) {
        console.log("Félicitations, vous avez gagné ! Score: " + score);
        
    } // Vous pouvez ajouter ici d'autres actions pour gérer la défaite
}


function updateEnemies(enemies, tank) {
    for (let enemy of enemies) {
        let direction = tank.position.subtract(enemy.position).normalize();
        enemy.position.addInPlace(direction.multiplyByFloats(enemy.speed, enemy.speed, enemy.speed));
    }
}
function modifySettings() {
    // as soon as we click on the game window, the mouse pointer is "locked"
    // you will have to press ESC to unlock it
    scene.onPointerDown = () => {
        if(!scene.alreadyLocked) {
            console.log("requesting pointer lock");
            canvas.requestPointerLock();
        } else {
            console.log("Pointer already locked");
        }
    }

    document.addEventListener("pointerlockchange", () => {
        let element = document.pointerLockElement || null;
        if(element) {
            // lets create a custom attribute
            scene.alreadyLocked = true;
        } else {
            scene.alreadyLocked = false;
        }
    })

    // key listeners for the tank
    inputStates.left = false;
    inputStates.right = false;
    inputStates.up = false;
    inputStates.down = false;
    inputStates.space = false;
    
    //add the listener to the main, window object, and update the states
    window.addEventListener('keydown', (event) => {
        if ((event.key === "ArrowLeft") || (event.key === "q")|| (event.key === "Q")) {
           inputStates.left = true;
        } else if ((event.key === "ArrowUp") || (event.key === "z")|| (event.key === "Z")){
           inputStates.up = true;
        } else if ((event.key === "ArrowRight") || (event.key === "d")|| (event.key === "D")){
           inputStates.right = true;
        } else if ((event.key === "ArrowDown")|| (event.key === "s")|| (event.key === "S")) {
           inputStates.down = true;
        }  else if (event.key === " ") {
           inputStates.space = true;
        }
    }, false);

    //if the key will be released, change the states object 
    window.addEventListener('keyup', (event) => {
        if ((event.key === "ArrowLeft") || (event.key === "q")|| (event.key === "Q")) {
           inputStates.left = false;
        } else if ((event.key === "ArrowUp") || (event.key === "z")|| (event.key === "Z")){
           inputStates.up = false;
        } else if ((event.key === "ArrowRight") || (event.key === "d")|| (event.key === "D")){
           inputStates.right = false;
        } else if ((event.key === "ArrowDown")|| (event.key === "s")|| (event.key === "S")) {
           inputStates.down = false;
        }  else if (event.key === " ") {
           inputStates.space = false;
        }
    }, false);
}

