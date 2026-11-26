# levelup Pro: ¿es factible y es buena idea?

Análisis del 2026-11-25. Precios de terceros revisados en noviembre de 2026 (fuentes al final;
varias son blogs de comparación con interés comercial, así que se usan como rango, no como dato
exacto). Las cifras marcadas **(supuesto)** son hipótesis de trabajo, no mediciones.

## Veredicto
**Sí, con una condición: validar la demanda antes de construir.** Técnicamente es fácil (encaja
en lo que ya existe: Cognito, DynamoDB, Lambda) y la economía por usuario es buena: el costo de la
IA es una fracción chica del precio y se puede acotar por construcción. El riesgo real no es
técnico, es **distribución**: el mercado de preparación de entrevistas está lleno de productos
grandes. levelup tiene un ángulo propio (español + AI Architect/Staff + el Gimnasio contra la
pérdida de habilidades), pero hay que probar que alguien paga por él.

## 1. El mercado ya paga por esto
| Producto | Qué vende | Precio (nov. 2026, aprox.) |
|---|---|---|
| LeetCode Premium | Problemas de coding | US$35/mes o US$159/año |
| NeetCode Pro | Cursos + problemas | US$119/año o US$297 de por vida |
| Exponent (ahora "Aced") | Cursos, IA, comunidad | ~US$79/mes; plan anual ~US$149 (las fuentes no coinciden) |
| Hello Interview Premium | System design | pago único, ~US$47–78 por año según la fuente |
| interviewing.io | Mock con humano | desde US$179 por sesión |
| Final Round AI | Mock y "copiloto" con IA | US$90–150/mes o US$300/año |

Lectura: la gente paga **US$100–300 al año** por contenido y práctica, y bastante más por
feedback (humano o IA). Ninguno de los grandes está en español ni se enfoca en AI Architect, y
ninguno vende "no perder habilidades por usar IA".

**La señal de demanda del Gimnasio:** en la encuesta de Stack Overflow 2025, el 84% usa o piensa
usar IA, pero el 46% desconfía de su precisión (contra 33% que confía). En el experimento
controlado de Anthropic (enero 2026), quienes aprendieron con IA sacaron ~50% en la prueba contra
~67% de quienes programaron a mano, y la mayor diferencia fue al depurar. El problema existe y
está documentado; falta probar que se paga por resolverlo.

## 2. Qué es gratis y qué es Pro
**Regla de diseño:** lo que corre entero en el navegador se puede saltar (el código es público).
El valor pagado debe estar en lo que necesita servidor (IA, sincronización, historial) o en
contenido nuevo. El contenido de estudio sigue gratis: es el SEO y la puerta de entrada.

| Basic (gratis, tope US$5/mes, como hoy) | Pro |
|---|---|
| Todo el temario, labs, ruta, repaso espaciado | **Coach con IA**: evalúa "explicar sin mirar", historias STAR, la ronda de diseño y revisa tu código |
| Entrenamiento diario del Gimnasio (8 ejercicios) | **Gimnasio sin límite**: series libres dirigidas a tus puntos débiles, historial y tendencia completos |
| Problemas, simulacros, plan de entrevista | **Sincronización** entre dispositivos |
| Progreso en el navegador | **Packs por empresa** (Amazon, Google, Meta, labs de IA) |

**Producto mínimo para cobrar:** Coach con IA + Gimnasio sin límite. Los packs vienen después.

## 3. Costo del Coach con IA por usuario
Precios oficiales de Anthropic por millón de tokens (referencia del 2026-11-03):
Haiku 5.5 US$0.10 entrada / US$0.50 salida; Sonnet 5.5 US$2 / US$10; Opus 5.5 US$4 / US$20.

**Uso típico (supuesto)**: 30 explicaciones evaluadas (~1.5k tokens de entrada, ~300 de salida),
10 historias STAR (~2.5k / ~700), 4 rondas de diseño (~6k / ~1.5k) y 20 revisiones de código
(~2k / ~500) al mes. En total ~134k tokens de entrada y ~32k de salida, que se duplican a ~64k
contando el razonamiento del modelo **(supuesto)**.

