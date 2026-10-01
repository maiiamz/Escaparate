import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

//--Canvas--
const canvas = document.querySelector('#scene');
const scene = new THREE.Scene();

//--Cámara--
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.x = 0;
camera.position.y = 0;
camera.position.z = 5;

//--Configuración de render--
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
canvas.appendChild(renderer.domElement);

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


//------Escaparate-------
const ancho = 4; //pared a pared
const alto = 4; //piso a pared
const fondo = 3; //profundidad del escaparate

//geometría
const escaparateGeo = new THREE.BoxGeometry(ancho, alto, fondo); 
console.log("escaparateGeo");

//materiales 
const derecha   = new THREE.MeshBasicMaterial({color: "#75bde4", side: THREE.DoubleSide});
const izquierda = new THREE.MeshBasicMaterial({color: "#75bde4", side: THREE.DoubleSide});
const abajo     = new THREE.MeshBasicMaterial({color: "#294934", side: THREE.DoubleSide});
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
scene.add(escaparate);
console.log("escaparate");

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

// Ejes de depuración (rojo = X, verde = Y, azul = Z). Bórralo cuando termines.
//escudoGrupo.add(new THREE.AxesHelper(2));

// modelo
const escudo = '/modelos/escudo.gltf'; 
const loader = new GLTFLoader();

