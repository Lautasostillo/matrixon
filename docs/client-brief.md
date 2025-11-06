# Client Brief (Original in Spanish) + TL;DR (EN)

## TL;DR (ENGLISH)
Build a mockup tool (Stage 2) to plan creative tests:
- User selects one Main Dimension (vertical) for the test: Target Persona, Pain Point, Messaging Angle, Core Insight, Product.
- They define vertical values and assign ads/budget distribution (Pareto live; Even and Stage-Weighted prepared; Stage activates when Main=Messaging Angle and values include Top/Mid/Bottom).
- They set variety levels (0–3) across horizontal dimensions: Format, Narrative Pattern, Visual Style, Opening Type, Tone/Emotion, Talent, CTA.
- The system auto-generates combinations enforcing compatibility rules, uniqueness by Similarity Key (VerticalValue|Pattern|Format|VisualStyle), and minimum diversity score D between consecutive ads per vertical value.
- User can manually edit results and copy CSV (ENGLISH headers).
- Formats map to Production Clusters (UGC → ScriptShootEdit; Static/Anim → DANDA; Video → Airpost).
- Stage 3 will port to Notion/Sheets/Airtable.

Outputs must be 100% in ENGLISH (UI, labels, CSV, README). Auto-audit log prints in console on first page render.

---

## Brief (Original - Spanish content pasted)

Contexto: presentación de andromeda en screenshots adjuntas. también:

un partner me dio este encargo, esto es lo que hay que resolver:
Pedido para Lautaro: Investigación y Mockup de Matriz Variable de Diversidad Creativa

Objetivo General
Diseñar una matriz creativa dinámica que permita a cualquier miembro del equipo (con o sin learnings previos de marca) tomar decisiones estratégicas sobre la estructura de un test creativo.
El sistema debe:
Permitir elegir una Main Dimension (dimensión vertical estructurante) que defina el eje principal del test (ej. Target Persona, Pain Point, Messaging Angle, etc.)

Esa elección define automáticamente el nivel de aprendizaje que se espera del test y su ubicación dentro del journey de testing.

A partir de ahí, el usuario puede:

Definir la cantidad de unidades verticales (ej. cuántos pain points se testean)

Definir la distribución por ads o presupuesto para cada unidad vertical

El sistema sugiere automáticamente combinaciones con dimensiones horizontales (formato, tono, talento, concepto, estilo, narrative driver, core insight, etc.), con un ratio de diferenciación lógico por tipo de variable

Luego se puede modificar manualmente cada grupo de variaciones según preferencia, ajustando niveles de variedad

El objetivo final es descubrir cómo se relacionan las dimensiones verticales con las horizontales, y cómo eso se traduce en objetivos de testeo claros y accionables.
La matriz debe ser simple de operar, intuitiva para tomar decisiones, y robusta para visualizar combinatorias y niveles de variabilidad.

Etapas del Pedido
Etapa 1: Investigación y Estructura Inicial (Output: Informe + Diagrama Visual)
Determinar cuáles deberían ser las dimensiones verticales (estructurantes / main dimension) del sistema, y en qué casos se usa cada una.

Proponer lógicas de asignación presupuestaria o de volumen de ads por valor dentro de esa dimensión.

Investigar qué dimensiones podrían operar como dimensiones horizontales, es decir, variables con las que diversificar (tono, formato, estética, etc.).

Proponer un sistema de ratios de diferenciación esperados (e.g., cambios fuertes como "Emotion" = +70%, cambios leves como "CTA" = +10%).

Diseñar un diagrama visual donde se represente:

La relación entre la Main Dimension elegida y las dimensiones horizontales

Un flujo simple donde se pueda estimar combinaciones posibles

Etapa 2: Mockup de Concepto (Output: Figma/Canva u otro visual simple)
Prototipar un sistema visual donde:

Se pueda elegir una Main Dimension (ej. Pain Point)

Se le asignen presupuestos o volúmenes de ads por valor

El sistema proponga automáticamente combinaciones con dimensiones horizontales

Se pueda ajustar el nivel de variabilidad por dimensión (ej. "Quiero más variedad de tono, menos cambios de formato")

Se pueda editar manualmente

Etapa 3: Construcción del MVP
Una vez validado el mockup, construir un tablero editable (Notion, Sheets, Airtable) que permita:

Cargar inputs de estrategia (ej. Dimensión principal, cantidad de piezas, prioridades)

Visualizar y modificar las combinaciones resultantes

Guía Inicial para la Etapa 1 (lo que ya sabemos)
Posibles dimensiones verticales (estructurantes / Main Dimensions):
Target Persona (ICP)

Pain Point

Messaging Angle

Core Insight

Product

Estas dimensiones permiten organizar el testing o el enfoque estratégico según "a quién se le habla" y "qué se dice".
Posibles dimensiones horizontales (variabilidad creativa):
Format (UGC, Static, Motion, etc.)

Tone (Urgente, Emotivo, Gracioso, etc.)

Emotion (Confianza, Esperanza, FOMO, etc.)

Narrative Driver

Visual Style

Opening Type (copy / visual / sonido / locación)

Talent / Multi-talent

Text Style / End Card / CTA

Estas dimensiones determinan cómo se presenta el mensaje, el ritmo visual, y el estilo de ejecución.
Lógica tentativa del sistema:
El usuario selecciona una Dimensión Principal (Main Dimension)

Para cada valor de esa dimensión, se define un volumen de producción (en número de ads o presupuesto)

El sistema propone combinaciones con dimensiones horizontales según un ratio de diferenciación

El usuario puede pedir "más variedad de X" o reducir la variedad en Y

El sistema permite también ajustes manuales de cada combinatoria

Preguntas Abiertas que deberá investigar Lautaro
¿Cuáles son las dimensiones estructurantes más efectivas para organizar una matriz variable?

¿Cuál es la mejor forma de representar los niveles de diferenciación visual/funcional entre combinatorias?

¿Qué lógica de volumen por dimensión puede escalar mejor: fija por plantilla o editable por presupuesto?

¿Cómo puede visualizarse la relación entre inputs (persona, pain point, producto) y outputs (ads variados)?

¿Cómo se ata cada tipo de testeo a objetivos de aprendizaje concretos?

Formato del Entregable Etapa 1
Documento (Notion, PDF o Gdoc) con:

Propuesta de organización del sistema

Tabla de dimensiones (estructurantes vs. horizontales)

Ejemplos y casos de uso

Diagrama visual (Figma o Miro, embebido o linkeado)

Gracias, Lauti. Cualquier duda o exploración libre que quieras sumar, bienvenida.
