import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

export default function Signup() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/api/auth/signup", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("username", res.data.username);
      nav("/");
    } catch (err) { setError(err.response?.data?.detail || "Signup failed"); }
  };

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 24 }}>
      <h2>Create Account</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={submit}>
        <input placeholder="Username" value={form.username}
          onChange={e => setForm({...form, username: e.target.value})}
          style={{ width: "100%", marginBottom: 12, padding: 8 }} />
        <input placeholder="Email" value={form.email}
          onChange={e => setForm({...form, email: e.target.value})}
          style={{ width: "100%", marginBottom: 12, padding: 8 }} />
        <input type="password" placeholder="Password" value={form.password}
          onChange={e => setForm({...form, password: e.target.value})}
          style={{ width: "100%", marginBottom: 12, padding: 8 }} />
        <button type="submit" style={{ width: "100%", padding: 10 }}>Create Account</button>
      </form>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}