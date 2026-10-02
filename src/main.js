import * as THREE from 'three';
import gsap from 'gsap';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

//--Canvas--
const canvas = document.querySelector('#scene');
const scene = new THREE.Scene();

//--Cámara--
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.x = 0;
camera.position.y = 0;
camera.position.z = 5;

//--Configuración de render--
const pixelRatioMax = 1.5;   // límite de resolución (1 = más rápido, 2 = más nítido)

const renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioMax));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;              // activa las sombras
renderer.shadowMap.type = THREE.PCFShadowMap;   // bordes suaves 
canvas.appendChild(renderer.domElement);

//--Contador de FPS 
const stats = new Stats();
stats.showPanel(0);   // 0 = FPS, 1 = ms por frame, 2 = memoria
document.body.appendChild(stats.dom);

//--Controles de orbita--
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // movimiento suave

//--Ratio cambio canvas a pantalla--
function resize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};

window.addEventListener('resize', resize);
resize();

//------Luces------
const luzAmbiente = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(luzAmbiente);

const luzDireccional = new THREE.DirectionalLight(0xffffff, 2);
luzDireccional.position.set(0, 2, 7);
scene.add(luzDireccional);

//------Configuración de sombras------
const sombraResolucion = 1024;   // calidad de la sombra (1024 = rápido, 2048 = más nítido, 4096 = pesado)
const sombraOpacidad = 0.35;     // qué tan oscura se ve la sombra (0 a 1)

luzDireccional.castShadow = true;
luzDireccional.shadow.mapSize.set(sombraResolucion, sombraResolucion);
luzDireccional.shadow.camera.left = -3.5;   // área que cubre la sombra 
luzDireccional.shadow.camera.right = 3.5;
luzDireccional.shadow.camera.top = 3;
luzDireccional.shadow.camera.bottom = -3;
luzDireccional.shadow.camera.near = 0.5;
luzDireccional.shadow.camera.far = 15;
luzDireccional.shadow.bias = -0.0005;       // evita rayas en las superficies
luzDireccional.shadow.normalBias = 0.02;
luzDireccional.shadow.radius = 4;           // suavidad del borde de la sombra
luzDireccional.shadow.camera.updateProjectionMatrix();


//------Escaparate-------
const ancho = 6; //pared a pared
const alto = 4; //piso a pared
const fondo = 3; //profundidad del escaparate

//geometría
const escaparateGeo = new THREE.BoxGeometry(ancho, alto, fondo); 
console.log("escaparateGeo");

//------Textura del piso------
const pisoCarpeta = '/texturas/textures/';

const pisoRepeticionX = 3;       // veces que se repite la textura a lo ancho
const pisoRepeticionY = 1.5;     // veces que se repite a lo fondo
const pisoRelieve = 1;           // intensidad del relieve (normal map). 0 = plano
const pisoRugosidad = 1;         // multiplicador de la rugosidad (0 = brillante, 1 = mate)

// Extensiones que se prueban en orden para cada mapa (usa la primera que exista)
const pisoExtensiones = ['.png', '.jpg', '.exr'];

const texLoader = new THREE.TextureLoader();
const exrLoader = new EXRLoader();
const anisotropia = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);   // 4 es suficiente y más ligero

// Repetir la textura y nitidez en ángulos
function configurarTextura(tex) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(pisoRepeticionX, pisoRepeticionY);
    tex.anisotropy = anisotropia;
    tex.needsUpdate = true;
}

// Carga un mapa probando cada extensión hasta que una funcione
function cargarMapaPiso(nombre, alCargar) {
    const intentar = (i) => {
        if (i >= pisoExtensiones.length) {
            console.error("No se encontró el mapa del piso:", pisoCarpeta + nombre, "(probé", pisoExtensiones.join(', ') + ")");
            return;
        }
        const ext = pisoExtensiones[i];
        const cargador = (ext === '.exr') ? exrLoader : texLoader;
        cargador.load(
            pisoCarpeta + nombre + ext,
            (tex) => {
                console.log("Piso:", nombre + ext, "cargado");
                alCargar(tex);
            },
            undefined,
            () => intentar(i + 1)   // si falla, prueba la siguiente extensión
        );
    };
    intentar(0);
}

// Material del piso
const pisoMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: pisoRugosidad,
    metalness: 0,
    side: THREE.DoubleSide
});

// Color
cargarMapaPiso('rocky_terrain_02_diff_2k', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;   // solo el mapa de color lleva esto
    configurarTextura(tex);
    pisoMat.map = tex;
    pisoMat.needsUpdate = true;
});

// Normal (relieve)
cargarMapaPiso('rocky_terrain_02_nor_gl_2k', (tex) => {
    configurarTextura(tex);
    pisoMat.normalMap = tex;
    pisoMat.normalScale.set(pisoRelieve, pisoRelieve);
    pisoMat.needsUpdate = true;
});

// Rugosidad
cargarMapaPiso('rocky_terrain_02_rough_2k', (tex) => {
    configurarTextura(tex);
    pisoMat.roughnessMap = tex;
    pisoMat.needsUpdate = true;
});

//materiales 
const derecha   = new THREE.MeshBasicMaterial({color: "#75bde4", side: THREE.DoubleSide});
const izquierda = new THREE.MeshBasicMaterial({color: "#75bde4", side: THREE.DoubleSide});
const abajo     = pisoMat;   // el piso usa la textura rocosa
const atras     = new THREE.MeshBasicMaterial({color: "#94cbf5", side: THREE.DoubleSide});
const oculto    = new THREE.MeshBasicMaterial({visible: false});

// composición en orden
const escaparateMat = [
    derecha,    
    izquierda,  
    oculto,     
    abajo,      
    oculto,    
    atras,      
];

const escaparate = new THREE.Mesh(escaparateGeo, escaparateMat);
escaparate.receiveShadow = true;   // el piso recibe las sombras directamente
scene.add(escaparate);
console.log("escaparate");

