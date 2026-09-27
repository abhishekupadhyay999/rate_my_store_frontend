import { useEffect, useState } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('ratemystore_token') || ''
  );

  const [user, setUser] = useState(null);
  const [stores, setStores] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [newStore, setNewStore] = useState({
  name: '',
  email: '',
  address: '',
});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [ratings, setRatings] = useState({});

  const [form, setForm] = useState({
    name: '',
    email: '',
    address: '',
    password: '',
  });

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  }

  async function loadStores(query = search) {
    if (!token) return;

    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (query.trim()) {
        params.set('search', query.trim());
      }

      const suffix = params.toString()
        ? `?${params.toString()}`
        : '';

      const data = await apiRequest(`/stores${suffix}`);
      setStores(data.stores || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAdminData() {
  try {
    const [statsData, usersData] = await Promise.all([
      apiRequest('/admin/stats'),
      apiRequest('/admin/users'),
    ]);

    setAdminStats(statsData.stats);
    setAdminUsers(usersData.users || []);
  } catch (error) {
    setMessage(error.message);
  }
}
async function handleCreateStore(event) {
  event.preventDefault();
  setMessage('');

  try {
    const storeData = {
      name: newStore.name.trim(),
      address: newStore.address.trim(),
      ...(newStore.email.trim()
        ? { email: newStore.email.trim() }
        : {}),
    };

    await apiRequest('/stores', {
      method: 'POST',
      body: JSON.stringify(storeData),
    });

    setNewStore({
      name: '',
      email: '',
      address: '',
    });

    setMessage('Store created successfully!');

    await loadStores('');
    await loadAdminData();
  } catch (error) {
    setMessage(error.message);
  }
}

  async function loadProfile() {
  try {
    const data = await apiRequest('/auth/profile');

    setUser(data.user);

    if (data.user.role === 'ADMIN') {
      await loadAdminData();
    }
  } catch {
    logout();
  }
}

  useEffect(() => {
    if (token) {
      loadProfile();
      loadStores('');
    }
    // Run when the saved login token changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const endpoint = isRegister
        ? '/auth/register'
        : '/auth/login';

      const body = isRegister
        ? {
            name: form.name,
            email: form.email,
            address: form.address,
            password: form.password,
          }
        : {
            email: form.email,
            password: form.password,
          };

      const data = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (isRegister) {
        setMessage('Account created! You can now log in.');
        setIsRegister(false);
        setForm({
          name: '',
          email: form.email,
          address: '',
          password: '',
        });
      } else {
        localStorage.setItem('ratemystore_token', data.token);
        setUser(data.user);
        setToken(data.token);
        setMessage('');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('ratemystore_token');
    setToken('');
    setUser(null);
    setStores([]);
    setRatings({});
    setMessage('');
  }

  async function submitRating(storeId) {
    const score = Number(ratings[storeId]);

    if (!score || score < 1 || score > 5) {
      setMessage('Please select a rating from 1 to 5.');
      return;
    }

    try {
      const data = await apiRequest(
        `/stores/${storeId}/ratings`,
        {
          method: 'POST',
          body: JSON.stringify({ score }),
        }
      );

      setMessage(data.message || 'Rating submitted!');
      await loadStores();
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand">
            <span className="brand-icon">★</span>
            <span>RateMyStore</span>
          </div>

          <p className="eyebrow">YOUR OPINION MATTERS</p>

          <h1>
            {isRegister
              ? 'Create your account'
              : 'Welcome back'}
          </h1>

          <p className="subtitle">
            Discover stores. Share experiences.
            Help others shop with confidence.
          </p>

          {message && (
            <div className="notice">{message}</div>
          )}

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  name="name"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={handleChange}
                  minLength={1}
                  maxLength={60}
                  required
                />

                <label htmlFor="address">Address</label>
                <input
                  id="address"
                  name="address"
                  placeholder="Your address"
                  value={form.address}
                  onChange={handleChange}
                  maxLength={400}
                />
              </>
            )}

            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              minLength={isRegister ? 8 : 1}
              maxLength={16}
              required
            />

            <button
              className="primary-btn"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : isRegister
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          <p className="switch-auth">
            {isRegister
              ? 'Already have an account?'
              : "Don't have an account?"}{' '}
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                setIsRegister(!isRegister);
                setMessage('');
              }}
            >
              {isRegister ? 'Sign in' : 'Register'}
            </button>
          </p>
        </section>
      </main>
    );
  }
  if (user?.role === 'ADMIN') {
  return (
    <main className="dashboard">
      <header className="navbar">
        <a className="brand" href="#">
          <span className="brand-icon">★</span>
          <span>RateMyStore Admin</span>
        </a>

        <div className="nav-right">
          <span className="welcome">
            Hi, {user.name}
          </span>

          <button className="logout-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">ADMINISTRATION</p>
        <h1>Dashboard overview</h1>
        <p>Manage your platform and monitor store activity.</p>
      </section>

      <section className="admin-section">
        <div className="admin-create-section">
  <div className="admin-table-heading">
    <div>
      <p className="eyebrow">STORE MANAGEMENT</p>
      <h2>Add a new store</h2>
    </div>
  </div>

  <form
    className="admin-create-form"
    onSubmit={handleCreateStore}
  >
    <div className="admin-form-field">
      <label htmlFor="store-name">Store name</label>
      <input
        id="store-name"
        value={newStore.name}
        onChange={(event) =>
          setNewStore({
            ...newStore,
            name: event.target.value,
          })
        }
        placeholder="Enter store name"
        maxLength={100}
        required
      />
    </div>

    <div className="admin-form-field">
      <label htmlFor="store-email">Store email (optional)</label>
      <input
        id="store-email"
        type="email"
        value={newStore.email}
        onChange={(event) =>
          setNewStore({
            ...newStore,
            email: event.target.value,
          })
        }
        placeholder="store@example.com"
      />
    </div>

    <div className="admin-form-field">
      <label htmlFor="store-address">Store address</label>
      <input
        id="store-address"
        value={newStore.address}
        onChange={(event) =>
          setNewStore({
            ...newStore,
            address: event.target.value,
          })
        }
        placeholder="Enter full address"
        maxLength={400}
        required
      />
    </div>

    <button className="primary-btn" type="submit">
      + Add Store
    </button>
  </form>
</div>
        <div className="admin-stats">
          <article className="admin-stat-card">
            <span>Total users</span>
            <h2>{adminStats?.totalUsers ?? '—'}</h2>
          </article>

          <article className="admin-stat-card">
            <span>Total stores</span>
            <h2>{adminStats?.totalStores ?? '—'}</h2>
          </article>

          <article className="admin-stat-card">
            <span>Total ratings</span>
            <h2>{adminStats?.totalRatings ?? '—'}</h2>
          </article>
        </div>

        {message && <div className="notice">{message}</div>}

        <div className="admin-table-heading">
          <div>
            <p className="eyebrow">ACCOUNTS</p>
            <h2>Registered users</h2>
          </div>

          <span className="store-count">
            {adminUsers.length} users
          </span>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>

            <tbody>
              {adminUsers.map((adminUser) => (
                <tr key={adminUser.id}>
                  <td>{adminUser.name}</td>
                  <td>{adminUser.email}</td>
                  <td>
                    <span className="role-badge">
                      {adminUser.role}
                    </span>
                  </td>
                  <td>
                    {new Date(
                      adminUser.createdAt
                    ).toLocaleDateString()}
                  </td>
                </tr>
              ))}

              {adminUsers.length === 0 && (
                <tr>
                  <td colSpan="4">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          className="primary-btn admin-refresh"
          onClick={loadAdminData}
        >
          Refresh dashboard
        </button>
      </section>
    </main>
  );
}

  return (
    <main className="dashboard">
      <header className="navbar">
        <a className="brand" href="#">
          <span className="brand-icon">★</span>
          <span>RateMyStore</span>
        </a>

        <div className="nav-right">
          <span className="welcome">
            Hi, {user?.name || 'there'}
          </span>
          <button
            className="logout-btn"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">THE COMMUNITY STORE GUIDE</p>
        <h1>Find stores worth talking about.</h1>
        <p>
          Explore local stores and see what other
          customers think.
        </p>

        <form
          className="search-form"
          onSubmit={(event) => {
            event.preventDefault();
            loadStores(search);
          }}
        >
          <input
            aria-label="Search stores"
            placeholder="Search by store name or address..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button className="primary-btn" type="submit">
            Search
          </button>
        </form>
      </section>

      <section className="store-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EXPLORE</p>
            <h2>Stores near you</h2>
          </div>
          <span className="store-count">
            {stores.length} {stores.length === 1 ? 'store' : 'stores'}
          </span>
        </div>

        {message && (
          <div className="notice">{message}</div>
        )}

        {loading ? (
          <p className="empty-state">Loading stores...</p>
        ) : stores.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">⌕</span>
            <h3>No stores found</h3>
            <p>Try another search, or check back later.</p>
          </div>
        ) : (
          <div className="store-grid">
            {stores.map((store) => (
              <article className="store-card" key={store.id}>
                <div className="store-card-top">
                  <div className="store-icon">🏬</div>
                  <span className="store-id">
                    STORE #{store.id}
                  </span>
                </div>

                <h3>{store.name}</h3>
                <p className="store-address">
                  <span>⌖</span> {store.address}
                </p>

                <div className="rating-summary">
                  <span className="rating-star">★</span>
                  <strong>
                    {store.averageRating ?? '—'}
                  </strong>
                  <span className="rating-muted">
                    {store._count?.ratings ?? 0} ratings
                  </span>
                </div>

                <div className="rate-area">
                  <label htmlFor={`rating-${store.id}`}>
                    Your rating
                  </label>

                  <div className="rate-controls">
                    <select
                      id={`rating-${store.id}`}
                      value={ratings[store.id] || ''}
                      onChange={(event) =>
                        setRatings({
                          ...ratings,
                          [store.id]: event.target.value,
                        })
                      }
                    >
                      <option value="">Select stars</option>
                      {[5, 4, 3, 2, 1].map((score) => (
                        <option key={score} value={score}>
                          {'★'.repeat(score)} ({score}/5)
                        </option>
                      ))}
                    </select>

                    <button
                      className="rate-btn"
                      onClick={() => submitRating(store.id)}
                    >
                      Rate
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="footer">
        <span>★ RateMyStore</span>
        <span>Real experiences. Better decisions.</span>
      </footer>
    </main>
  );
}

export default App;