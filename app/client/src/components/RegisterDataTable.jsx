import React from "react";
import {
  collectColumnKeys,
  formatRegisterCellValue,
  humanizeKey,
} from "../utils/registerTableUtils";

/**
 * Generic scrollable data grid for an array of homogeneous objects.
 * Contained in parent flex: fills available height, scrolls vertically and horizontally.
 */
export default function RegisterDataTable({ rows, emptyMessage = "No rows." }) {
  const columns = React.useMemo(
    () => (rows && rows.length ? collectColumnKeys(rows) : []),
    [rows]
  );

  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg bg-slate-50/80 shrink-0">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0 w-full h-full max-h-full">
      {/* Single scrollport: both axes. min-w-0 allows flex child to shrink for overflow. */}
      <div
        className="
          register-table-scroll
          flex-1 min-h-0 min-w-0
          overflow-auto
          overscroll-contain
          rounded-lg
          border border-slate-200
          bg-white
          shadow-sm
          [scrollbar-gutter:stable]
        "
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/*
          min-w-max: table grows with column content so horizontal scrollbar appears
          when wider than the viewport. min-w-full: at least full width when few columns.
        */}
        <table className="w-max min-w-full text-left text-sm border-collapse">
          <thead className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 shadow-sm">
            <tr>
              <th className="sticky left-0 z-30 px-3 py-2.5 w-10 min-w-[2.75rem] text-center text-xs font-semibold text-slate-500 border-r border-slate-200 bg-slate-100 shadow-[1px_0_0_0_rgb(226_232_240)]">
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
            {rows.map((row, rowIndex) => {
              const stripe = rowIndex % 2 === 0;
              return (
              <tr
                key={rowIndex}
                className={`group border-b border-slate-100 ${
                  stripe ? "bg-white" : "bg-slate-50/60"
                } hover:bg-indigo-50/40 transition-colors`}
              >
                <td
                  className={`sticky left-0 z-10 px-3 py-2 text-center text-xs text-slate-500 border-r border-slate-200 font-mono [box-shadow:1px_0_0_0_rgb(241_245_249)] ${
                    stripe ? "bg-white" : "bg-slate-50/60"
                  } group-hover:bg-indigo-50/40`}
                >
                  {rowIndex + 1}
                </td>
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-2 text-slate-800 border-r border-slate-100 last:border-r-0 align-top min-w-[6rem] max-w-[32rem] sm:max-w-lg"
                  >
                    <span
                      className="block break-words [overflow-wrap:anywhere] leading-snug"
                      title={formatRegisterCellValue(row[col])}
                    >
                      {formatRegisterCellValue(row[col])}
                    </span>
                  </td>
                ))}
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
