import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alias, setAlias] = useState('');
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignUp) {
      signUp(email, password, alias || email.split('@')[0]);
    } else {
      signIn(email, password);
    }
    navigate('/app');
  };

  const inputClass = 'w-full px-4 py-3 rounded-lg bg-surface-light border border-border text-cream placeholder:text-muted/60 focus:outline-none focus:border-caramel/60 text-sm';

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="block text-center text-lg font-semibold text-caramel mb-10 tracking-tight">
          screentime
        </Link>

        <div className="bg-surface-card border border-border rounded-xl p-8">
          <h2 className="text-xl font-semibold text-cream mb-6">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <input type="text" placeholder="Display name" value={alias}
                onChange={e => setAlias(e.target.value)} className={inputClass} />
            )}
            <input type="email" placeholder="Email" value={email} required
              onChange={e => setEmail(e.target.value)} className={inputClass} />
            <input type="password" placeholder="Password" value={password} required minLength={6}
              onChange={e => setPassword(e.target.value)} className={inputClass} />
            <button type="submit"
              className="w-full py-3 rounded-lg bg-caramel text-surface font-semibold text-sm hover:bg-caramel-light transition">
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-caramel hover:underline">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
