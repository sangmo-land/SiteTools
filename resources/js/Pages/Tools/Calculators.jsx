import AuthenticatedLayout, { PageHeader } from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Cuboid,
    PaintBucket,
    Ruler,
    SquareStack,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const round = (value, places = 2) =>
    Number.isFinite(value) ? Number(value.toFixed(places)) : 0;

export default function Calculators() {
    const [concrete, setConcrete] = useState({
        length: 6,
        width: 4,
        depth: 0.15,
        waste: 7.5,
    });
    const [blocks, setBlocks] = useState({
        wallLength: 20,
        wallHeight: 3,
        blockLength: 0.45,
        blockHeight: 0.225,
        openings: 4,
        waste: 5,
    });
    const [paint, setPaint] = useState({
        area: 80,
        coverage: 10,
        coats: 2,
        waste: 8,
    });
    const [unit, setUnit] = useState({
        value: 10,
        mode: 'metersToFeet',
    });

    const concreteResult = useMemo(() => {
        const base =
            Number(concrete.length) *
            Number(concrete.width) *
            Number(concrete.depth);
        const withWaste = base * (1 + Number(concrete.waste) / 100);

        return {
            volume: round(withWaste, 3),
            cementBags: Math.ceil(withWaste * 7.2),
            sand: round(withWaste * 0.44, 2),
            aggregate: round(withWaste * 0.88, 2),
        };
    }, [concrete]);

    const blockResult = useMemo(() => {
        const wallArea =
            Number(blocks.wallLength) * Number(blocks.wallHeight) -
            Number(blocks.openings);
        const blockArea =
            Number(blocks.blockLength) * Number(blocks.blockHeight);
        const base = blockArea > 0 ? wallArea / blockArea : 0;
        const total = Math.ceil(base * (1 + Number(blocks.waste) / 100));

        return {
            wallArea: round(Math.max(wallArea, 0), 2),
            blocks: Math.max(total, 0),
            mortarBags: Math.ceil(Math.max(total, 0) / 90),
        };
    }, [blocks]);

    const paintResult = useMemo(() => {
        const litres =
            (Number(paint.area) * Number(paint.coats)) /
            Math.max(Number(paint.coverage), 1);
        const withWaste = litres * (1 + Number(paint.waste) / 100);

        return {
            litres: round(withWaste, 1),
            buckets4L: Math.ceil(withWaste / 4),
            buckets20L: Math.ceil(withWaste / 20),
        };
    }, [paint]);

    const unitResult = useMemo(() => {
        const value = Number(unit.value);
        const converters = {
            metersToFeet: value * 3.28084,
            feetToMeters: value / 3.28084,
            kgToTons: value / 1000,
            tonsToKg: value * 1000,
            sqmToSqft: value * 10.7639,
            sqftToSqm: value / 10.7639,
        };

        return round(converters[unit.mode] || 0, 3);
    }, [unit]);

    const unitLabel = {
        metersToFeet: 'ft',
        feetToMeters: 'm',
        kgToTons: 't',
        tonsToKg: 'kg',
        sqmToSqft: 'ft²',
        sqftToSqm: 'm²',
    }[unit.mode];

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow="Site calculators"
                    title="Field quantity tools"
                    actions={
                        <Link
                            href={route('tools.expenses')}
                            className="btn btn-secondary"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Expense tracker
                        </Link>
                    }
                />
            }
        >
            <Head title="Calculators" />

            <div className="grid gap-5 xl:grid-cols-2">
                <ToolPanel
                    title="Concrete volume"
                    subtitle="Slabs, lintels, blinding, and pads"
                    icon={Cuboid}
                    accent="brand"
                    result={[
                        ['Concrete', `${concreteResult.volume} m³`],
                        ['Cement', `${concreteResult.cementBags} bags`],
                        ['Sand', `${concreteResult.sand} m³`],
                        ['Aggregate', `${concreteResult.aggregate} m³`],
                    ]}
                >
                    <NumberInput
                        label="Length (m)"
                        value={concrete.length}
                        onChange={(value) =>
                            setConcrete((current) => ({
                                ...current,
                                length: value,
                            }))
                        }
                    />
                    <NumberInput
                        label="Width (m)"
                        value={concrete.width}
                        onChange={(value) =>
                            setConcrete((current) => ({
                                ...current,
                                width: value,
                            }))
                        }
                    />
                    <NumberInput
                        label="Depth (m)"
                        value={concrete.depth}
                        step="0.01"
                        onChange={(value) =>
                            setConcrete((current) => ({
                                ...current,
                                depth: value,
                            }))
                        }
                    />
                    <NumberInput
                        label="Waste (%)"
                        value={concrete.waste}
                        step="0.5"
                        onChange={(value) =>
                            setConcrete((current) => ({
                                ...current,
                                waste: value,
                            }))
                        }
                    />
                </ToolPanel>

                <ToolPanel
                    title="Block estimator"
                    subtitle="Wall area less openings"
                    icon={SquareStack}
                    accent="amber"
                    result={[
                        ['Wall area', `${blockResult.wallArea} m²`],
                        ['Blocks', `${blockResult.blocks} pcs`],
                        ['Mortar cement', `${blockResult.mortarBags} bags`],
                    ]}
                >
                    <NumberInput
                        label="Wall length (m)"
                        value={blocks.wallLength}
                        onChange={(value) =>
                            setBlocks((current) => ({
                                ...current,
                                wallLength: value,
                            }))
                        }
                    />
                    <NumberInput
                        label="Wall height (m)"
                        value={blocks.wallHeight}
                        onChange={(value) =>
                            setBlocks((current) => ({
                                ...current,
                                wallHeight: value,
                            }))
                        }
                    />
                    <NumberInput
                        label="Openings (m²)"
                        value={blocks.openings}
                        onChange={(value) =>
                            setBlocks((current) => ({
                                ...current,
                                openings: value,
                            }))
                        }
                    />
                    <NumberInput
                        label="Waste (%)"
                        value={blocks.waste}
                        onChange={(value) =>
                            setBlocks((current) => ({
                                ...current,
                                waste: value,
                            }))
                        }
                    />
                </ToolPanel>

                <ToolPanel
                    title="Paint quantity"
                    subtitle="Coverage, coats, and allowance"
                    icon={PaintBucket}
                    accent="sky"
                    result={[
                        ['Paint', `${paintResult.litres} litres`],
                        ['4L buckets', paintResult.buckets4L],
                        ['20L buckets', paintResult.buckets20L],
                    ]}
                >
                    <NumberInput
                        label="Surface area (m²)"
                        value={paint.area}
                        onChange={(value) =>
                            setPaint((current) => ({
                                ...current,
                                area: value,
                            }))
                        }
                    />
                    <NumberInput
                        label="Coverage (m²/L)"
                        value={paint.coverage}
                        onChange={(value) =>
                            setPaint((current) => ({
                                ...current,
                                coverage: value,
                            }))
                        }
                    />
                    <NumberInput
                        label="Coats"
                        value={paint.coats}
                        step="1"
                        onChange={(value) =>
                            setPaint((current) => ({
                                ...current,
                                coats: value,
                            }))
                        }
                    />
                    <NumberInput
                        label="Waste (%)"
                        value={paint.waste}
                        onChange={(value) =>
                            setPaint((current) => ({
                                ...current,
                                waste: value,
                            }))
                        }
                    />
                </ToolPanel>

                <section className="card p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                            <Ruler className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-base font-bold text-white">
                                Unit converter
                            </h2>
                            <p className="text-sm text-slate-400">
                                Common field conversions
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <NumberInput
                            label="Value"
                            value={unit.value}
                            onChange={(value) =>
                                setUnit((current) => ({
                                    ...current,
                                    value,
                                }))
                            }
                        />
                        <label>
                            <span className="label">Conversion</span>
                            <select
                                value={unit.mode}
                                onChange={(event) =>
                                    setUnit((current) => ({
                                        ...current,
                                        mode: event.target.value,
                                    }))
                                }
                                className="field mt-1.5"
                            >
                                <option value="metersToFeet">
                                    Meters to feet
                                </option>
                                <option value="feetToMeters">
                                    Feet to meters
                                </option>
                                <option value="kgToTons">Kg to tons</option>
                                <option value="tonsToKg">Tons to kg</option>
                                <option value="sqmToSqft">m² to ft²</option>
                                <option value="sqftToSqm">ft² to m²</option>
                            </select>
                        </label>
                    </div>

                    <div className="ink-panel mt-5 overflow-hidden rounded-xl p-6 text-white">
                        <p className="text-xs font-semibold uppercase tracking-widest text-brand-300">
                            Result
                        </p>
                        <p className="mt-2 text-4xl font-bold">
                            {unitResult}{' '}
                            <span className="text-xl font-semibold text-slate-400">
                                {unitLabel}
                            </span>
                        </p>
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}

function ToolPanel({ title, subtitle, icon: Icon, accent, result, children }) {
    const colorMap = {
        brand: 'bg-brand-500/15 text-brand-300',
        amber: 'bg-amber-500/15 text-amber-300',
        sky: 'bg-sky-500/15 text-sky-300',
    };

    return (
        <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-3">
                <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorMap[accent]}`}
                >
                    <Icon className="h-5 w-5" />
                </span>
                <div>
                    <h2 className="text-base font-bold text-white">{title}</h2>
                    <p className="text-sm text-slate-400">{subtitle}</p>
                </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {result.map(([label, value]) => (
                    <div
                        key={label}
                        className="rounded-xl border hairline bg-white/[0.04] p-4 transition hover:border-brand-400/40 hover:bg-brand-500/10"
                    >
                        <p className="text-xs font-medium text-slate-400">
                            {label}
                        </p>
                        <p className="mt-1 text-2xl font-bold text-white">
                            {value}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function NumberInput({ label, value, onChange, step = '0.1' }) {
    return (
        <label>
            <span className="label">{label}</span>
            <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="field mt-1.5"
                min="0"
                step={step}
                type="number"
            />
        </label>
    );
}
