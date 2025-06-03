./
├── .DS_Store
├── .github/
│   └── workflows/
│       ├── manual.yml
│       └── notify.yml
├── $fn
├── 20250514_220508_resumen.txt
├── 20250529_104246_resumen.txt
├── mensajes/
│   ├── 21-19-45.md
│   ├── fri-17-50.md
│   ├── fri-19-50.md
│   ├── fri-20-20.md
│   ├── fri-21-20.md
│   ├── fri-22-20.md
│   ├── mon-14-50.md
│   ├── mon-18-20.md
│   ├── mon-19-50.md
│   ├── mon-20-20.md
│   ├── mon-20-50.md
│   ├── mon-21-20.md
│   ├── sat-15-50.md
│   ├── sat-17-50.md
│   ├── sat-19-50.md
│   ├── sat-20-20.md
│   ├── sun-13-20.md
│   ├── sun-15-50.md
│   ├── sun-17-50.md
│   ├── sun-19-50.md
│   ├── sun-21-20.md
│   ├── sun-22-20.md
│   ├── thu-14-50.md
│   ├── thu-15-50.md
│   ├── thu-17-50.md
│   ├── thu-18-50.md
│   ├── thu-19-50.md
│   ├── thu-20-20.md
│   ├── thu-20-50.md
│   ├── thu-21-20.md
│   ├── tue-13-20.md
│   ├── tue-17-50.md
│   ├── tue-19-50.md
│   ├── tue-20-20.md
│   ├── tue-20-50.md
│   ├── tue-21-20.md
│   ├── wed-14-50.md
│   ├── wed-17-50.md
│   ├── wed-19-50.md
│   ├── wed-20-20.md
│   ├── wed-21-20.md
│   └── wed-21-30.md
├── package.json
└── scripts/
    ├── build_messages.sh*
    └── send.js

5 directories, 51 files


===== Contenido de Archivos =====

==== package.json ====
{ "type": "module" }


