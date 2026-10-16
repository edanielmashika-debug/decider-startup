import Image from "next/image";

export default function Home(){
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-between px-6 py-10">
      <header className="text-center"> 
        <h1 className="text-2x1 font-bold"> Decider </h1>
        <p className="text-sm opacity-70"> What should I do right now?</p>
      </header>

      <section className="flex w-full flex-1 items-center justify-center">
        <div className="rounded-card bg-surface px-10 py-16 shadow-sm">
          Buddy goes here
        </div>
      </section>

      <footer className="w-full">
        <button className="w-full rounded-card bg-accent py-4 text-lg font-semibold text-white">
          Decide for me
        </button>
      </footer>
    </main>
  );
 }