//------Planos receptores de sombra------
const sombraMat = new THREE.ShadowMaterial({
    opacity: sombraOpacidad,
    polygonOffset: true,         // evita parpadeo con la superficie de abajo
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
});

// Pared del fondo
const sombraPared = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), sombraMat);
sombraPared.position.set(0, 0, -fondo / 2 + 0.002);
sombraPared.receiveShadow = true;
scene.add(sombraPared);


//------Escudo------
const escudoGrupo = new THREE.Group();
scene.add(escudoGrupo);

// Posición, rotación, tamaño 
escudoGrupo.position.set(0, 0.5, -0.7);
escudoGrupo.rotation.x = 0;
escudoGrupo.rotation.y = Math.PI / -2;
escudoGrupo.rotation.z = 0;
escudoGrupo.scale.setScalar(.5);

//material
const escudoMat = new THREE.MeshStandardMaterial({color:'#ffc400', metalness: 1, roughness: 0.3});

// Giro continuo
const velocidadGiro = 0.01;


// modelo
const escudo = '/modelos/escudo.gltf'; 
const loader = new GLTFLoader();

loader.load(
    escudo,
    (gltf) => {
        const modeloEscudo = gltf.scene;

        // Aplicar el material y las sombras a todas las mallas del modelo
        modeloEscudo.traverse((hijo) => {
            if (hijo.isMesh) {
                hijo.material = escudoMat;
                hijo.castShadow = true;
                hijo.receiveShadow = true;
            }
        });

        // Medir el modelo
        const caja = new THREE.Box3().setFromObject(modeloEscudo);
        const tamano = caja.getSize(new THREE.Vector3());
        const centro = caja.getCenter(new THREE.Vector3());
        console.log("Tamaño original del escudo:", tamano);

        // Escalar para que su lado más grande mida 2 unidades (cabe en el escaparate)
        const escala = 2 / Math.max(tamano.x, tamano.y, tamano.z);
        modeloEscudo.scale.setScalar(escala);

        // Centrar el modelo dentro de su grupo
        modeloEscudo.position.set(
            -centro.x * escala,
            -centro.y * escala,
            -centro.z * escala
        );

        // IMPORTANTE: se agrega al grupo, NO a scene
        escudoGrupo.add(modeloEscudo);
        console.log("Escudo");
    },
    undefined,
    (error) => {
        console.error("Error cargando el escudo:", error);
    }
);

//------Espada 1------
const espada1Grupo = new THREE.Group();
scene.add(espada1Grupo);

// Posición, rotación, tamaño (posición = MANGO)
espada1Grupo.position.set(-1.5, -1, -0.4);
espada1Grupo.rotation.x = 0;
espada1Grupo.rotation.y = Math.PI / -2;
espada1Grupo.rotation.z = 0;
espada1Grupo.scale.setScalar(1.2);

// Pivote: desde dónde gira la espada
const espada1Pivote = new THREE.Group();
espada1Grupo.add(espada1Pivote);

// Configuración de la animación
// Math.PI * 0.7 (~126°) = mango abajo-izquierda y punta arriba-derecha
const espada1AnguloBase = Math.PI * 0.7;
const espada1AnguloSwing = Math.PI / 10;  // cuanto sube y baja
const espada1DuracionSwing = 1.2;         // segundos que tarda cada subida o bajada
const espada1Ease = "power3.inOut";       // lento al inicio, rápido en medio, lento al llegar
const espada1MangoEnMaximo = true;        // true = el mango es el extremo máximo del eje largo

//material
const espada1Mat = new THREE.MeshStandardMaterial({color:'#d6d6d6', metalness: 0.8, roughness: 0.3});

// modelo
const espada1 = '/modelos/espada.gltf'; 
const espada1loader = new GLTFLoader();

espada1loader.load(
    espada1,
    (gltf) => {
        const modeloEspada1 = gltf.scene;

        // Aplicar el material y las sombras a todas las mallas del modelo
        modeloEspada1.traverse((hijo) => {
            if (hijo.isMesh) {
                hijo.material = espada1Mat;
                hijo.castShadow = true;
                hijo.receiveShadow = true;
            }
        });

        // Medir el modelo
        const espada1Caja = new THREE.Box3().setFromObject(modeloEspada1);
        const espada1Tamano = espada1Caja.getSize(new THREE.Vector3());
        const espada1Centro = espada1Caja.getCenter(new THREE.Vector3());
        console.log("Tamaño original de la espada 1:", espada1Tamano);

        // Escalar para que su lado más grande mida 2 unidades
        const espada1Escala = 2 / Math.max(espada1Tamano.x, espada1Tamano.y, espada1Tamano.z);
        modeloEspada1.scale.setScalar(espada1Escala);

        // Detectar el eje más largo de la espada (el que va del mango a la punta)
        const espada1Dimensiones = { x: espada1Tamano.x, y: espada1Tamano.y, z: espada1Tamano.z };
        const espada1EjeLargo = Object.keys(espada1Dimensiones).reduce((a, b) =>
            espada1Dimensiones[a] >= espada1Dimensiones[b] ? a : b
        );
        console.log("Eje largo de la espada 1:", espada1EjeLargo);

        // Punto del mango
        const espada1Mango = espada1Centro.clone();
        espada1Mango[espada1EjeLargo] = espada1MangoEnMaximo ? espada1Caja.max[espada1EjeLargo] : espada1Caja.min[espada1EjeLargo];

        // Colocar el modelo para que el mango quede en el origen del pivote
        modeloEspada1.position.set(
            -espada1Mango.x * espada1Escala,
            -espada1Mango.y * espada1Escala,
            -espada1Mango.z * espada1Escala
        );

        // Se agrega al pivote de la espada 1
        espada1Pivote.add(modeloEspada1);
        console.log("Espada 1");
    },
    undefined,
    (error) => {
        console.error("Error cargando la espada 1:", error);
    }
);

