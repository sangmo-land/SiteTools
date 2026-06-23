import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Calculator,
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
        const blockArea = Number(blocks.blockLength) * Number(blocks.blockHeight);
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

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-medium text-emerald-700">
                            Site calculators
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold text-zinc-950">
                            Field quantity tools
                        </h1>
                    </div>
                    <Link
                        href={route('tools.expenses')}
                        className="inline-flex w-fit items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Expense tracker
                    </Link>
                </div>
            }
        >
            <Head title="Calculators" />

            <div className="grid gap-6 xl:grid-cols-2">
                <ToolPanel
                    title="Concrete volume"
                    subtitle="Slabs, lintels, blinding, and pads"
                    icon={Cuboid}
                    accent="emerald"
                    result={[
                        ['Concrete', `${concreteResult.volume} m3`],
                        ['Cement', `${concreteResult.cementBags} bags`],
                        ['Sand', `${concreteResult.sand} m3`],
                        ['Aggregate', `${concreteResult.aggregate} m3`],
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
                        ['Wall area', `${blockResult.wallArea} m2`],
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
                        label="Openings (m2)"
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
                    accent="cyan"
                    result={[
                        ['Paint', `${paintResult.litres} litres`],
                        ['4L buckets', paintResult.buckets4L],
                        ['20L buckets', paintResult.buckets20L],
                    ]}
                >
                    <NumberInput
                        label="Surface area (m2)"
                        value={paint.area}
                        onChange={(value) =>
                            setPaint((current) => ({
                                ...current,
                                area: value,
                            }))
                        }
                    />
                    <NumberInput
                        label="Coverage (m2/L)"
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

                <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-rose-50 text-rose-700">
                            <Ruler className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-base font-semibold text-zinc-950">
                                Unit converter
                            </h2>
                            <p className="text-sm text-zinc-500">
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
                            <span className="text-sm font-medium text-zinc-700">
                                Conversion
                            </span>
                            <select
                                value={unit.mode}
                                onChange={(event) =>
                                    setUnit((current) => ({
                                        ...current,
                                        mode: event.target.value,
                                    }))
                                }
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                            >
                                <option value="metersToFeet">
                                    Meters to feet
                                </option>
                                <option value="feetToMeters">
                                    Feet to meters
                                </option>
                                <option value="kgToTons">Kg to tons</option>
                                <option value="tonsToKg">Tons to kg</option>
                                <option value="sqmToSqft">m2 to ft2</option>
                                <option value="sqftToSqm">ft2 to m2</option>
                            </select>
                        </label>
                    </div>

                    <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                        <div className="flex items-center gap-3">
                            <Calculator className="h-5 w-5 text-rose-700" />
                            <p className="text-3xl font-semibold text-zinc-950">
                                {unitResult}
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}

function ToolPanel({ title, subtitle, icon: Icon, accent, result, children }) {
    const colorMap = {
        emerald: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        cyan: 'bg-cyan-50 text-cyan-700',
    };

    return (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <span
                    className={`flex h-10 w-10 items-center justify-center rounded-md ${colorMap[accent]}`}
                >
                    <Icon className="h-5 w-5" />
                </span>
                <div>
                    <h2 className="text-base font-semibold text-zinc-950">
                        {title}
                    </h2>
                    <p className="text-sm text-zinc-500">{subtitle}</p>
                </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {result.map(([label, value]) => (
                    <div
                        key={label}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                    >
                        <p className="text-sm text-zinc-500">{label}</p>
                        <p className="mt-1 text-2xl font-semibold text-zinc-950">
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
            <span className="text-sm font-medium text-zinc-700">{label}</span>
            <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="mt-1 w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                min="0"
                step={step}
                type="number"
            />
        </label>
    );
}
