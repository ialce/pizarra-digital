# Pizarra Digital

Juego de pistas por el pueblo de Pizarra (Málaga) para el curso de digitalización del **Punto Vuela**, pensado para gente mayor. Se empieza en el Punto Vuela con Victoria (la profesora) y Paco Polo; en cada parada hay un reto de ordenadores, móviles o internet, y la última pista lleva hasta **El Santo**.

Funciona en el ordenador y en el móvil. Se anda tocando el suelo o con el botón «Llévame», con letra y botones grandes, y cada texto se puede escuchar.

## Cómo está hecho

- **Vite + TypeScript + three.js**, web estática sin servidor. Se publica en **Cloudflare Workers** (`wrangler.jsonc`, carpeta `dist`).
- **Motor** (`src/juego/`): sale del juego «Corresponsal» de La Hemeroteca Perdida.
  - `juego.ts`: andar, cámara, personajes, paradas, flecha, minimapa, «Llévame», partida guardada, final.
  - `retos.ts`: los tipos de reto (`una`, `elegir`, `ordenar`, `relacionar`, `escribir`).
  - `pixel.ts` (pintado pixel-art), `retrato.ts` (caras de los diálogos), `sonido.ts`, `almacen.ts`.
- **Realidad virtual** (`src/vr/`): el mismo juego en unas Meta Quest 2 o 3, desde su navegador (WebXR). Si la página se abre en las gafas, cada capítulo abierto tiene el botón «En realidad virtual». A pie de calle y a tamaño real; se mueve uno apuntando al suelo y pulsando el gatillo (teletransporte), el joystick gira la vista de 45 en 45°, los diálogos y retos salen en paneles flotantes y la pista va en la mano izquierda. Comparte la partida guardada con la versión de pantalla.
  - `vr.ts`: la sesión, el teletransporte, los mandos, los retos y el recorrido. `panel.ts`: los paneles (lienzo 2D sobre un plano).
- **El pueblo** (`src/pizarra/`):
  - `pueblo.json`: el plano, generado con `npm run osm` a partir de los `.osm` de `referencias/` (exportados de OpenStreetMap; se juntan todos). OpenStreetMap casi no tiene casas en Pizarra, así que las casas se generan a lo largo de las calles.
  - `pueblo.ts`: monta la maqueta 3D, lo que se puede andar y el minimapa a partir del plano.
  - `capitulos.ts`: la lista de capítulos (uno por tema) y cuáles están **abiertos** (`abierto: true`). Con `?profe` en la dirección se juegan todos.
  - `capitulos/<id>.ts`: **el contenido de cada capítulo** (lo que dice Victoria, paradas, retos, pistas y final). Las paradas se colocan por nombre de calle (`calle('Avenida de Europa', 0.4)`, el 40 % de la calle) o de sitio (`sitio('correos')`).
  - `datos.ts`: lo común (Punto Vuela, Victoria, Paco, El Santo) y cómo se monta un capítulo.

## Comandos

```
npm install
npm run dev        # para probar en local
npm run build      # genera dist/
npm run osm        # rehace src/pizarra/pueblo.json desde referencias/*.osm
npm run revisar    # compila, captura escritorio y móvil y juega la partida entera (revision/)
npm run revisar-vr # lo mismo en realidad virtual, con unas Quest 3 emuladas (IWER): capturas revision/vr-*.png
```

`npm run revisar` usa el Chrome instalado o el navegador que diga la variable `CHROMIUM`.

Plano: © colaboradores de OpenStreetMap (ODbL).
