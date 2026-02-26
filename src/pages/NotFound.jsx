import { Link } from 'react-router-dom';
import { LogoText } from '../components/Logo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
      <LogoText size={32} className="justify-center mb-8" />
      <h1 className="text-6xl font-bold text-cream mb-4">404</h1>
      <h2 className="text-xl text-muted mb-8">Page not found</h2>
      <p className="text-sm text-muted mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="px-6 py-3 rounded-lg bg-caramel text-surface font-semibold text-sm hover:bg-caramel-light transition"
      >
        Back to Home
      </Link>
    </div>
  );
}