//Animación de la espada 1
espada1Pivote.rotation.x = espada1AnguloBase - espada1AnguloSwing; // posición inicial

gsap.to(espada1Pivote.rotation, {
    x: espada1AnguloBase + espada1AnguloSwing,
    duration: espada1DuracionSwing,
    ease: espada1Ease,    // lento al arrancar, rápido en medio, lento al llegar
    yoyo: true,           // va y regresa
    repeat: -1            // infinito
});

//------ Espada 2 ------
const espada2Grupo = new THREE.Group();
scene.add(espada2Grupo);

// Posición, rotación, tamaño 
espada2Grupo.position.set(1.5, -1, -0.3);
espada2Grupo.rotation.x = 0;
espada2Grupo.rotation.y = Math.PI / -2;
espada2Grupo.rotation.z = 0;
espada2Grupo.scale.setScalar(1.2);

// Pivote propio
const espada2Pivote = new THREE.Group();
espada2Grupo.add(espada2Pivote);

// Configuración de la animación
// mango abajo-derecha y punta arriba-izquierda
const espada2AnguloBase = Math.PI * -0.7;
const espada2AnguloSwing = Math.PI / 10;  // cuánto sube y baja alrededor del ángulo base (18°)
const espada2DuracionSwing = 1.2;         // segundos que tarda cada subida o bajada
const espada2Ease = "power3.inOut";       // lento al inicio, rápido en medio, lento al llegar
const espada2MangoEnMaximo = true;        // true = el mango es el extremo máximo del eje largo

//material
const espada2Mat = new THREE.MeshStandardMaterial({color:'#d6d6d6', metalness: 0.8, roughness: 0.3});

// modelo
const espada2 = '/modelos/espada.gltf'; 
const espada2loader = new GLTFLoader();

espada2loader.load(
    espada2,
    (gltf) => {
        const modeloEspada2 = gltf.scene;

        // Aplicar el material y las sombras a todas las mallas del modelo
        modeloEspada2.traverse((hijo) => {
            if (hijo.isMesh) {
                hijo.material = espada2Mat;
                hijo.castShadow = true;
                hijo.receiveShadow = true;
            }
        });

        // Medir el modelo
        const espada2Caja = new THREE.Box3().setFromObject(modeloEspada2);
        const espada2Tamano = espada2Caja.getSize(new THREE.Vector3());
        const espada2Centro = espada2Caja.getCenter(new THREE.Vector3());
        console.log("Tamaño original de la espada 2:", espada2Tamano);

        // Escalar para que su lado más grande mida 2 unidades
        const espada2Escala = 2 / Math.max(espada2Tamano.x, espada2Tamano.y, espada2Tamano.z);
        modeloEspada2.scale.setScalar(espada2Escala);

        // Detectar el eje más largo de la espada (el que va del mango a la punta)
        const espada2Dimensiones = { x: espada2Tamano.x, y: espada2Tamano.y, z: espada2Tamano.z };
        const espada2EjeLargo = Object.keys(espada2Dimensiones).reduce((a, b) =>
            espada2Dimensiones[a] >= espada2Dimensiones[b] ? a : b
        );
        console.log("Eje largo de la espada 2:", espada2EjeLargo);

        // Punto del mango: centro del modelo, pero en el extremo del eje largo
        const espada2Mango = espada2Centro.clone();
        espada2Mango[espada2EjeLargo] = espada2MangoEnMaximo ? espada2Caja.max[espada2EjeLargo] : espada2Caja.min[espada2EjeLargo];

        // Colocar el modelo para que el mango quede en el origen del pivote
        modeloEspada2.position.set(
            -espada2Mango.x * espada2Escala,
            -espada2Mango.y * espada2Escala,
            -espada2Mango.z * espada2Escala
        );

        // Se agrega al pivote de la espada 2
        espada2Pivote.add(modeloEspada2);
        console.log("Espada 2");
    },
    undefined,
    (error) => {
        console.error("Error cargando la espada 2:", error);
    }
);

//Animación de la espada 2
espada2Pivote.rotation.x = espada2AnguloBase + espada2AnguloSwing; // posición inicial

gsap.to(espada2Pivote.rotation, {
    x: espada2AnguloBase - espada2AnguloSwing,
    duration: espada2DuracionSwing,
    ease: espada2Ease,    // lento al arrancar, rápido en medio, lento al llegar
    yoyo: true,           // va y regresa
    repeat: -1            // infinito
});

//------Nube 1------
const nubeGrupo = new THREE.Group();
scene.add(nubeGrupo);

// Posición y tamaño
const nubeX = -2;
const nubeY = 1.5;
const nubeZ = -1.2;
nubeGrupo.position.set(nubeX, nubeY - 0.08, nubeZ); // arranca en el punto más bajo del flote
nubeGrupo.scale.setScalar(1);

// Configuración de la animación
const nubeAmplitud = 0.08;   // sube y baja
const nubeDuracion = 2.5;    // segundos que tarda cada subida o bajada

// Material
const nubeMat = new THREE.MeshStandardMaterial({color:'#ffffff', metalness: 0, roughness: 1});

// Esferas que forman la nube: [x, y, z, radio]
const nubeBolas = [
    [ 0.00,  0.00, 0.00, 0.35],
    [-0.40, -0.08, 0.05, 0.26],
    [ 0.40, -0.08, 0.00, 0.28],
    [-0.15,  0.20, 0.00, 0.28],
    [ 0.20,  0.17, 0.05, 0.25],
    [-0.70, -0.14, 0.00, 0.18],
    [ 0.70, -0.14, 0.00, 0.18],
];

//Geometría (16 x 16 segmentos: se ve igual y pesa menos)
const nubeGeo = new THREE.SphereGeometry(1, 16, 16);

nubeBolas.forEach(([x, y, z, radio]) => {
    const bola = new THREE.Mesh(nubeGeo, nubeMat);
    bola.position.set(x, y, z);
    bola.scale.setScalar(radio);
    bola.castShadow = true;
    bola.receiveShadow = true;
    nubeGrupo.add(bola);
});
console.log("Nube 1");

