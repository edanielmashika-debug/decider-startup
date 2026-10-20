import type { Face } from "@/lib/moods";

//What the buddy is adding right now (separate from its moods)
export type BuddyPhase = "idle" | "thinking" | "excited";

//Takes the mood's normal face and returns the face of the current phase
//Idle= the mood's own face unchanged

export function faceForState(base: Face, phase: BuddyPhase): Face {
    if(phase === "thinking"){
        return{
            ...base,
            eyeRy: 8, //narrowed, "hmm"
            blinkSeconds: 0.9, //fidgety blinking
            floatSeconds: 1.2, //restless wobble
            mouth: "M88 136 Q100 131 112 138", //small crooked line
            mouthFilled: false,
            lids: false,

        };
    }

    if(phase === "excited") {
        return{
            ...base,
            eyeRy: 15, //wide open
            blinkSeconds: 2.5,
            floatSeconds: 0.9,
            mouth: "M78 124 Q100 162 122 124 Z", //big open smile
            mouthFilled: true,
            lids: false,
        };
    }

    return base;
}