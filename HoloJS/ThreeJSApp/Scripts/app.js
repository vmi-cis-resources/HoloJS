let canvas = document.createElement(window.getViewMatrix ? 'canvas3D' : 'canvas');
if (!window.getViewMatrix) {
    document.body.appendChild(canvas);
    document.body.style.margin = document.body.style.padding = 0;
    canvas.style.width = canvas.style.height = "100%";
}

class HolographicCamera extends THREE.Camera {

    constructor () {
        super();
        this._holographicViewMatrix = new THREE.Matrix4();
        this._holographicTransformMatrix = new THREE.Matrix4();
        this._flipMatrix = new THREE.Matrix4().makeScale(-1, 1, 1);
    }

    update () {
        this._holographicViewMatrix.elements.set(window.getViewMatrix());
        this._holographicViewMatrix.multiply(this._flipMatrix);
        this._holographicTransformMatrix.getInverse(this._holographicViewMatrix);
        this._holographicTransformMatrix.decompose(this.position, this.quaternion, this.scale);
    }
}

let renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
let scene = new THREE.Scene();
let camera = window.experimentalHolographic === true ? new HolographicCamera() : new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
let clock = new THREE.Clock();
let loader = new THREE.TextureLoader();
let material = new THREE.MeshStandardMaterial({ vertexColors: THREE.VertexColors, map: new THREE.DataTexture(new Uint8Array(3).fill(255), 1, 1, THREE.RGBFormat) });

let ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.8);
let directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
let pointLight = new THREE.PointLight(0xFFFFFF, 0.5);

let cube = new THREE.Mesh(new THREE.BoxBufferGeometry(0.2, 0.2, 0.2), material.clone());
let sphere = new THREE.Mesh(initColors(new THREE.SphereBufferGeometry(0.1, 20, 20)), material.clone());
let cone = new THREE.Mesh(initColors(new THREE.ConeBufferGeometry(0.1, 0.2, 20, 20)), material.clone());
let torus = new THREE.Mesh(initColors(new THREE.TorusKnotBufferGeometry(0.2, 0.02, 100, 100)), material.clone());

renderer.setSize(window.innerWidth, window.innerHeight);
loader.setCrossOrigin('anonymous');
material.map.needsUpdate = true;

directionalLight.position.set(0, 2, 0);

cube.position.set(0, 0, -1.5);
cube.geometry.addAttribute('color', new THREE.BufferAttribute(Float32Array.from([
    1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, // right - red
    0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // left - blue
    0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, // top - green
    1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, // bottom - yellow
    0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, // back - cyan
    1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, // front - purple
]), 3));
loader.load('texture.png', tex => { cube.material.map = tex; start(); }, x => x, err => start());

sphere.position.set(0.4, 0, -1.5);
sphere.material.color.set(0xff0000);
sphere.material.roughness = 0.3;
sphere.material.metalness = 0.2;

cone.position.set(-0.4, 0, -1.5);
cone.material.color.set(0x0000ff);
cone.material.roughness = 0.5;

torus.scale.set(1.5, 1.5, 1.5);
torus.material.color.set(0x00ff00);
torus.material.roughness = 0.5;
torus.material.metalness = 1.0;

scene.add(ambientLight);
scene.add(directionalLight);
scene.add(pointLight);

scene.add(cube);
scene.add(sphere);
scene.add(cone);
scene.add(torus);
scene.add(camera);

cube.frustumCulled = false;
sphere.frustumCulled = false;
cone.frustumCulled = false;
torus.frustumCulled = false;

var controls;

if (window.experimentalHolographic !== true) {
    camera.position.set(0, 0, 1);
    controls = new THREE.OrbitControls(camera, canvas);
}

function initColors (geometry) {
    return geometry.addAttribute('color', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.array.length).fill(1.0), 3));
}

function update (delta, elapsed) {
    window.requestAnimationFrame(() => update(clock.getDelta(), clock.getElapsedTime()));

    pointLight.position.set(0 + 2.0 * Math.cos(elapsed * 0.5), 0, -1.5 + 2.0 * Math.sin(elapsed * 0.5));

    if (camera.update) camera.update();

    renderer.render(scene, camera);
}

function start () {
    update(clock.getDelta(), clock.getElapsedTime());

    // Listen to spatial input events (hands)
    // On press, spatial mapping data is requested and the visible meshes are updated
    canvas.addEventListener("sourcepress", onSpatialSourcePress);
}

