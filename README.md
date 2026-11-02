<p align="center"><img src="assets/logo/dsh-agy-staff.svg" width="520" alt="dsh-agy-staff"></p>

<p align="center"><a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a></p>

<p align="center"><img src="assets/badges/host-dsh.svg" height="20" alt="host: DeepSeek Harness"> <img src="assets/badges/worker-agy.svg" height="20" alt="worker: agy / Gemini 3.8 Flash"> <img src="assets/badges/license-mit.svg" height="20" alt="license: MIT"> <img src="assets/badges/upstream-agy-staff.svg" height="20" alt="upstream: keli-wen/agy-staff"></p>

<p align="center">A DeepSeek Harness bundle that hires <a href="https://github.com/keli-wen/agy-staff">agy-staff</a>'s personas as seven skills — <code>/agy-ask</code>, <code>/agy-staffer</code>, <code>/agy-researcher</code>, <code>/agy-reviewer</code>, <code>/agy-implementer</code>, plus <code>/agy-lead</code> and <code>/agy-jobs</code>.</p>

**[Why](#-why) · [Install](#install) · [Usage](#cujs) · [Core design](#core-design) · [Updating](#updating) · [Troubleshooting](#troubleshooting) · [Credits](#credits)**

## What & Why

[agy-staff](https://github.com/keli-wen/agy-staff) hires Google's Antigravity CLI (`agy`, Gemini 3.8 Flash) as staff: the host agent hands out a survey, a review, or a scoped implementation, and gets a second model family back in seconds instead of grinding the same work itself. It ships as plugins for Claude Code, Codex, Pi and OpenCode.

DeepSeek Harness is not one of those hosts. **dsh plugins are cordis bundles**, not host plugin manifests, and dsh has no `/agy:` namespace: its composer menu matches the skill *name* from frontmatter, discovered through a registered **skill provider**. So this repo is not an installer script that copies files around — it is a dsh bundle that registers one provider serving the vendored personas:

```
dsh-agy-staff (bundle patch)
  └── row: dsh-agy-staff  (inject: ['skills'])
        └── ctx.skills.registerProvider(...)
              └── /agy-ask  /agy-staffer  /agy-researcher  /agy-reviewer
                  /agy-implementer  /agy-lead  /agy-jobs
```

Nothing is written into `~/.dsh/skills`, nothing is junctioned, and no upstream checkout is required at runtime: the personas, the companion and the reference docs ship inside the package under `assets/`.

| | Claude Code / Codex | DeepSeek Harness (this bundle) |
|---|---|---|
| Install | `claude plugin install …` | `dsh plugin --profile <p> add …` |
| Surface | `/agy:ask` | `/agy-ask` |
| Skill delivery | plugin manifest | `ctx.skills.registerProvider` |
| Shared resources | `<plugin-root>/companion` | `resourceBase` → `<pkg>/assets/` |
| Taking effect | next session | **restart the app** (bundles load at host start) |

## Install

**Step 1 — the worker.** Node.js and the [Antigravity CLI](https://antigravity.google/docs/cli/install), logged in once:

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
agy --version
```

On Windows the installer puts `agy.exe` under `%LOCALAPPDATA%\agy\bin`; keep that on `PATH`.

**Step 2 — install the bundle into a profile.** `dsh plugin` forwards to pnpm in the profile directory and registers the bundle in `dsh.profile.bundles`:

```powershell
git clone https://github.com/Adingo001/dsh-agy-staff.git
dsh plugin --profile desktop add "link:$PWD/dsh-agy-staff"
```

Or straight from GitHub, if you would rather not keep a clone:

```powershell
dsh plugin --profile desktop add "github:Adingo001/dsh-agy-staff"
```

**Step 3 — restart DeepSeek Harness.** A skill *directory* is picked up live; a new bundle row is not. Quit the app and open it again, then type `/agy` in the composer: seven rows.

**Step 4 — smoke test.** `ask` is tool-free, so it needs no setup and answers in about three seconds:

```powershell
node "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\dsh-agy-staff\assets\companion\agy-companion.mjs" ask --prompt "reply with OK"
```

## CUJs

| Use case | Type this |
|---|---|
| Quick second opinion | `/agy-ask what's your backend model` |
| General task | `/agy-staffer summarize the open TODOs in this repo` |
| Generate an image | `/agy-staffer generate a pixel-art robot mascot, save it as assets/mascot.png` |
| Review the working tree | `/agy-reviewer Review the current working tree` |
| Review a PR | `/agy-reviewer Review PR #12` |
| Challenge a plan | `/agy-reviewer Challenge the migration plan in docs/plan.md` |
| Survey a topic | `/agy-researcher how does auth work in this repo` |
| Scoped implementation | `/agy-implementer fix the flaky retry test` |
| Orchestrate a task | `/agy-lead investigate the options, draft a proposal, then revise it with my feedback` |
| Job ops | `/agy-jobs`, or just "is the agy job done?" |

Only `ask` blocks. The rest return a job id; the companion's `wait` collects the report, and in dsh you run that `wait` as a background command so the host keeps working — one wait per job, `exit 2` means still running.

## Core design

- **One provider, seven candidates.** `index.js` parses the vendored `assets/skills/<persona>/SKILL.md` frontmatter, serves the body as skill content, and reports `rank: 600` (the packaged-provider precedence). It has no dependencies — Node builtins only.
- **Name prefix is load-bearing.** dsh has no colon namespace; `/agy` only lists something if the *name* starts with `agy`. The bundle therefore serves `agy-<persona>` while the on-disk directory keeps upstream's `ask`/`jobs`, so `../jobs/SKILL.md` still resolves as written.
- **`resourceBase` replaces junctions.** Every candidate advertises `{ kind: 'directory', path: <pkg>/assets }`; dsh tells the model to resolve relative references against that base, so `../../companion/agy-companion.mjs`, `../jobs/references/setup.md` and `../../docs/REFERENCE.md` work untouched.
- **Prose is localized at load.** Upstream bodies say `/agy:ask`; the provider rewrites that to `/agy-ask` in descriptions and bodies, leaving the vendored files byte-identical to upstream.
- **Upstream is vendored, not copied at install.** `assets/` holds the personas, companion, templates and reference docs at the commit recorded in `assets/UPSTREAM-COMMIT`; `NOTICE` spells out what came from where.

## Updating

Upstream moved:

```powershell
git -C <agy-staff-checkout> pull
node scripts/vendor-upstream.mjs --from <agy-staff-checkout>
npm test
```

Then restart the app. `scripts/vendor-upstream.mjs` copies the payload, rewrites `assets/UPSTREAM-COMMIT`, and warns when a path upstream dropped is missing.

This bundle itself:

```powershell
git pull
dsh plugin --profile desktop add "link:$PWD"   # re-link after a move
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `/agy` lists nothing | bundle row not loaded | check `dsh-agy-staff` is in the profile's `dsh.profile.bundles`, then restart the app |
| Warning: duplicate skill `agy-ask` | an older filesystem install is still in `~/.dsh/skills` | delete `~/.dsh/skills/agy-*` (the bundle takes over) |
| `unknown subcommand: researcher` | companion modes are `research` / `review` / `implement` | call the mode, not the skill directory name |
| `ask` hangs or 401 | agy needs a localhost port plus its OAuth token | run it unsandboxed and log `agy` in once |
| Skill body's relative path 404s | `assets/` incomplete after a manual edit | re-run `node scripts/vendor-upstream.mjs` |
| Everything vanished after reinstall | the row id changed to a package name pnpm cannot resolve | `dsh plugin --profile desktop why dsh-agy-staff` |

## Credits

**This is an adapter, not the invention.** The design that makes it worth using — the five personas, the companion, the job protocol, the prompts, and the bench that measures them — belongs to [**keli-wen**](https://github.com/keli-wen) and the [agy-staff](https://github.com/keli-wen/agy-staff) contributors. Go star upstream; if you use this bundle you are using their work.

- Upstream: <https://github.com/keli-wen/agy-staff> (MIT, vendored at `9ddec3e`)
- Bench v1 report: [English](https://lastwhisper.dev/en/zen-of-harness-engineering/agy-staff-bench-v1/) · [中文](https://lastwhisper.dev/zen-of-harness-engineering/agy-staff-bench-v1/)
- Worker: [Antigravity CLI](https://antigravity.google/product/antigravity-cli)

Thanks also to the DeepSeek Harness authors: a skill registry that accepts a provider from any bundle is what made a real plugin possible here.

## License

MIT — see [LICENSE](LICENSE) for this bundle's code and [NOTICE](NOTICE) for the vendored upstream material, which stays under its own MIT license (`assets/UPSTREAM-LICENSE`).
