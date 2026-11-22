// The shape of a mock system design round: phases with suggested minutes and the questions a
// strong candidate answers in each, plus a self-assessment rubric. Generic guidance (a common
// interview structure), not any company's official rubric; the case-specific "what a strong
// answer covers" comes from the case's own concept file.
import type { I18n } from "./types";

export interface Phase { id: string; minutes: number; title: I18n; prompts: I18n[] }

export const PHASES: Phase[] = [
  { id: "req", minutes: 5, title: { en: "Requirements and scope", es: "Requisitos y alcance" }, prompts: [
    { en: "Who are the users and what are the 2–3 core use cases?", es: "¿Quiénes son los usuarios y cuáles son los 2–3 casos de uso centrales?" },
    { en: "Non-functional: latency, availability, consistency, durability. Which one wins when they conflict?", es: "No funcionales: latencia, disponibilidad, consistencia, durabilidad. ¿Cuál gana cuando chocan?" },
    { en: "What is explicitly out of scope?", es: "¿Qué queda explícitamente fuera de alcance?" },
  ] },
  { id: "est", minutes: 5, title: { en: "Estimates", es: "Estimaciones" }, prompts: [
    { en: "Users, actions per user, read:write ratio → average and peak QPS.", es: "Usuarios, acciones por usuario, relación lectura:escritura → QPS promedio y pico." },
    { en: "Storage per item × items per day × retention; bandwidth in and out.", es: "Almacenamiento por ítem × ítems por día × retención; ancho de banda de entrada y salida." },
    { en: "Which number changes the design (does it fit in memory? on one machine?)", es: "¿Qué número cambia el diseño? (¿cabe en memoria? ¿en una máquina?)" },
  ] },
  { id: "api", minutes: 8, title: { en: "API and data model", es: "API y modelo de datos" }, prompts: [
    { en: "The 3–5 endpoints or events, with their key parameters.", es: "Los 3–5 endpoints o eventos, con sus parámetros clave." },
    { en: "Entities, keys and the access pattern each table serves.", es: "Entidades, claves y el patrón de acceso que sirve cada tabla." },
    { en: "Where does each piece of data live, and why that store?", es: "¿Dónde vive cada dato y por qué ese almacenamiento?" },
  ] },
  { id: "hld", minutes: 10, title: { en: "High-level design", es: "Diseño de alto nivel" }, prompts: [
    { en: "Draw the components and walk one request end to end (write path and read path).", es: "Dibuja los componentes y recorre una request de punta a punta (camino de escritura y de lectura)." },
    { en: "Where are the caches, queues and replicas, and what does each buy?", es: "¿Dónde están los caches, colas y réplicas, y qué te compra cada uno?" },
    { en: "Check it against the requirements and the estimates.", es: "Contrástalo con los requisitos y las estimaciones." },
  ] },
  { id: "deep", minutes: 12, title: { en: "Deep dives", es: "Deep dives" }, prompts: [
    { en: "Pick the 1–2 hardest parts (the interviewer often picks one) and go deep.", es: "Elige las 1–2 partes más difíciles (el entrevistador suele elegir una) y profundiza." },
    { en: "Name at least two options for each and why you choose one: the trade-off.", es: "Nombra al menos dos opciones para cada una y por qué eliges una: el trade-off." },
    { en: "What breaks at 10× load, and how do you find out first?", es: "¿Qué se rompe con 10× de carga y cómo te enteras primero?" },
  ] },
  { id: "wrap", minutes: 5, title: { en: "Wrap-up", es: "Cierre" }, prompts: [
    { en: "Top risks and their mitigations; how you monitor and roll out.", es: "Principales riesgos y sus mitigaciones; cómo lo monitoreas y lo despliegas." },
    { en: "What you would build first, and what you would do differently with more time.", es: "Qué construirías primero y qué harías distinto con más tiempo." },
  ] },
];

export const TOTAL_MINUTES = PHASES.reduce((n, p) => n + p.minutes, 0);

export interface RubricDim { id: string; title: I18n; levels: [I18n, I18n, I18n, I18n]; study: string[] }

/** Four levels per dimension, from missing to Staff-level. `study` = concepts to revisit when weak. */
export const RUBRIC: RubricDim[] = [
  { id: "req", title: { en: "Requirements and scope", es: "Requisitos y alcance" }, study: ["design-framework"], levels: [
    { en: "Jumped into boxes", es: "Saltó directo a las cajas" }, { en: "Listed features", es: "Listó funcionalidades" },
    { en: "Clear functional + non-functional", es: "Funcionales y no funcionales claros" }, { en: "Drove scope and priorities", es: "Condujo el alcance y las prioridades" }] },
  { id: "est", title: { en: "Estimation", es: "Estimación" }, study: ["back-of-envelope"], levels: [
    { en: "None", es: "Ninguna" }, { en: "Numbers without use", es: "Números sin uso" },
    { en: "QPS, storage and bandwidth right", es: "QPS, almacenamiento y ancho de banda bien" }, { en: "Numbers drove the design", es: "Los números guiaron el diseño" }] },
  { id: "data", title: { en: "API and data model", es: "API y modelo de datos" }, study: ["api-design", "sql-vs-nosql", "sharding"], levels: [
    { en: "Missing", es: "Faltó" }, { en: "Vague", es: "Vago" },
    { en: "Keys fit the access patterns", es: "Las claves calzan con los accesos" }, { en: "Partitioning and growth planned", es: "Particionado y crecimiento pensados" }] },
  { id: "hld", title: { en: "High-level design", es: "Diseño de alto nivel" }, study: ["caching", "queues-streams", "replication"], levels: [
    { en: "Doesn't work end to end", es: "No funciona de punta a punta" }, { en: "Works, unjustified", es: "Funciona, sin justificar" },
    { en: "Sound and justified", es: "Sólido y justificado" }, { en: "Simple, evolvable, failure-aware", es: "Simple, evolucionable y pensado para fallas" }] },
  { id: "deep", title: { en: "Deep dive and trade-offs", es: "Deep dive y trade-offs" }, study: ["cap-pacelc", "consistency-models", "slos"], levels: [
    { en: "Stayed shallow", es: "Se quedó en la superficie" }, { en: "One option only", es: "Una sola opción" },
    { en: "Options compared with trade-offs", es: "Opciones comparadas con trade-offs" }, { en: "Quantified trade-offs and failure modes", es: "Trade-offs y modos de falla cuantificados" }] },
  { id: "comm", title: { en: "Communication", es: "Comunicación" }, study: ["tradeoff-communication"], levels: [
    { en: "Hard to follow", es: "Difícil de seguir" }, { en: "Followable, interviewer led", es: "Se sigue, guiado por el entrevistador" },
    { en: "Structured, checked in", es: "Estructurado, confirma con el entrevistador" }, { en: "Led the room, managed time", es: "Condujo la sesión y manejó el tiempo" }] },
];
