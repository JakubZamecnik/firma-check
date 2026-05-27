import CompanyForm from "./CompanyForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-12 text-zinc-950">
      <div className="mx-auto w-full max-w-3xl">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">🔍 FirmaCheck</h1>
          <p className="mt-3 text-zinc-600 text-lg">
            Ověřte českou firmu podle IČO z veřejných údajů ARES s integrovanou mapou.
          </p>
        </header>
        <main>
          <CompanyForm />
        </main>
      </div>
    </div>
  );
}
