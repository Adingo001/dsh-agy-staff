window.__ModuleLoader__.load({
	id: "dsh-agy-staff",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const react = require("react");
		const reactDom = (() => {
			try {
				return require("react-dom");
			} catch {
				return undefined;
			}
		})();
		const h = react.createElement;
		const { useCallback, useEffect, useRef, useState } = react;

		const name = "dsh-agy-staff";
		const inject = ["slots"];
		const API = "/agy/api";
		const STYLE_ID = "dsag-style";
		const PANEL_WIDTH = 452;

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

		/* --------------------------------------------------------------- anchor */

		const ZH_CONVERSATION = String.fromCharCode(0x5bf9, 0x8bdd);

		/**
		 * The 对话 / 轨迹 / … tab strip. dsh exposes no slot for it, so the entry
		 * joins the strip the way the host's own tabs live there: an element
		 * appended to the row, styled from the host's tokens.
		 */
		function findTabRow() {
			if (typeof document === "undefined") return null;
			return (
				document.querySelector("[data-conversation-tabs]") ||
				document.querySelector("[data-conversation-tabrow]") ||
				document.querySelector("[role='tablist'][aria-label*='" + ZH_CONVERSATION + "'], [role='tablist'][aria-label*='Conversation' i]") ||
				document.querySelector("[class*='conversation' i][class*='tab' i][class*='row' i]")
			);
		}

		function useTabHost() {
			const [host, setHost] = useState(null);
			useEffect(() => {
				if (typeof document === "undefined") return undefined;
				let dead = false;
				const ensure = () => {
					if (dead) return;
					const row = findTabRow();
					if (row === null) {
						setHost((prev) => (prev === null ? prev : null));
						return;
					}
					let el = row.querySelector(":scope > .dsag-tab-slot");
					if (el === null) {
						el = document.createElement("span");
						el.className = "dsag-tab-slot";
						el.setAttribute("data-testid", "dsh-agy-staff-tab");
						// Last child: lands after the host's tabs and after dsh-purge's chip,
						// which inserts itself between the last [role=tab] and the row end.
						row.appendChild(el);
					}
					setHost((prev) => (prev === el ? prev : el));
				};
				ensure();
				const observer = typeof MutationObserver !== "undefined" ? new MutationObserver(ensure) : null;
				if (observer) observer.observe(document.body, { childList: true, subtree: true });
				const interval = setInterval(ensure, 1000);
				return () => {
					dead = true;
					if (observer) observer.disconnect();
					clearInterval(interval);
				};
			}, []);
			return host;
		}

		/* ---------------------------------------------------------------- style */

		const CSS = `
.dsag-tab-slot{display:inline-flex;align-items:center;flex:0 0 auto}
.dsag-tab-btn{appearance:none;position:relative;border:0;background:transparent;cursor:pointer;
  display:inline-flex;align-items:center;gap:6px;padding:0 0 9px;margin:0 0 0 22px;
  font:500 13px/16px system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  color:var(--dsw-alias-label-tertiary,currentColor);white-space:nowrap;-webkit-text-fill-color:currentColor}
.dsag-tab-btn:hover{color:var(--dsw-alias-label-primary,currentColor)}
.dsag-tab-btn.on{color:var(--dsw-alias-brand-primary,#4f46e5)}
.dsag-tab-btn.on:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;border-radius:2px;
  background:var(--dsw-alias-brand-primary,#4f46e5)}
.dsag-dot{width:6px;height:6px;border-radius:3px;background:var(--dsw-alias-label-quaternary,#94a3b8);flex:0 0 auto}
.dsag-dot.ok{background:var(--dsw-alias-status-success,#10b981)}
.dsag-dot.bad{background:var(--dsw-alias-status-danger,#f43f5e)}

.dsag-panel{position:fixed;z-index:2147483000;box-sizing:border-box;width:452px;max-width:calc(100vw - 24px);
  max-height:min(74vh,640px);overflow:auto;overscroll-behavior:contain;border-radius:12px;
  background:var(--dsw-alias-bg-layer-2,#ffffff);color:var(--dsw-alias-label-primary,#0f172a);
  border:1px solid var(--dsw-alias-line-1,rgba(15,23,42,.12));
  box-shadow:0 18px 44px rgba(15,23,42,.18),0 2px 6px rgba(15,23,42,.08);
  font:13px/1.55 system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  -webkit-text-fill-color:currentColor}
@media (prefers-color-scheme: dark){
  .dsag-panel{background:var(--dsw-alias-bg-layer-2,#111827);color:var(--dsw-alias-label-primary,#e5e7eb);
    border-color:var(--dsw-alias-line-1,rgba(148,163,184,.22));box-shadow:0 18px 44px rgba(0,0,0,.5)}
}
.dsag-head{display:flex;align-items:center;gap:8px;padding:12px 14px 10px}
.dsag-title{font-weight:600;font-size:13.5px;letter-spacing:.01em}
.dsag-spacer{margin-left:auto}
.dsag-x{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-tertiary,#94a3b8);
  cursor:pointer;font-size:16px;line-height:1;padding:2px 4px;border-radius:6px}
.dsag-x:hover{background:var(--dsw-alias-bg-layer-3,rgba(148,163,184,.16));color:inherit}
.dsag-sec{padding:12px 14px;border-top:1px solid var(--dsw-alias-line-1,rgba(148,163,184,.16))}
.dsag-label{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
  color:var(--dsw-alias-label-tertiary,#94a3b8);margin:0 0 8px}
.dsag-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.dsag-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.dsag-field{display:flex;flex-direction:column;gap:4px;min-width:0}
.dsag-field>span{font-size:11.5px;color:var(--dsw-alias-label-tertiary,#94a3b8)}
.dsag-panel input,.dsag-panel select,.dsag-panel textarea{box-sizing:border-box;width:100%;height:30px;
  padding:0 8px;border-radius:7px;font:inherit;outline:none;
  background:var(--dsw-alias-bg-layer-1,#f8fafc);color:inherit;
  border:1px solid var(--dsw-alias-line-1,rgba(15,23,42,.14))}
.dsag-panel textarea{height:auto;min-height:56px;padding:7px 8px;resize:vertical;
  font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}
.dsag-panel input:focus,.dsag-panel select:focus,.dsag-panel textarea:focus{
  border-color:var(--dsw-alias-brand-primary,#4f46e5);box-shadow:0 0 0 3px rgba(79,70,229,.14)}
.dsag-btn{appearance:none;cursor:pointer;border-radius:7px;padding:0 11px;height:30px;
  font:500 12.5px/1 inherit;color:var(--dsw-alias-label-primary,inherit);
  background:var(--dsw-alias-bg-layer-1,rgba(148,163,184,.12));
  border:1px solid var(--dsw-alias-line-1,rgba(148,163,184,.28))}
.dsag-btn:hover{background:var(--dsw-alias-bg-layer-3,rgba(148,163,184,.2))}
.dsag-btn.primary{color:#fff;border-color:transparent;background:var(--dsw-alias-brand-primary,#4f46e5)}
.dsag-btn.primary:hover{filter:brightness(1.06)}
.dsag-btn.danger{color:var(--dsw-alias-status-danger,#e11d48)}
.dsag-btn:disabled{opacity:.5;cursor:default}
.dsag-hint{font-size:11.5px;color:var(--dsw-alias-label-tertiary,#94a3b8)}
.dsag-mono{font:11px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;
  color:var(--dsw-alias-label-secondary,#64748b);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsag-out{margin-top:8px;border-radius:8px;padding:8px;
  border:1px solid var(--dsw-alias-line-1,rgba(148,163,184,.22));
  background:var(--dsw-alias-bg-layer-1,rgba(148,163,184,.08));
  font:11.5px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;
  overflow-wrap:anywhere;max-height:190px;overflow:auto}
.dsag-err{color:var(--dsw-alias-status-danger,#e11d48);font-size:12.5px}
.dsag-jobs{display:flex;flex-direction:column;gap:6px;max-height:186px;overflow:auto}
.dsag-job{display:flex;align-items:center;gap:8px}
.dsag-job .id{flex:1;min-width:0;font:11.5px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;
  color:var(--dsw-alias-label-secondary,#475569);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsag-badge{font-size:10.5px;line-height:1;padding:4px 7px;border-radius:999px;
  border:1px solid var(--dsw-alias-line-1,rgba(148,163,184,.32));color:var(--dsw-alias-label-secondary,#475569)}
.dsag-badge.done{color:#0f7b52;border-color:rgba(16,185,129,.45);background:rgba(16,185,129,.1)}
.dsag-badge.running{color:#0e7490;border-color:rgba(34,211,238,.45);background:rgba(34,211,238,.1)}
.dsag-badge.error,.dsag-badge.timeout{color:#b91c1c;border-color:rgba(244,63,94,.4);background:rgba(244,63,94,.08)}
.dsag-foot{padding:9px 14px 11px;border-top:1px solid var(--dsw-alias-line-1,rgba(148,163,184,.16));
  font-size:11px;color:var(--dsw-alias-label-tertiary,#94a3b8)}
`;

		function ensureStyle() {
			if (typeof document === "undefined") return;
			const existing = document.getElementById(STYLE_ID);
			if (existing !== null) {
				// HMR swaps this module without a page reload, so the shipped CSS
				// has to be able to replace the previous generation's.
				if (existing.textContent !== CSS) existing.textContent = CSS;
				return;
			}
			const tag = document.createElement("style");
			tag.id = STYLE_ID;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		/* ----------------------------------------------------------------- views */

		function Section(props) {
			return h("div", { className: "dsag-sec" }, props.children);
		}

		function Label(props) {
			return h("div", { className: "dsag-label" }, props.text);
		}

		function AgyPanel(props) {
			const onClose = props.onClose;
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
				if (loadedRef.current) return;
				loadedRef.current = true;
				void load();
			}, [load]);

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
					setTestOut(await api("test", { prompt: prompt, mode: "ask", cwd: cwd || undefined }));
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

			const healthy = status !== null && status.agy !== undefined && status.agy.ok;
			const dotClass = status === null ? "dsag-dot" : healthy ? "dsag-dot ok" : "dsag-dot bad";

			return h("div", { className: "dsag-panel", role: "dialog", "aria-label": "agy" },
				h("div", { className: "dsag-head" },
					h("div", { className: dotClass }),
					h("div", { className: "dsag-title" }, "agy"),
					status !== null && status.pluginVersion !== undefined
						? h("span", { className: "dsag-hint" }, "v" + status.pluginVersion)
						: null,
					h("div", { className: "dsag-spacer" }),
					h("button", { className: "dsag-x", title: "关闭", onClick: onClose }, "×"),
				),

				error !== "" ? h(Section, null, h("div", { className: "dsag-err" }, error)) : null,

				h(Section, null,
					h("div", { className: "dsag-row" },
						h("span", { className: "dsag-hint" },
							status === null
								? "读取中…"
								: (healthy ? "agy " + status.agy.version : status.agy.error || "agy 不可用")
									+ " · companion " + (status.companionExists ? "✓" : "✗")),
						h("div", { className: "dsag-spacer" }),
						h("button", { className: "dsag-btn", disabled: busy !== "", onClick: () => void load() }, "刷新"),
					),
					status !== null
						? h("div", { className: "dsag-mono", title: status.companion + "\n" + status.settingsPath },
							status.companion)
						: null,
				),

				draft === null ? null : h(Section, null,
					h(Label, { text: "委派配置" }),
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
							}, [h("option", { key: "", value: "" }, "默认")].concat(
								(status && status.efforts ? status.efforts : ["low", "medium", "high"]).map((x) => h("option", { key: x, value: x }, x))))),
						h("label", { className: "dsag-field" }, h("span", null, "模型（留空按模式默认）"),
							h("input", {
								value: draft.model,
								placeholder: "gemini-3.8-flash-medium",
								onChange: (e) => setDraft(Object.assign({}, draft, { model: e.target.value })),
							})),
						h("label", { className: "dsag-field" }, h("span", null, "超时（分钟）"),
							h("input", {
								type: "number", min: 1, max: 120, value: draft.timeoutMin,
								onChange: (e) => setDraft(Object.assign({}, draft, { timeoutMin: e.target.value })),
							})),
					),
					h("div", { className: "dsag-row", style: { marginTop: 10 } },
						h("label", { className: "dsag-row", style: { gap: 6, cursor: "pointer" } },
							h("input", {
								type: "checkbox", style: { width: 14, height: 14 },
								checked: draft.subagentEnabled,
								onChange: (e) => setDraft(Object.assign({}, draft, { subagentEnabled: e.target.checked })),
							}),
							h("span", { className: "dsag-hint" }, "agy 子智能体")),
						h("label", { className: "dsag-row", style: { gap: 6, cursor: "pointer" } },
							h("input", {
								type: "checkbox", style: { width: 14, height: 14 },
								checked: draft.skillsEnabled,
								onChange: (e) => setDraft(Object.assign({}, draft, { skillsEnabled: e.target.checked })),
							}),
							h("span", { className: "dsag-hint" }, "/agy-* 技能")),
						h("div", { className: "dsag-spacer" }),
						notice !== "" ? h("span", { className: "dsag-hint" }, notice) : null,
						h("button", { className: "dsag-btn primary", disabled: busy !== "", onClick: () => void save() },
							busy === "save" ? "保存中…" : "保存"),
					),
				),

				h(Section, null,
					h(Label, { text: "连通性测试" }),
					h("textarea", {
						value: prompt,
						onChange: (e) => setPrompt(e.target.value),
						placeholder: "问 agy 一句话（一次 ask，零工具，约 3 秒）",
					}),
					h("div", { className: "dsag-row", style: { marginTop: 8 } },
						h("button", { className: "dsag-btn", disabled: busy !== "", onClick: () => void runTest() },
							busy === "test" ? "运行中…" : "跑一次"),
						testOut !== null
							? h("span", { className: "dsag-hint" },
								(testOut.ok ? "✓ " : "✗ ") + (testOut.ms || 0) + "ms" + (testOut.exitCode ? " · exit " + testOut.exitCode : ""))
							: null,
					),
					testOut !== null ? h("div", { className: "dsag-out" }, testOut.output || "(无输出)") : null,
				),

				h(Section, null,
					h("div", { className: "dsag-row", style: { marginBottom: 8 } },
						h(Label, { text: "作业" }),
						h("div", { className: "dsag-spacer" }),
						h("input", {
							value: cwd, placeholder: "仓库目录（留空用宿主 cwd）", style: { width: 200 },
							onChange: (e) => setCwd(e.target.value),
						}),
						h("button", { className: "dsag-btn", disabled: busy !== "", onClick: () => void refreshJobs() }, "刷新"),
					),
					jobs.length === 0
						? h("div", { className: "dsag-hint" }, "没有作业记录（该目录下 .agy-staff/state.json 为空或不存在）")
						: h("div", { className: "dsag-jobs" }, jobs.map((job) => h("div", { className: "dsag-job", key: job.id },
							h("span", { className: "dsag-badge " + job.status }, job.status || "?"),
							h("span", { className: "id", title: job.id + " · " + job.mode + " · " + job.model },
								job.mode + " · " + job.id),
							h("button", { className: "dsag-btn", disabled: busy !== "", onClick: () => void showResult(job.id) }, "结果"),
							job.status === "running"
								? h("button", { className: "dsag-btn danger", disabled: busy !== "", onClick: () => void cancelJob(job.id) }, "取消")
								: null,
						))),
					jobOut !== null ? h("div", { className: "dsag-out" }, jobOut.id + "\n\n" + jobOut.text) : null,
				),

				h("div", { className: "dsag-foot" },
					"改动即时生效；面板随应用启动加载，bundle 行不会热更。"),
			);
		}

		/* ------------------------------------------------------------------ entry */

		/** The strip entry: a text button, health dot, underline while open. */
		function AgyTab(props) {
			const dotClass = props.healthy === undefined ? "dsag-dot" : props.healthy ? "dsag-dot ok" : "dsag-dot bad";
			return h("button", {
				type: "button",
				className: props.open ? "dsag-tab-btn on" : "dsag-tab-btn",
				"data-testid": "dsh-agy-staff-tab-btn",
				"aria-expanded": props.open ? "true" : "false",
				onClick: props.onToggle,
			}, h("span", { className: dotClass }), "agy");
		}

		function AgyOverlay() {
			const host = useTabHost();
			const [open, setOpen] = useState(false);
			const [healthy, setHealthy] = useState(undefined);
			const [anchor, setAnchor] = useState(null);
			const chipRef = useRef(null);

			useEffect(() => {
				let alive = true;
				api("status")
					.then((info) => {
						if (alive && info.ok) setHealthy(info.agy !== undefined && info.agy.ok);
					})
					.catch(() => {});
				return () => {
					alive = false;
				};
			}, []);

			const close = useCallback(() => setOpen(false), []);

			const toggle = useCallback(() => {
				setOpen((prev) => {
					const next = !prev;
					if (next) {
						const rect = chipRef.current === null || chipRef.current === undefined
							? undefined
							: chipRef.current.getBoundingClientRect();
						const left = rect === undefined
							? 24
							: Math.max(12, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 12));
						const top = rect === undefined ? 64 : rect.bottom + 8;
						setAnchor({ left: left, top: top });
					}
					return next;
				});
			}, []);

			useEffect(() => {
				if (!open) return undefined;
				const onKey = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, [open]);

			const portal = reactDom !== undefined && typeof reactDom.createPortal === "function"
				? reactDom.createPortal
				: null;
			if (portal === null || typeof document === "undefined") return null;

			const tab = h("span", { ref: chipRef },
				h(AgyTab, { open: open, healthy: healthy, onToggle: toggle }));

			const target = host !== null ? host : document.body;
			const panelStyle = anchor === null
				? { position: "fixed", left: 24, top: 64 }
				: { position: "fixed", left: anchor.left + "px", top: anchor.top + "px" };

			return h(react.Fragment, null,
				portal(tab, target),
				open
					? portal(h("div", { style: panelStyle }, h(AgyPanel, { onClose: close })), document.body)
					: null,
			);
		}

		/**
		 * Where the panel landed, as the DOM sees it. The host records this in
		 * `status.panel`, so "I don't see it" stays measurable.
		 */
		function panelGeometry() {
			try {
				const node = document.querySelector(".dsag-panel") ||
					document.querySelector(".dsag-tab-btn") ||
					document.querySelector(".dsag-tab-slot");
				if (node === null || node === undefined) return undefined;
				const rect = node.getBoundingClientRect();
				const visible = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
					&& rect.top < window.innerHeight && rect.left < window.innerWidth;
				let topmost = false;
				try {
					const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
					topmost = hit !== null && hit !== undefined && (hit === node || node.contains(hit));
				} catch {}
				return `x${Math.round(rect.left)},y${Math.round(rect.top)},w${Math.round(rect.width)},h${Math.round(rect.height)},visible:${visible},topmost:${topmost}`;
			} catch (error) {
				return `probe-error:${String(error)}`;
			}
		}

		function apply(ctx) {
			// Hello to the host half: proves in `status` that this bundle ran at all.
			void api("panel-alive", { version: "boot" }).catch(() => {});

			const register = () => {
				try {
					ctx.slots.register({ name: "shell.overlay", id: "dsh-agy-staff-panel", order: 60 }, AgyOverlay);
				} catch (error) {
					console.warn("[dsh-agy-staff] panel registration failed:", error);
				}
				setTimeout(() => {
					const geometry = panelGeometry();
					void api("panel-alive", {
						version: geometry === undefined ? "missing" : "mounted:" + geometry,
					}).catch(() => {});
				}, 1500);
			};

			try {
				if (ctx.slots !== undefined && typeof ctx.slots.inject === "function") {
					ctx.slots.inject("shell.overlay", register);
				} else {
					register();
				}
			} catch (error) {
				console.warn("[dsh-agy-staff] shell.overlay slot unavailable:", error);
				register();
			}
		}

		exports.name = name;
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	},
});
