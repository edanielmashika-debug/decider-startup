export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export type Category = "move" | "reset" | "create" | "social" | "chill" | "learn";

export type Priority = "low" | "normal" | "high";

export type Activity = {
  id: string;
  emoji: string;
  text: string;
  category: Category;
  times: TimeOfDay[]; // when this activity makes sense
  priority?: Priority; //missing = normal
  custom?: Boolean;

};

export const TIMES: TimeOfDay[] = [ "morning", "afternoon", "evening", "night"];
export const CATEGORIES: Category[] = ["move", "reset", "create", "social", "chill", "learn"];
export const MAX_TEXT_LENGTH = 80; //longest activity text
export const MAX_CUSTOM = 100; //most activities a user can keep

const ALL: TimeOfDay[] = ["morning", "afternoon", "evening", "night"];

export const ACTIVITIES: Activity[] = [
  // morning
  { id: "daylight", emoji: "☀️", text: "Step outside for 5 minutes of daylight", category: "move", times: ["morning"] },
  { id: "make-bed", emoji: "🛏️", text: "Make your bed", category: "reset", times: ["morning"] },
  { id: "top-three", emoji: "📝", text: "Write down your top 3 things for today", category: "reset", times: ["morning"] },
  { id: "stretch", emoji: "🧘", text: "Do a 5-minute stretch", category: "move", times: ["morning", "afternoon"] },
  { id: "water", emoji: "💧", text: "Drink a full glass of water", category: "reset", times: ["morning", "afternoon"] },

  // afternoon
  { id: "walk", emoji: "🚶", text: "Take a 10-minute walk", category: "move", times: ["morning", "afternoon", "evening"] },
  { id: "inbox", emoji: "📬", text: "Clear 5 things from your inbox", category: "reset", times: ["afternoon"] },
  { id: "snack-break", emoji: "🍎", text: "Have a proper snack and a real break", category: "chill", times: ["afternoon"] },
  { id: "learn-ten", emoji: "📚", text: "Learn one new thing for 10 minutes", category: "learn", times: ["afternoon", "evening"] },
  { id: "message-friend", emoji: "💬", text: "Message someone you haven't talked to in a while", category: "social", times: ["afternoon", "evening"] },
  { id: "doodle", emoji: "✏️", text: "Doodle anything for 5 minutes", category: "create", times: ["afternoon", "evening"] },

  // evening
  { id: "cook", emoji: "🍳", text: "Cook something simple from scratch", category: "create", times: ["evening"] },
  { id: "tidy-corner", emoji: "🧺", text: "Tidy one small area for 10 minutes", category: "reset", times: ["evening"] },
  { id: "call-someone", emoji: "📞", text: "Call someone you care about", category: "social", times: ["evening"] },
  { id: "quick-game", emoji: "🎲", text: "Play a quick game with someone", category: "social", times: ["evening"] },
  { id: "album", emoji: "🎧", text: "Listen to a full album with no scrolling", category: "chill", times: ["evening", "night"] },
  { id: "three-good", emoji: "📓", text: "Write down 3 things that went well today", category: "chill", times: ["evening", "night"] },

  // night
  { id: "warm-shower", emoji: "🚿", text: "Take a warm shower", category: "chill", times: ["evening", "night"] },
  { id: "phone-away", emoji: "📵", text: "Put your phone across the room for 30 minutes", category: "chill", times: ["night"] },
  { id: "read-pages", emoji: "📖", text: "Read a few pages of a book", category: "learn", times: ["night"] },
  { id: "prep-tomorrow", emoji: "🎒", text: "Get tomorrow's clothes and bag ready", category: "reset", times: ["night"] },
  { id: "look-sky", emoji: "🌙", text: "Look at the sky for one quiet minute", category: "chill", times: ["evening", "night"] },

  // any time
  { id: "deep-breaths", emoji: "🌬️", text: "Take 10 slow, deep breaths", category: "chill", times: ALL },
  { id: "dance", emoji: "💃", text: "Put on one song and dance to it", category: "move", times: ALL },
  { id: "compliment", emoji: "🙌", text: "Send someone a genuine compliment", category: "social", times: ALL },
  { id: "toss-five", emoji: "🗑️", text: "Throw away 5 things you don't need", category: "reset", times: ALL },
  { id: "sing", emoji: "🎤", text: "Sing one song out loud", category: "create", times: ALL },
];