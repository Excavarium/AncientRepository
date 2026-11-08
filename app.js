/* AncientRepository web UI: static, served from the `index` branch.
   Data: catalog.json + leaves/<leaf>/<key>.json.gz (same origin),
   file bytes from raw.githubusercontent.com at the version's commit. */
"use strict";

const $app = document.getElementById("app");
const $crumbs = document.getElementById("crumbs");
const S = { catalog: null, repo: "", listings: new Map(), text: new Map() };
const CTX = 3;                       // context lines around a change
const MAX_DIFF_BYTES = 4 * 1024 * 1024;
const TEXT_EXT = new Set(["lua", "txt", "json", "xml", "po", "pot", "vdf", "md", "csv", "cfg", "ini",
  "ps", "vs", "fx", "glsl", "hlsl", "shader", "html", "js", "css", "yml", "yaml", "meta", "lst"]);
const IMG_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp"]);

// ------------------------------------------------------------------ helpers
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
  return el;
};
const fmtBytes = (n) => {
  if (n == null) return "–";
  const u = ["B", "KB", "MB", "GB"]; let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${i ? n.toFixed(n < 10 ? 2 : 1) : n} ${u[i]}`;
};
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "–";
const ext = (p) => { const b = p.split("/").pop(); const i = b.lastIndexOf("."); return i > 0 ? b.slice(i + 1).toLowerCase() : ""; };
const enc = (p) => p.split("/").map(encodeURIComponent).join("/");
const LOCALRAW = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has("localraw");
const rawUrl = (commit, path) => LOCALRAW ? `raw/${commit}/${enc(path)}` : `https://raw.githubusercontent.com/${S.repo}/${commit}/${enc(path)}`;
const ghBlob = (commit, path) => `https://github.com/${S.repo}/blob/${commit}/${enc(path)}`;
const ghHistory = (leaf, path) => `https://github.com/${S.repo}/commits/${leaf}/${enc(path)}`;
const isText = (p) => TEXT_EXT.has(ext(p)) || p.endsWith("version.txt");
const leafOf = (name) => S.catalog.leaves[name];
const versionOf = (leaf, key) => (leafOf(leaf)?.versions || []).find((v) => v.key === key);
const route = (...parts) => "#/" + parts.map((p) => encodeURIComponent(p)).join("/");
const delta = (v) => h("span", { class: "delta" },
  h("span", { class: "add" }, `+${v.added}`), " ", h("span", { class: "del" }, `−${v.removed}`), " ",
  h("span", { class: "mod" }, `~${v.modified}`));

async function getJSON(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

async function getListing(leaf, key) {
  const id = `${leaf}/${key}`;
  if (!S.listings.has(id)) {
    S.listings.set(id, (async () => {
      const r = await fetch(`leaves/${encodeURIComponent(leaf)}/${encodeURIComponent(key)}.json.gz`);
      if (!r.ok) throw new Error(`listing ${id}: HTTP ${r.status}`);
      let buf = new Uint8Array(await r.arrayBuffer());
      if (buf[0] === 0x1f && buf[1] === 0x8b) {
        const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
        buf = new Uint8Array(await new Response(ds).arrayBuffer());
      }
      const lst = JSON.parse(new TextDecoder().decode(buf));
      lst.byPath = new Map(lst.files.map((f) => [f[0], f]));
      return lst;
    })());
  }
  return S.listings.get(id);
}

async function getText(commit, path, blob) {
  if (!S.text.has(blob)) {
    S.text.set(blob, (async () => {
      const r = await fetch(rawUrl(commit, path));
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${path}`);
      const buf = await r.arrayBuffer();
      const bytes = new Uint8Array(buf, 0, Math.min(buf.byteLength, 8000));
      if (bytes.includes(0)) return null; // binary
      return new TextDecoder("utf-8").decode(buf).replace(/\r\n?/g, "\n");
    })());
  }
  return S.text.get(blob);
}

function setCrumbs(items) {
  $crumbs.replaceChildren(...items.flatMap((it, i) => [
    i ? h("span", { class: "sep" }, "/") : null,
    it.href ? h("a", { href: it.href }, it.label) : h("span", { class: "cur" }, it.label),
  ]).filter(Boolean));
}

function page(...kids) { $app.replaceChildren(...kids); window.scrollTo(0, 0); }
function fail(e) { console.error(e); page(h("div", { class: "pad err" }, `Error: ${e.message || e}`)); }

// ------------------------------------------------------------------- router
async function router() {
  try {
    if (!S.catalog) {
      S.catalog = await getJSON("catalog.json");
      S.repo = S.catalog.repo;
      document.getElementById("ghlink").href = `https://github.com/${S.repo}`;
    }
    const [path, query] = location.hash.replace(/^#\/?/, "").split("?");
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
    const q = new URLSearchParams(query || "");
    if (!parts.length) return viewHome();
    const [leaf, a, b, ...rest] = parts;
    if (!leafOf(leaf)) throw new Error(`unknown leaf ${leaf}`);
    if (!a) return viewLeaf(leaf);
    if (a === "diff") return viewDiff(leaf, b, q);
    if (b === "file") return viewFile(leaf, a, rest.join("/"));
    return viewTree(leaf, a, b === "tree" ? rest.join("/") : "", q);
  } catch (e) { fail(e); }
}
window.addEventListener("hashchange", router);
router();

// --------------------------------------------------------------------- home
function viewHome() {
  setCrumbs([{ label: "All builds" }]);
  const leaves = Object.entries(S.catalog.leaves);
  const apps = {};
  for (const [name, l] of leaves) (apps[l.app_name] ||= []).push([name, l]);
  const recent = leaves.flatMap(([name, l]) => l.versions.map((v, i) => ({ name, l, v, i })))
    .filter((x) => x.i > 0).sort((x, y) => y.v.released.localeCompare(x.v.released)).slice(0, 40);
  page(
    h("section", { class: "hero" },
      h("h1", {}, "Don't Starve Together, every Steam build"),
      h("p", { class: "muted" }, "Browse the game files of any mirrored version, search them, and see exactly what an update changed.")),
    ...Object.entries(apps).map(([app, ls]) => h("section", {},
      h("h2", {}, app),
      h("div", { class: "cards" }, ls.map(([name, l]) => {
        const v = l.versions.at(-1);
        return h("a", { class: "card", href: route(name) },
          h("div", { class: "card-t" }, h("b", {}, l.branch), h("span", { class: "tag" }, l.os)),
          v ? h("div", { class: "card-v" }, `v${v.version}`) : h("div", { class: "muted" }, "not mirrored yet"),
          v ? h("div", { class: "muted small" }, `build ${v.buildid} · ${fmtDate(v.released)}`) : null,
          v ? h("div", { class: "muted small" }, `${v.files.toLocaleString()} files · ${fmtBytes(v.bytes)} · ${l.versions.length} version(s)`) : null);
      })))),
    h("section", {},
      h("h2", {}, "Recent updates"),
      recent.length ? h("table", { class: "grid" },
        h("thead", {}, h("tr", {}, h("th", {}, "Released"), h("th", {}, "Leaf"), h("th", {}, "Version"), h("th", {}, "Changes"), h("th", {}, ""))),
        h("tbody", {}, recent.map(({ name, l, v, i }) => h("tr", {},
          h("td", {}, fmtDate(v.released)), h("td", {}, h("a", { href: route(name) }, name)),
          h("td", {}, `v${l.versions[i - 1].version} → v${v.version}`), h("td", {}, delta(v)),
          h("td", {}, h("a", { href: route(name, "diff", `${l.versions[i - 1].key}..${v.key}`) }, "diff")))))
      ) : h("p", { class: "muted" }, "No updates recorded yet.")),
  );
}

// ------------------------------------------------------------- leaf versions
function viewLeaf(leaf) {
  const l = leafOf(leaf);
  setCrumbs([{ label: "All builds", href: "#/" }, { label: leaf }]);
  const vs = [...l.versions].reverse();
  page(
    h("section", {},
      h("h1", {}, l.title),
      h("p", { class: "muted" }, `Steam app ${l.app} · branch ${l.branch} · ${l.os} · git branch `,
        h("a", { href: `https://github.com/${S.repo}/tree/${leaf}`, target: "_blank" }, leaf)),
      h("div", { class: "actions" },
        vs[0] ? h("a", { class: "btn primary", href: route(leaf, vs[0].key) }, "Browse latest") : null,
        vs[1] ? h("a", { class: "btn", href: route(leaf, "diff", `${vs[1].key}..${vs[0].key}`) }, "Latest changes") : null)),
    h("table", { class: "grid" },
      h("thead", {}, h("tr", {}, ["Version", "Build", "Released", "Files", "Size", "Changes", ""].map((t) => h("th", {}, t)))),
      h("tbody", {}, vs.map((v, i) => h("tr", {},
        h("td", {}, h("a", { href: route(leaf, v.key) }, `v${v.version}`), v.legacy ? h("span", { class: "tag", title: v.note || "" }, "imported") : null),
        h("td", { class: "mono" }, v.buildid), h("td", {}, fmtDate(v.released)),
        h("td", {}, v.files.toLocaleString()), h("td", {}, fmtBytes(v.bytes)),
        h("td", {}, vs[i + 1] ? delta(v) : h("span", { class: "muted" }, "first")),
        h("td", { class: "row-actions" },
          h("a", { href: route(leaf, v.key) }, "browse"),
          vs[i + 1] ? h("a", { href: route(leaf, "diff", `${vs[i + 1].key}..${v.key}`) }, "diff") : null,
          h("a", { href: `https://github.com/${S.repo}/tree/${v.tag}`, target: "_blank" }, "tag ↗")))))),
  );
}

// -------------------------------------------------------------- browse tree
async function viewTree(leaf, key, dir, q) {
  const v = versionOf(leaf, key);
  if (!v) throw new Error(`unknown version ${key}`);
  const lst = await getListing(leaf, key);
  const crumbs = [{ label: "All builds", href: "#/" }, { label: leaf, href: route(leaf) },
    { label: `v${v.version}`, href: dir ? route(leaf, key) : null }];
  let acc = "";
  for (const seg of dir.split("/").filter(Boolean)) {
    acc = acc ? `${acc}/${seg}` : seg;
    crumbs.push({ label: seg, href: acc === dir ? null : route(leaf, key, "tree", ...acc.split("/")) });
  }
  setCrumbs(crumbs);
  const filter = q.get("q") || "";
  const input = h("input", { type: "search", class: "search", placeholder: "Find a file in this version (substring, or /regex/)", value: filter });
  const body = h("div", {});
  const render = () => {
    const term = input.value.trim();
    if (term) return body.replaceChildren(searchResults(leaf, key, lst, term));
    body.replaceChildren(dirListing(leaf, key, lst, dir));
  };
  let t; input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(render, 150); });
  page(
    h("section", { class: "bar" },
      h("div", {},
        h("h1", {}, `${leafOf(leaf).title}  ·  v${v.version}`),
        h("p", { class: "muted small" }, `build ${v.buildid} · released ${fmtDate(v.released)} · ${v.files.toLocaleString()} files · ${fmtBytes(v.bytes)} · commit `,
          h("a", { class: "mono", href: `https://github.com/${S.repo}/tree/${v.commit}`, target: "_blank" }, v.commit.slice(0, 10)))),
      h("div", { class: "actions" }, versionPicker(leaf, key, (k) => route(leaf, k, ...(dir ? ["tree", ...dir.split("/")] : []))))),
    input, body);
  render();
}

function versionPicker(leaf, key, href) {
  const sel = h("select", { onchange: (e) => { location.hash = href(e.target.value); } },
    [...leafOf(leaf).versions].reverse().map((v) => h("option", { value: v.key, selected: v.key === key }, `v${v.version} (${v.buildid})`)));
  return h("label", { class: "picker" }, "Version ", sel);
}

function dirListing(leaf, key, lst, dir) {
  const pre = dir ? dir + "/" : "";
  const dirs = new Map(), files = [];
  for (const f of lst.files) {
    if (!f[0].startsWith(pre)) continue;
    const rest = f[0].slice(pre.length);
    const i = rest.indexOf("/");
    if (i < 0) files.push(f);
    else {
      const d = rest.slice(0, i), e = dirs.get(d) || { n: 0, b: 0 };
      e.n++; e.b += f[3] || 0; dirs.set(d, e);
    }
  }
  const rows = [
    ...[...dirs.entries()].sort().map(([d, e]) => h("tr", {},
      h("td", {}, h("a", { class: "dir", href: route(leaf, key, "tree", ...(pre + d).split("/")) }, d + "/")),
      h("td", { class: "muted" }, `${e.n.toLocaleString()} files`), h("td", { class: "num" }, fmtBytes(e.b)))),
    ...files.sort((a, b) => a[0].localeCompare(b[0])).map((f) => h("tr", {},
      h("td", {}, h("a", { class: "file", href: route(leaf, key, "file", ...f[0].split("/")) }, f[0].slice(pre.length))),
      h("td", { class: "muted small" }, f[4] ? `from ${f[4].split("/").pop()}` : ""), h("td", { class: "num" }, fmtBytes(f[3])))),
  ];
  return rows.length ? h("table", { class: "grid files" }, h("tbody", {}, rows)) : h("p", { class: "muted" }, "Empty folder.");
}

function matcher(term) {
  if (term.length > 2 && term.startsWith("/") && term.endsWith("/")) {
    try { const re = new RegExp(term.slice(1, -1), "i"); return (p) => re.test(p); } catch { /* fall through */ }
  }
  const t = term.toLowerCase();
  return (p) => p.toLowerCase().includes(t);
}

function searchResults(leaf, key, lst, term) {
  const m = matcher(term);
  const hits = lst.files.filter((f) => m(f[0]));
  const shown = hits.slice(0, 500);
  return h("div", {},
    h("p", { class: "muted small" }, `${hits.length.toLocaleString()} match(es)${hits.length > shown.length ? `, showing ${shown.length}` : ""}`),
    h("table", { class: "grid files" }, h("tbody", {}, shown.map((f) => h("tr", {},
      h("td", {}, h("a", { class: "file", href: route(leaf, key, "file", ...f[0].split("/")) }, f[0])),
      h("td", { class: "num" }, fmtBytes(f[3])))))));
}

// --------------------------------------------------------------- file view
async function viewFile(leaf, key, path) {
  const v = versionOf(leaf, key);
  const lst = await getListing(leaf, key);
  const f = lst.byPath.get(path);
  if (!f) throw new Error(`${path} is not in v${v.version}`);
  const dir = path.split("/").slice(0, -1);
  const crumbs = [{ label: "All builds", href: "#/" }, { label: leaf, href: route(leaf) }, { label: `v${v.version}`, href: route(leaf, key) }];
  dir.forEach((seg, i) => crumbs.push({ label: seg, href: route(leaf, key, "tree", ...dir.slice(0, i + 1)) }));
  crumbs.push({ label: path.split("/").pop() });
  setCrumbs(crumbs);
  const body = h("div", { class: "viewer" }, h("p", { class: "muted pad" }, "Loading…"));
  page(
    h("section", { class: "bar" },
      h("div", {}, h("h1", { class: "mono path" }, path),
        h("p", { class: "muted small" }, `${fmtBytes(f[3])} · blob `, h("span", { class: "mono" }, f[2].slice(0, 10)),
          f[4] ? ` · extracted from ${f[4]}` : "")),
      h("div", { class: "actions" },
        h("a", { class: "btn", href: rawUrl(v.commit, path), target: "_blank" }, "Raw"),
        h("a", { class: "btn", href: ghBlob(v.commit, path), target: "_blank" }, "GitHub ↗"),
        h("a", { class: "btn", href: ghHistory(leaf, path), target: "_blank" }, "History ↗"))),
    body);
  const e = ext(path);
  if (IMG_EXT.has(e)) return body.replaceChildren(h("img", { class: "preview", src: rawUrl(v.commit, path), alt: path }));
  if ((f[3] || 0) > MAX_DIFF_BYTES && !isText(path)) return body.replaceChildren(binaryNote(f));
  try {
    const txt = await getText(v.commit, path, f[2]);
    if (txt == null) return body.replaceChildren(binaryNote(f));
    body.replaceChildren(codeBlock(txt));
  } catch (err) { body.replaceChildren(h("p", { class: "err pad" }, err.message)); }
}

function binaryNote(f) {
  return h("p", { class: "muted pad" }, `Binary file (${fmtBytes(f[3])}). Use “Raw” to download it.`);
}

function codeBlock(txt) {
  const lines = txt.split("\n");
  if (lines.length && lines.at(-1) === "") lines.pop();
  const tb = h("tbody", {});
  const frag = document.createDocumentFragment();
  lines.forEach((ln, i) => frag.append(h("tr", {}, h("td", { class: "ln" }, i + 1), h("td", { class: "code" }, ln || " "))));
  tb.append(frag);
  return h("table", { class: "src" }, tb);
}

// --------------------------------------------------------------------- diff
async function viewDiff(leaf, spec, q) {
  const l = leafOf(leaf);
  const vs = l.versions;
  let [fromKey, toKey] = (spec || "").split("..");
  if (!toKey) toKey = vs.at(-1)?.key;
  if (!fromKey) fromKey = vs[Math.max(0, vs.findIndex((v) => v.key === toKey) - 1)]?.key;
  const A = versionOf(leaf, fromKey), B = versionOf(leaf, toKey);
  if (!A || !B) throw new Error("pick two versions");
  setCrumbs([{ label: "All builds", href: "#/" }, { label: leaf, href: route(leaf) }, { label: `v${A.version} → v${B.version}` }]);
  const pick = (cur, other, isFrom) => h("select", {
    onchange: (e) => { location.hash = route(leaf, "diff", isFrom ? `${e.target.value}..${other}` : `${other}..${e.target.value}`); },
  }, [...vs].reverse().map((v) => h("option", { value: v.key, selected: v.key === cur }, `v${v.version} (${v.buildid})`)));
  const head = h("section", { class: "bar" },
    h("div", {}, h("h1", {}, `${l.title}: v${A.version} → v${B.version}`),
      h("p", { class: "muted small" }, `${fmtDate(A.released)} → ${fmtDate(B.released)} · `,
        h("a", { href: `https://github.com/${S.repo}/compare/${A.tag}...${B.tag}`, target: "_blank" }, "GitHub compare ↗"))),
    h("div", { class: "actions" }, h("label", { class: "picker" }, "From ", pick(fromKey, toKey, true)),
      h("label", { class: "picker" }, "To ", pick(toKey, fromKey, false))));
  const body = h("div", {}, h("p", { class: "muted pad" }, "Comparing file lists…"));
  page(head, body);
  const [la, lb] = await Promise.all([getListing(leaf, fromKey), getListing(leaf, toKey)]);
  const added = [], removed = [], modified = [];
  for (const f of lb.files) {
    const o = la.byPath.get(f[0]);
    if (!o) added.push({ path: f[0], b: f });
    else if (o[2] !== f[2]) modified.push({ path: f[0], a: o, b: f });
  }
  for (const f of la.files) if (!lb.byPath.has(f[0])) removed.push({ path: f[0], a: f });
  const all = [
    ...modified.map((x) => ({ ...x, kind: "mod" })), ...added.map((x) => ({ ...x, kind: "add" })),
    ...removed.map((x) => ({ ...x, kind: "del" }))].sort((x, y) => x.path.localeCompare(y.path));
  if (!all.length) return body.replaceChildren(h("p", { class: "pad muted" }, "These versions have identical files."));

  const state = { kind: q.get("kind") || "all", text: q.get("q") || "", textOnly: false };
  const filterIn = h("input", { type: "search", class: "search", placeholder: "Filter changed paths (substring or /regex/)", value: state.text });
  const chips = h("div", { class: "chips" });
  const list = h("div", { class: "changes" });
  const counts = { all: all.length, mod: modified.length, add: added.length, del: removed.length };
  const labels = { all: "All", mod: "Modified", add: "Added", del: "Removed" };
  const draw = () => {
    chips.replaceChildren(...Object.keys(labels).map((k) => h("button", {
      class: `chip ${k} ${state.kind === k ? "on" : ""}`, onclick: () => { state.kind = k; draw(); },
    }, `${labels[k]} ${counts[k].toLocaleString()}`)),
    h("label", { class: "chip plain" }, h("input", { type: "checkbox", checked: state.textOnly, onchange: (e) => { state.textOnly = e.target.checked; draw(); } }), " text files only"),
    h("button", { class: "chip plain", onclick: () => list.querySelectorAll("details:not([open])").forEach((d, i) => { if (i < 60) d.open = true; }) }, "Expand first 60"));
    const m = state.text ? matcher(state.text) : () => true;
    const rows = all.filter((x) => (state.kind === "all" || x.kind === state.kind) && m(x.path) && (!state.textOnly || isText(x.path)));
    const shown = rows.slice(0, 1500);
    list.replaceChildren(
      h("p", { class: "muted small" }, `${rows.length.toLocaleString()} file(s)${rows.length > shown.length ? `, showing first ${shown.length}` : ""}`),
      ...groupByDir(shown).map(([d, items]) => h("div", { class: "dgroup" },
        h("div", { class: "dname mono" }, d || "(root)"),
        items.map((x) => changeRow(leaf, A, B, x)))));
  };
  let t; filterIn.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { state.text = filterIn.value.trim(); draw(); }, 150); });
  body.replaceChildren(filterIn, chips, list);
  draw();
}

