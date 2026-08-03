# AncientRepository

Public mirror of **Don't Starve Together** (Steam PC) install trees for readable history and diffs.

Unofficial fan archive. Not affiliated with Klei. Game content © Klei Entertainment.

## Layout

```text
Klei/Don't Starve Together/
├── Client/                         # app 322330
│   ├── public/{windows,linux}
│   └── updatebeta/{windows,linux}
└── Dedicated Server/               # app 343050
    ├── public/{windows,linux}
    └── updatebeta/{windows,linux}
```

- English only · no macOS/console  
- `data/movies/` omitted  
- `data/databundles/*.zip` stored **unzipped**  
- `.exe` / `.dll` replaced with `*.meta.json` (hashes only)

## Clone one section (sparse)

Full tree is multi‑GB. Example — Linux client public:

```bash
git clone --filter=blob:none --sparse https://github.com/Excavarium/AncientRepository.git
cd AncientRepository
git sparse-checkout init --cone
git sparse-checkout set "Klei/Don't Starve Together/Client/public/linux"
```

| Section path under `Klei/Don't Starve Together/` |
|---|
| `Client/public/windows` |
| `Client/public/linux` |
| `Client/updatebeta/windows` |
| `Client/updatebeta/linux` |
| `Dedicated Server/public/windows` |
| `Dedicated Server/public/linux` |
| `Dedicated Server/updatebeta/windows` |
| `Dedicated Server/updatebeta/linux` |

Add more later: `git sparse-checkout add "Klei/Don't Starve Together/..."`.

## Versions

Each sync commit records Steam build ids and `version.txt`. Annotated tags look like:

`v<version>-<app>-<branch>-<buildid>`
