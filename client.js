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

		/** Snapshot of `agy models`; the host op replaces it with the live catalog. */
		const FALLBACK_MODELS = [
			{ id: "gemini-4-argon-high", label: "Gemini 4 Argon (High)" },
			{ id: "gemini-4-argon-medium", label: "Gemini 4 Argon (Medium)" },
			{ id: "gemini-4-argon-low", label: "Gemini 4 Argon (Low)" },
			{ id: "gemini-3.8-flash-high", label: "Gemini 3.8 Flash (High)" },
			{ id: "gemini-3.8-flash-medium", label: "Gemini 3.8 Flash (Medium)" },
			{ id: "gemini-3.8-flash-low", label: "Gemini 3.8 Flash (Low)" },
			{ id: "claude-opus-5-5-high", label: "Claude Opus 5.5 (High)" },
			{ id: "claude-sonnet-5-5-high", label: "Claude Sonnet 5.5 (High)" },
			{ id: "gpt-oss-120b-medium", label: "GPT-OSS 120B (Medium)" },
		];

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
  display:inline-flex;align-items:center;gap:7px;padding:0 2px 9px;margin:0 0 0 0px;
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

.dsag-host{position:fixed;inset:0;z-index:2147483647;pointer-events:none}
.dsag-panel{pointer-events:auto}
.dsag-panel{position:fixed;z-index:2147483647;box-sizing:border-box;width:440px;max-width:calc(100vw - 24px);
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
.dsag-sec{display:flex;flex-direction:column;gap:8px;margin:0;padding:0}
.dsag-sec+.dsag-sec{padding-top:14px;border-top:1px solid var(--dsw-alias-border-l1,rgba(15,23,42,.08))}
.dsag-sec-head{display:flex;align-items:center;gap:8px;min-height:16px;margin:0;padding:0}
.dsag-panel .dsag-label{font-size:11px;font-weight:600;line-height:16px;letter-spacing:.04em;text-transform:uppercase;
  color:var(--dsw-alias-label-tertiary,#64748b);margin:0;padding:0;text-indent:0;text-align:left;
  white-space:nowrap;flex:0 0 auto}
.dsag-panel .dsag-sec-meta{margin-left:auto;font-size:11px;line-height:16px;
  color:var(--dsw-alias-label-tertiary,#64748b);white-space:nowrap;flex:0 0 auto}
.dsag-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.dsag-panel .dsag-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:12px;row-gap:10px;
  align-items:start}
.dsag-panel .dsag-field{display:flex;flex-direction:column;gap:4px;min-width:0;margin:0;padding:0;border:0}.dsag-field-model{margin-top:10px}
.dsag-field-inline{flex-direction:row;align-items:center;gap:6px;flex:0 0 auto}
.dsag-field-inline>span:first-child{font-size:11px;color:var(--dsw-alias-label-secondary,#475569);white-space:nowrap}
.dsag-field-inline input{width:52px;text-align:center}
.dsag-panel .dsag-field>span:first-child{display:block;height:16px;line-height:16px;margin:0;padding:0;
  font-size:11px;font-weight:500;color:var(--dsw-alias-label-secondary,#475569);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.dsag-panel .dsag-select-wrap{position:relative;display:block;width:100%;height:28px;min-width:0}
.dsag-panel .dsag-select-wrap:after{content:"";position:absolute;right:10px;top:50%;width:5px;height:5px;
  border-right:1.5px solid var(--dsw-alias-label-tertiary,#64748b);
  border-bottom:1.5px solid var(--dsw-alias-label-tertiary,#64748b);
  transform:translateY(-65%) rotate(45deg);pointer-events:none}
.dsag-panel input:not([type="checkbox"]),.dsag-panel select{appearance:none;-webkit-appearance:none;
  box-sizing:border-box;display:block;width:100%;min-width:0;height:28px;min-height:28px;max-height:28px;
  margin:0;padding:0 8px;border-radius:7px;
  font:400 12px/26px system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  font-variant-numeric:tabular-nums;outline:none;
  background:var(--dsw-alias-bg-layer-1,#f8fafc);color:var(--dsw-alias-label-primary,#0f172a);
  border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.12))}
.dsag-panel .dsag-select-wrap select{padding-right:26px;cursor:pointer}
.dsag-panel input::placeholder{color:var(--dsw-alias-label-caption,#94a3b8)}
.dsag-panel textarea{appearance:none;-webkit-appearance:none;display:block;box-sizing:border-box;
  width:100%;height:auto;min-height:60px;margin:0;padding:6px 68px 6px 10px;
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

.dsag-panel .dsag-seg{box-sizing:border-box;display:flex;align-items:stretch;width:100%;min-width:0;
  height:28px;min-height:28px;max-height:28px;padding:0;margin:0;overflow:hidden;
  border-radius:7px;background:var(--dsw-alias-bg-layer-1,#f8fafc);
  border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.12))}
.dsag-panel .dsag-seg-btn{appearance:none;-webkit-appearance:none;box-sizing:border-box;
  flex:1 1 0%;width:0;min-width:0;height:100%;margin:0;padding:0 4px;border:0;border-radius:0;
  background:transparent;cursor:pointer;
  font:500 11.5px/1 system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  color:var(--dsw-alias-label-secondary,#475569);
  display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}
.dsag-panel .dsag-seg-btn+.dsag-seg-btn{border-left:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.12))}
.dsag-panel .dsag-seg-btn:hover{color:var(--dsw-alias-label-primary,#0f172a);
  background:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.05))}
.dsag-panel .dsag-seg-btn.on{background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4f46e5));
  color:var(--dsw-alias-label-primary-inverted,#ffffff);font-weight:600}

.dsag-panel .dsag-toggle-bar{display:flex;align-items:center;gap:14px;min-height:28px;padding-top:10px;margin:0;
  border-top:1px solid var(--dsw-alias-border-l1,rgba(15,23,42,.07))}
.dsag-panel .dsag-toggle{display:inline-flex;align-items:center;gap:6px;height:28px;margin:0;padding:0;
  cursor:pointer;user-select:none;font-size:12px;line-height:16px;
  color:var(--dsw-alias-label-secondary,#475569);white-space:nowrap;flex:0 0 auto}
.dsag-panel .dsag-toggle>span{display:inline-block;line-height:16px;margin:0;padding:0}
.dsag-panel input[type="checkbox"].dsag-switch{appearance:none;-webkit-appearance:none;box-sizing:border-box;
  position:relative;display:inline-block;vertical-align:middle;width:28px;height:16px;min-height:16px;max-height:16px;
  margin:0;padding:0;border-radius:999px;cursor:pointer;flex:0 0 28px;
  background:var(--dsw-alias-bg-layer-3,#cbd5e1);
  border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.14));transition:background .14s ease,border-color .14s ease}
.dsag-panel input[type="checkbox"].dsag-switch:after{content:"";position:absolute;top:1px;left:1px;width:12px;height:12px;
  border-radius:999px;background:var(--dsw-alias-bg-layer-2,#ffffff);box-shadow:0 1px 2px rgba(0,0,0,.18);
  transition:transform .14s ease}
.dsag-panel input[type="checkbox"].dsag-switch:checked{
  background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4f46e5));
  border-color:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4f46e5))}
.dsag-panel input[type="checkbox"].dsag-switch:checked:after{transform:translateX(12px);
  background:var(--dsw-alias-label-primary-inverted,#ffffff)}
.dsag-notice{font-size:11px;line-height:16px;color:var(--dsw-alias-state-success-primary,#10b981);
  min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.dsag-btn,.dsag-panel button.dsag-btn{appearance:none;-webkit-appearance:none;cursor:pointer;box-sizing:border-box;
  position:relative;border-radius:7px;margin:0;padding:0 10px;height:28px;min-height:0;
  font:500 12px/1 system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  color:var(--dsw-alias-label-primary,#0f172a);
  background:var(--dsw-alias-bg-layer-1,#f1f5f9);
  border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.12));
  display:inline-flex;align-items:center;justify-content:center;gap:4px;flex:0 0 auto;white-space:nowrap}
.dsag-btn:hover,.dsag-panel button.dsag-btn:hover{
  background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-3,#e2e8f0))}
.dsag-btn.primary,.dsag-panel button.dsag-btn.primary{color:var(--dsw-alias-label-primary-inverted,#ffffff);
  border-color:transparent;background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4f46e5))}
.dsag-btn.primary:hover,.dsag-panel button.dsag-btn.primary:hover{filter:brightness(1.07)}
.dsag-btn.dsag-btn-ghost,.dsag-panel button.dsag-btn.dsag-btn-ghost{background:transparent;border-color:transparent;
  color:var(--dsw-alias-label-secondary,#475569)}
.dsag-btn.dsag-btn-ghost:hover,.dsag-panel button.dsag-btn.dsag-btn-ghost:hover{
  background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-3,rgba(15,23,42,.06)));
  color:var(--dsw-alias-label-primary,#0f172a)}
.dsag-btn.dsag-icon-btn,.dsag-panel button.dsag-btn.dsag-icon-btn{width:28px;padding:0;
  color:var(--dsw-alias-label-tertiary,#64748b)}
.dsag-btn.dsag-btn-primary-ghost,.dsag-panel button.dsag-btn.dsag-btn-primary-ghost{height:24px;padding:0 9px;
  font-size:11.5px;color:var(--dsw-alias-brand-primary,#4f46e5);
  border-color:rgba(79,70,229,.28);
  border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#4f46e5) 30%,transparent);
  background:rgba(79,70,229,.08);
  background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4f46e5) 9%,var(--dsw-alias-bg-layer-2,#ffffff))}
.dsag-btn.dsag-btn-primary-ghost:hover,.dsag-panel button.dsag-btn.dsag-btn-primary-ghost:hover{
  background:rgba(79,70,229,.15);
  background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4f46e5) 16%,var(--dsw-alias-bg-layer-2,#ffffff))}
.dsag-btn.dsag-btn-sm,.dsag-panel button.dsag-btn.dsag-btn-sm{height:24px;padding:0 7px;font-size:11px;border-radius:6px}
.dsag-btn.dsag-foot-btn,.dsag-panel button.dsag-btn.dsag-foot-btn{height:24px;padding:0 6px;font-size:12px;
  line-height:22px;border-radius:6px;color:var(--dsw-alias-label-secondary,#475569)}
.dsag-btn.dsag-foot-btn.dsag-foot-upgrade,.dsag-panel button.dsag-btn.dsag-foot-btn.dsag-foot-upgrade{
  color:var(--dsw-alias-brand-primary,#4f46e5);font-weight:600}
.dsag-btn.danger,.dsag-panel button.dsag-btn.danger{color:var(--dsw-alias-state-error-primary,#e11d48);
  border-color:var(--dsw-alias-border-l1,rgba(225,29,72,.2))}
.dsag-btn.dsag-btn-ghost.danger,.dsag-panel button.dsag-btn.dsag-btn-ghost.danger{border-color:transparent;
  color:var(--dsw-alias-state-error-primary,#e11d48)}
.dsag-btn.danger:hover,.dsag-panel button.dsag-btn.danger:hover{
  background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-3,rgba(225,29,72,.08)));
  color:var(--dsw-alias-state-error-primary,#e11d48)}
.dsag-btn:disabled,.dsag-panel button.dsag-btn:disabled{opacity:.45;cursor:not-allowed;filter:none}

.dsag-panel .dsag-test-box{position:relative;display:block;width:100%;margin:0;padding:0}
.dsag-panel .dsag-test-box>button.dsag-btn.dsag-test-run{position:absolute;top:6px;right:6px;bottom:auto;left:auto;
  margin:0;z-index:2}
.dsag-meta{margin-left:auto;font-size:11px;line-height:16px;font-variant-numeric:tabular-nums;
  color:var(--dsw-alias-label-secondary,#475569);white-space:nowrap;flex:0 0 auto}
.dsag-meta.ok{color:var(--dsw-alias-state-success-primary,#10b981)}
.dsag-meta.bad{color:var(--dsw-alias-state-error-primary,#e11d48)}
.dsag-hint{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#64748b);
  font-variant-numeric:tabular-nums}
.dsag-panel .dsag-empty{display:block;width:100%;box-sizing:border-box;margin:0;padding:0;
  text-indent:0;text-align:left}
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

.dsag-panel .dsag-jobs-head{display:flex;align-items:center;gap:8px;height:28px;min-height:28px;margin:0;padding:0}
.dsag-panel .dsag-jobs-head .dsag-label{line-height:28px}
.dsag-panel input.dsag-cwd{flex:1 1 0%;width:auto;min-width:0;height:28px;margin:0}
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

.dsag-update-tray{padding:8px 16px;border-top:1px solid var(--dsw-alias-border-l1,rgba(15,23,42,.08));
  background:var(--dsw-alias-bg-layer-1,#f8fafc);display:flex;flex-direction:column;gap:6px}
.dsag-update-bar{display:flex;align-items:center;gap:6px;min-height:24px}
.dsag-update-meta{font-size:11.5px;line-height:16px;font-variant-numeric:tabular-nums;
  color:var(--dsw-alias-label-tertiary,#64748b);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsag-update-meta.ok{color:var(--dsw-alias-state-success-primary,#10b981)}
.dsag-update-meta.brand{color:var(--dsw-alias-brand-primary,#4f46e5);font-weight:500}
.dsag-update-meta.err{color:var(--dsw-alias-state-error-primary,#e11d48)}
.dsag-out.dsag-foot-out{max-height:160px}

.dsag-menu-wrap{position:relative;display:inline-flex}
.dsag-icon-btn.on{color:var(--dsw-alias-label-primary,#0f172a);background:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.06))}
.dsag-menu{position:absolute;right:0;top:calc(100% + 4px);min-width:136px;padding:4px;z-index:3;
  display:flex;flex-direction:column;border-radius:8px;
  background:var(--dsw-alias-bg-layer-2,#fff);border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.12));
  box-shadow:0 8px 20px rgba(15,23,42,.14)}
.dsag-menu-item{appearance:none;border:0;background:transparent;text-align:left;cursor:pointer;
  padding:6px 8px;border-radius:6px;font:500 12px/16px inherit;color:var(--dsw-alias-label-primary,inherit)}
.dsag-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.06))}
.dsag-menu-item:disabled{opacity:.5;cursor:default}

.dsag-foot{padding:6px 16px;border-top:1px solid var(--dsw-alias-border-l1,rgba(15,23,42,.08));
  background:var(--dsw-alias-bg-layer-1,#f8fafc);display:flex;align-items:baseline;justify-content:space-between;
  gap:8px;font-size:11px;font-variant-numeric:tabular-nums;
  color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary,#94a3b8));white-space:nowrap}
.dsag-foot-left{display:flex;align-items:baseline;gap:4px;flex:1 1 auto;min-width:0;overflow:hidden;
  text-overflow:ellipsis}
.dsag-foot-ver{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsag-foot-hint{flex:0 0 auto;margin-left:auto;white-space:nowrap;
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
			const [models, setModels] = useState(FALLBACK_MODELS);
			const [menuOpen, setMenuOpen] = useState(false);
			const [newerAvailable, setNewerAvailable] = useState(false);
			const [updateInfo, setUpdateInfo] = useState(null);
			const [updateOpen, setUpdateOpen] = useState(true);
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
				// The CLI owns the catalog; the embedded list is only a placeholder.
				api("models")
					.then((res) => {
						if (res.ok && Array.isArray(res.models) && res.models.length > 0) setModels(res.models);
					})
					.catch(() => {});
			}, []);

			useEffect(() => {
				// Report the open panel's own layering: a covered region shows up as
				// `body:false` in `status.panel`, which is otherwise invisible from a shell.
				const timer = setTimeout(() => {
					try {
						const node = document.querySelector(".dsag-panel");
						if (node === null) return;
						const rect = node.getBoundingClientRect();
						const hits = [];
						for (const probe of [[0.5, 0.06, "head"], [0.5, 0.5, "body"], [0.5, 0.94, "foot"]]) {
							const hit = document.elementFromPoint(
								rect.left + rect.width * probe[0],
								rect.top + rect.height * probe[1],
							);
							const mine = hit !== null && hit !== undefined && (hit === node || node.contains(hit));
							hits.push(probe[2] + ":" + mine);
						}
						void api("panel-alive", {
							version: "open:" + Math.round(rect.width) + "x" + Math.round(rect.height) + " " + hits.join(" "),
						}).catch(() => {});
					} catch (error) {
						void api("panel-alive", { version: "open-probe-error:" + String(error) }).catch(() => {});
					}
				}, 500);
				return () => clearTimeout(timer);
			}, []);

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

			const checkUpdate = useCallback(async () => {
				setBusy("update-check");
				try {
					const res = await api("update-check");
					if (!res.ok && typeof res.error === "string" && res.error.indexOf("unknown op") !== -1) {
						setUpdateInfo({ meta: "重启应用后可用", output: "", tone: "" });
						setUpdateOpen(false);
					} else if (!res.ok) {
						setUpdateInfo({ meta: res.error || "检查更新失败", output: res.output || "", tone: "err" });
						setUpdateOpen(Boolean(res.output));
					} else if (res.newerAvailable === true) {
						setNewerAvailable(true);
						setUpdateInfo({
							meta: "发现新版本 " + (res.latest || "?") + "（当前 " + (res.installed || "?") + "）",
							output: res.output || "",
							tone: "brand",
						});
						setUpdateOpen(Boolean(res.output));
					} else {
						setNewerAvailable(false);
						setUpdateInfo({
							meta: ("已是最新 " + (res.installed || res.latest || "")).trim(),
							output: res.output || "",
							tone: "ok",
						});
						setUpdateOpen(Boolean(res.output));
					}
				} catch (e) {
					setUpdateInfo({ meta: String((e && e.message) || e), output: "", tone: "err" });
					setUpdateOpen(false);
				} finally {
					setBusy("");
				}
			}, []);

			const applyUpdate = useCallback(async () => {
				setBusy("update-apply");
				try {
					const res = await api("update-apply");
					if (!res.ok && typeof res.error === "string" && res.error.indexOf("unknown op") !== -1) {
						setUpdateInfo({ meta: "重启应用后可用", output: "", tone: "" });
						setUpdateOpen(false);
					} else if (res.ok) {
						setNewerAvailable(false);
						setUpdateInfo({ meta: "升级完成，重启 agy 后生效", output: res.output || "", tone: "ok" });
						setUpdateOpen(Boolean(res.output));
						const info = await api("status");
						if (info.ok) setStatus(info);
					} else {
						setUpdateInfo({ meta: res.error || "升级失败", output: res.output || "", tone: "err" });
						setUpdateOpen(Boolean(res.output));
					}
				} catch (e) {
					setUpdateInfo({ meta: String((e && e.message) || e), output: "", tone: "err" });
					setUpdateOpen(false);
				} finally {
					setBusy("");
				}
			}, []);

			const healthy = status !== null && status.agy !== undefined && status.agy.ok;
			const statusOk = status !== null && status.ok === true;
			const dotClass = status === null ? "dsag-dot" : healthy ? "dsag-dot ok" : "dsag-dot bad";
			const healthSummary = status === null
				? "读取中…"
				: (healthy ? "agy " + status.agy.version : (status.agy && status.agy.error) || "agy 不可用");
			const healthTitle = status === null
				? healthSummary
				: healthSummary + "\n" + status.companion + "\n" + status.settingsPath;
			const efforts = status && status.efforts ? status.efforts : ["low", "medium", "high"];
			const cliIssue = status !== null && (!healthy || !status.companionExists) ? healthSummary : "";

			return h("div", { className: "dsag-panel", role: "dialog", "aria-label": "agy" },
				h("div", { className: "dsag-head" },
					h("div", { className: dotClass, title: healthTitle }),
					h("div", { className: "dsag-title" }, "agy"),
					h("span", { className: "dsag-chip", title: "插件版本 " + (status && status.pluginVersion ? status.pluginVersion : "?") },
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
						statusOk
							? h("span", { className: "dsag-menu-wrap" },
								h("button", {
									type: "button",
									className: menuOpen ? "dsag-btn dsag-btn-ghost dsag-icon-btn on" : "dsag-btn dsag-btn-ghost dsag-icon-btn",
									title: "更多",
									"aria-label": "更多",
									"aria-expanded": menuOpen ? "true" : "false",
									onClick: () => setMenuOpen((prev) => !prev),
								}, "⋯"),
								menuOpen
									? h("div", { className: "dsag-menu", role: "menu" },
										h("button", {
											type: "button",
											className: "dsag-menu-item",
											role: "menuitem",
											disabled: busy !== "",
											onClick: () => {
												setMenuOpen(false);
												void checkUpdate();
											},
										}, "检查更新"),
										newerAvailable === true
											? h("button", {
												type: "button",
												className: "dsag-menu-item",
												role: "menuitem",
												disabled: busy !== "",
												onClick: () => {
													setMenuOpen(false);
													void applyUpdate();
												},
											}, busy === "update-apply" ? "升级中…" : "升级 agy")
											: null,
									)
									: null,
							)
							: null,
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
							draft !== null
								? h("span", { className: "dsag-sec-meta" }, "推理：" + (draft.effort === "" ? "默认" : draft.effort))
								: null,
						),
						draft === null
							? h("div", { className: "dsag-hint dsag-empty" }, "读取配置中…")
							: h(react.Fragment, null,
								h("div", { className: "dsag-grid" },
									h("label", { className: "dsag-field" },
										h("span", null, "模式"),
										h("span", { className: "dsag-select-wrap" },
											h("select", {
												value: draft.mode,
												onChange: (e) => setDraft(Object.assign({}, draft, { mode: e.target.value })),
											}, (status && status.modes ? status.modes : ["staffer"]).map((m) =>
												h("option", { key: m, value: m }, m))))),
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
								h("label", { className: "dsag-field dsag-field-model" },
									h("span", null, "模型"),
									h("input", {
										value: draft.model,
										placeholder: "留空按模式默认（可从下拉里挑，如 gemini-4-argon-high）",
										list: "dsag-model-list",
										onChange: (e) => setDraft(Object.assign({}, draft, { model: e.target.value })),
									})),
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
									h("label", { className: "dsag-field dsag-field-inline" },
										h("span", null, "超时"),
										h("input", {
											type: "number",
											min: 1,
											max: 120,
											"aria-label": "超时（分钟）",
											value: draft.timeoutMin,
											onChange: (e) => setDraft(Object.assign({}, draft, { timeoutMin: e.target.value })),
										}),
										h("span", { className: "dsag-hint" }, "分")),
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
						h("div", { className: "dsag-jobs-head" },
							h(Label, { text: jobs.length > 0 ? "作业 · " + jobs.length : "作业" }),
							h("input", {
								className: "dsag-cwd",
								value: cwd,
								placeholder: "仓库目录（默认宿主 cwd）",
								onChange: (e) => setCwd(e.target.value),
							}),
							h("button", {
								type: "button",
								className: "dsag-btn dsag-btn-ghost",
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

				updateInfo !== null
					? h("div", { className: "dsag-update-tray" },
						h("div", { className: "dsag-update-bar" },
							h("span", {
								className: updateInfo.tone !== ""
									? "dsag-update-meta " + updateInfo.tone
									: "dsag-update-meta",
								title: updateInfo.meta,
							}, updateInfo.meta),
							h("div", { className: "dsag-spacer" }),
							updateInfo.output !== ""
								? h("button", {
									type: "button",
									className: "dsag-btn dsag-btn-ghost dsag-foot-btn",
									"aria-expanded": updateOpen ? "true" : "false",
									onClick: () => setUpdateOpen((prev) => !prev),
								}, updateOpen ? "收起" : "详情")
								: null,
							h("button", {
								type: "button",
								className: "dsag-btn dsag-btn-ghost dsag-foot-btn",
								title: "关闭",
								"aria-label": "关闭更新提示",
								onClick: () => setUpdateInfo(null),
							}, "×"),
						),
						updateOpen && updateInfo.output !== ""
							? h("div", {
								className: updateInfo.tone === "err"
									? "dsag-out dsag-foot-out dsag-out-err"
									: "dsag-out dsag-foot-out",
							}, updateInfo.output)
							: null,
					)
					: null,

				h("datalist", { id: "dsag-model-list" },
					models.map((model) => h("option", { key: model.id, value: model.id }, model.label))),

				h("div", { className: "dsag-foot" },
					h("div", { className: "dsag-foot-left" },
						h("span", { className: "dsag-mono dsag-foot-ver", title: healthTitle }, "agy CLI " + healthSummary.replace(/^agy /, "")),
					),
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

		/**
		 * The panel's own layer. Another chat element (the code-block toolbar) can win
		 * the paint order when the panel is a plain body child: it may sit in a later
		 * sibling or carry a bigger z-index. Owning a host that is re-appended to the
		 * end of <body> and stacking at the maximum index removes both races.
		 */
		/**
		 * The panel's own layer. Created once and never moved during render: mutating
		 * the DOM from a render body (plus a repeating re-append) is what froze the
		 * page. Effects may append it, render bodies may only read it.
		 */
		function ensurePanelHost() {
			if (typeof document === "undefined") return null;
			let host = document.getElementById("dsag-host");
			if (host === null) {
				host = document.createElement("div");
				host.id = "dsag-host";
				host.className = "dsag-host";
				document.body.appendChild(host);
			}
			return host;
		}

		/** Render never crashes the host UI: a throwing panel renders nothing. */
		class PanelBoundary extends react.Component {
			constructor(props) {
				super(props);
				this.state = { failed: false };
			}

			static getDerivedStateFromError() {
				return { failed: true };
			}

			componentDidCatch(error) {
				console.warn("[dsh-agy-staff] panel render failed:", error);
				void api("panel-alive", { version: "render-error:" + String(error) }).catch(() => {});
			}

			render() {
				if (this.state.failed) return null;
				return this.props.children;
			}
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

			// The layer handle is state, filled by an effect after commit. Rendering must
			// never touch the DOM: doing that inside the render body is what hung the page.
			const [layer, setLayer] = useState(null);
			useEffect(() => {
				if (!open) return;
				const hostLayer = ensurePanelHost();
				if (hostLayer !== null) {
					// Post-commit move: last sibling wins a stacking tie with a hover toolbar.
					document.body.appendChild(hostLayer);
					setLayer(hostLayer);
				}
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
				open && layer !== null
					? portal(h("div", { style: panelStyle }, h(PanelBoundary, null, h(AgyPanel, { onClose: close }))), layer)
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
