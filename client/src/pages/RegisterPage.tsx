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

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
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
              <h1>Create your account</h1>
              <p className="muted">Start tracking income and expenses</p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Form.Group controlId="register-name">
              <Form.Label>Name</Form.Label>
              <Form.Control
                autoComplete="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="register-email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="register-password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
              />
              <Form.Text>At least 8 characters</Form.Text>
            </Form.Group>
            <Form.Group controlId="register-confirm">
              <Form.Label>Confirm password</Form.Label>
              <Form.Control
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => update("confirm", e.target.value)}
                required
              />
            </Form.Group>
            <Button type="submit" className="w-100 mt-1" disabled={submitting}>
              {submitting && <Spinner animation="border" size="sm" />}
              {submitting ? "Creating..." : "Create account"}
            </Button>
            <p className="auth-switch">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
