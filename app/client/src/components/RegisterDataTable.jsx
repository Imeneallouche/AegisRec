import React from "react";
import {
  collectColumnKeys,
  formatRegisterCellValue,
  humanizeKey,
} from "../utils/registerTableUtils";

/**
 * Generic scrollable data grid for an array of homogeneous objects.
 */
export default function RegisterDataTable({ rows, emptyMessage = "No rows." }) {
  const columns = React.useMemo(
    () => (rows && rows.length ? collectColumnKeys(rows) : []),
    [rows]
  );

  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg bg-slate-50/80">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-16rem)] min-h-0 rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 shadow-[0_1px_0_0_rgb(226_232_240)]">
          <tr>
            <th className="px-3 py-2.5 w-10 text-center text-xs font-semibold text-slate-500 border-r border-slate-200 bg-slate-100">
              #
            </th>
            {columns.map((col) => (
              <th
                key={col}
                className="px-3 py-2.5 text-xs font-semibold text-slate-700 uppercase tracking-wide whitespace-nowrap border-r border-slate-200 last:border-r-0 bg-slate-100"
              >
                {humanizeKey(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`border-b border-slate-100 ${
                rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60"
              } hover:bg-indigo-50/40 transition-colors`}
            >
              <td className="px-3 py-2 text-center text-xs text-slate-400 border-r border-slate-100 font-mono">
                {rowIndex + 1}
              </td>
              {columns.map((col) => (
                <td
                  key={col}
                  className="px-3 py-2 text-slate-800 border-r border-slate-100 last:border-r-0 align-top max-w-md"
                >
                  <span
                    className="break-words line-clamp-6"
                    title={formatRegisterCellValue(row[col])}
                  >
                    {formatRegisterCellValue(row[col])}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