function groupByDir(rows) {
  const g = new Map();
  for (const r of rows) {
    const i = r.path.lastIndexOf("/");
    const d = i < 0 ? "" : r.path.slice(0, i);
    if (!g.has(d)) g.set(d, []);
    g.get(d).push(r);
  }
  return [...g.entries()];
}

function changeRow(leaf, A, B, x) {
  const name = x.path.split("/").pop();
  const sz = x.kind === "mod" ? `${fmtBytes(x.a[3])} → ${fmtBytes(x.b[3])}` : fmtBytes((x.b || x.a)[3]);
  const panel = h("div", { class: "dpanel" });
  const det = h("details", { class: `chg ${x.kind}` },
    h("summary", {},
      h("span", { class: `badge ${x.kind}` }, { mod: "M", add: "A", del: "D" }[x.kind]),
      h("span", { class: "mono" }, name),
      h("span", { class: "muted small" }, sz),
      h("a", { class: "small", href: x.kind === "del" ? route(leaf, A.key, "file", ...x.path.split("/")) : route(leaf, B.key, "file", ...x.path.split("/")), onclick: (e) => e.stopPropagation() }, "open")),
    panel);
  det.addEventListener("toggle", () => { if (det.open && !panel.dataset.done) { panel.dataset.done = "1"; fillPanel(panel, A, B, x); } }, { once: false });
  return det;
}

