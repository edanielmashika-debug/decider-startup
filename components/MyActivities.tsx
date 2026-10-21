"use Client";

import { useState } from "react";
import {
    CATEGORIES,
    TIMES,
    MAX_TEXT_LENGTH,
    MAX_CUSTOM,
    type Activity,
    type Category,
    type Priority,
    type TimeOfDay,

} from "@/lib/activities";

import { newId, sanitizeActivity } from "@/lib/pool";


const TIME_LABEL: Record<TimeOfDay, string> = {
    morning: "🌅 Morning",
    afternoon: "☀️ Afternoon",
    evening: "🌆 Evening",
    night: "🌙 Night",
};

const PRIORITIES: { id: Priority; label: string }[] = [
    { id: "low", label: "Low" },
    { id: "normal", label: "Normal" },
    { id: "high", label: "High" },

];

const CATEGORY_LABEL: Record<Category, string> = {
    move: "🏃 Move",
    reset: "🧹 Reset",
    create: "🎨 Create",
    social: "💬 Social",
    chill: "😌 Chill",
    learn: "📚 Learn",
};

type Props = {
    activities: Activity[]; // the user's own activities
    useStarter: boolean;
    onSave: (a: Activity) => void; //adds a new one or replaces one with the same id
    onDelete: (id: string) => void;
    onToggleStarter: (value: boolean) => void;

    onClose: () => void;


};

const inputClass =
    "w-full rounded-card border border-foreground/15 bg-surface px-4 py-3 text-base";

