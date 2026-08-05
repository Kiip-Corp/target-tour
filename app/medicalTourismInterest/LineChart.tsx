"use client";

import * as d3 from "d3";
import { useState } from "react";

type Point = { ym: string; value: number };

const WIDTH = 720;
const HEIGHT = 320;
const MARGIN = { top: 20, right: 20, bottom: 40, left: 40 };

const TEAL = "#0E7C6B";
const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";

function formatYm(ym: string) {
  return `${ym.slice(0, 4)}.${ym.slice(4, 6)}`;
}

export default function LineChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const innerW = WIDTH - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x = d3
    .scalePoint<string>()
    .domain(data.map((d) => d.ym))
    .range([0, innerW])
    .padding(0.5);

  const y = d3
    .scaleLinear()
    .domain([0, 100])
    .range([innerH, 0]);

  const line = d3
    .line<Point>()
    .x((d) => x(d.ym) ?? 0)
    .y((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  const path = line(data) ?? "";
  const yTicks = y.ticks(5);
  const active = hover !== null ? data[hover] : null;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ width: "100%", height: "auto", fontFamily: "ui-monospace, monospace" }}
    >
      <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
        {yTicks.map((t) => (
          <g key={t} transform={`translate(0,${y(t)})`}>
            <line x2={innerW} stroke={BORDER} strokeDasharray="2 3" />
            <text x={-8} dy="0.32em" textAnchor="end" fontSize={10} fill={MUTED}>
              {t}
            </text>
          </g>
        ))}

        {data.map((d, i) =>
          i % 3 === 0 ? (
            <text
              key={d.ym}
              x={x(d.ym) ?? 0}
              y={innerH + 16}
              textAnchor="middle"
              fontSize={9.5}
              fill={MUTED}
            >
              {formatYm(d.ym)}
            </text>
          ) : null
        )}

        <path d={path} fill="none" stroke={TEAL} strokeWidth={2.5} />

        {data.map((d, i) => (
          <circle
            key={d.ym}
            cx={x(d.ym) ?? 0}
            cy={y(d.value)}
            r={hover === i ? 5 : 3}
            fill={hover === i ? INK : TEAL}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: "pointer" }}
          />
        ))}

        {active && (
          <g transform={`translate(${x(active.ym) ?? 0},${y(active.value) - 14})`}>
            <text textAnchor="middle" fontSize={11} fontWeight={700} fill={INK}>
              {formatYm(active.ym)} · {active.value}
            </text>
          </g>
        )}
      </g>
    </svg>
  );
}
