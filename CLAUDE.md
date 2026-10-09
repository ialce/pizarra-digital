# Pizarra Digital

Juego de Iván para el curso de digitalización del Punto Vuela de Pizarra (Málaga). Público: **gente mayor**. Lee `README.md` para la estructura.

- Todo en español, también el código y los comentarios.
- Un capítulo por tema del curso: lista y cuáles están abiertos en `src/pizarra/capitulos.ts`; contenido en `src/pizarra/capitulos/<id>.ts`. **Iván dice cuándo se abre cada capítulo** (`abierto: true`); abiertos, se juegan en cualquier orden. Iván pasa los textos de Victoria y la frase fija de Paco Polo; mientras, los de ejemplo están marcados como provisionales.
- Accesibilidad por encima de todo: letra grande, botones de 56 px o más, nada de tiempo límite, nada de tiempo límite. Sin ayudas para llegar (`guiado: false`): los alumnos van solos con la pista.
- Antes de subir: `npm run revisar` (debe acabar «Sin errores» y la partida terminada) y mirar las capturas de `revision/`.
- Si cambia el plano: exportar de OpenStreetMap a `referencias/`, `npm run osm`, y comprobar que las calles de `datos.ts` siguen existiendo (si no, `datos.ts` avisa al cargar).
- Se publica en Cloudflare Workers desde `main`.