//Animación de la nube 1
gsap.to(nubeGrupo.position, {
    y: nubeY + nubeAmplitud,
    duration: nubeDuracion,
    ease: "sine.inOut",   // movimiento suave, como flotando
    yoyo: true,           // sube y baja
    repeat: -1            // infinito
});

//------Nube 2------
const nube2Grupo = new THREE.Group();
scene.add(nube2Grupo);

// Posición y tamaño 
const nube2X = 2;
const nube2Y = 1.4;
const nube2Z = -1.2;
nube2Grupo.position.set(nube2X, nube2Y - 0.08, nube2Z); // arranca en el punto más bajo del flote
nube2Grupo.scale.setScalar(0.9);

// Configuración de la animación
const nube2Amplitud = 0.08;   // sube y baja
const nube2Duracion = 2.8;    // segundos que tarda cada subida o bajada
const nube2Delay = 1;         // desfase para que no flote sincronizada con la nube 1

// Material
const nube2Mat = new THREE.MeshStandardMaterial({color:'#ffffff', metalness: 0, roughness: 1});

// Esferas que forman la nube: [x, y, z, radio]
const nube2Bolas = [
    [ 0.00,  0.00, 0.00, 0.33],
    [ 0.42, -0.08, 0.05, 0.27],
    [-0.38, -0.08, 0.00, 0.25],
    [ 0.15,  0.20, 0.00, 0.28],
    [-0.20,  0.16, 0.05, 0.24],
    [ 0.72, -0.14, 0.00, 0.17],
    [-0.68, -0.14, 0.00, 0.19],
];

// Geometría
const nube2Geo = new THREE.SphereGeometry(1, 16, 16);

nube2Bolas.forEach(([x, y, z, radio]) => {
    const bola = new THREE.Mesh(nube2Geo, nube2Mat);
    bola.position.set(x, y, z);
    bola.scale.setScalar(radio);
    bola.castShadow = true;
    bola.receiveShadow = true;
    nube2Grupo.add(bola);
});
console.log("Nube 2");

//Animación de la nube 2
gsap.to(nube2Grupo.position, {
    y: nube2Y + nube2Amplitud,
    duration: nube2Duracion,
    delay: nube2Delay,
    ease: "sine.inOut",   // movimiento suave, como flotando
    yoyo: true,           // sube y baja
    repeat: -1            // infinito
});

//------Nube 3------
const nube3Grupo = new THREE.Group();
scene.add(nube3Grupo);

// Posición y tamaño 
const nube3X = -1.45;
const nube3Y = 0.95;
const nube3Z = -1.4;
nube3Grupo.position.set(nube3X, nube3Y - 0.05, nube3Z); // arranca en el punto más bajo del flote
nube3Grupo.scale.setScalar(0.45);

// Configuración de la animación
const nube3Amplitud = 0.05;   // sube y baja
const nube3Duracion = 3.4;    // segundos que tarda cada subida o bajada 
const nube3Delay = 0.5;       // desfase para que no flote sincronizada con las otras

// Material
const nube3Mat = new THREE.MeshStandardMaterial({color:'#e6f1fb', metalness: 0, roughness: 1});

// Esferas que forman la nube: [x, y, z, radio]
const nube3Bolas = [
    [ 0.00,  0.00, 0.00, 0.35],
    [-0.38, -0.08, 0.05, 0.25],
    [ 0.42, -0.07, 0.00, 0.27],
    [-0.10,  0.21, 0.00, 0.27],
    [ 0.24,  0.15, 0.05, 0.24],
    [-0.68, -0.14, 0.00, 0.17],
    [ 0.70, -0.13, 0.00, 0.17],
];

//Geometría
const nube3Geo = new THREE.SphereGeometry(1, 16, 16);

nube3Bolas.forEach(([x, y, z, radio]) => {
    const bola = new THREE.Mesh(nube3Geo, nube3Mat);
    bola.position.set(x, y, z);
    bola.scale.setScalar(radio);
    bola.castShadow = true;
    bola.receiveShadow = true;
    nube3Grupo.add(bola);
});
console.log("Nube 3");

//Animación
gsap.to(nube3Grupo.position, {
    y: nube3Y + nube3Amplitud,
    duration: nube3Duracion,
    delay: nube3Delay,
    ease: "sine.inOut",   // movimiento suave, como flotando
    yoyo: true,           // sube y baja
    repeat: -1            // infinito
});

//------Nube 4------
const nube4Grupo = new THREE.Group();
scene.add(nube4Grupo);

// Posición y tamaño
const nube4X = 0;
const nube4Y = 1.6;
const nube4Z = -1.35;
nube4Grupo.position.set(nube4X - 1.2, nube4Y - 0.04, nube4Z); // arranca en el extremo izquierdo
nube4Grupo.scale.setScalar(0.55);

// Configuración de la animación
const nube4Recorrido = 1.2;   // cuánto se aleja del centro hacia cada lado 
const nube4DuracionCruce = 14; // segundos que tarda en ir de un extremo al otro
const nube4Amplitud = 0.04;   // sube y baja
const nube4DuracionFlote = 2.6; // segundos de cada subida o bajada

// Material
const nube4Mat = new THREE.MeshStandardMaterial({color:'#f4f9ff', metalness: 0, roughness: 1});

// Esferas que forman la nube: [x, y, z, radio]
const nube4Bolas = [
    [ 0.00,  0.00, 0.00, 0.34],
    [ 0.40, -0.08, 0.05, 0.26],
    [-0.40, -0.07, 0.00, 0.27],
    [ 0.12,  0.21, 0.00, 0.27],
    [-0.22,  0.15, 0.05, 0.23],
    [ 0.70, -0.14, 0.00, 0.17],
    [-0.70, -0.13, 0.00, 0.18],
];

// Geometría
const nube4Geo = new THREE.SphereGeometry(1, 16, 16);

