import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";
import { useAuth } from "../context/auth-context";
import { getErrorMessage } from "../api/client";
import Brand from "../components/Brand";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <Card.Body>
          <Form className="d-flex flex-column gap-3" onSubmit={handleSubmit}>
            <div className="auth-head">
              <Brand size="lg" />
              <h1>Welcome back</h1>
              <p className="muted">Log in to track your home expenses</p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Form.Group controlId="login-email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="login-password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>
            <Button type="submit" className="w-100 mt-1" disabled={submitting}>
              {submitting && <Spinner animation="border" size="sm" />}
              {submitting ? "Logging in..." : "Log in"}
            </Button>
            <p className="auth-switch">
              New here? <Link to="/register">Create an account</Link>
            </p>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
