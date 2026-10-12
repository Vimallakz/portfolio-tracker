/** Lives inside each shadow root, so Tickertape's CSS cannot reach it and it cannot leak out. */
export const CHIP_CSS = `
  :host { all: initial; display: inline-flex; vertical-align: middle; margin-left: 8px; }
  :host([data-stacked]) { margin: 10px 0 0; }
  button {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 999px; border: 1px solid transparent;
    font: 600 11px/16px system-ui, -apple-system, sans-serif; white-space: nowrap; cursor: pointer;
  }
  button:focus-visible { outline: 2px solid #2563eb; outline-offset: 1px; }
  .positive { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
  .muted { color: #475569; background: #f1f5f9; border-color: #e2e8f0; }
  .negative { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
  .stop { width: 6px; height: 6px; border-radius: 50%; background: #dc2626; }
`;

export const CARD_CSS = `
  :host { all: initial; position: fixed; z-index: 2147483647; }
  .card {
    box-sizing: border-box; width: 300px; max-height: min(480px, calc(100vh - 16px)); overflow: auto;
    padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; color: #0f172a;
    box-shadow: 0 10px 30px rgb(15 23 42 / 0.18);
    font: 12px/1.45 system-ui, -apple-system, sans-serif;
  }
  .head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .name { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ticker { color: #64748b; font-weight: 500; }
  .badges { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .badge { padding: 1px 7px; border-radius: 999px; background: #f1f5f9; color: #334155; font-weight: 500; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 10px 0 0; }
  dt { color: #64748b; }
  dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
  .note { margin-left: 6px; font-weight: 600; }
  .positive { color: #047857; }
  .negative { color: #b91c1c; }
  .muted { color: #64748b; }
  h3 { margin: 12px 0 4px; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
  ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 3px; }
  li { display: flex; gap: 6px; align-items: baseline; }
  li::before { content: ""; flex: none; width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; transform: translateY(-1px); }
  li.positive::before { background: #10b981; }
  li.negative::before { background: #ef4444; }
  .empty { margin: 8px 0 0; color: #475569; }
  .foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 12px; padding-top: 8px; border-top: 1px solid #f1f5f9; color: #64748b; font-size: 11px; }
  a { color: #2563eb; font-weight: 600; text-decoration: none; white-space: nowrap; }
  a:hover { text-decoration: underline; }
`;