async function fillPanel(panel, A, B, x) {
  panel.replaceChildren(h("p", { class: "muted pad" }, "Loading…"));
  const big = Math.max(x.a?.[3] || 0, x.b?.[3] || 0) > MAX_DIFF_BYTES;
  const e = ext(x.path);
  try {
    if (IMG_EXT.has(e)) {
      return panel.replaceChildren(h("div", { class: "imgs" },
        x.a ? h("figure", {}, h("img", { src: rawUrl(A.commit, x.path) }), h("figcaption", {}, `v${A.version}`)) : null,
        x.b ? h("figure", {}, h("img", { src: rawUrl(B.commit, x.path) }), h("figcaption", {}, `v${B.version}`)) : null));
    }
    if (big || (!isText(x.path) && Math.max(x.a?.[3] || 0, x.b?.[3] || 0) > 512 * 1024)) {
      return panel.replaceChildren(binaryCompare(A, B, x, big ? "File too large to diff in the browser." : "Binary file."));
    }
    const [ta, tb] = await Promise.all([
      x.a ? getText(A.commit, x.path, x.a[2]) : "",
      x.b ? getText(B.commit, x.path, x.b[2]) : ""]);
    if (ta == null || tb == null) return panel.replaceChildren(binaryCompare(A, B, x, "Binary file."));
    if (x.kind === "mod" && ta === tb) {
      return panel.replaceChildren(h("p", { class: "muted pad small" },
        "Only line endings changed (CRLF ↔ LF); the text is identical."));
    }
    panel.replaceChildren(renderDiff(ta, tb));
  } catch (err) { panel.replaceChildren(h("p", { class: "err pad" }, err.message)); }
}

