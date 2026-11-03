window.__ModuleLoader__.load({
	id: "dsh-agy-staff",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const react = require("react");
		const h = react.createElement;
		const { useCallback, useEffect, useRef, useState } = react;

		const name = "dsh-agy-staff";
		const inject = ["slots"];
		const API = "/agy/api";
		const STYLE_ID = "dsag-style";

		/* ---------------------------------------------------------------- data */

		async function api(op, extra) {
			const response = await fetch(API, {
				method: "POST",
				credentials: "same-origin",
				cache: "no-store",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(Object.assign({ op: op }, extra || {})),
			});
			let body;
			try {
				body = await response.json();
			} catch {
				body = { ok: false, error: "HTTP " + response.status };
			}
			return body;
		}

		/* ---------------------------------------------------------------- style */

		const CSS = `
.dsag-trigger{position:fixed;right:18px;bottom:96px;z-index:70;pointer-events:auto;display:flex;align-items:center;justify-content:center;
  width:44px;height:44px;border-radius:22px;border:1px solid rgba(129,140,248,.45);cursor:pointer;
  background:linear-gradient(135deg,#4f46e5,#22d3ee);color:#fff;font:600 12px/1 ui-sans-serif,system-ui,"Segoe UI",sans-serif;
  letter-spacing:.02em;box-shadow:0 6px 18px rgba(15,23,42,.35)}
.dsag-trigger:hover{filter:brightness(1.08)}
.dsag-panel{position:fixed;right:18px;bottom:150px;z-index:71;pointer-events:auto;width:432px;max-height:72vh;overflow:auto;
  border-radius:14px;border:1px solid rgba(99,102,241,.35);background:#0b1220;color:#e2e8f0;
  font:12px/1.55 ui-sans-serif,system-ui,"Segoe UI",sans-serif;box-shadow:0 18px 48px rgba(2,6,23,.55)}
.dsag-head{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(99,102,241,.22)}
.dsag-title{font-weight:700;font-size:13px;letter-spacing:.02em}
.dsag-dot{width:8px;height:8px;border-radius:4px;background:#64748b}
.dsag-dot.ok{background:#10b981}.dsag-dot.bad{background:#f43f5e}
.dsag-muted{color:#94a3b8}
.dsag-x{margin-left:auto;cursor:pointer;border:0;background:transparent;color:#94a3b8;font-size:15px;line-height:1}
.dsag-x:hover{color:#e2e8f0}
.dsag-sec{padding:11px 14px;border-bottom:1px solid rgba(99,102,241,.14)}
.dsag-sec:last-child{border-bottom:0}
.dsag-label{font-size:11px;color:#94a3b8;margin-bottom:6px;letter-spacing:.03em;text-transform:uppercase}
.dsag-row{display:flex;gap:8px;align-items:center}
.dsag-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dsag-field{display:flex;flex-direction:column;gap:4px}
.dsag-field span{font-size:11px;color:#94a3b8}
.dsag input,.dsag select,.dsag textarea{width:100%;box-sizing:border-box;border-radius:8px;border:1px solid rgba(148,163,184,.28);
  background:#0f172a;color:#e2e8f0;padding:6px 8px;font:inherit;outline:none}
.dsag input:focus,.dsag select:focus,.dsag textarea:focus{border-color:#6366f1}
.dsag textarea{resize:vertical;min-height:54px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px}
.dsag-btn{cursor:pointer;border:1px solid rgba(99,102,241,.45);background:rgba(79,70,229,.22);color:#c7d2fe;
  border-radius:8px;padding:5px 10px;font:600 11px/1.4 inherit}
.dsag-btn:hover{background:rgba(79,70,229,.34)}
.dsag-btn.ghost{border-color:rgba(148,163,184,.28);background:transparent;color:#cbd5e1}
.dsag-btn.danger{border-color:rgba(244,63,94,.45);background:rgba(244,63,94,.14);color:#fecdd3}
.dsag-btn:disabled{opacity:.5;cursor:default}
.dsag-mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10.5px;color:#94a3b8;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsag-out{margin-top:8px;border-radius:8px;background:#0f172a;border:1px solid rgba(148,163,184,.18);padding:8px;
  font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:180px;overflow:auto}
.dsag-err{color:#fda4af}
.dsag-jobs{display:flex;flex-direction:column;gap:6px;max-height:190px;overflow:auto}
.dsag-job{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:rgba(15,23,42,.75);
  border:1px solid rgba(148,163,184,.14)}
.dsag-job .id{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10.5px;color:#cbd5e1;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.dsag-badge{font-size:10px;padding:1px 6px;border-radius:6px;border:1px solid rgba(148,163,184,.3);color:#cbd5e1}
.dsag-badge.done{border-color:rgba(16,185,129,.45);color:#6ee7b7}
.dsag-badge.running{border-color:rgba(34,211,238,.45);color:#67e8f9}
.dsag-badge.error,.dsag-badge.timeout{border-color:rgba(244,63,94,.45);color:#fda4af}
.dsag-foot{padding:9px 14px;color:#64748b;font-size:10.5px}
.dsag-link{color:#818cf8;cursor:pointer;text-decoration:underline dotted}
`;

		function ensureStyle() {
			if (typeof document === "undefined") return;
			if (document.getElementById(STYLE_ID) !== null) return;
			const tag = document.createElement("style");
			tag.id = STYLE_ID;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		/* ---------------------------------------------------------------- panel */

		function Section(props) {
			return h("div", { className: "dsag-sec" }, props.children);
		}

		function Label(props) {
			return h("div", { className: "dsag-label" }, props.text);
		}

		function AgyPanel() {
			const [open, setOpen] = useState(false);
			const [status, setStatus] = useState(null);
			const [draft, setDraft] = useState(null);
			const [busy, setBusy] = useState("");
			const [error, setError] = useState("");
			const [notice, setNotice] = useState("");
			const [prompt, setPrompt] = useState("reply with exactly: agy works");
			const [testOut, setTestOut] = useState(null);
			const [jobs, setJobs] = useState([]);
			const [jobOut, setJobOut] = useState(null);
			const [cwd, setCwd] = useState("");
			const loadedRef = useRef(false);

			const load = useCallback(async () => {
				setBusy("load");
				setError("");
				try {
					const info = await api("status");
					if (!info.ok) throw new Error(info.error || "status failed");
					setStatus(info);
					setDraft({
						mode: info.defaults.mode,
						model: info.defaults.model,
						effort: info.defaults.effort,
						timeoutMin: Math.round(info.defaults.timeoutMs / 60000),
						subagentEnabled: info.defaults.subagentEnabled,
						skillsEnabled: info.defaults.skillsEnabled,
					});
					const list = await api("jobs", { cwd: cwd || undefined });
					if (list.ok) setJobs(list.jobs);
				} catch (e) {
					setError(String((e && e.message) || e));
				} finally {
					setBusy("");
				}
			}, [cwd]);

			useEffect(() => {
				ensureStyle();
			}, []);

			useEffect(() => {
				if (!open || loadedRef.current) return;
				loadedRef.current = true;
				void load();
			}, [open, load]);

			const save = useCallback(async () => {
				if (draft === null) return;
				setBusy("save");
				setError("");
				setNotice("");
				try {
					const result = await api("set", {
						patch: {
							mode: draft.mode,
							model: draft.model,
							effort: draft.effort,
							timeoutMs: Math.max(30000, Math.round(Number(draft.timeoutMin) * 60000)),
							subagentEnabled: draft.subagentEnabled,
							skillsEnabled: draft.skillsEnabled,
						},
					});
					if (!result.ok) throw new Error(result.error || "save failed");
					setNotice("已保存，下一次委派生效");
					const info = await api("status");
					if (info.ok) setStatus(info);
				} catch (e) {
					setError(String((e && e.message) || e));
				} finally {
					setBusy("");
				}
			}, [draft]);

			const runTest = useCallback(async () => {
				setBusy("test");
				setError("");
				setTestOut(null);
				try {
					const result = await api("test", { prompt: prompt, mode: "ask", cwd: cwd || undefined });
					setTestOut(result);
				} catch (e) {
					setError(String((e && e.message) || e));
				} finally {
					setBusy("");
				}
			}, [prompt, cwd]);

			const refreshJobs = useCallback(async () => {
				setBusy("jobs");
				try {
					const result = await api("jobs", { cwd: cwd || undefined });
					if (result.ok) setJobs(result.jobs);
					else setError(result.error || "jobs failed");
				} catch (e) {
					setError(String((e && e.message) || e));
				} finally {
					setBusy("");
				}
			}, [cwd]);

			const showResult = useCallback(async (jobId) => {
				setBusy("result:" + jobId);
				try {
					const result = await api("result", { jobId: jobId, cwd: cwd || undefined });
					setJobOut(result.ok ? { id: jobId, text: result.output } : { id: jobId, text: result.error || "读取失败" });
				} catch (e) {
					setJobOut({ id: jobId, text: String((e && e.message) || e) });
				} finally {
					setBusy("");
				}
			}, [cwd]);

			const cancelJob = useCallback(async (jobId) => {
				setBusy("cancel:" + jobId);
				try {
					const result = await api("cancel", { jobId: jobId, cwd: cwd || undefined });
					setNotice(result.ok ? "已请求取消 " + jobId : result.error || "取消失败");
					await refreshJobs();
				} catch (e) {
					setError(String((e && e.message) || e));
				} finally {
					setBusy("");
				}
			}, [cwd, refreshJobs]);

			const dot = status === null ? "dsag-dot" : (status.agy && status.agy.ok ? "dsag-dot ok" : "dsag-dot bad");

			if (!open) {
				return h("div", {
					className: "dsag-trigger",
					role: "button",
					title: "agy 控制台",
					onClick: () => setOpen(true),
				}, "agy");
			}

			return h("div", { className: "dsag-panel" },
				h("div", { className: "dsag-head" },
					h("div", { className: dot }),
					h("div", { className: "dsag-title" }, "agy 控制台"),
					h("div", { className: "dsag-muted" }, status && status.pluginVersion ? "v" + status.pluginVersion : ""),
					h("button", { className: "dsag-x", title: "收起", onClick: () => setOpen(false) }, "×"),
				),

				error !== "" ? h(Section, null, h("div", { className: "dsag-err" }, error)) : null,

				h(Section, null,
					h(Label, { text: "环境" }),
					h("div", { className: "dsag-row", style: { justifyContent: "space-between" } },
						h("div", { className: "dsag-mono", title: status ? status.companion : "" },
							status === null ? "读取中…" : (status.companionExists ? "companion ✓" : "companion ✗") + " · " + (status.companion || "")),
						h("button", { className: "dsag-btn ghost", disabled: busy !== "", onClick: () => void load() }, "刷新"),
					),
					h("div", { className: "dsag-mono", title: status && status.settingsPath ? status.settingsPath : "" },
						"agy " + (status && status.agy ? (status.agy.ok ? status.agy.version : status.agy.error) : "…")),
				),

				draft === null ? null : h(Section, null,
					h(Label, { text: "委派配置（保存后即时生效）" }),
					h("div", { className: "dsag-grid" },
						h("label", { className: "dsag-field" }, h("span", null, "模式"),
							h("select", {
								value: draft.mode,
								onChange: (e) => setDraft(Object.assign({}, draft, { mode: e.target.value })),
							}, (status && status.modes ? status.modes : ["staffer"]).map((m) => h("option", { key: m, value: m }, m)))),
						h("label", { className: "dsag-field" }, h("span", null, "推理强度"),
							h("select", {
								value: draft.effort,
								onChange: (e) => setDraft(Object.assign({}, draft, { effort: e.target.value })),
							}, [h("option", { key: "", value: "" }, "（默认）")].concat(
								(status && status.efforts ? status.efforts : ["low", "medium", "high"]).map((x) => h("option", { key: x, value: x }, x))))),
						h("label", { className: "dsag-field" }, h("span", null, "模型（留空按模式默认）"),
							h("input", {
								value: draft.model,
								placeholder: "gemini-3.8-flash-medium",
								onChange: (e) => setDraft(Object.assign({}, draft, { model: e.target.value })),
							})),
						h("label", { className: "dsag-field" }, h("span", null, "超时（分钟）"),
							h("input", {
								type: "number",
								min: 1,
								max: 120,
								value: draft.timeoutMin,
								onChange: (e) => setDraft(Object.assign({}, draft, { timeoutMin: e.target.value })),
							})),
					),
					h("div", { className: "dsag-row", style: { marginTop: 8, flexWrap: "wrap" } },
						h("label", { className: "dsag-row", style: { gap: 6, cursor: "pointer" } },
							h("input", {
								type: "checkbox",
								style: { width: 14 },
								checked: draft.subagentEnabled,
								onChange: (e) => setDraft(Object.assign({}, draft, { subagentEnabled: e.target.checked })),
							}),
							h("span", { className: "dsag-muted" }, "agy 子智能体")),
						h("label", { className: "dsag-row", style: { gap: 6, cursor: "pointer" } },
							h("input", {
								type: "checkbox",
								style: { width: 14 },
								checked: draft.skillsEnabled,
								onChange: (e) => setDraft(Object.assign({}, draft, { skillsEnabled: e.target.checked })),
							}),
							h("span", { className: "dsag-muted" }, "/agy-* 技能")),
						h("button", { className: "dsag-btn", disabled: busy !== "", onClick: () => void save() },
							busy === "save" ? "保存中…" : "保存"),
						notice !== "" ? h("span", { className: "dsag-muted" }, notice) : null,
					),
				),

				h(Section, null,
					h(Label, { text: "连通性测试（一次 ask，零工具，约 3 秒）" }),
					h("textarea", {
						value: prompt,
						onChange: (e) => setPrompt(e.target.value),
						placeholder: "问 agy 一句话",
					}),
					h("div", { className: "dsag-row", style: { marginTop: 8 } },
						h("button", { className: "dsag-btn", disabled: busy !== "", onClick: () => void runTest() },
							busy === "test" ? "运行中…" : "跑一次"),
						testOut !== null ? h("span", { className: "dsag-muted" },
							(testOut.ok ? "✓ " : "✗ ") + (testOut.ms || 0) + "ms" + (testOut.exitCode ? " · exit " + testOut.exitCode : "")) : null,
					),
					testOut !== null ? h("div", { className: "dsag-out" }, testOut.output || "(无输出)") : null,
				),

				h(Section, null,
					h("div", { className: "dsag-row", style: { justifyContent: "space-between", marginBottom: 6 } },
						h(Label, { text: "作业" }),
						h("button", { className: "dsag-btn ghost", disabled: busy !== "", onClick: () => void refreshJobs() }, "刷新"),
					),
					h("div", { className: "dsag-row", style: { marginBottom: 8 } },
						h("input", {
							value: cwd,
							placeholder: "仓库目录（留空用宿主 cwd）",
							onChange: (e) => setCwd(e.target.value),
						}),
					),
					jobs.length === 0
						? h("div", { className: "dsag-muted" }, "没有作业记录（该目录下 .agy-staff/state.json 为空或不存在）")
						: h("div", { className: "dsag-jobs" }, jobs.map((job) => h("div", { className: "dsag-job", key: job.id },
							h("span", { className: "dsag-badge " + job.status }, job.status || "?"),
							h("span", { className: "id", title: job.id + " · " + job.mode + " · " + job.model }, job.mode + " · " + job.id),
							h("button", { className: "dsag-btn ghost", disabled: busy !== "", onClick: () => void showResult(job.id) }, "结果"),
							job.status === "running"
								? h("button", { className: "dsag-btn danger", disabled: busy !== "", onClick: () => void cancelJob(job.id) }, "取消")
								: null,
						))),
					jobOut !== null ? h("div", { className: "dsag-out" }, jobOut.id + "\n\n" + jobOut.text) : null,
				),

				h("div", { className: "dsag-foot" },
					"改动即时生效；面板本身随应用启动加载，bundle 行不会热更。",
				),
			);
		}

		/* ----------------------------------------------------------------- apply */

		function apply(ctx) {
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "dsh-agy-staff-panel",
				order: 60,
			}, AgyPanel));
		}

		exports.name = name;
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	},
});
