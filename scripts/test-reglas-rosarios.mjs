// Prueba de las reglas de «salas_rosario» (Rosario en comunidad) con el emulador de Firestore (no toca la base real).
//   npm i -D firebase-tools @firebase/rules-unit-testing firebase
//   npx firebase emulators:exec --only firestore --project demo-agape "node scripts/test-reglas-rosarios.mjs"
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, deleteField, Timestamp } from "firebase/firestore";

const env = await initializeTestEnvironment({ projectId: "demo-agape", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), "users", "ana"), { role: "ingreso", active: true, name: "Ana Pérez", email: "a@x.cl" }); });
// ana: con cuenta; v1, v2: visitas con sesión anónima; nadie: sin sesión
const as = (uid) => uid === "ana" ? env.authenticatedContext("ana", { email: "a@x.cl", email_verified: true }).firestore()
  : env.authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } }).firestore();
const E = (n) => ({ n, a: serverTimestamp(), j: Date.now() });
const R = "ABCD", ref = (uid) => doc(as(uid), "salas_rosario", R);
const up = (uid, data) => updateDoc(ref(uid), { ...data, at: serverTimestamp() });
const sala = (uid) => ({ host: uid, hn: "Ana P.", guia: uid, set: "gozosos", i: 0, people: { [uid]: E("Ana P.") }, at: serverTimestamp(), createdAt: serverTimestamp() });
let n = 0; const t = async (name, p) => { await p; n++; console.log("✓", name); };

await t("sin sesión no se ve", assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "salas_rosario", R))));
await t("Ana crea la sala", assertSucceeds(setDoc(ref("ana"), sala("ana"))));
await t("código inválido", assertFails(setDoc(doc(as("ana"), "salas_rosario", "ab12"), sala("ana"))));
await t("no crea a nombre de otro", assertFails(setDoc(doc(as("ana"), "salas_rosario", "WXYZ"), sala("v1"))));
await t("visita anónima no abre salas", assertFails(setDoc(doc(as("v1"), "salas_rosario", "WXYZ"), { ...sala("v1"), people: { v1: E("Rosa") } })));
await t("visita anónima ve la sala", assertSucceeds(getDoc(ref("v1"))));
await t("v1 entra", assertSucceeds(up("v1", { "people.v1": E("Rosa") })));
await t("v2 entra", assertSucceeds(up("v2", { "people.v2": E("Juan") })));
await t("nombre vacío no", assertFails(up("v2", { "people.v2": { n: "", a: serverTimestamp(), j: 1 } })));
await t("no puede escribir el nombre de otro", assertFails(up("v2", { "people.v1": E("Otro") })));
await t("quien no guía no avanza", assertFails(up("v1", { i: 3 })));
await t("quien no guía no cambia misterios", assertFails(up("v1", { set: "dolorosos" })));
await t("quien no guía no toma la guía (la guía tiene señal)", assertFails(up("v1", { guia: "v1" })));
await t("Ana guía y avanza", assertSucceeds(up("ana", { i: 5 })));
await t("paso fuera de rango no", assertFails(up("ana", { i: 500 })));
await t("Ana cede la guía a v1", assertSucceeds(up("ana", { guia: "v1" })));
await t("v1 (sin cuenta) guía y avanza", assertSucceeds(up("v1", { i: 6, set: "luminosos" })));
await t("no se cede a alguien que no está", assertFails(up("v1", { guia: "zz" })));
await t("Ana (creó la sala) retoma la guía", assertSucceeds(up("ana", { guia: "ana" })));
await t("Ana ya no puede tocar el host", assertFails(up("ana", { host: "v2" })));
await t("Ana (guía) pone la llamada de WhatsApp", assertSucceeds(up("ana", { llamada: "https://call.whatsapp.com/voice/AbCdEf123" })));
await t("enlace de llamada de otro sitio no", assertFails(up("ana", { llamada: "https://ejemplo.com/x" })));
await t("quien no guía ni creó la sala no cambia la llamada", assertFails(up("v1", { llamada: "https://meet.google.com/abc-defg-hij" })));
await t("v2 avisa que sigue", assertSucceeds(up("v2", { "people.v2.a": serverTimestamp() })));
// La guía se queda sin señal: otro la toma
await env.withSecurityRulesDisabled(async (c) => { await updateDoc(doc(c.firestore(), "salas_rosario", R), { "people.ana.a": Timestamp.fromMillis(Date.now() - 10 * 60e3) }); });
await t("con la guía sin señal, v2 la toma", assertSucceeds(up("v2", { guia: "v2" })));
await t("v2 guía y avanza", assertSucceeds(up("v2", { i: 7 })));
await t("v1 no saca a otro", assertFails(up("v1", { "people.v2": deleteField() })));
await t("v1 sale", assertSucceeds(up("v1", { "people.v1": deleteField() })));
await t("v2 (guía) sale y deja la guía a Ana", assertSucceeds(up("v2", { "people.v2": deleteField(), guia: "ana" })));
await t("la guía no puede quedar en alguien que salió", assertFails(up("ana", { guia: "v2" })));
await t("Ana sale y la sala queda vacía (sala de espera)", assertSucceeds(up("ana", { "people.ana": deleteField() })));
await t("v1 llega a la sala de espera", assertSucceeds(up("v1", { "people.v1": E("Rosa") })));
await t("v1 no borra la sala", assertFails(deleteDoc(ref("v1"))));
await t("Ana (creó la sala) cierra la sala", assertSucceeds(deleteDoc(ref("ana"))));
console.log(`\n${n} pruebas OK`);
await env.cleanup();