nube4Bolas.forEach(([x, y, z, radio]) => {
    const bola = new THREE.Mesh(nube4Geo, nube4Mat);
    bola.position.set(x, y, z);
    bola.scale.setScalar(radio);
    bola.castShadow = true;
    bola.receiveShadow = true;
    nube4Grupo.add(bola);
});
console.log("Nube 4");

// Animación de la nube 4
// Desplazamiento horizontal: va de izquierda a derecha y regresa
gsap.to(nube4Grupo.position, {
    x: nube4X + nube4Recorrido,
    duration: nube4DuracionCruce,
    ease: "sine.inOut",   // se frena un poco en los extremos
    yoyo: true,
    repeat: -1
});

// Flote vertical
gsap.to(nube4Grupo.position, {
    y: nube4Y + nube4Amplitud,
    duration: nube4DuracionFlote,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1
});

//------Pasto------
const pastoPisoY = -2;
const pastoMargenX = 0.05;       // margen respecto a las paredes laterales (evita que se corten)
const pastoMargenZ = 0.05;       // margen respecto a la pared del fondo
const pastoGrupos = 3;           // cantidad de grupos que se mecen por separado
const pastoHojasPorGrupo = 350;  // hojas en cada grupo (total = grupos x hojas)
const pastoAlturaMin = 0.15;     // altura mínima de una hoja (en unidades)
const pastoAlturaMax = 0.4;      // altura máxima de una hoja
const pastoAncho = 0.04;         // radio de la base de cada hoja
const pastoInclinacion = 0.25;   // cuánto se inclina cada hoja al azar (radianes)
const pastoSombras = false;      // false = el pasto no proyecta ni recibe sombras (mucho más rápido)

// Tonos de verde (azar)
const pastoColores = ['#2f7a35', '#3f8f3f', '#52a43e', '#6dbb45', '#8acb55'];

// Geometría
const pastoGeo = new THREE.ConeGeometry(pastoAncho, 1, 4);
pastoGeo.translate(0, 0.5, 0);

const pastoMat = new THREE.MeshStandardMaterial({color:'#ffffff', roughness: 0.9, metalness: 0});

const pastoListaGrupos = [];

for (let g = 0; g < pastoGrupos; g++) {
    // El grupo está en el piso: el balanceo gira desde la base de las hojas
    const pastoGrupo = new THREE.Group();
    pastoGrupo.position.set(0, pastoPisoY, 0);
    scene.add(pastoGrupo);

    const hojas = new THREE.InstancedMesh(pastoGeo, pastoMat, pastoHojasPorGrupo);
    hojas.castShadow = pastoSombras;
    hojas.receiveShadow = pastoSombras;
    const matriz = new THREE.Matrix4();
    const posicion = new THREE.Vector3();
    const rotacion = new THREE.Quaternion();
    const escala = new THREE.Vector3();
    const euler = new THREE.Euler();
    const color = new THREE.Color();

    for (let i = 0; i < pastoHojasPorGrupo; i++) {
        // Posición al azar dentro del piso
        posicion.set(
            (Math.random() - 0.5) * (ancho - pastoMargenX * 2),
            0,
            (Math.random() - 0.5) * (fondo - pastoMargenZ * 2)
        );

        // Inclinación al azar
        euler.set(
            (Math.random() - 0.5) * pastoInclinacion * 2,
            Math.random() * Math.PI * 2,
            (Math.random() - 0.5) * pastoInclinacion * 2
        );
        rotacion.setFromEuler(euler);

        // Altura al azar (x y z un poco variables para que no todas sean iguales)
        const altura = pastoAlturaMin + Math.random() * (pastoAlturaMax - pastoAlturaMin);
        const grosor = 0.8 + Math.random() * 0.6;
        escala.set(grosor, altura, grosor);

        matriz.compose(posicion, rotacion, escala);
        hojas.setMatrixAt(i, matriz);

        // Tono de verde al azar
        color.set(pastoColores[Math.floor(Math.random() * pastoColores.length)]);
        hojas.setColorAt(i, color);
    }

    hojas.instanceMatrix.needsUpdate = true;
    hojas.instanceColor.needsUpdate = true;
    pastoGrupo.add(hojas);
    pastoListaGrupos.push(pastoGrupo);
}
console.log("Pasto");

//Animación del pasto
const pastoBalanceo = 0.03;      // cuánto se inclina el grupo (radianes)
const pastoDuracionBase = 2.2;   // segundos que tarda cada vaivén (cada grupo varía un poco)

pastoListaGrupos.forEach((pastoGrupo, i) => {
    pastoGrupo.rotation.z = -pastoBalanceo;
    gsap.to(pastoGrupo.rotation, {
        z: pastoBalanceo,
        duration: pastoDuracionBase + i * 0.6,
        delay: i * 0.3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
    });
});

//------Gema de cristal------
const gemaX = -2.5;
const gemaY = -0.6;             // altura base (el piso está en y = -2)
const gemaZ = 0.5;
const gemaRadio = 0.50;
const gemaAlargar = 3;         // qué tan alta es respecto a su ancho
const gemaGiroDuracion = 8;      // segundos por vuelta completa
const gemaFloteAmplitud = 0.06;  // cuánto sube y baja
const gemaFloteDuracion = 2.2;   // segundos de cada subida o bajada

// Ajustes del cristal
const gemaIor = 2.0;                 // índice de refracción (1.5 = vidrio, 2.0 = diamante)
const gemaGrosor = 0.8;              // grosor para la refracción (más alto = más deformación)
const gemaDispersion = 0.4;          // separación de colores en los bordes (0 = ninguna)
const gemaReflejos = 2.5;            // intensidad de los reflejos del entorno
const gemaColorInterior = '#2fc8ff'; // tinte del cristal al atravesarlo
const gemaNucleo = true;             // pequeño cristal brillante en el interior

