# AncientRepository · index

Machine-readable catalog of every mirrored **Don't Starve Together** build in
[`Excavarium/AncientRepository`](https://github.com/Excavarium/AncientRepository). The web UI at https://excavarium.github.io/AncientRepository/ is served from this branch.

A **leaf** is one Steam install (`client|server` × `public|updatebeta` × `windows|linux`), and each
leaf has its own git branch with the same name. Every Steam build of a leaf is one commit on that branch
plus a tag `<leaf>-v<version>`.

## Files

| Path | Content |
|---|---|
| `catalog.json` | every leaf and its versions, oldest → newest |
| `leaves/<leaf>/<key>.json.gz` | complete file list of one version (gzip JSON) |
| `changes/<leaf>/<key>.json` | what changed vs. the previous version of that leaf |

`catalog.json` → `leaves.<leaf>.versions[]`:
`{key, version, buildid, released, synced, commit, tag, files, bytes, added, removed, modified, manifests}`
(`key` = Steam build id, `manifests` = Steam depot → manifest id, `legacy: true` = imported from the
first folder-layout mirror, so no Steam manifest data).

`leaves/<leaf>/<key>.json.gz`:
- `files[]`: `[path, mode, git_blob_sha, size, source?]`, where `source` is the Steam file it was derived from
  when that differs from `path` (a databundle zip, or the binary behind a `.meta.json` stub)
- `steam`: `{depot: {manifest, files: [[path, size, sha1, flags]]}}`, the raw Steam manifest (null for legacy)
- `excluded[]`: Steam files that are not mirrored (`data/movies/`)

`changes/<leaf>/<key>.json`: `from`, `to`, `added[] = [path, blob, size]`, `removed[] = [path, blob, size]`,
`modified[] = [path, old_blob, new_blob, old_size, new_size]`.

## Reading a file

`https://raw.githubusercontent.com/Excavarium/AncientRepository/<commit>/<path>`, using `commit` from the catalog.

## Quick recipes (humans and AI agents)

- **Latest public client scripts**: branch `main`, folder `data/databundles/scripts/`.
- **What changed in the last update**: `catalog.json` → `leaves["client-public-windows"].versions[-1].key`,
  then `changes/client-public-windows/<key>.json`.
- **Did file X exist in version Y**: `leaves/<leaf>/<key>.json.gz` → `files`.
- **Full diff on GitHub**: `https://github.com/Excavarium/AncientRepository/compare/<from.tag>...<to.tag>`.
