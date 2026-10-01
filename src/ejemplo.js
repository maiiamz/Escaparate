// ---------- el canvas ----------
const canvas = document.querySelector('#escena');

// ---------- 1 · el renderizador ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---------- 2 · la escena ----------
const escena = new THREE.Scene();
escena.background = new THREE.Color('#111111');

// ---------- 3 · la cámara ----------
const LENTE = 50;   // 35 exagera, 50 neutral, 70 aplana

const camara = new THREE.PerspectiveCamera(LENTE, 16 / 9, 0.1, 100);

// ---------- 4 · la caja del escaparate ----------
const ANCHO = 4;    // de pared a pared
const ALTO  = 3;    // del piso al techo
const FONDO = 2.5;  // profundidad de la vitrina

const escaparate = new THREE.Group();
escena.add(escaparate);

// un material por superficie: el valor es lo que separa los planos
const matPiso  = new THREE.MeshBasicMaterial({ color: '#f4f3ee', side: THREE.DoubleSide });
const matFondo = new THREE.MeshBasicMaterial({ color: '#dedbd2', side: THREE.DoubleSide });
const matLados = new THREE.MeshBasicMaterial({ color: '#c4c1b8', side: THREE.DoubleSide });
const matTecho = new THREE.MeshBasicMaterial({ color: '#2a2a28', side: THREE.DoubleSide });

// piso
const piso = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, FONDO), matPiso);
piso.rotation.x = -Math.PI / 2;
escaparate.add(piso);

// techo
const techo = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, FONDO), matTecho);
techo.rotation.x = Math.PI / 2;
techo.position.set(0, ALTO, 0);
escaparate.add(techo);

// pared del fondo
const fondo = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, ALTO), matFondo);
fondo.position.set(0, ALTO / 2, -FONDO / 2);
escaparate.add(fondo);

// pared izquierda
const izq = new THREE.Mesh(new THREE.PlaneGeometry(FONDO, ALTO), matLados);
izq.rotation.y = Math.PI / 2;
izq.position.set(-ANCHO / 2, ALTO / 2, 0);
escaparate.add(izq);

// pared derecha
const der = new THREE.Mesh(new THREE.PlaneGeometry(FONDO, ALTO), matLados);
der.rotation.y = -Math.PI / 2;
der.position.set(ANCHO / 2, ALTO / 2, 0);
escaparate.add(der);

// ---------- 5 · el lápiz ----------
const lapiz = new THREE.Group();
escaparate.add(lapiz);

const LARGO_CUERPO = 2.2;    // el cuerpo hexagonal
const RADIO        = 0.085;  // proporción real de lápiz

const matCuerpo = new THREE.MeshBasicMaterial({ color: '#3d3d42' });   // grafito oscuro
const matMadera = new THREE.MeshBasicMaterial({ color: '#c9a227' });   // madera expuesta
const matPunta  = new THREE.MeshBasicMaterial({ color: '#2b2b2b' });   // el grafito

// el cuerpo: cilindro de 6 lados = hexágono
const cuerpo = new THREE.Mesh(
  new THREE.CylinderGeometry(RADIO, RADIO, LARGO_CUERPO, 6),
  matCuerpo
);
lapiz.add(cuerpo);

// el cono de madera
const madera = new THREE.Mesh(
  new THREE.ConeGeometry(RADIO, 0.34, 6),
  matMadera
);
madera.position.y = -(LARGO_CUERPO / 2) - 0.17;
lapiz.add(madera);

// la punta de grafito
const punta = new THREE.Mesh(
  new THREE.ConeGeometry(RADIO * 0.45, 0.13, 6),
  matPunta
);
punta.position.y = -(LARGO_CUERPO / 2) - 0.38;
lapiz.add(punta);

// posición y ángulo del lápiz completo
lapiz.position.set(-0.5, 1.5, 0.3);
lapiz.rotation.z = -0.42;   // la diagonal de la referencia

// ayuda visual: rojo X, verde Y, azul Z. Comenta esta línea cuando estorbe.
escena.add(new THREE.AxesHelper(2));

// ---------- 6 · controles de cámara ----------
// el centro de la órbita: el corazón de la composición
const CENTRO = new THREE.Vector3(0, ALTO * 0.45, 0);

const controles = new OrbitControls(camara, renderer.domElement);
controles.target.copy(CENTRO);

controles.enableDamping = true;      // inercia: se siente mucho mejor
controles.dampingFactor = 0.05;

// límites verticales: ni bajo el piso, ni sobre el techo
controles.minPolarAngle = Math.PI * 0.20;   // arriba
controles.maxPolarAngle = Math.PI * 0.50;   // horizonte: nunca desde abajo

// límites horizontales: un arco de ~120° al frente
controles.minAzimuthAngle = -Math.PI / 3;   // -60°
controles.maxAzimuthAngle =  Math.PI / 3;   // +60°

controles.enablePan = false;         // que no se pierda el centro

// ---------- encuadre automático ----------
// calcula qué tan lejos tiene que estar la cámara para que la caja llene el frame
const MARGEN = 0.3;   // aire alrededor de la caja, en metros

function encuadrar() {
  const vFov = (LENTE * Math.PI) / 180;    // el lente, en radianes
  const mitadV = Math.tan(vFov / 2);       // cuánto abre hacia arriba
  const mitadH = mitadV * camara.aspect;   // cuánto abre a los lados

  const distAlto  = (ALTO / 2 + MARGEN) / mitadV;
  const distAncho = (ANCHO / 2 + MARGEN) / mitadH;

  // gana la más lejana: si cabe la más exigente, cabe todo
  const dist = Math.max(distAlto, distAncho) + FONDO / 2;

  // los límites de zoom salen del encuadre ideal, no de números inventados
  controles.minDistance = dist * 0.45;   // no atravesar la pared del fondo
  controles.maxDistance = dist * 1.15;   // no alejarse hasta perder la pieza

  camara.position.set(0, ALTO * 0.55, dist);
  controles.update();
}

// ---------- sincronizar tamaños ----------
function ajustar() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);   // false = no toques el CSS
  camara.aspect = w / h;
  camara.updateProjectionMatrix();
}
addEventListener('resize', ajustar);
ajustar();
encuadrar();   // una sola vez: después manda el usuario

// ---------- el bucle ----------
const reloj = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const t = reloj.getElapsedTime();

  controles.update();   // obligatorio con damping

  renderer.render(escena, camara);
});
