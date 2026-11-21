# Simulador D'Hondt del Congreso

Web app para simular el reparto de los 350 escaños del Congreso de los Diputados por circunscripción. Partes de los votos reales de unas elecciones generales, los cambias con deslizadores provincia a provincia y ves al momento cuántos escaños saca cada partido con la ley D'Hondt y con otros sistemas.

## Para aprender (pensado también para clase y para adolescentes)

1. **Laboratorio**: una provincia inventada con partidos ficticios. Repartes los escaños uno a uno y cada paso explica por qué gana ese partido. Al final compara D'Hondt con un reparto proporcional.
2. **Simula**: el Congreso real con el mapa y los deslizadores.
3. **¿Cuánto vale tu voto?**: votos por escaño según la provincia y según el partido.
4. **Retos**: seis misiones que se comprueban solas (romper el bipartidismo en Soria, decidir un escaño con menos de 2.000 votos, quitar el umbral, conseguir una mayoría absoluta…).
5. **Ponte a prueba**: test de 8 preguntas con explicación de cada respuesta.
6. **Glosario** con los términos básicos.

## Qué hace

- **Mapa de las 52 circunscripciones** (50 provincias + Ceuta y Melilla). Cada casilla muestra los escaños de la provincia y cómo se reparten. Se puede colorear por partido más votado, por provincias donde tus cambios alteran el resultado, o por el porcentaje de un partido.
- **Deslizadores de votos** para cada candidatura, para el voto en blanco (cuenta para el umbral) y para «otras candidaturas».
- **Pistas por partido**: cuántos votos le faltan para el siguiente escaño y cuántos puede perder sin perder ninguno.
- **Tabla de cocientes D'Hondt** de la provincia, con el último escaño repartido y el primer cociente que se queda fuera.
- **Mover votos** de un partido a otro (o a blanco/abstención), en una provincia o en toda España.
- **Cambiar el número de escaños** de una provincia y el **umbral** (3 % por defecto).
- **Con y sin D'Hondt**: con los mismos votos, compara el resultado real, D'Hondt, Sainte-Laguë, Hare (restos mayores) por provincia y un reparto proporcional en circunscripción única nacional.

## Datos incluidos

| Elección | Fuente |
|---|---|
| 29 de noviembre de 2026 (escenario) | Escaños: Real Decreto 806/2026. Candidaturas: BOE 3-nov-2026 y prensa. Votos de partida: estructura provincial del 23J ajustada a la media de encuestas de Demócrata |
| 23 de julio de 2023 | BOE-A-2023-18907, resumen oficial de la Junta Electoral Central |
| 10 de noviembre de 2019 | Resultados por provincia publicados por Público (escrutinio 100 %) |

Las pruebas (`tests/run.js`) comprueban que, con estos votos, D'Hondt reproduce exactamente los escaños oficiales en las 52 circunscripciones de ambas elecciones y que los totales de 2023 coinciden con el BOE.

Notas: el PSC se cuenta como PSOE; en 2019, Unidas Podemos incluye sus confluencias y Más País incluye Compromís. Las candidaturas pequeñas sin opción a escaño se agrupan en «otras candidaturas» (no compiten por escaño en el simulador).

## Usarlo

No necesita instalación ni servidor: abre `index.html` en el navegador.

### Publicarlo en GitHub Pages

1. Crea un repositorio vacío en GitHub (por ejemplo `simulador-dhondt`).
2. Desde esta carpeta:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/simulador-dhondt.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**. En un minuto estará en `https://TU_USUARIO.github.io/simulador-dhondt/`.

## Añadir otra elección

1. Crea `data/raw/g2016.txt` con una línea por circunscripción:
   ```
   Provincia|votos_validos|votos_en_blanco|PARTIDO:votos:escaños;PARTIDO:votos:escaños;...
   ```
   (los nombres de provincia y siglas aceptados están en `scripts/build_data.js`).
2. Añádela a la lista `ELECCIONES` de `scripts/build_data.js` y, si hace falta, sus partidos en `PARTIDOS`.
3. Ejecuta `node scripts/build_data.js` y `node tests/run.js`. Si las pruebas pasan, los datos reproducen los escaños oficiales.

## Estructura

```
index.html            página
css/styles.css        estilos (modo claro y oscuro)
js/electoral.js       motor de reparto: D'Hondt, Sainte-Laguë, Hare, umbral, votos para el siguiente escaño
js/app.js             interfaz: mapa, hemiciclo, deslizadores, tablas
data/raw/*.txt        datos fuente por elección
data/elecciones.js    datos generados (no editar a mano)
scripts/build_data.js genera data/elecciones.js
tests/run.js          pruebas (node tests/run.js)
```

## Sobre el mapa

El mapa usa una casilla por circunscripción, todas del mismo tamaño y colocadas aproximadamente en su posición geográfica. Así Ceuta, Melilla o Soria se pueden tocar igual que Madrid, lo que en un mapa real sería difícil en el móvil. Para el reparto no hace falta más detalle geográfico: la unidad electoral del Congreso es la provincia.

Licencia: MIT.