| Modelo | Costo típico/mes | Peor caso con tope de 150 evaluaciones/mes (≤4k entrada, ≤2k salida c/u) |
|---|---|---|
| Haiku 5.5 | ~US$0.05 | ~US$0.21 |
| Sonnet 5.5 | ~US$0.91 | ~US$4.20 |
| Opus 5.5 | ~US$1.82 | ~US$8.40 |

Reglas de diseño:
- **Tope por usuario** de modo que el peor caso de IA quede bajo el 50% del ingreso neto.
  Con un precio de US$10/mes **(supuesto)** y Sonnet 5.5, el peor caso (US$4.20) no supera el
  ingreso neto (~US$9): ningún usuario puede generar pérdida.
- El modelo se elige **midiendo calidad** con un set de evaluación propio (explicaciones y
  historias reales calificadas a mano): primero el modelo más capaz con esfuerzo bajo, después
  los más baratos. Una evaluación mala destruye la confianza más rápido que lo que ahorra.
- El prompt fijo (rúbrica y puntos clave) va con caché, lo que baja el costo de entrada.

## 4. Arquitectura (y cómo respeta el tope de US$5)
- **Basic no cambia:** estático, sin backend nuevo y con el mismo peor caso de hoy.
- **Pro agrega:**
  1. **Cobro con un "merchant of record"**: el proveedor es el vendedor legal y se encarga de
     IVA y otros impuestos por país (crítico para vender a LatAm y Europa).
  2. Un webhook del proveedor llega a una Lambda que guarda el derecho de acceso
     (`plan=pro, hasta=fecha`) en la tabla de DynamoDB que ya existe, con capacidad fija.
  3. Un endpoint del Coach (API Gateway HTTP con autorizador JWT de Cognito, más Lambda) que,
     **antes de llamar al modelo**, verifica el derecho de acceso y descuenta la cuota del mes.
     Sin JWT válido no se ejecuta nada.
  4. Límites duros: throttling en API Gateway, concurrencia reservada en Lambda y tope mensual
     de gasto en la cuenta de la API de Anthropic.
- **Costo fijo:** prácticamente US$0 extra. Lambda y API Gateway cuestan centavos por millón de
  requests, y DynamoDB provisionado ya está acotado. Antes de construir hay que verificar si
  API Gateway cobra los requests rechazados por el autorizador; si los cobra, el throttling
  define el peor caso.
- **El costo variable (IA) lo paga el ingreso de Pro**, con el tope por usuario de la sección 3.
  El tope de US$5 sigue aplicando a Basic; Pro tiene su propio presupuesto, acotado por usuario
  pagado.

### Proveedor de cobro
| Opción | Comisión | Estado |
|---|---|---|
| **Paddle** | 5% + US$0.50 por transacción (merchant of record, impuestos incluidos) | Recomendado para empezar: estable y con precio público |
| Stripe Managed Payments | Las fuentes no coinciden (se reporta 3.5% + procesamiento, con promoción de 1.5%) | Verificar tarifa y si está disponible en tu país |
| ~~Lemon Squeezy~~ | 5% + US$0.50 | **Descartado:** cerró registros el 2026-11-16 y deja de cobrar el 2027-03-31 (anuncio oficial) |

Con Paddle, un plan de US$10/mes deja ~US$9.00 netos; uno de US$79/año deja ~US$74.55.

## 5. Números del negocio (supuestos, para dimensionar)
| Usuarios Pro | Ingreso bruto (US$10/mes) | Neto de comisiones | IA (típico Sonnet) | Margen aprox. |
|---|---|---|---|---|
| 100 | US$1,000 | ~US$900 | ~US$91 | ~US$800/mes |
| 500 | US$5,000 | ~US$4,500 | ~US$455 | ~US$4,000/mes |
| 1,000 | US$10,000 | ~US$9,000 | ~US$910 | ~US$8,000/mes |

Llegar a esos números depende del tráfico y de la conversión de gratis a pago. **Hoy levelup no
mide uso**, así que no hay base para proyectar: eso es lo primero que hay que arreglar, con una
métrica mínima, anónima y sin datos personales (se puede reutilizar el sistema de eventos de
get-certified, con sus mismas reglas de privacidad).

