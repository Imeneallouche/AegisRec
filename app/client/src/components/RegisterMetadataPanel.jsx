import React from "react";
import { humanizeKey, formatRegisterCellValue } from "../utils/registerTableUtils";

/**
 * Key–value table for the register `metadata` object.
 * Scrolls inside the sheet when content is long or wide.
 */
export default function RegisterMetadataPanel({ metadata }) {
  if (!metadata || typeof metadata !== "object") {
    return (
      <div className="text-sm text-slate-500 p-4">No site metadata available.</div>
    );
  }

  const entries = Object.entries(metadata);

  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0 h-full max-h-full">
      <div
        className="flex-1 min-h-0 min-w-0 overflow-auto overscroll-contain rounded-lg border border-slate-200 bg-white shadow-sm [scrollbar-gutter:stable]"
      >
        <table className="w-max min-w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide whitespace-nowrap min-w-[12rem]">
                Field
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide min-w-[16rem]">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, value], i) => (
              <tr
                key={key}
                className={
                  i % 2 === 0
                    ? "bg-white border-b border-slate-100"
                    : "bg-slate-50/60 border-b border-slate-100"
                }
              >
                <td className="px-4 py-3 text-slate-600 font-medium border-r border-slate-100 align-top whitespace-nowrap">
                  {humanizeKey(key)}
                </td>
                <td className="px-4 py-3 text-slate-800 align-top break-words [overflow-wrap:anywhere] max-w-[80ch]">
                  {formatRegisterCellValue(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