function SpatialMappingMeshes(scene) {
    var self = this;
    this.meshObjects = [];
    this.scene = scene;

    function hideMeshData() {
        for (var meshIndex in self.meshObjects) {
            self.scene.remove(self.meshObjects[meshIndex].Mesh);
        }
    };

    function showMeshData() {
        for (var meshIndex in self.meshObjects) {
            self.scene.add(self.meshObjects[meshIndex].Mesh);
        }
    };

    function idEquals(id1, id2) {
        if (id1.length != id2.length) {
            return false;
        }

        for (var i = 0; i < id1.length; i++) {
            if (id1[i] != id2[i]) {
                return false;
            }
        }

        return true;
    }

    this.clearMeshData = function (id) {
        if (id != undefined) {
            for (var meshIndex in self.meshObjects) {
                if (idEquals(self.meshObjects[meshIndex].id, id)) {
                    self.scene.remove(self.meshObjects[meshIndex].mesh);
                    self.meshObjects[meshIndex].mesh.geometry.dispose();
                    self.meshObjects[meshIndex].mesh.material.dispose();
                    self.meshObjects.splice(meshIndex, 1);
                    break;
                }
            }
        }
    };

    this.setMeshData = function (surfaceData) {
        self.clearMeshData(surfaceData.id);
        //var newMeshObject = createMeshObject(surfaceData);
        var newMeshObject = createMeshObjectBuffered(surfaceData);

        self.scene.add(newMeshObject.mesh);
        self.meshObjects.push(newMeshObject);
    }

    // This method is faster to render the mesh, but does not allow easy
    // manipulation of the surface; the buffers are passed through directly to the
    // GPU
    function createMeshObjectBuffered(surface) {
        var geometry = new THREE.BufferGeometry();

        // Make copies of the incoming buffers; they get recycled after this returns
        var indices = new Uint16Array(surface.indices);
        var vertices = new Float32Array(surface.vertices);
        var normals = new Uint8Array(surface.normals);

        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3, true));
        
        var vertexTransform = new THREE.Matrix4();
        vertexTransform.fromArray(surface.originToSurfaceTransform);
        geometry.applyMatrix(vertexTransform);

        return { id: surface.id, mesh: new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xFFFFFF })) };
    }

    // This method is slower than the one above, but allows for mesh manipulation
    function createMeshObject(surface) {
        var geometry = new THREE.Geometry();

        var vertexTransform = new THREE.Matrix4();
        vertexTransform.fromArray(surface.originToSurfaceTransform);

        var normalTransform = new THREE.Matrix4();
        normalTransform.fromArray(surface.normalTransform);

        var vertexIndex = 0;
        // Iterate over vertices, normals and indices and add them to the new geometry object
        for (vertexIndex = 0; vertexIndex <= surface.vertices.length - 3; vertexIndex += 3) {
            geometry.vertices.push(new THREE.Vector3(
                surface.vertices[vertexIndex],
                surface.vertices[vertexIndex + 1],
                surface.vertices[vertexIndex + 2]
            ));
        }

        geometry.applyMatrix(vertexTransform);

        for (var indiceIndex = 0; indiceIndex <= surface.indices.length - 3; indiceIndex += 3) {
            var vertexNormals = [];
            for (var normalIndex = 0; normalIndex < 3; normalIndex++) {
                vertexNormals[normalIndex] = new THREE.Vector3(
                    surface.normals[surface.indices[indiceIndex + normalIndex]],
                    surface.normals[surface.indices[indiceIndex + normalIndex] + 1],
                    surface.normals[surface.indices[indiceIndex + normalIndex] + 2]
                );
                vertexNormals[normalIndex].applyMatrix4(normalTransform);
            }
            geometry.faces.push(
                //Data passed back from surface reconstruction uses front CW winding order
                new THREE.Face3(
                    surface.indices[indiceIndex],
                    surface.indices[indiceIndex + 1],
                    surface.indices[indiceIndex + 2],
                    vertexNormals));
        }

        return { id: surface.id, mesh: new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xFFFFFF })) };
    }
}

var meshManager = new SpatialMappingMeshes(scene);
function onSurfaceAvailable(surfaceData) {
    meshManager.setMeshData(surfaceData);
}

function onSpatialSourcePress(spatialInputEvent) {
    var mappingOptions = { scanExtentMeters: { x: 5, y: 5, z: 3 }, trianglesPerCubicMeter: 100 };
    window.requestSpatialMappingData(onSurfaceAvailable, mappingOptions);
}

start();