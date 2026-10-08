# Pizarra Digital

Juego de pistas por el pueblo de Pizarra (Málaga) para el curso de digitalización del **Punto Vuela**, pensado para gente mayor. Se empieza en el Punto Vuela con Victoria (la profesora) y Paco Polo; en cada parada hay un reto de ordenadores, móviles o internet, y la última pista lleva hasta **El Santo**.

Funciona en el ordenador y en el móvil. Se anda tocando el suelo o con el botón «Llévame», con letra y botones grandes, y cada texto se puede escuchar.

## Cómo está hecho

- **Vite + TypeScript + three.js**, web estática sin servidor. Se publica en **Cloudflare Workers** (`wrangler.jsonc`, carpeta `dist`).
- **Motor** (`src/juego/`): sale del juego «Corresponsal» de La Hemeroteca Perdida.
  - `juego.ts`: andar, cámara, personajes, paradas, flecha, minimapa, «Llévame», partida guardada, final.
  - `retos.ts`: los tipos de reto (`una`, `elegir`, `ordenar`, `relacionar`, `escribir`).
  - `pixel.ts` (pintado pixel-art), `retrato.ts` (caras de los diálogos), `sonido.ts`, `almacen.ts`.
- **El pueblo** (`src/pizarra/`):
  - `pueblo.json`: el plano, generado con `npm run osm` a partir de los `.osm` de `referencias/` (exportados de OpenStreetMap; se juntan todos). OpenStreetMap casi no tiene casas en Pizarra, así que las casas se generan a lo largo de las calles.
  - `pueblo.ts`: monta la maqueta 3D, lo que se puede andar y el minimapa a partir del plano.
  - `datos.ts`: **el contenido del juego** (personajes, paradas, retos, pistas y final). Las paradas se colocan por nombre de calle: `p('Avenida de Europa', 0.4)` es el 40 % de la calle.

## Comandos

```
npm install
npm run dev        # para probar en local
npm run build      # genera dist/
npm run osm        # rehace src/pizarra/pueblo.json desde referencias/*.osm
npm run revisar    # compila, captura escritorio y móvil y juega la partida entera (revision/)
```

`npm run revisar` usa el Chrome instalado o el navegador que diga la variable `CHROMIUM`.

Plano: © colaboradores de OpenStreetMap (ODbL).
