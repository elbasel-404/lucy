import React, { useState } from "react";

export type JSONProps = {
  data: unknown;
  className?: string;
};

// Utility to detect type
function getType(val: unknown) {
  if (Array.isArray(val)) return "array";
  if (val === null) return "null";
  return typeof val;
}

// Syntax highlight a value
function highlightValue(val: unknown) {
  const type = getType(val);
  switch (type) {
    case "string":
      return (
        <span style={{ color: "#ce9178" }}>&quot;{String(val)}&quot;</span>
      );
    case "number":
      return <span style={{ color: "#b5cea8" }}>{val as number}</span>;
    case "boolean":
      return <span style={{ color: "#569cd6" }}>{String(val)}</span>;
    case "null":
      return <span style={{ color: "#569cd6" }}>null</span>;
    default:
      return <span>{String(val)}</span>;
  }
}

// Collapsible node for objects/arrays
function Collapsible({
  label,
  children,
  collapsedDefault = false,
}: {
  label: string;
  children: React.ReactNode;
  collapsedDefault?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(collapsedDefault);
  return (
    <div style={{ marginLeft: "1em" }}>
      <span
        style={{ cursor: "pointer", color: "#d7ba7d", fontWeight: 500 }}
        onClick={() => setCollapsed((c) => !c)}
      >
        {collapsed ? "▶" : "▼"} {label}
      </span>
      {!collapsed && <div>{children}</div>}
    </div>
  );
}

function renderJSON(data: unknown, depth = 0) {
  const type = getType(data);
  if (type === "object" && data !== null) {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0)
      return <span style={{ color: "#d4d4d4" }}>{"{}"}</span>;
    return (
      <Collapsible label="{...}" collapsedDefault={depth > 0}>
        <div style={{ marginLeft: "1em" }}>
          {entries.map(([key, value], i) => (
            <div key={key}>
              <span style={{ color: "#9cdcfe" }}>&quot;{key}&quot;</span>
              <span style={{ color: "#d4d4d4" }}>: </span>
              {renderJSON(value, depth + 1)}
              {i < entries.length - 1 ? (
                <span style={{ color: "#d4d4d4" }}>,</span>
              ) : null}
            </div>
          ))}
        </div>
      </Collapsible>
    );
  }
  if (type === "array") {
    const arr = data as unknown[];
    if (arr.length === 0)
      return <span style={{ color: "#d4d4d4" }}>{"[]"}</span>;
    return (
      <Collapsible label="[...]" collapsedDefault={depth > 0}>
        <div style={{ marginLeft: "1em" }}>
          {arr.map((item, i) => (
            <div key={i}>
              {renderJSON(item, depth + 1)}
              {i < arr.length - 1 ? (
                <span style={{ color: "#d4d4d4" }}>,</span>
              ) : null}
            </div>
          ))}
        </div>
      </Collapsible>
    );
  }
  return highlightValue(data);
}

export function JSONView({ data, className }: JSONProps) {
  const isObject = getType(data) === "object" && data !== null;
  return (
    <pre
      className={`motion-preset-fade motion-opacity-in-0 motion-translate-y-in-4 bg-black text-gray-200 p-4 rounded-lg overflow-x-auto text-base font-mono m-0 border border-gray-800 shadow ${
        className ?? ""
      }`}
      style={{
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <code>
        {isObject ? <span style={{ color: "#d4d4d4" }}>{"{"}</span> : null}
        {renderJSON(data)}
        {isObject ? <span style={{ color: "#d4d4d4" }}>{"}"}</span> : null}
      </code>
    </pre>
  );
}

export default JSONView;
