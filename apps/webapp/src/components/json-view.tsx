"use client";

import {
  JsonView,
  allExpanded,
  collapseAllNested,
  defaultStyles,
} from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";

export interface JSONViewProps {
  data: any;
  collapsed?: boolean;
}

export function JSONView({ data, collapsed = false }: JSONViewProps) {
  return (
    <JsonView
      data={data}
      shouldExpandNode={collapsed ? collapseAllNested : allExpanded}
      style={{
        ...defaultStyles,
        container: "child-fields-container",
      }}
    />
  );
}
