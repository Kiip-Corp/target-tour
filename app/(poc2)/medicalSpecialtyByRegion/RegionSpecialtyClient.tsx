"use client";

import { useState } from "react";
import HorizontalShareBar, { RegionButtons } from "../RegionSpecialtyBar";

type RegionShare = { region: string; count: Record<string, number>; amount: Record<string, number> };

export default function RegionSpecialtyClient({ data }: { data: RegionShare[] }) {
  const [region, setRegion] = useState(data[0]?.region ?? "");
  const current = data.find((d) => d.region === region) ?? data[0];

  return (
    <div>
      <RegionButtons regions={data.map((d) => d.region)} selected={region} onSelect={setRegion} />
      {current && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <HorizontalShareBar title={`${current.region} · 소비건수 비율`} shares={current.count} />
          <HorizontalShareBar title={`${current.region} · 소비액 비율`} shares={current.amount} />
        </div>
      )}
    </div>
  );
}