export default function MyActivities({
    activities,
    useStarter,
    onSave,
    onDelete,
    onToggleStarter,
    onClose,
}: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [emoji, setEmoji] = useState("✨");
    const [text, setText] = useState("");
    const [times, setTimes] = useState<TimeOfDay[]>([...TIMES]);
    const [priority, setPriority] = useState<Priority>("normal");
    const [category, setCategory] = useState<Category>("chill");
    const [error, setError] = useState("");

    function resetForm() {
        setEditingId(null);
        setEmoji("✨");
        setText("");
        setTimes([...TIMES]);
        setPriority("normal");
        setCategory("chill");
        setError("");
    }

    function startEdit(a: Activity) {
        setEditingId(a.id);
        setEmoji(a.emoji);
        setText(a.text);
        setTimes(a.times);
        setPriority(a.priority ?? "normal");
        setCategory(a.category);
        setError("");
    }

    function toggleTime(t: TimeOfDay) {
        setTimes((current) =>
            current.includes(t) ? current.filter((x) => x !== t) : [...current, t],
        );
    }

    function submit() {
        if (!editingId && activities.length >= MAX_CUSTOM) {
            setError(`You can keep up to ${MAX_CUSTOM} activities.`);
            return;
        }
        const clean = sanitizeActivity({
            id: editingId ?? newId(),
            emoji,
            text,
            category,
            times,
            priority,

        });

        if (!clean) {
            setError("Write what to do and pick at least one time of day");
            return;

        }
        onSave(clean);
        resetForm();
    }

    const countFor = (t: TimeOfDay) => activities.filter((a) => a.times.includes(t)).length;

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-10">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">My activities</h1>
                <button
                    onClick={onClose}
                    className="min-h-12 rounded-card bg-surface px-5 font-medium"
                >
                    Done
                </button>
            </header>

            <section className="flex flex-col gap-3">
                <label className="flex min-h-12 items-center gap-3 rounded-card bg-surface px-4">
                    <input
                        type="checkbox"
                        checked={useStarter}
                        onChange={(e) => onToggleStarter(e.target.checked)}
                        className="size-5"
                    />
                    <span>Also use the starter ideas</span>
                </label>
                <p className="text-sm opacity-70">
                    Your own activities show up about twice as often as starter ones.
                </p>
                <ul className="grid grid-cols-2 gap-2 text-sm">
                    {TIMES.map((t) => (
                        <li key={t} className="rounded-card bg-surface px-3 py-2">
                            {TIME_LABEL[t]}: {countFor(t)}
                            {!useStarter && countFor(t) === 0 ? " (empty)" : ""}
                        </li>
                    ))}
                </ul>
                {!useStarter && TIMES.some((t) => countFor(t) === 0) && (
                    <p className="text-sm opacity-70">
                        With the starter ideas off, an empty time of day makes the buddy pick from any time.
                    </p>
                )}
            </section>

            <section className="flex flex-col gap-4 rounded-card bg-surface p-4">
                <h2 className="font-semibold">{editingId ? "Edit activity" : "Add an activity"}</h2>

                <div className="flex gap-3">
                    <input
                        value={emoji}
                        onChange={(e) => setEmoji(e.target.value)}
                        maxLength={8}
                        aria-label="Emoji"
                        className={`${inputClass} w-20 text-center`}
                    />
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        maxLength={MAX_TEXT_LENGTH}
                        placeholder="What do you do?"
                        aria-label="Activity"
                        className={inputClass}
                    />
                </div>

                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-sm opacity-70">When does it fit?</legend>
                    <div className="grid grid-cols-2 gap-2">
                        {TIMES.map((t) => (
                            <button
                                key={t}
                                type="button"
                                aria-pressed={times.includes(t)}
                                onClick={() => toggleTime(t)}
                                className={`min-h-12 rounded-card px-3 ${times.includes(t) ? "bg-accent text-white" : "bg-background"
                                    }`}
                            >
                                {TIME_LABEL[t]}
                            </button>
                        ))}
                    </div>
                </fieldset>

                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-sm opacity-70">Priority (high shows up more often)</legend>
                    <div className="grid grid-cols-3 gap-2">
                        {PRIORITIES.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                aria-pressed={priority === p.id}
                                onClick={() => setPriority(p.id)}
                                className={`min-h-12 rounded-card px-3 ${priority === p.id ? "bg-accent text-white" : "bg-background"
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </fieldset>

                <label className="flex flex-col gap-2">
                    <span className="text-sm opacity-70">Kind (the buddy avoids the same kind twice in a row)</span>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as Category)}
                        className={inputClass}
                    >
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                                {CATEGORY_LABEL[c]}
                            </option>
                        ))}
                    </select>
                </label>

                {error && <p className="text-sm font-medium">⚠️ {error}</p>}

                <div className="flex gap-3">
                    <button
                        onClick={submit}
                        className="min-h-12 flex-1 rounded-card bg-accent font-semibold text-white"
                    >
                        {editingId ? "Save changes" : "Add"}
                    </button>
                    {editingId && (
                        <button onClick={resetForm} className="min-h-12 rounded-card bg-background px-5">
                            Cancel
                        </button>
                    )}
                </div>
            </section>

            <section className="flex flex-col gap-3">
                <h2 className="font-semibold">Your list ({activities.length})</h2>
                {activities.length === 0 && (
                    <p className="text-sm opacity-70">Nothing yet. Add the things you actually do.</p>
                )}
                <ul className="flex flex-col gap-2">
                    {activities.map((a) => (
                        <li key={a.id} className="flex items-center gap-2 rounded-card bg-surface p-2">
                            <button
                                onClick={() => startEdit(a)}
                                aria-label={`Edit ${a.text}`}
                                className="min-h-12 flex-1 px-2 text-left"
                            >
                                <span className="block">
                                    {a.emoji} {a.text}
                                </span>
                                <span className="block text-xs opacity-70">
                                    {a.times.map((t) => TIME_LABEL[t].split(" ")[0]).join(" ")}
                                    {a.priority === "high" ? " · ⭐ high" : a.priority === "low" ? " · low" : ""}
                                </span>
                            </button>
                            <button
                                onClick={() => onDelete(a.id)}
                                aria-label={`Delete ${a.text}`}
                                className="min-h-12 min-w-12 rounded-card bg-background"
                            >
                                🗑️
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}