loader.load(
    escudo,
    (gltf) => {
        const modeloEscudo = gltf.scene;

        // Aplicar el material a todas las mallas del modelo
        modeloEscudo.traverse((hijo) => {
            if (hijo.isMesh) {
                hijo.material = escudoMat;
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

// Posición, rotación, tamaño (la posición marca dónde está el MANGO)
espada1Grupo.position.set(-1.5, -1, -0.4);
espada1Grupo.rotation.x = 0;
espada1Grupo.rotation.y = Math.PI / -2;
espada1Grupo.rotation.z = 0;
espada1Grupo.scale.setScalar(1.2);

// Pivote: el modelo se acomoda para que el mango quede en su origen,
// y la animación rota este pivote (así la espada gira desde el mango)
const espada1Pivote = new THREE.Group();
espada1Grupo.add(espada1Pivote);

// Configuración de la animación
// Ángulo base: 0 = espada colgando hacia abajo.
// Math.PI * 0.7 (~126°) = mango abajo-izquierda y punta arriba-derecha
const espada1AnguloBase = Math.PI * 0.7;
const espada1AnguloSwing = Math.PI / 10;  // cuánto sube y baja alrededor del ángulo base (18°)
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

        // Aplicar el material a todas las mallas del modelo
        modeloEspada1.traverse((hijo) => {
            if (hijo.isMesh) {
                hijo.material = espada1Mat;
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

        // Punto del mango: centro del modelo, pero en el extremo del eje largo
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

//------Animación de la espada 1 (subir y bajar desde el mango)------
espada1Pivote.rotation.x = espada1AnguloBase - espada1AnguloSwing; // posición inicial

gsap.to(espada1Pivote.rotation, {
    x: espada1AnguloBase + espada1AnguloSwing,
    duration: espada1DuracionSwing,
    ease: espada1Ease,    // lento al arrancar, rápido en medio, lento al llegar
    yoyo: true,           // va y regresa
    repeat: -1            // infinito
});

//------Espada 2 (lado contrario a la espada 1, completamente independiente)------
const espada2Grupo = new THREE.Group();
scene.add(espada2Grupo);

// Posición, rotación, tamaño (la posición marca dónde está el MANGO)
espada2Grupo.position.set(1.5, -1, -0.3);
espada2Grupo.rotation.x = 0;
espada2Grupo.rotation.y = Math.PI / -2;
espada2Grupo.rotation.z = 0;
espada2Grupo.scale.setScalar(1.2);

// Pivote propio: la animación rota este pivote (la espada gira desde el mango)
const espada2Pivote = new THREE.Group();
espada2Grupo.add(espada2Pivote);

// Configuración de la animación
// Ángulo base negativo = espejo de la espada 1:
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

        // Aplicar el material a todas las mallas del modelo
        modeloEspada2.traverse((hijo) => {
            if (hijo.isMesh) {
                hijo.material = espada2Mat;
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

//------Animación de la espada 2 (subir y bajar desde el mango)------
espada2Pivote.rotation.x = espada2AnguloBase + espada2AnguloSwing; // posición inicial (invertida para espejo)

gsap.to(espada2Pivote.rotation, {
    x: espada2AnguloBase - espada2AnguloSwing,
    duration: espada2DuracionSwing,
    ease: espada2Ease,    // lento al arrancar, rápido en medio, lento al llegar
    yoyo: true,           // va y regresa
    repeat: -1            // infinito
});

//------Nube 1 (geometría propia, completamente independiente)------
const nubeGrupo = new THREE.Group();
scene.add(nubeGrupo);

// Posición y tamaño (y = altura base alrededor de la cual flota)
const nubeX = -1;
const nubeY = 1.5;
const nubeZ = -1.2;
nubeGrupo.position.set(nubeX, nubeY - 0.08, nubeZ); // arranca en el punto más bajo del flote
nubeGrupo.scale.setScalar(1);

// Configuración de la animación
const nubeAmplitud = 0.08;   // cuánto sube y baja desde su altura base (en unidades)
const nubeDuracion = 2.5;    // segundos que tarda cada subida o bajada

// Material: blanco mate para que se vea suave
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

// Una sola geometría de esfera, reutilizada y escalada según el radio de cada bola
const nubeGeo = new THREE.SphereGeometry(1, 24, 24);

nubeBolas.forEach(([x, y, z, radio]) => {
    const bola = new THREE.Mesh(nubeGeo, nubeMat);
    bola.position.set(x, y, z);
    bola.scale.setScalar(radio);
    nubeGrupo.add(bola);
});
console.log("Nube 1");

//------Animación de la nube 1 (flota de arriba a abajo)------
gsap.to(nubeGrupo.position, {
    y: nubeY + nubeAmplitud,
    duration: nubeDuracion,
    ease: "sine.inOut",   // movimiento suave, como flotando
    yoyo: true,           // sube y baja
    repeat: -1            // infinito
});

//------Nube 2 (lado contrario a la nube 1, completamente independiente)------
const nube2Grupo = new THREE.Group();
scene.add(nube2Grupo);

// Posición y tamaño (y = altura base alrededor de la cual flota)
const nube2X = 1;
const nube2Y = 1.4;
const nube2Z = -1.2;
nube2Grupo.position.set(nube2X, nube2Y - 0.08, nube2Z); // arranca en el punto más bajo del flote
nube2Grupo.scale.setScalar(0.9);

// Configuración de la animación
const nube2Amplitud = 0.08;   // cuánto sube y baja desde su altura base (en unidades)
const nube2Duracion = 2.8;    // segundos que tarda cada subida o bajada
const nube2Delay = 1;         // desfase para que no flote sincronizada con la nube 1

// Material: blanco mate para que se vea suave
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

// Una sola geometría de esfera, reutilizada y escalada según el radio de cada bola
const nube2Geo = new THREE.SphereGeometry(1, 24, 24);

nube2Bolas.forEach(([x, y, z, radio]) => {
    const bola = new THREE.Mesh(nube2Geo, nube2Mat);
    bola.position.set(x, y, z);
    bola.scale.setScalar(radio);
    nube2Grupo.add(bola);
});
console.log("Nube 2");

//------Animación de la nube 2 (flota de arriba a abajo)------
gsap.to(nube2Grupo.position, {
    y: nube2Y + nube2Amplitud,
    duration: nube2Duracion,
    delay: nube2Delay,
    ease: "sine.inOut",   // movimiento suave, como flotando
    yoyo: true,           // sube y baja
    repeat: -1            // infinito
});

//------Destello del escudo (solo resplandor difuso, sin líneas)------
const destelloGrupo = new THREE.Group();
scene.add(destelloGrupo);

// Posición: centro del escudo, un poco DETRÁS de él para que el brillo "salga" del escudo
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

// Textura del resplandor: degradado radial dorado que se desvanece suavemente
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

// Mezcla normal (no aditiva) para que el dorado se vea sobre el fondo azul claro
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

//------Animación del destello (late: crece y se ilumina, luego se achica y baja)------
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

//--Renderizar la escena--
function animate() {
    requestAnimationFrame(animate);

    escudoGrupo.rotation.y += velocidadGiro; // giro continuo del escudo

    controls.update(); // requerido por el damping
    renderer.render(scene, camera);
}
 
animate();