// Prueba de las reglas de «vistas» (lo más visto) con el emulador de Firestore (no toca la base real).
//
// Cómo correrla (en un computador con internet y Java):
//   npm i -D firebase-tools @firebase/rules-unit-testing firebase
//   npx firebase emulators:exec --only firestore --project demo-agape "node scripts/test-reglas-vistas.mjs"
//
// Si todo está bien, termina con «Todas las pruebas pasaron».
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";

const env = await initializeTestEnvironment({ projectId: "demo-agape", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
await env.withSecurityRulesDisabled(async (c) => {
  await setDoc(doc(c.firestore(), "users", "coord"), { role: "coordinador", active: true, name: "Coordinación", email: "coord@x.cl" });
  await setDoc(doc(c.firestore(), "users", "joven"), { role: "ingreso", active: true, name: "Joven", email: "joven@x.cl" });
});
const anon = env.unauthenticatedContext().firestore();
const joven = env.authenticatedContext("joven", { email: "joven@x.cl" }).firestore();
const coord = env.authenticatedContext("coord", { email: "coord@x.cl" }).firestore();
const D = "2026-10-27";
let n = 0;
const ok = async (t, p) => { await assertSucceeds(p); n++; console.log("✓", t); };
const no = async (t, p) => { await assertFails(p); n++; console.log("✓", t); };

await ok("un visitante sin cuenta suma 1 a una sección (crea el día)", setDoc(doc(anon, "vistas", D), { capilla: increment(1) }, { merge: true }));
await ok("otro suma 1 a la misma sección", setDoc(doc(joven, "vistas", D), { capilla: increment(1) }, { merge: true }));
await ok("y 1 a otra sección", setDoc(doc(anon, "vistas", D), { muro: increment(1) }, { merge: true }));
await no("no puede sumar 2 de una vez", setDoc(doc(anon, "vistas", D), { capilla: increment(2) }, { merge: true }));
await no("no puede sumar a dos secciones de una vez", setDoc(doc(anon, "vistas", D), { capilla: increment(1), muro: increment(1) }, { merge: true }));
await no("no puede inventar una sección", setDoc(doc(anon, "vistas", D), { otra: increment(1) }, { merge: true }));
await no("no puede bajar un número", setDoc(doc(anon, "vistas", D), { capilla: 0 }, { merge: true }));
await no("el nombre del documento tiene que ser una fecha", setDoc(doc(anon, "vistas", "hola"), { capilla: increment(1) }, { merge: true }));
await no("un joven no puede leer las estadísticas", getDoc(doc(joven, "vistas", D)));
await ok("la coordinación sí puede leerlas", getDoc(doc(coord, "vistas", D)));
const s = await env.withSecurityRulesDisabled(async (c) => (await getDoc(doc(c.firestore(), "vistas", D))).data());
if (s.capilla !== 2 || s.muro !== 1) throw new Error("Conteo inesperado: " + JSON.stringify(s));
console.log(`\nTodas las pruebas pasaron (${n}).`);
await env.cleanup();
