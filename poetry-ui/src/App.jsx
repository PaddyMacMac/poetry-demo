import { useEffect, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const GENRES = ["haiku", "playful", "melancholy", "frustrated", "epic"];

// Resolves to [] if the optional history endpoint isn't available
const fetchHistory = () =>
  fetch(`${API}/poems`)
    .then((res) => (res.ok ? res.json() : []))
    .then((data) => (Array.isArray(data) ? data : []))
    .catch(() => []);

const createPoem = async (genre, theme) => {
  const res = await fetch(`${API}/poems`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ genre, theme }),
  });
  if (!res.ok) {
    const { detail } = await res.json().catch(() => ({}));
    throw new Error(detail ?? `Request failed (${res.status})`);
  }
  return res.json();
};

const GenreChips = ({ selected, onSelect }) => (
  <div className="mb-3 d-flex flex-wrap gap-2">
    {GENRES.map((g) => (
      <button
        key={g}
        type="button"
        onClick={() => onSelect(g)}
        className={`btn btn-sm rounded-pill ${
          selected === g ? "btn-primary" : "btn-outline-secondary"
        }`}
      >
        {g}
      </button>
    ))}
  </div>
);

const FloatingInput = ({ id, label, value, onChange, maxLength }) => (
  <div className="form-floating mb-3">
    <input
      id={id}
      className="form-control"
      placeholder={label}
      value={value}
      onChange={({ target }) => onChange(target.value)}
      maxLength={maxLength}
      required
    />
    <label htmlFor={id}>{label}</label>
  </div>
);

const SubmitButton = ({ loading }) => (
  <button className="btn btn-primary btn-lg w-100" disabled={loading}>
    {loading ? (
      <>
        <span className="spinner-border spinner-border-sm me-2" role="status" />
        Writing...
      </>
    ) : (
      "Generate poem"
    )}
  </button>
);

const ErrorAlert = ({ message, onClose }) => (
  <div className="alert alert-danger alert-dismissible mt-4" role="alert">
    {message}
    <button type="button" className="btn-close" onClick={onClose} />
  </div>
);

const PoemCard = ({ title, content, genre, theme }) => (
  <div className="card shadow-sm border-0 mt-4 poem-card">
    <div className="card-body p-4">
      <h3 className="h5 card-title">{title}</h3>
      <p className="card-text fs-5 fst-italic text-break poem-text">{content}</p>
      <span className="badge text-bg-primary me-2">{genre}</span>
      <span className="badge text-bg-secondary">{theme}</span>
    </div>
  </div>
);

const History = ({ poems }) =>
  poems.length ? (
    <div className="mt-4 mb-5">
      <h3 className="h6 text-uppercase text-body-secondary">Recent poems</h3>
      <ul className="list-group shadow-sm">
        {poems.map(({ title, genre }, i) => (
          <li key={i} className="list-group-item d-flex justify-content-between align-items-start">
            <span>{title}</span>
            <span className="badge text-bg-light">{genre}</span>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

const App = () => {
  const [genre, setGenre] = useState("haiku");
  const [theme, setTheme] = useState("");
  const [poem, setPoem] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHistory().then(setHistory);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPoem(null);
    try {
      setPoem(await createPoem(genre, theme));
      setHistory(await fetchHistory());
    } catch ({ message }) {
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-body-tertiary">
      <nav className="navbar navbar-dark bg-dark mb-4">
        <div className="container">
          <span className="navbar-brand mb-0 h1">
            <span className="me-2">🪶</span>Poetry Demo
          </span>
          <span className="navbar-text small">Spring Boot · Gemini · Azure</span>
        </div>
      </nav>

      <main className="container app-container">
        <div className="card shadow-sm border-0">
          <form className="card-body p-4" onSubmit={handleSubmit}>
            <h2 className="h4 mb-3">Write me a poem</h2>
            <GenreChips selected={genre} onSelect={setGenre} />
            <FloatingInput id="genre" label="Genre" value={genre} onChange={setGenre} maxLength={50} />
            <FloatingInput
              id="theme"
              label="Theme (e.g. code review comments)"
              value={theme}
              onChange={setTheme}
              maxLength={500}
            />
            <SubmitButton loading={loading} />
          </form>
        </div>

        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
        {poem && <PoemCard {...poem} />}
        <History poems={history} />
      </main>
    </div>
  );
};

export default App;
