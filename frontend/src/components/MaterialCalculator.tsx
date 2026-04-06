import { useMemo, useState } from "react";
type Props = {
    categorySlug?: string;
    productName: string;
};
export function MaterialCalculator({ categorySlug, productName }: Props) {
    const [area, setArea] = useState("20");
    const mode = useMemo(() => {
        if (categorySlug === "lkm")
            return "paint" as const;
        if (categorySlug === "napolnye-pokrytiya")
            return "floor" as const;
        if (categorySlug === "stroitelnye-materialy")
            return "mix" as const;
        return "generic" as const;
    }, [categorySlug]);
    const sq = Math.max(0, parseFloat(area.replace(",", ".")) || 0);
    const paintL = sq > 0 ? Math.ceil(sq * 0.15 * 1.15 * 10) / 10 : 0;
    const laminatePacks = sq > 0 ? Math.ceil((sq / 2.2) * 1.08) : 0;
    const mixKg = sq > 0 ? Math.ceil(sq * 2 * 1.1 * 10) / 10 : 0;
    return (<section className="card" style={{ marginTop: "1.5rem", padding: "1rem 1.25rem" }} aria-labelledby="calc-heading">
      <h2 id="calc-heading" style={{ fontSize: "1.05rem", marginTop: 0 }}>
        Калькулятор расхода
      </h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 0 }}>
        Для «{productName}». Ориентир для непрофессиональных закупок; уточняйте
        по инструкции производителя.
      </p>
      <div className="field" style={{ maxWidth: "200px" }}>
        <label htmlFor="calc-area">Площадь помещения, м²</label>
        <input id="calc-area" inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)}/>
      </div>
      {sq <= 0 ? (<p style={{ color: "var(--muted)" }}>Введите площадь больше 0.</p>) : mode === "paint" ? (<p style={{ marginBottom: 0 }}>
          <strong>Краска (2 слоя, запас ~15%):</strong> ориентировочно{" "}
          <strong>{paintL.toLocaleString("ru-RU")} л</strong> готового продукта.
        </p>) : mode === "floor" ? (<p style={{ marginBottom: 0 }}>
          <strong>Ламинат / напольное покрытие:</strong> при ~2,2 м² в упаковке и
          запасе 8% — <strong>{laminatePacks} уп.</strong>
        </p>) : mode === "mix" ? (<p style={{ marginBottom: 0 }}>
          <strong>Сухие смеси (очень грубо ~2 кг/м²):</strong> с запасом 10% —{" "}
          <strong>{mixKg.toLocaleString("ru-RU")} кг</strong>.
        </p>) : (<p style={{ marginBottom: 0, color: "var(--muted)" }}>
          Для этой категории нет готовой формулы — уточните расход по инструкции
          или спросите менеджера.
        </p>)}
    </section>);
}
