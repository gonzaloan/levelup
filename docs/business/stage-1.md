# Etapa 1: validar Pro (2–4 semanas, US$0)

Objetivo: saber si alguien quiere pagar antes de construir nada. Plan general y números en
`pro-analysis.md`. Este archivo es el paso a paso.

## 1. Formulario de lista de espera (10 min)
Créalo en Tally (gratis) o Google Forms. Tiene que tomar ≤ 2 minutos. Las preguntas, en este orden:

| # | Pregunta (ES / EN) | Tipo |
|---|---|---|
| 1 | Correo / Email | correo, obligatorio |
| 2 | ¿Para qué rol te preparas? / Which role are you preparing for? — Staff/Principal SWE · AI Architect / ML · Senior SWE · Otro | una opción |
| 3 | ¿Cuándo es tu próxima entrevista? / When is your next interview? — < 1 mes · 1–3 meses · > 3 meses · Sin fecha | una opción |
| 4 | ¿Qué de Pro te serviría más? / What in Pro would help most? — Coach que evalúa explicaciones · Feedback de historias STAR · Ronda de diseño evaluada · Revisión de código · Packs por empresa | varias |
| 5 | ¿Qué usas hoy para prepararte? / What do you use today? — LeetCode · NeetCode · Hello Interview · Exponent · Libros · ChatGPT/Claude · Nada · Otro | varias |
| 6 | ¿Cuánto pagarías al mes por Pro? / How much would you pay per month? — No pagaría · US$5 · US$10 · US$20 · US$30 o más | una opción |
| 7 | ¿Aceptas una charla de 20 min para contarnos cómo te preparas? / Up for a 20-min chat? — Sí · No | una opción |
| 8 | Acepto que me escriban sobre levelup Pro / I agree to be emailed about levelup Pro | casilla, obligatoria |

- Campos ocultos: `lang` y `src` (la página `/pro` los manda en el link).
- Sin login para responder. Activa el aviso por correo de cada respuesta nueva.

## 2. Conectar el formulario al sitio
```bash
PRO_FORM_URL=https://tally.so/r/XXXX ./deploy/sync-config.sh
```
Después, el build y el deploy de siempre. Sin esa URL, `/pro` dice "la lista de espera abre pronto".
El valor queda en `.env.production.local` (no se commitea) y `sync-config.sh` lo conserva.

## 3. Cómo medimos (sin rastrear a nadie)
El plan gratis de CloudFront no incluye logs (tabla "Plans and features" de
https://aws.amazon.com/cloudfront/pricing/, revisada el 2026-11-26), y levelup no usa analítica
en el navegador. Medimos con tres fuentes que ya existen y no cuestan nada:

| Fuente | Qué dice | Cómo |
|---|---|---|
| Formulario | Interesados en Pro, precio que pagarían, quién acepta charla | Panel de Tally |
| `deploy/usage.sh` | Cuentas que sincronizan y cuántas lo hicieron en 7 y 30 días | `./deploy/usage.sh` cada lunes |
| Google Search Console | Clics e impresiones desde Google, por página | Verifica el dominio (registro TXT en el DNS) y envía `https://levelup.skillrealm.dev/sitemap.xml` |

Anota cada lunes: interesados nuevos, activos 7d, activos 30d, clics de Search Console.

## 4. Lanzar y conversar
- Publica los textos de `launch-kit.md` (adáptalos a tu voz).
- Agenda 10 charlas con quienes marcaron "Sí" en la pregunta 7: guía en `user-interviews.md`.

## 5. Decidir (al cumplir 2–4 semanas)
- **Seguir a la etapa 2** si hay ~100 interesados, o si al menos 3–5% de los activos de 30 días
  se anotaron, y al menos 5 de las 10 charlas describen un dolor que el coach resuelve
  **(supuestos del análisis)**.
- **Si no:** levelup sigue gratis tal como está (menos de US$5/mes) y no se construye Pro.
- La etapa 2 va en un repo aparte (`levelup-pro`, privado, con su propio deploy); este repo queda
  solo con lo gratis.
