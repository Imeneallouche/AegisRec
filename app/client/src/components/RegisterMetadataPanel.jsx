import React from "react";
import { humanizeKey, formatRegisterCellValue } from "../utils/registerTableUtils";

/**
 * Key–value table for the register `metadata` object.
 */
export default function RegisterMetadataPanel({ metadata }) {
  if (!metadata || typeof metadata !== "object") {
    return (
      <div className="text-sm text-slate-500 p-4">No site metadata available.</div>
    );
  }

  const entries = Object.entries(metadata);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide w-1/4 min-w-[200px]">
              Field
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value], i) => (
            <tr
              key={key}
              className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60 border-t border-slate-100"}
            >
              <td className="px-4 py-3 text-slate-600 font-medium border-r border-slate-100 align-top whitespace-nowrap">
                {humanizeKey(key)}
              </td>
              <td className="px-4 py-3 text-slate-800 align-top">
                {formatRegisterCellValue(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
