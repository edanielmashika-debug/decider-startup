import { ACTIVITIES, type Activity, type TimeOfDay } from "../lib/activities";

const RECENT_LIMIT =3; // how many past picks are skipped

export function getTimeOfDay(date: Date): TimeOfDay {
    const hour = date.getHours();

    if(hour >= 5 && hour < 12) return "morning";
    if(hour >= 12 && hour < 17) return "afternoon";

    if(hour >= 17 && hour < 22) return "evening";
    return "night";

}

type DecideInput = {
    now: Date;
    recentIds: string[]; //past picks newest last
    random?: () => number; // swap this out when testing
};

export function decide({
    now, 
    recentIds,
    random = Math.random,
}: DecideInput): Activity{
    const slot = getTimeOfDay(now);

    //1. Only activities that fit this time of day
    const fits = ACTIVITIES.filter((a)=> a.times.includes(slot));

    //2. Skip the last few picks
    const skip = recentIds.slice(-RECENT_LIMIT);
    const fresh = fits.filter((a) => !skip.includes(a.id));

    //3. Prefer a different activity than the last one
    const lastId = recentIds[recentIds.length - 1];
    const lastCategory = ACTIVITIES.find((a) => a.id === lastId)?.category;
    const varied = fresh.filter((a) => a.category !== lastCategory);

    //4. use the narrowest list that still has something in it
    const pool = varied.length > 0 ? varied: fresh.length > 0 ? fresh: fits;

    return pool[Math.floor(random() * pool.length)];
}