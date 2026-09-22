
import { useState } from "react";
import { checkBackend } from "./services/api";

function App() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCheck() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await checkBackend();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h1>My Backend Connection</h1>

      <button onClick={handleCheck} disabled={loading}>
        {loading ? "Connecting..." : "Test Backend Connection"}
      </button>

      {result && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}

      {error && (
        <p style={{ color: "red" }}>Error: {error}</p>
      )}
    </div>
  );
}

export default App;