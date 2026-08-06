# AncientRepository · Dedicated Server / updatebeta / linux

Unofficial, automated mirror of **Don't Starve Together** game files as installed by Steam,
kept in sync with every Steam build.

| | |
|---|---|
| **This branch** | `server-updatebeta-linux`: Steam app `343050`, branch `updatebeta`, `linux` (depot `343052`) |
| **History** | one commit per Steam build; commit date = Steam release time |
| **Tags** | `server-updatebeta-linux-v<version>` for every mirrored build |
| **Default branch** | `main` = `client-public-windows` (latest public client) |

## Branches

| Branch | Game | Steam branch | OS |
|---|---|---|---|
| `client-public-windows` (= `main`) | Client | public | windows |
| `client-public-linux` | Client | public | linux |
| `client-updatebeta-windows` | Client | updatebeta (Public Beta) | windows |
| `client-updatebeta-linux` | Client | updatebeta (Public Beta) | linux |
| `server-public-windows` | Dedicated Server | public | windows |
| `server-public-linux` | Dedicated Server | public | linux |
| `server-updatebeta-windows` | Dedicated Server | updatebeta | windows |
| `server-updatebeta-linux` | Dedicated Server | updatebeta | linux |

## What is stored

Files are byte-for-byte as Steam installs them, except:

- `data/databundles/*.zip` are extracted in place. The Lua source is in `data/databundles/scripts/`.
- `*.exe` / `*.dll` are replaced by `<name>.meta.json` (original size + sha256).
- `data/movies/` is not mirrored.
- `.github/` and `.gitattributes` belong to the mirror, not the game.

## Browse, search, diff

- **Web UI** (versions, file browser, diffs): https://excavarium.github.io/AncientRepository/
- **Index** (machine-readable): branch [`index`](https://github.com/Excavarium/AncientRepository/tree/index): `catalog.json`,
  the full file list of every version, and the change list of every update.
- **Compare two builds on GitHub**: `https://github.com/Excavarium/AncientRepository/compare/<tagA>...<tagB>`
- **Code search** covers `main` (latest public client).
- **Clone a single leaf** (about 5 GB instead of all of them):
  `git clone --single-branch --depth 1 -b server-updatebeta-linux https://github.com/Excavarium/AncientRepository.git`
