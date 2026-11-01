import {MOODS, type MoodId } from "@/lib/moods";

type MoodPickerProps = {
    value: MoodId;
    onChange: (id: MoodId) => void;

};

export default function MoodPicker({value, onChange}: MoodPickerProps){
    return(
        <div
          role="radiogroup"
          aria-label="Buddy Mood"
          className="grid-grid-cols-3 gap-3"

        >
            {MOODS.map((mood)=>{
                const selected = mood.id === value;
                return(
                    <button
                        key={mood.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(mood.id)}
                        className={`flecx min-h-12 flex-col items-center justify-center rounded-card py-2 text-sm font-semibold transition ${selected ?  "bg-accent text-white" :  "bg-surface text-foreground"}`}
                        >
                            <span className="text-x1">{mood.emoji}</span> 
                            {mood.label} 
                        </button>
                );
            })}
        </div>
    );
}