// Entorno de reflejos SOLO para las gemas (no cambia el aspecto del resto de la escena)
const gemaPmrem = new THREE.PMREMGenerator(renderer);
const gemaEntorno = gemaPmrem.fromScene(new RoomEnvironment(), 0.04).texture;
gemaPmrem.dispose();

const gemaMat = new THREE.MeshPhysicalMaterial({
    color: '#ff3bb1',
    metalness: 0,
    roughness: 0,
    transmission: 1,                 // transparencia real: se ve lo que hay detrás
    thickness: gemaGrosor,
    ior: gemaIor,
    dispersion: gemaDispersion,
    attenuationColor: gemaColorInterior,
    attenuationDistance: 0.6,
    specularIntensity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0,
    envMap: gemaEntorno,
    envMapIntensity: gemaReflejos,
    flatShading: true                // caras planas, como cristal tallado
});

const gema = new THREE.Mesh(new THREE.OctahedronGeometry(gemaRadio, 0), gemaMat);
gema.scale.set(1, gemaAlargar, 1);
gema.position.set(gemaX, gemaY - gemaFloteAmplitud, gemaZ);
gema.castShadow = false;             // un cristal con sombra sólida se ve falso
gema.receiveShadow = false;
scene.add(gema);

// Núcleo interior: se ve refractado a través de las caras y da profundidad
if (gemaNucleo) {
    const nucleo = new THREE.Mesh(
        new THREE.OctahedronGeometry(gemaRadio * 0.5, 0),
        new THREE.MeshBasicMaterial({color: '#8fefff'})
    );
    gema.add(nucleo);
}
console.log("Gema");

//Animación de la gema
gsap.to(gema.rotation, {
    y: Math.PI * 2,
    duration: gemaGiroDuracion,
    ease: "none",
    repeat: -1
});

gsap.to(gema.position, {
    y: gemaY + gemaFloteAmplitud,
    duration: gemaFloteDuracion,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1
});

//------Gema 2------
const gema2X = 2.5;              // lado opuesto 
const gema2Y = -0.6;             // altura base 
const gema2Z = 0.5;
const gema2Radio = 0.50;
const gema2Alargar = 3;          // qué tan alta es respecto a su ancho
const gema2GiroDuracion = 8;     // segundos por vuelta completa
const gema2FloteAmplitud = 0.06; // cuánto sube y baja
const gema2FloteDuracion = 2.2;  // segundos de cada subida o bajada

// Ajustes del cristal
const gema2Ior = 2.0;                 // índice de refracción (1.5 = vidrio, 2.0 = diamante)
const gema2Grosor = 0.8;              // grosor para la refracción (más alto = más deformación)
const gema2Dispersion = 0.4;          // separación de colores en los bordes (0 = ninguna)
const gema2Reflejos = 2.5;            // intensidad de los reflejos del entorno
const gema2ColorInterior = '#2fc8ff'; // tinte del cristal al atravesarlo
const gema2Nucleo = true;             // pequeño cristal brillante en el interior

const gema2Mat = new THREE.MeshPhysicalMaterial({
    color: '#ff3bb1',
    metalness: 0,
    roughness: 0,
    transmission: 1,                 // transparencia real: se ve lo que hay detrás
    thickness: gema2Grosor,
    ior: gema2Ior,
    dispersion: gema2Dispersion,
    attenuationColor: gema2ColorInterior,
    attenuationDistance: 0.6,
    specularIntensity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0,
    envMap: gemaEntorno,             
    envMapIntensity: gema2Reflejos,
    flatShading: true                // caras planas, como cristal tallado
});

const gema2 = new THREE.Mesh(new THREE.OctahedronGeometry(gema2Radio, 0), gema2Mat);
gema2.scale.set(1, gema2Alargar, 1);
gema2.position.set(gema2X, gema2Y - gema2FloteAmplitud, gema2Z);
gema2.castShadow = false;
gema2.receiveShadow = false;
scene.add(gema2);

// Núcleo interior
if (gema2Nucleo) {
    const nucleo2 = new THREE.Mesh(
        new THREE.OctahedronGeometry(gema2Radio * 0.5, 0),
        new THREE.MeshBasicMaterial({color: '#8fefff'})
    );
    gema2.add(nucleo2);
}
console.log("Gema 2");

//Animación de la gema 2
gsap.to(gema2.rotation, {
    y: Math.PI * 2,
    duration: gema2GiroDuracion,
    ease: "none",
    repeat: -1
});

gsap.to(gema2.position, {
    y: gema2Y + gema2FloteAmplitud,
    duration: gema2FloteDuracion,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1
});

//------Destello del escudo------
const destelloGrupo = new THREE.Group();
scene.add(destelloGrupo);

// Posición
const destelloX = 0;
const destelloY = 0.5;
const destelloZ = -0.85;
destelloGrupo.position.set(destelloX, destelloY, destelloZ);

// Configuración
const destelloTamano = 2.4;          // diámetro del resplandor (en unidades)
const destelloLatido = 1.2;          // segundos que dura cada "latido" (crece y se achica)
const destelloPulso = 0.12;          // cuánto crece en cada latido (0.12 = 12%)
const destelloOpacidadMin = 0.55;    // brillo mínimo del latido (0 a 1)
const destelloOpacidadMax = 1;       // brillo máximo del latido (0 a 1)

// Textura del resplandor
function crearTexturaResplandor() {
    const lienzo = document.createElement('canvas');
    lienzo.width = 512;
    lienzo.height = 512;
    const ctx = lienzo.getContext('2d');
    const c = 256;

    const brillo = ctx.createRadialGradient(c, c, 0, c, c, 256);
    brillo.addColorStop(0, 'rgba(229, 255, 0, 0.95)');
    brillo.addColorStop(0.25, 'rgba(229, 255, 146, 0.7)');
    brillo.addColorStop(0.55, 'rgba(255, 248, 109, 0.28)');
    brillo.addColorStop(1, 'rgba(255,210,80,0)');
    ctx.fillStyle = brillo;
    ctx.fillRect(0, 0, 512, 512);

    return new THREE.CanvasTexture(lienzo);
}

