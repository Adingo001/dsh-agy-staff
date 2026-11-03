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
		const PANEL_WIDTH = 440;

		/**
		 * HMR swaps this module without unmounting the previous React tree, so the
		 * old entry keeps its (now stale) registration and DOM. Counting loads lets
		 * a swap register under a fresh id and drop the stale hosts, which is what
		 * makes a layout change visible without restarting the app.
		 */
		const GENERATION = (() => {
			try {
				const next = (window.__DSAG_GEN__ ?? 0) + 1;
				window.__DSAG_GEN__ = next;
				return next;
			} catch {
				return 1;
			}
		})();

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

		// Module scope, not a React effect: when HMR swaps this bundle the previous
		// component instance stays mounted, so an effect-owned style node would keep
		// serving the old CSS forever. Writing it here makes every swap land at once.
		queueMicrotask(() => {
			try {
				ensureStyle();
			} catch (error) {
				console.warn("[dsh-agy-staff] style injection failed:", error);
			}
		});

		const CSS = `
.dsag-tab-slot{display:inline-flex;align-items:center;flex:0 0 auto}
.dsag-tab-btn{appearance:none;position:relative;border:0;background:transparent;cursor:pointer;
  display:inline-flex;align-items:center;gap:7px;padding:0 2px 9px;margin:0 0 0 20px;
  font:500 13px/16px system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  color:var(--dsw-alias-label-tertiary,#64748b);white-space:nowrap;-webkit-text-fill-color:currentColor}
.dsag-tab-btn:hover{color:var(--dsw-alias-label-primary,#0f172a)}
.dsag-tab-btn.on{color:var(--dsw-alias-brand-primary,#4f46e5)}
.dsag-tab-btn.on:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;border-radius:2px;
  background:var(--dsw-alias-brand-primary,#4f46e5)}
.dsag-fallback{position:fixed;right:16px;bottom:96px;z-index:2147483000}
.dsag-fallback .dsag-tab-btn{margin:0;padding:7px 12px;min-height:32px;border-radius:16px;
  background:var(--dsw-alias-brand-primary,#4f46e5);color:var(--dsw-alias-label-primary-inverted,#ffffff)}
.dsag-fallback .dsag-tab-btn.on:after{display:none}
.dsag-dot{width:6px;height:6px;border-radius:999px;background:var(--dsw-alias-label-caption,#94a3b8);flex:0 0 auto;
  box-shadow:0 0 0 3px rgba(148,163,184,.12);
  box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-label-caption,#94a3b8) 12%,transparent)}
.dsag-dot.ok{background:var(--dsw-alias-state-success-primary,#10b981);
  box-shadow:0 0 0 3px rgba(16,185,129,.12);
  box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-success-primary,#10b981) 12%,transparent)}
.dsag-dot.bad{background:var(--dsw-alias-state-error-primary,#f43f5e);
  box-shadow:0 0 0 3px rgba(244,63,94,.12);
  box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-error-primary,#f43f5e) 12%,transparent)}

.dsag-panel{position:fixed;z-index:2147483000;box-sizing:border-box;width:440px;max-width:calc(100vw - 24px);
  max-height:min(76vh,660px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;border-radius:14px;
  background:var(--dsw-alias-bg-layer-2,#ffffff);color:var(--dsw-alias-label-primary,#0f172a);
  border:1px solid var(--dsw-alias-border-l1,rgba(15,23,42,.1));
  box-shadow:0 12px 32px rgba(0,0,0,.16);
  font:12.5px/1.45 system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  font-variant-numeric:tabular-nums;-webkit-text-fill-color:currentColor}
.dsag-head{position:sticky;top:0;z-index:4;box-sizing:border-box;height:44px;padding:0 10px 0 16px;
  display:flex;align-items:center;gap:8px;background:var(--dsw-alias-bg-layer-2,#ffffff);
  border-bottom:1px solid var(--dsw-alias-border-l1,rgba(15,23,42,.08))}
.dsag-title{font-weight:650;font-size:13.5px;letter-spacing:-.01em;color:var(--dsw-alias-label-primary,#0f172a)}
.dsag-chip{display:inline-flex;align-items:center;height:19px;padding:0 6px;border-radius:5px;
  font:500 11px/1 ui-monospace,SFMono-Regular,Consolas,monospace;font-variant-numeric:tabular-nums;
  color:var(--dsw-alias-label-secondary,#475569);background:var(--dsw-alias-bg-layer-1,#f1f5f9);
  border:1px solid var(--dsw-alias-border-l1,rgba(15,23,42,.08))}
.dsag-spacer{margin-left:auto}
.dsag-head-acts{margin-left:auto;display:inline-flex;align-items:center;gap:2px}
.dsag-x{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-tertiary,#64748b);
  cursor:pointer;width:28px;height:28px;padding:0;border-radius:7px;font-size:16px;line-height:1;
  display:inline-flex;align-items:center;justify-content:center}
.dsag-x:hover{background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-3,rgba(15,23,42,.06)));
  color:var(--dsw-alias-label-primary,#0f172a)}

.dsag-body{padding:14px 16px;display:flex;flex-direction:column;gap:14px}
.dsag-sec{display:flex;flex-direction:column;gap:8px}
.dsag-sec+.dsag-sec{padding-top:14px;border-top:1px solid var(--dsw-alias-border-l1,rgba(15,23,42,.08))}
.dsag-sec-head{display:flex;align-items:center;gap:8px;min-height:18px}
.dsag-label{font-size:11px;font-weight:600;line-height:1.2;letter-spacing:.04em;
  color:var(--dsw-alias-label-tertiary,#64748b);margin:0}
.dsag-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.dsag-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
.dsag-col{display:flex;flex-direction:column;gap:10px;min-width:0}
.dsag-field{display:flex;flex-direction:column;gap:4px;min-width:0}
.dsag-field>span{font-size:11px;line-height:1.2;font-weight:500;color:var(--dsw-alias-label-secondary,#475569)}

.dsag-panel input:not([type="checkbox"]),.dsag-panel select{box-sizing:border-box;width:100%;height:28px;
  padding:0 8px;border-radius:7px;font:12px/1 inherit;font-variant-numeric:tabular-nums;outline:none;
  background:var(--dsw-alias-bg-layer-1,#f8fafc);color:var(--dsw-alias-label-primary,#0f172a);
  border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.12))}
.dsag-panel input::placeholder{color:var(--dsw-alias-label-caption,#94a3b8)}
.dsag-panel textarea{box-sizing:border-box;width:100%;height:auto;min-height:56px;padding:7px 76px 7px 10px;
  border-radius:7px;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;outline:none;resize:vertical;
  background:var(--dsw-alias-bg-layer-1,#f8fafc);color:var(--dsw-alias-label-primary,#0f172a);
  border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.12))}
.dsag-panel textarea::placeholder{font:11.5px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;
  color:var(--dsw-alias-label-caption,#94a3b8)}
.dsag-panel input:not([type="checkbox"]):focus,.dsag-panel select:focus,.dsag-panel textarea:focus{
  border-color:var(--dsw-alias-brand-primary,#4f46e5)}
.dsag-panel input:focus-visible,.dsag-panel select:focus-visible,.dsag-panel textarea:focus-visible,
.dsag-btn:focus-visible,.dsag-seg-btn:focus-visible,.dsag-tab-btn:focus-visible,.dsag-x:focus-visible{
  outline:none;border-color:var(--dsw-alias-brand-primary,#4f46e5);
  box-shadow:0 0 0 3px rgba(79,70,229,.2);
  box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary,#4f46e5) 20%,transparent)}

.dsag-seg{box-sizing:border-box;display:grid;grid-template-columns:repeat(3,1fr);gap:2px;height:28px;padding:2px;
  border-radius:7px;background:var(--dsw-alias-bg-layer-1,#f1f5f9);
  border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.12))}
.dsag-seg-btn{appearance:none;border:0;border-radius:5px;background:transparent;cursor:pointer;padding:0 4px;
  font:500 11.5px/1 inherit;color:var(--dsw-alias-label-secondary,#475569);
  display:inline-flex;align-items:center;justify-content:center}
.dsag-seg-btn:hover{color:var(--dsw-alias-label-primary,#0f172a);
  background:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.05))}
.dsag-seg-btn.on{background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4f46e5));
  color:var(--dsw-alias-label-primary-inverted,#ffffff);font-weight:600;
  box-shadow:0 1px 2px rgba(0,0,0,.14)}

.dsag-toggle-bar{display:flex;align-items:center;gap:12px;padding-top:10px;
  border-top:1px solid var(--dsw-alias-border-l1,rgba(15,23,42,.07))}
.dsag-toggle{display:inline-flex;align-items:center;gap:6px;cursor:pointer;user-select:none;
  font-size:11.5px;color:var(--dsw-alias-label-secondary,#475569)}
.dsag-switch{appearance:none;position:relative;width:26px;height:15px;margin:0;border-radius:999px;cursor:pointer;
  flex:0 0 auto;background:var(--dsw-alias-bg-layer-3,#cbd5e1);
  border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.14));transition:background .14s ease,border-color .14s ease}
.dsag-switch:after{content:"";position:absolute;top:1px;left:1px;width:11px;height:11px;border-radius:999px;
  background:var(--dsw-alias-bg-layer-2,#ffffff);box-shadow:0 1px 2px rgba(0,0,0,.18);transition:transform .14s ease}
.dsag-switch:checked{background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4f46e5));
  border-color:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4f46e5))}
.dsag-switch:checked:after{transform:translateX(11px);background:var(--dsw-alias-label-primary-inverted,#ffffff)}
.dsag-notice{font-size:11px;color:var(--dsw-alias-state-success-primary,#10b981);
  min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.dsag-btn{appearance:none;cursor:pointer;box-sizing:border-box;border-radius:7px;padding:0 10px;height:28px;
  font:500 12px/1 inherit;color:var(--dsw-alias-label-primary,#0f172a);
  background:var(--dsw-alias-bg-layer-1,#f1f5f9);
  border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.12));
  display:inline-flex;align-items:center;justify-content:center;gap:4px;flex:0 0 auto}
.dsag-btn:hover{background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-3,#e2e8f0))}
.dsag-btn.primary{color:var(--dsw-alias-label-primary-inverted,#ffffff);border-color:transparent;
  background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4f46e5))}
.dsag-btn.primary:hover{filter:brightness(1.07)}
.dsag-btn.dsag-btn-ghost{background:transparent;border-color:transparent;
  color:var(--dsw-alias-label-secondary,#475569)}
.dsag-btn.dsag-btn-ghost:hover{background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-3,rgba(15,23,42,.06)));
  color:var(--dsw-alias-label-primary,#0f172a)}
.dsag-btn.dsag-icon-btn{width:28px;padding:0;color:var(--dsw-alias-label-tertiary,#64748b)}
.dsag-btn.dsag-btn-primary-ghost{height:24px;padding:0 9px;font-size:11.5px;
  color:var(--dsw-alias-brand-primary,#4f46e5);
  border-color:rgba(79,70,229,.28);
  border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#4f46e5) 30%,transparent);
  background:rgba(79,70,229,.08);
  background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4f46e5) 9%,var(--dsw-alias-bg-layer-2,#ffffff))}
.dsag-btn.dsag-btn-primary-ghost:hover{
  background:rgba(79,70,229,.15);
  background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4f46e5) 16%,var(--dsw-alias-bg-layer-2,#ffffff))}
.dsag-btn.dsag-btn-sm{height:24px;padding:0 7px;font-size:11px;border-radius:6px}
.dsag-btn.danger{color:var(--dsw-alias-state-error-primary,#e11d48);
  border-color:var(--dsw-alias-border-l1,rgba(225,29,72,.2))}
.dsag-btn.dsag-btn-ghost.danger{border-color:transparent;color:var(--dsw-alias-state-error-primary,#e11d48)}
.dsag-btn.danger:hover{background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-3,rgba(225,29,72,.08)));
  color:var(--dsw-alias-state-error-primary,#e11d48)}
.dsag-btn:disabled{opacity:.45;cursor:not-allowed;filter:none}

.dsag-test-box{position:relative}
.dsag-test-run{position:absolute;top:6px;right:6px;z-index:1}
.dsag-meta{font-size:11px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#475569)}
.dsag-meta.ok{color:var(--dsw-alias-state-success-primary,#10b981)}
.dsag-meta.bad{color:var(--dsw-alias-state-error-primary,#e11d48)}
.dsag-hint{font-size:11px;color:var(--dsw-alias-label-tertiary,#64748b);font-variant-numeric:tabular-nums}
.dsag-empty{padding:2px 0;margin:0}
.dsag-mono{font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;font-variant-numeric:tabular-nums;
  color:var(--dsw-alias-label-secondary,#475569);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsag-out{margin:0;border-radius:7px;padding:8px 11px;
  border:1px solid var(--dsw-alias-border-l1,rgba(15,23,42,.12));
  border-left:2px solid var(--dsw-alias-brand-primary,#4f46e5);
  background:var(--dsw-alias-markdown-code-block,var(--dsw-alias-bg-layer-1,#f8fafc));
  color:var(--dsw-alias-label-primary,#0f172a);
  font:11.5px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;font-variant-numeric:tabular-nums;
  white-space:pre-wrap;overflow-wrap:anywhere;max-height:184px;overflow:auto}
.dsag-out.dsag-out-err{border-left-color:var(--dsw-alias-state-error-primary,#e11d48)}
.dsag-err{padding:7px 10px;border-radius:7px;font-size:11.5px;
  color:var(--dsw-alias-state-error-primary,#e11d48);
  border:1px solid var(--dsw-alias-border-l1,rgba(225,29,72,.2));
  border-left:2px solid var(--dsw-alias-state-error-primary,#e11d48);
  background:var(--dsw-alias-bg-layer-1,#fff1f2)}

.dsag-cwd{width:176px !important;flex:0 1 176px}
.dsag-jobs{display:flex;flex-direction:column;gap:3px;max-height:188px;overflow:auto}
.dsag-job{display:flex;align-items:center;gap:8px;min-height:30px;padding:2px 4px 2px 8px;
  border-radius:7px;border-left:2px solid transparent}
.dsag-job:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.04))}
.dsag-job.dsag-job-running{border-left-color:var(--dsw-alias-link,#0284c7);
  background:rgba(2,132,199,.04);
  background:color-mix(in srgb,var(--dsw-alias-link,#0284c7) 5%,transparent)}
.dsag-job-mode{flex:0 0 auto;font-size:11.5px;color:var(--dsw-alias-label-secondary,#475569)}
.dsag-job-id{flex:1 1 auto;min-width:0;font:11px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;
  font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary,#64748b);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsag-job-acts{margin-left:auto;display:inline-flex;align-items:center;gap:2px;flex:0 0 auto}
.dsag-badge{box-sizing:border-box;width:64px;flex:0 0 64px;height:20px;padding:0 6px;border-radius:999px;
  display:inline-flex;align-items:center;justify-content:center;
  font-size:10.5px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums;
  border:1px solid var(--dsw-alias-border-l1,rgba(15,23,42,.14));
  color:var(--dsw-alias-label-secondary,#475569);
  background:var(--dsw-alias-bg-layer-1,#f8fafc)}
.dsag-badge.done{color:var(--dsw-alias-state-success-primary,#0f7b52);
  border-color:rgba(16,185,129,.4);
  border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary,#10b981) 38%,transparent);
  background:rgba(16,185,129,.1);
  background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#10b981) 10%,transparent)}
.dsag-badge.running{color:var(--dsw-alias-link,#0284c7);
  border-color:rgba(2,132,199,.4);
  border-color:color-mix(in srgb,var(--dsw-alias-link,#0284c7) 38%,transparent);
  background:rgba(2,132,199,.08);
  background:color-mix(in srgb,var(--dsw-alias-link,#0284c7) 10%,transparent)}
.dsag-badge.error,.dsag-badge.timeout{color:var(--dsw-alias-state-error-primary,#b91c1c);
  border-color:rgba(225,29,72,.4);
  border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e11d48) 38%,transparent);
  background:rgba(225,29,72,.08);
  background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e11d48) 10%,transparent)}
.dsag-badge.warn,.dsag-badge.queued{color:var(--dsw-alias-state-warn-primary,#b45309);
  border-color:rgba(245,158,11,.4);
  border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#f59e0b) 38%,transparent);
  background:rgba(245,158,11,.08);
  background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#f59e0b) 10%,transparent)}
.dsag-foot{padding:8px 16px;border-top:1px solid var(--dsw-alias-border-l1,rgba(15,23,42,.08));
  background:var(--dsw-alias-bg-layer-1,#f8fafc);display:flex;align-items:center;gap:8px;
  font-size:11px;font-variant-numeric:tabular-nums;
  color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary,#94a3b8))}
@keyframes dsag-spin{to{transform:rotate(360deg)}}
.dsag-spin{animation:dsag-spin .75s linear infinite}
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

		function RefreshIcon(props) {
			return h("svg", {
				viewBox: "0 0 16 16",
				width: 14,
				height: 14,
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1.6,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				className: props.spinning ? "dsag-spin" : undefined,
				"aria-hidden": "true",
			},
				h("path", { d: "M13.5 8a5.5 5.5 0 1 1-1.45-3.72" }),
				h("path", { d: "M13.5 2.5v2.6h-2.6" }),
			);
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
					setNotice("已保存，下次委派生效");
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
			const healthSummary = status === null
				? "读取中…"
				: (healthy ? "agy " + status.agy.version : (status.agy && status.agy.error) || "agy 不可用")
					+ " · companion " + (status.companionExists ? "✓" : "✗");
			const healthTitle = status === null
				? healthSummary
				: healthSummary + "\n" + status.companion + "\n" + status.settingsPath;
			const efforts = status && status.efforts ? status.efforts : ["low", "medium", "high"];
			const cliIssue = status !== null && (!healthy || !status.companionExists) ? healthSummary : "";

			return h("div", { className: "dsag-panel", role: "dialog", "aria-label": "agy" },
				h("div", { className: "dsag-head" },
					h("div", { className: dotClass, title: healthTitle }),
					h("div", { className: "dsag-title" }, "agy"),
					h("span", { className: "dsag-chip", title: healthTitle },
						status !== null && status.pluginVersion !== undefined ? "v" + status.pluginVersion : "…"),
					h("div", { className: "dsag-head-acts" },
						h("button", {
							type: "button",
							className: "dsag-btn dsag-btn-ghost dsag-icon-btn",
							title: "刷新",
							"aria-label": "刷新",
							disabled: busy !== "",
							onClick: () => void load(),
						}, h(RefreshIcon, { spinning: busy === "load" })),
						h("button", {
							type: "button",
							className: "dsag-x",
							title: "关闭",
							"aria-label": "关闭",
							onClick: onClose,
						}, "×"),
					),
				),

				h("div", { className: "dsag-body" },
					error !== "" ? h("div", { className: "dsag-err" }, error) : null,
					error === "" && cliIssue !== "" ? h("div", { className: "dsag-err" }, cliIssue) : null,

					h(Section, null,
						h("div", { className: "dsag-sec-head" },
							h(Label, { text: "委派配置" }),
							draft !== null && draft.effort === ""
								? h("span", { className: "dsag-hint" }, "推理：默认")
								: null,
						),
						draft === null
							? h("div", { className: "dsag-hint dsag-empty" }, "读取配置中…")
							: h(react.Fragment, null,
								h("div", { className: "dsag-grid" },
									h("div", { className: "dsag-col" },
										h("label", { className: "dsag-field" },
											h("span", null, "模式"),
											h("select", {
												value: draft.mode,
												onChange: (e) => setDraft(Object.assign({}, draft, { mode: e.target.value })),
											}, (status && status.modes ? status.modes : ["staffer"]).map((m) =>
												h("option", { key: m, value: m }, m)))),
										h("div", { className: "dsag-field" },
											h("span", null, "推理强度"),
											h("div", { className: "dsag-seg", role: "group", "aria-label": "推理强度" },
												efforts.map((level) => {
													const active = draft.effort === level;
													return h("button", {
														key: level,
														type: "button",
														className: active ? "dsag-seg-btn on" : "dsag-seg-btn",
														"aria-pressed": active ? "true" : "false",
														title: active ? "再次点击恢复默认" : "设为 " + level,
														onClick: () => setDraft(Object.assign({}, draft, { effort: active ? "" : level })),
													}, level);
												}))),
									),
									h("div", { className: "dsag-col" },
										h("label", { className: "dsag-field" },
											h("span", null, "模型（留空按默认）"),
											h("input", {
												value: draft.model,
												placeholder: "gemini-3.8-flash-medium",
												onChange: (e) => setDraft(Object.assign({}, draft, { model: e.target.value })),
											})),
										h("label", { className: "dsag-field" },
											h("span", null, "超时（分钟）"),
											h("input", {
												type: "number",
												min: 1,
												max: 120,
												value: draft.timeoutMin,
												onChange: (e) => setDraft(Object.assign({}, draft, { timeoutMin: e.target.value })),
											})),
									),
								),
								h("div", { className: "dsag-toggle-bar" },
									h("label", { className: "dsag-toggle" },
										h("input", {
											type: "checkbox",
											className: "dsag-switch",
											checked: draft.subagentEnabled,
											onChange: (e) => setDraft(Object.assign({}, draft, { subagentEnabled: e.target.checked })),
										}),
										h("span", null, "agy 子智能体")),
									h("label", { className: "dsag-toggle" },
										h("input", {
											type: "checkbox",
											className: "dsag-switch",
											checked: draft.skillsEnabled,
											onChange: (e) => setDraft(Object.assign({}, draft, { skillsEnabled: e.target.checked })),
										}),
										h("span", null, "/agy-* 技能")),
									h("div", { className: "dsag-spacer" }),
									notice !== "" ? h("span", { className: "dsag-notice", title: notice }, notice) : null,
									h("button", {
										type: "button",
										className: "dsag-btn primary",
										disabled: busy !== "",
										onClick: () => void save(),
									}, busy === "save" ? "保存中…" : "保存"),
								),
							),
					),

					h(Section, null,
						h("div", { className: "dsag-sec-head" },
							h(Label, { text: "连通性测试" }),
							h("div", { className: "dsag-spacer" }),
							testOut !== null
								? h("span", { className: testOut.ok ? "dsag-meta ok" : "dsag-meta bad" },
									(testOut.ok ? "✓ " : "✗ ") + (testOut.ms || 0) + " ms"
										+ (testOut.exitCode ? " · exit " + testOut.exitCode : ""))
								: null,
						),
						h("div", { className: "dsag-test-box" },
							h("textarea", {
								value: prompt,
								onChange: (e) => setPrompt(e.target.value),
								placeholder: "reply with: agy works  # ask, 0 tools",
							}),
							h("button", {
								type: "button",
								className: "dsag-btn dsag-btn-primary-ghost dsag-test-run",
								disabled: busy !== "",
								onClick: () => void runTest(),
							}, busy === "test" ? "运行中…" : "跑一次"),
						),
						testOut !== null
							? h("div", { className: testOut.ok ? "dsag-out" : "dsag-out dsag-out-err" },
								testOut.output || "(无输出)")
							: null,
					),

					h(Section, null,
						h("div", { className: "dsag-sec-head" },
							h(Label, { text: "作业" }),
							jobs.length > 0 ? h("span", { className: "dsag-hint" }, String(jobs.length)) : null,
							h("div", { className: "dsag-spacer" }),
							h("input", {
								className: "dsag-cwd",
								value: cwd,
								placeholder: "仓库目录（默认宿主 cwd）",
								onChange: (e) => setCwd(e.target.value),
							}),
							h("button", {
								type: "button",
								className: "dsag-btn dsag-btn-ghost dsag-btn-sm",
								disabled: busy !== "",
								onClick: () => void refreshJobs(),
							}, "刷新"),
						),
						jobs.length === 0
							? h("div", { className: "dsag-hint dsag-empty" }, "暂无作业记录")
							: h("div", { className: "dsag-jobs" }, jobs.map((job) => {
								const running = job.status === "running";
								return h("div", {
									className: running ? "dsag-job dsag-job-running" : "dsag-job",
									key: job.id,
								},
									h("span", { className: "dsag-badge " + (job.status || "") }, job.status || "?"),
									h("span", { className: "dsag-job-mode" }, job.mode || "—"),
									h("span", {
										className: "dsag-job-id",
										title: job.id + (job.model ? " · " + job.model : ""),
									}, job.id),
									h("div", { className: "dsag-job-acts" },
										h("button", {
											type: "button",
											className: "dsag-btn dsag-btn-ghost dsag-btn-sm",
											disabled: busy !== "",
											onClick: () => void showResult(job.id),
										}, "结果"),
										running
											? h("button", {
												type: "button",
												className: "dsag-btn dsag-btn-ghost dsag-btn-sm danger",
												disabled: busy !== "",
												onClick: () => void cancelJob(job.id),
											}, "取消")
											: null,
									),
								);
							})),
						jobOut !== null ? h("div", { className: "dsag-out" }, jobOut.id + "\n\n" + jobOut.text) : null,
					),
				),

				h("div", { className: "dsag-foot", title: healthTitle },
					h("span", { className: "dsag-mono" }, healthSummary),
					h("div", { className: "dsag-spacer" }),
					h("span", null, "保存后下次委派生效"),
				),
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

			// No strip (welcome screen) means no tab row to join: fall back to a small
			// pill instead of letting a tab-styled button flow into <body>.
			const target = host !== null ? host : document.body;
			const entry = host !== null ? tab : h("div", { className: "dsag-fallback" }, tab);
			const panelStyle = anchor === null
				? { position: "fixed", left: 24, top: 64 }
				: { position: "fixed", left: anchor.left + "px", top: anchor.top + "px" };

			return h(react.Fragment, null,
				portal(entry, target),
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
				if (GENERATION > 1 && typeof document !== "undefined") {
					// The previous generation's portal hosts are detached from state; removing
					// them unmounts its entry instead of leaving two agy entries on the page.
					for (const stale of document.querySelectorAll(".dsag-tab-slot, .dsag-fallback, #dsag-agy-staff-root")) {
						stale.remove();
					}
				}
				const id = GENERATION === 1 ? "dsh-agy-staff-panel" : "dsh-agy-staff-panel-" + GENERATION;
				try {
					ctx.slots.register({ name: "shell.overlay", id: id, order: 60 }, AgyOverlay);
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
