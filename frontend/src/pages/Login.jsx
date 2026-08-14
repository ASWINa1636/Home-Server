import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/api/auth/login", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("username", res.data.username);
      nav("/");
    } catch { setError("Invalid username or password"); }
  };

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 24 }}>
      <h2>HomeServer Login</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={submit}>
        <input placeholder="Username" value={form.username}
          onChange={e => setForm({...form, username: e.target.value})}
          style={{ width: "100%", marginBottom: 12, padding: 8 }} />
        <input type="password" placeholder="Password" value={form.password}
          onChange={e => setForm({...form, password: e.target.value})}
          style={{ width: "100%", marginBottom: 12, padding: 8 }} />
        <button type="submit" style={{ width: "100%", padding: 10 }}>Login</button>
      </form>
      <p>No account? <Link to="/signup">Sign up</Link></p>
    </div>
  );
}