// Mezcla normal para que el dorado se vea sobre el fondo azul claro
const destelloMat = new THREE.SpriteMaterial({
    map: crearTexturaResplandor(),
    transparent: true,
    opacity: destelloOpacidadMin,
    depthWrite: false
});
const destelloSprite = new THREE.Sprite(destelloMat);
destelloSprite.scale.set(destelloTamano * (1 - destelloPulso), destelloTamano * (1 - destelloPulso), 1);
destelloGrupo.add(destelloSprite);
console.log("Destello");

//Animación del destello
gsap.to(destelloSprite.scale, {
    x: destelloTamano * (1 + destelloPulso),
    y: destelloTamano * (1 + destelloPulso),
    duration: destelloLatido,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1
});

gsap.to(destelloMat, {
    opacity: destelloOpacidadMax,
    duration: destelloLatido,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1
});

//------Giro del escudo al hacer click------
const clicVueltas = 3;               // vueltas extra que da con cada clic
const clicDuracion = 2;              // segundos que dura el giro
const clicEase = "power3.out";       // arranca muy rápido y va frenando suave
const clicUmbralArrastre = 5;        // píxeles: si el mouse se mueve más que esto, es arrastre (órbita), no clic

const raycaster = new THREE.Raycaster();
const puntero = new THREE.Vector2();
let escudoGirando = false;
let clicInicioX = 0;
let clicInicioY = 0;

// Revisa si el mouse está encima del escudo
function mouseSobreEscudo(evento) {
    const rect = renderer.domElement.getBoundingClientRect();
    puntero.x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
    puntero.y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(puntero, camera);
    return raycaster.intersectObject(escudoGrupo, true).length > 0;
}

// Giro extra: se SUMA al giro continuo, así al terminar queda como si nada hubiera pasado
function girarEscudo() {
    if (escudoGirando) return;   // evita que se empalmen varios giros
    escudoGirando = true;

    const giro = { valor: 0 };
    let anterior = 0;

    gsap.to(giro, {
        valor: Math.PI * 2 * clicVueltas,
        duration: clicDuracion,
        ease: clicEase,
        onUpdate: () => {
            escudoGrupo.rotation.y += giro.valor - anterior;
            anterior = giro.valor;
        },
        onComplete: () => {
            escudoGirando = false;
        }
    });
}

// Guarda dónde se presionó el mouse (para distinguir clic de arrastre)
renderer.domElement.addEventListener('pointerdown', (e) => {
    clicInicioX = e.clientX;
    clicInicioY = e.clientY;
});

// Al soltar: si casi no se movió y estaba sobre el escudo, gira
renderer.domElement.addEventListener('pointerup', (e) => {
    const movido = Math.hypot(e.clientX - clicInicioX, e.clientY - clicInicioY);
    if (movido > clicUmbralArrastre) return;
    if (mouseSobreEscudo(e)) girarEscudo();
});

// Cursor de manita al pasar sobre el escudo
renderer.domElement.addEventListener('pointermove', (e) => {
    renderer.domElement.style.cursor = mouseSobreEscudo(e) ? 'pointer' : 'default';
});

//------Hover del escudo------
const hoverAgrandar = 1.30;          // cuánto crece
const hoverDuracion = 0.35;          // segundos que tarda en crecer o regresar
const hoverEaseEntrada = "power2.out";   // al entrar: arranca rápido y suaviza
const hoverEaseSalida = "power2.inOut";  // al salir: regreso suave

const hoverEscalaBase = escudoGrupo.scale.x;   // tamaño normal del escudo 
let escudoHover = false;

// Anima el tamaño del escudo hacia el valor indicado
function escalarEscudo(factor, ease) {
    gsap.to(escudoGrupo.scale, {
        x: hoverEscalaBase * factor,
        y: hoverEscalaBase * factor,
        z: hoverEscalaBase * factor,
        duration: hoverDuracion,
        ease: ease,
        overwrite: "auto"   // si estaba creciendo y sale el mouse, cambia de dirección sin pelearse
    });
}

// Al mover el mouse: solo anima cuando cambia entre "encima" y "fuera"
renderer.domElement.addEventListener('pointermove', (e) => {
    const encima = mouseSobreEscudo(e);
    if (encima === escudoHover) return;
    escudoHover = encima;
    escalarEscudo(encima ? hoverAgrandar : 1, encima ? hoverEaseEntrada : hoverEaseSalida);
});

// Si el mouse sale del canvas estando sobre el escudo, regresa a su tamaño
renderer.domElement.addEventListener('pointerleave', () => {
    if (!escudoHover) return;
    escudoHover = false;
    escalarEscudo(1, hoverEaseSalida);
});

//------Choque de espadas con la barra espaciadora------
const choqueAnticipacion = Math.PI * 0.85;   // ángulo de la espada 1 al echarse hacia atrás (la 2 usa el negativo)
const choqueGolpe = Math.PI * 0.62;          // ángulo al golpear (más bajo = se cruzan más)
const choqueDuracionAnticipacion = 0.28;     // segundos que tarda en echarse hacia atrás
const choqueDuracionGolpe = 0.14;            // segundos del golpe (corto = más violento)
const choqueDuracionRebote = 0.9;            // segundos que tarda en volver al balanceo normal
const choqueEaseRebote = "elastic.out(1, 0.45)";   // rebote con vibración al volver

// Chispa del impacto
const choqueChispaX = 0;             // dónde aparece la chispa (cruce de las espadas)
const choqueChispaY = 0.3;
const choqueChispaZ = -0.2;          // un poco al frente de las espadas
const choqueChispaTamano = 1.6;      // tamaño máximo de la chispa
const choqueChispaDuracion = 0.45;   // segundos que dura la chispa

// Vibración del escudo al recibir el golpe
const choqueVibracion = 0.05;        // cuánto se mueve (unidades)
const choqueEscudoYBase = escudoGrupo.position.y;