function binaryCompare(A, B, x, note) {
  return h("div", { class: "pad small" }, h("p", { class: "muted" }, note),
    h("table", { class: "kv" }, h("tbody", {},
      x.a ? h("tr", {}, h("td", {}, `v${A.version}`), h("td", { class: "mono" }, `${fmtBytes(x.a[3])} · ${x.a[2].slice(0, 12)}`), h("td", {}, h("a", { href: rawUrl(A.commit, x.path), target: "_blank" }, "raw"))) : null,
      x.b ? h("tr", {}, h("td", {}, `v${B.version}`), h("td", { class: "mono" }, `${fmtBytes(x.b[3])} · ${x.b[2].slice(0, 12)}`), h("td", {}, h("a", { href: rawUrl(B.commit, x.path), target: "_blank" }, "raw"))) : null)));
}

// Side-by-side diff with folded context and intraline highlights (Beyond Compare style).
function renderDiff(a, b) {
  const parts = Diff.diffLines(a, b);
  const rows = [];   // {t:'eq'|'mod'|'del'|'add', l, r, ln, rn}
  let ln = 1, rn = 1;
  const split = (v) => { const xs = v.split("\n"); if (xs.at(-1) === "") xs.pop(); return xs; };
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p.added && !p.removed) { for (const s of split(p.value)) rows.push({ t: "eq", l: s, r: s, ln: ln++, rn: rn++ }); continue; }
    if (p.removed && parts[i + 1]?.added) {
      const L = split(p.value), R = split(parts[i + 1].value); i++;
      const n = Math.max(L.length, R.length);
      for (let k = 0; k < n; k++) {
        const hasL = k < L.length, hasR = k < R.length;
        rows.push({ t: hasL && hasR ? "mod" : hasL ? "del" : "add", l: hasL ? L[k] : null, r: hasR ? R[k] : null, ln: hasL ? ln++ : null, rn: hasR ? rn++ : null });
      }
      continue;
    }
    for (const s of split(p.value)) rows.push(p.added ? { t: "add", l: null, r: s, ln: null, rn: rn++ } : { t: "del", l: s, r: null, ln: ln++, rn: null });
  }
  const changed = rows.map((r) => r.t !== "eq");
  const near = new Array(rows.length).fill(false);
  changed.forEach((c, i) => { if (c) for (let k = Math.max(0, i - CTX); k <= Math.min(rows.length - 1, i + CTX); k++) near[k] = true; });
  const nChanged = changed.filter(Boolean).length;
  const tbody = h("tbody", {});
  const emit = (r) => {
    let lh = r.l, rh = r.r;
    const L = h("td", { class: `code ${r.t === "eq" ? "" : r.l == null ? "empty" : "del"}` });
    const R = h("td", { class: `code ${r.t === "eq" ? "" : r.r == null ? "empty" : "add"}` });
    if (r.t === "mod") {
      for (const part of Diff.diffWordsWithSpace(r.l, r.r)) {
        if (!part.added) L.append(part.removed ? h("mark", {}, part.value) : part.value);
        if (!part.removed) R.append(part.added ? h("mark", {}, part.value) : part.value);
      }
    } else { L.append(lh ?? ""); R.append(rh ?? ""); }
    return h("tr", { class: r.t }, h("td", { class: "ln" }, r.ln ?? ""), L, h("td", { class: "ln" }, r.rn ?? ""), R);
  };
  let i = 0;
  const frag = document.createDocumentFragment();
  while (i < rows.length) {
    if (near[i] || !nChanged) { frag.append(emit(rows[i])); i++; continue; }
    let j = i; while (j < rows.length && !near[j]) j++;
    const hidden = rows.slice(i, j);
    const fold = h("tr", { class: "fold" }, h("td", { colspan: 4 },
      h("button", { onclick: () => { const f = document.createDocumentFragment(); hidden.forEach((r) => f.append(emit(r))); fold.replaceWith(f); } },
        `⋯ ${hidden.length} unchanged line${hidden.length === 1 ? "" : "s"} ⋯`)));
    frag.append(fold);
    i = j;
  }
  tbody.append(frag);
  const stats = rows.reduce((s, r) => { s[r.t] = (s[r.t] || 0) + 1; return s; }, {});
  return h("div", {},
    h("div", { class: "dstats small muted" }, `${stats.mod || 0} changed · ${stats.add || 0} added · ${stats.del || 0} removed lines`),
    h("div", { class: "diffwrap" }, h("table", { class: "diff" }, tbody)));
}