**Actualización (2026-11-26):** el plan gratis de CloudFront no incluye logs, y reusar los eventos
de get-certified exigiría un servicio por request que el navegador puede llamar (contra la regla de
levelup). La etapa 1 mide con el formulario, `deploy/usage.sh` (cuentas que sincronizan) y Google
Search Console: ver `stage-1.md`.

## 6. Riesgos y cómo mitigarlos
| Riesgo | Mitigación |
|---|---|
| No hay demanda (el mayor) | Validar antes de construir (sección 7) |
| Competidores grandes con más contenido y comunidad | Nicho: español, AI Architect/Staff y el Gimnasio contra la pérdida de habilidades; precio menor que Exponent o Final Round |
| Evaluación de IA inconsistente | Set de evaluación propio, rúbricas explícitas y feedback con la cita del punto clave |
| Privacidad (historias STAR con datos de empresas) | Aviso claro, no guardar los textos, mandar a la API solo lo necesario |
| Datos de IA que envejecen | Revisión mensual de fechas y versiones (ya pendiente de antes) |
| Precio alto para LatAm | Precios por región y plan anual con descuento; verificar qué permite el proveedor |
| Contenido gratis "saltable" | El valor Pro está en el servidor; el contenido gratis es marketing |

## 7. Plan recomendado (por etapas, cada una con un criterio para seguir o parar)
1. **Validar (2–4 semanas, US$0)**:
   - una métrica de uso mínima;
   - una sección "Pro" con la propuesta y un botón "Quiero Pro" que lleve a un formulario externo;
   - 10 conversaciones con usuarios.
   **Se sigue** si se juntan ~100 interesados o al menos 3–5% de los usuarios activos
   **(supuesto)**.
2. **Primera versión pagada (4–6 semanas)**:
   - Coach para "explicar sin mirar" y STAR;
   - Gimnasio sin límite;
   - Paddle;
   - precio de fundador.
   **Se sigue** si ~20–30 personas pagan en el primer mes **(supuesto)**.
3. **Crecer**: revisión de diseño y de código con IA, sincronización, packs por empresa. Después,
   evaluar una oferta para equipos (B2B).

Si la etapa 1 no muestra interés, levelup sigue como producto gratis, que ya funciona solo y
cuesta menos de US$5/mes.

## Fuentes
- Anthropic, *How AI assistance impacts the formation of coding skills* (2026-01-29): https://www.anthropic.com/research/AI-assistance-coding-skills
- Stack Overflow Developer Survey 2025: https://stackoverflow.blog/2025/07/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here
- Precios de modelos: referencia oficial de la API de Anthropic (caché 2026-11-03); vigentes en https://www.anthropic.com/pricing
- LeetCode: https://prachub.com/resources/leetcode-pricing · https://leetcode.com/subscribe/
- NeetCode: https://neetcode.io/pro · https://prachub.com/resources/neetcode-pricing
- Exponent/Aced: https://prachub.com/resources/exponent-pricing · https://www.lodely.com/blog/exponent-pricing
- Hello Interview: https://www.hellointerview.com/pricing · https://prachub.com/resources/hellointerview-pricing
- interviewing.io: https://prachub.com/resources/interviewing-io-pricing
- Final Round AI: https://www.finalroundai.com/blog/final-round-ai-pricing · https://ophyai.com/blog/career-advice/final-round-ai-pricing
- Paddle: https://www.paddle.com/pricing
- Cierre de Lemon Squeezy: https://x.com/lemonsqueezy/status/2122349068706017700 · https://techstartups.com/2026/11/16/stripe-shuts-down-lemon-squeezy-just-two-years-after-acquisition-giving-businesses-until-march-2027-to-migrate/
- Stripe Managed Payments (tarifa por confirmar): https://checkoutpage.com/blog/paddle-pricing
- Amazon Cognito (10,000 MAU gratis en Lite/Essentials): https://aws.amazon.com/cognito/pricing/