// Letrero de ayuda en pantalla
const choqueMostrarAyuda = true;
const choqueTecla = 'Space';

// Textura de la chispa: núcleo blanco, brillo dorado y 4 rayos
function crearTexturaChoque() {
    const lienzo = document.createElement('canvas');
    lienzo.width = 256;
    lienzo.height = 256;
    const ctx = lienzo.getContext('2d');
    const c = 128;

    const brillo = ctx.createRadialGradient(c, c, 0, c, c, 110);
    brillo.addColorStop(0, 'rgba(255,255,255,1)');
    brillo.addColorStop(0.2, 'rgba(255,245,170,0.9)');
    brillo.addColorStop(0.6, 'rgba(255,200,60,0.3)');
    brillo.addColorStop(1, 'rgba(255,190,40,0)');
    ctx.fillStyle = brillo;
    ctx.fillRect(0, 0, 256, 256);

    const rayo = (horizontal) => {
        ctx.save();
        ctx.translate(c, c);
        if (!horizontal) ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(-125, 0);
        ctx.quadraticCurveTo(0, -9, 125, 0);
        ctx.quadraticCurveTo(0, 9, -125, 0);
        const g = ctx.createLinearGradient(-125, 0, 125, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
    };
    rayo(true);
    rayo(false);

    return new THREE.CanvasTexture(lienzo);
}

const choqueChispaMat = new THREE.SpriteMaterial({
    map: crearTexturaChoque(),
    transparent: true,
    opacity: 0,
    depthWrite: false
});
const choqueChispa = new THREE.Sprite(choqueChispaMat);
choqueChispa.position.set(choqueChispaX, choqueChispaY, choqueChispaZ);
choqueChispa.scale.set(0, 0, 1);
scene.add(choqueChispa);

let choqueEnCurso = false;

// Destello y vibración del impacto
function choqueImpacto() {
    // Chispa: aparece grande de golpe, gira un poco y se desvanece
    choqueChispaMat.rotation = 0;
    gsap.fromTo(choqueChispa.scale,
        { x: choqueChispaTamano * 0.3, y: choqueChispaTamano * 0.3 },
        { x: choqueChispaTamano, y: choqueChispaTamano, duration: choqueChispaDuracion, ease: "power3.out" }
    );
    gsap.fromTo(choqueChispaMat,
        { opacity: 1, rotation: 0 },
        { opacity: 0, rotation: Math.PI / 4, duration: choqueChispaDuracion, ease: "power2.in" }
    );

    // Vibración del escudo
    gsap.to(escudoGrupo.position, {
        y: choqueEscudoYBase + choqueVibracion,
        duration: 0.04,
        yoyo: true,
        repeat: 7,
        ease: "none",
        onComplete: () => { escudoGrupo.position.y = choqueEscudoYBase; }
    });
}

function chocarEspadas() {
    if (choqueEnCurso) return;   // evita que se empalmen varios choques
    choqueEnCurso = true;

    // Pausa el balanceo normal de cada espada y recuerda en qué ángulo estaba
    const tweensEspada1 = gsap.getTweensOf(espada1Pivote.rotation);
    const tweensEspada2 = gsap.getTweensOf(espada2Pivote.rotation);
    tweensEspada1.forEach((t) => t.pause());
    tweensEspada2.forEach((t) => t.pause());
    const angulo1 = espada1Pivote.rotation.x;
    const angulo2 = espada2Pivote.rotation.x;

    const tl = gsap.timeline({
        onComplete: () => {
            // Reanuda el balanceo desde el mismo ángulo en que se pausó
            tweensEspada1.forEach((t) => t.resume());
            tweensEspada2.forEach((t) => t.resume());
            choqueEnCurso = false;
        }
    });

    // 1) Anticipación: las dos se echan hacia atrás
    tl.to(espada1Pivote.rotation, { x: choqueAnticipacion, duration: choqueDuracionAnticipacion, ease: "power2.out" }, 0)
      .to(espada2Pivote.rotation, { x: -choqueAnticipacion, duration: choqueDuracionAnticipacion, ease: "power2.out" }, 0);

    // 2) Golpe: se cruzan rápido
    tl.addLabel("golpe")
      .to(espada1Pivote.rotation, { x: choqueGolpe, duration: choqueDuracionGolpe, ease: "power4.in" }, "golpe")
      .to(espada2Pivote.rotation, { x: -choqueGolpe, duration: choqueDuracionGolpe, ease: "power4.in" }, "golpe");

    // 3) Impacto: chispa y vibración del escudo
    tl.addLabel("impacto")
      .call(choqueImpacto, null, "impacto");

    // 4) Rebote: vuelven al ángulo donde estaban
    tl.to(espada1Pivote.rotation, { x: angulo1, duration: choqueDuracionRebote, ease: choqueEaseRebote }, "impacto")
      .to(espada2Pivote.rotation, { x: angulo2, duration: choqueDuracionRebote, ease: choqueEaseRebote }, "impacto");
}

// Barra espaciadora (ignora si la tecla se mantiene presionada)
window.addEventListener('keydown', (e) => {
    if (e.code !== choqueTecla) return;
    e.preventDefault();          // evita que la página haga scroll
    if (e.repeat) return;
    chocarEspadas();
});

// Letrero de ayuda
if (choqueMostrarAyuda) {
    const ayuda = document.createElement('div');
    ayuda.textContent = 'Espacio: chocar espadas';
    ayuda.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);' +
        'padding:8px 16px;border-radius:999px;background:rgba(0,0,0,0.55);color:#fff;' +
        'font:14px sans-serif;pointer-events:none;user-select:none;';
    document.body.appendChild(ayuda);
}

//--Renderizar la escena--
function animate() {
    requestAnimationFrame(animate);

    stats.begin();

    escudoGrupo.rotation.y += velocidadGiro; // giro continuo del escudo

    controls.update(); // requerido por el damping
    renderer.render(scene, camera);

    stats.end();
}
 
animate();