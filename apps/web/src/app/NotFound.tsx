import { Link } from '@tanstack/react-router';

export function NotFound() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2">
        <Link to="/" className="underline">
          Back to the overview
        </Link>
      </p>
    </section>
  );
}