==== scripts/build_messages.sh ====
#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")/../mensajes" && pwd)"
rm -f "\${DIR}"/*.md

while IFS='|' read -r dow hm text; do
  fn="\${DIR}/\${dow}-\${hm//:/-}.md"
  echo "\$text" > "\$fn"
done << 'TABLE'
mon|14:50|@everyone Lost City (World) – prepárense para entrar.
mon|18:20|@everyone Phantom Monastery abre en 10 min.
mon|19:50|@everyone Hoguera diario – reúnanse.
mon|20:20|@everyone Lost City (World) inicia en 10 min.
mon|20:50|@everyone Demon Realm (Abbys) abre en 10 min.
mon|21:20|@everyone Abbys Domination en 10 min.

tue|13:20|@everyone Phantom Monastery – 10 min.
tue|17:50|@everyone Lilith aparecerá en 10 min.
tue|19:50|@everyone Hoguera diario – reúnanse.
tue|20:20|@everyone Mu Ball inicia en 10 min.
tue|20:50|@everyone Lost Tower (World) abre en 10 min.
tue|21:20|@everyone Babel empieza en 10 min.

wed|14:50|@everyone Lost City (Abbys) – 10 min.
wed|17:50|@everyone Lilith aparecerá en 10 min.
wed|19:50|@everyone Hoguera diario – reúnanse.
wed|20:20|@everyone Lost City (Abbys) – 10 min.
wed|21:20|@everyone Roland City War (Asedio Abbys) inicia en 10 min.

thu|14:50|@everyone Kubera Mine fase 1 – 10 min.
thu|15:50|@everyone Kubera Mine fase 2 – 10 min.
thu|17:50|@everyone Lilith aparecerá en 10 min.
thu|18:50|@everyone Kubera Mine fase 3 – 10 min.
thu|19:50|@everyone Hoguera diario – reúnanse.
thu|20:20|@everyone Treasure Fayrland abre en 10 min.
thu|20:50|@everyone Lost Tower (Abbys) – 10 min.
thu|21:20|@everyone Babel empieza en 10 min.

fri|17:50|@everyone Lilith aparecerá en 10 min.
fri|19:50|@everyone Hoguera diario – reúnanse.
fri|20:20|@everyone Dragon Fort (GVG mundo) – 10 min.
fri|21:20|@everyone Abbys Domination en 10 min.
fri|22:20|@everyone Element Fayrland abre en 10 min.

sat|15:50|@everyone 3 vs 3 inicia en 10 min.
sat|17:50|@everyone Lilith aparecerá en 10 min.
sat|19:50|@everyone Hoguera diario – reúnanse.
sat|20:20|@everyone Dragon Fort (GVG abbys) – 10 min.

sun|13:20|@everyone Mu Stadium abre en 10 min.
sun|15:50|@everyone Element Competition – 10 min.
sun|17:50|@everyone Lilith aparecerá en 10 min.
sun|19:50|@everyone Hoguera diario – reúnanse.
sun|21:20|@everyone Roland City War (Asedio World) en 10 min.
sun|22:20|@everyone Element Competition – 10 min.
TABLE


==== scripts/send.js ====
import fs from 'node:fs/promises'

const offsetH = Number(process.env.OFFSET_H || 0)
const parNow = new Date()
const srvDate = new Date(parNow.getTime() + offsetH * 3_600_000)

const hh = String(srvDate.getHours()).padStart(2, '0')
const mm = String(srvDate.getMinutes()).padStart(2, '0')
const dow = srvDate.toLocaleDateString('en-US',
    { weekday: 'short', timeZone: 'UTC' })
    .slice(0, 3).toLowerCase()
const dd = String(srvDate.getDate()).padStart(2, '0')

const dir = new URL('../mensajes/', import.meta.url)
for (const name of [`\${dow}-\${hh}-\${mm}.md`, `\${dd}-\${hh}-\${mm}.md`]) {
    try {
        const txt = await fs.readFile(new URL(name, dir), 'utf8')
        await fetch(process.env.DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: txt.trim() })
        })
        break
    } catch { }
}


==== .github/workflows/notify.yml ====
name: avisos-exactos

on:
  schedule:
    # Eventos Diarios
    - cron: '50 14 * * *'   # 14:50 server
    - cron: '50 15 * * *'
    - cron: '50 17 * * *'
    - cron: '20 18 * * *'
    - cron: '50 18 * * *'
    - cron: '50 19 * * *'
    - cron: '20 20 * * *'
    - cron: '50 20 * * *'
    - cron: '20 21 * * *'
    - cron: '20 22 * * *'
    # Eventos Mensuales
    - cron: '45 19 21 * *'   # 19:45 server, día 21 de cada mes
    - cron: '30 21 * * *' #prueba
  workflow_dispatch:

concurrency:
  group: avisos
  cancel-in-progress: true

jobs:
  send:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/send.js
        env:
          DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK }}
          OFFSET_H:        ${{ vars.OFFSET_H }}


==== .github/workflows/manual.yml ====
name: disparo-manual

on:
  workflow_dispatch:
    inputs:
      texto:
        description: 'Mensaje (incluye @menciones)'
        required: true
        type: string

jobs:
  send:
    runs-on: ubuntu-latest
    steps:
      - name: enviar
        run: |
          curl -s -X POST \
               -H "Content-Type: application/json" \
               -d "{\"content\":\"${MENSAJE}\"}" \
               "$DISCORD_WEBHOOK"
        env:
          DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK }}
          MENSAJE:         ${{ github.event.inputs.texto }}


==== mensajes/tue-20-20.md ====
@everyone Mu Ball inicia en 10 min.


==== mensajes/wed-20-20.md ====
@everyone Lost City (Abbys) – 10 min.


==== mensajes/thu-20-20.md ====
@everyone Treasure Fayrland abre en 10 min.


==== mensajes/wed-19-50.md ====
@everyone Hoguera diario – reúnanse.


==== mensajes/thu-19-50.md ====
@everyone Hoguera diario – reúnanse.


==== mensajes/tue-19-50.md ====
@everyone Hoguera diario – reúnanse.


==== mensajes/sat-15-50.md ====
@everyone 3 vs 3 inicia en 10 min.


==== mensajes/thu-20-50.md ====
@everyone Lost Tower (Abbys) – 10 min.


==== mensajes/tue-20-50.md ====
@everyone Lost Tower (World) abre en 10 min.


==== mensajes/sun-21-20.md ====
@everyone Roland City War (Asedio World) en 10 min.


==== mensajes/sat-17-50.md ====
@everyone Lilith aparecerá en 10 min.


==== mensajes/thu-18-50.md ====
@everyone Kubera Mine fase 3 – 10 min.


==== mensajes/21-19-45.md ====
@everyone Invitación a "Strongest War Alliance"


==== mensajes/mon-14-50.md ====
@everyone Lost City (World) – prepárense para entrar.


==== mensajes/tue-21-20.md ====
@everyone Babel empieza en 10 min.


==== mensajes/thu-21-20.md ====
@everyone Babel empieza en 10 min.


==== mensajes/wed-21-20.md ====
@everyone Roland City War (Asedio Abbys) inicia en 10 min.


==== mensajes/fri-17-50.md ====
@everyone Lilith aparecerá en 10 min.


==== mensajes/wed-21-30.md ====
@everyone Lost City (Abbys) – 10 min.


==== mensajes/sun-22-20.md ====
@everyone Element Competition – 10 min.


==== mensajes/sun-19-50.md ====
@everyone Hoguera diario – reúnanse.


==== mensajes/sun-15-50.md ====
@everyone Element Competition – 10 min.


==== mensajes/sun-13-20.md ====
@everyone Mu Stadium abre en 10 min.


==== mensajes/mon-18-20.md ====
@everyone Phantom Monastery abre en 10 min.


==== mensajes/sun-17-50.md ====
@everyone Lilith aparecerá en 10 min.


==== mensajes/fri-20-20.md ====
@everyone Dragon Fort (GVG mundo) – 10 min.


==== mensajes/mon-21-20.md ====
@everyone Abbys Domination en 10 min.


==== mensajes/fri-19-50.md ====
@everyone Hoguera diario – reúnanse.


==== mensajes/fri-22-20.md ====
@everyone Element Fayrland abre en 10 min.


==== mensajes/thu-14-50.md ====
@everyone Kubera Mine fase 1 – 10 min.


==== mensajes/wed-14-50.md ====
@everyone Lost City (Abbys) – 10 min.


==== mensajes/sat-20-20.md ====
@everyone Dragon Fort (GVG abbys) – 10 min.


==== mensajes/sat-19-50.md ====
@everyone Hoguera diario – reúnanse.


==== mensajes/mon-20-50.md ====
@everyone Demon Realm (Abbys) abre en 10 min.


==== mensajes/tue-13-20.md ====
@everyone Phantom Monastery – 10 min.


==== mensajes/mon-19-50.md ====
@everyone Hoguera diario – reúnanse.


==== mensajes/thu-15-50.md ====
@everyone Kubera Mine fase 2 – 10 min.


==== mensajes/mon-20-20.md ====
@everyone Lost City (World) inicia en 10 min.


==== mensajes/tue-17-50.md ====
@everyone Lilith aparecerá en 10 min.


==== mensajes/fri-21-20.md ====
@everyone Abbys Domination en 10 min.


==== mensajes/wed-17-50.md ====
@everyone Lilith aparecerá en 10 min.


==== mensajes/thu-17-50.md ====
@everyone Lilith aparecerá en 10 min.


