import React, { useState, useEffect, useCallback } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import './App.css'; // Import the new CSS file

// --- Configuration ---
// In a real app, these would be in a .env file.
const API_URL = process.env.REACT_APP_API_URL; // Your Flask backend URL
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID; // Replace with your actual Google Client ID

// --- API Helper ---
const api = {
  async request(endpoint, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json',
      'x-access-token': localStorage.getItem('token') || '',
    };
    const config = { method, headers };
    if (body) {
      config.body = JSON.stringify(body);
    }
    try {
      const response = await fetch(`${API_URL}${endpoint}`, config);
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
      }
      return response.json();
    } catch (error) {
      console.error('API request error:', error);
      return { message: 'Network error or server is down.' };
    }
  },
};

// --- Components ---

function AuthForm({ setIsLoggedIn }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const payload = { email, password };
    const data = await api.request(endpoint, 'POST', payload);
    if (data.token) {
      localStorage.setItem('token', data.token);
      setIsLoggedIn(true);
    } else if (data.message && !isLogin) {
      setMessage(data.message + " Now you can log in.");
      setIsLogin(true);
    } else {
      setError(data.message || 'An error occurred.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const googleToken = credentialResponse.credential;
    const data = await api.request('/auth/google-login', 'POST', { token: googleToken });
    if (data.token) {
      localStorage.setItem('token', data.token);
      setIsLoggedIn(true);
    } else {
      setError(data.message || 'Google login failed.');
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <div className="app-container">
      <div className="auth-card">
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="******************"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn" type="submit">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <div className="divider">or</div>
        <div className="google-login-container">
          <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} useOneTap />
        </div>
        <div className="toggle-auth">
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TodoList({ setIsLoggedIn }) {
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [editingTodo, setEditingTodo] = useState(null);
  const [editingText, setEditingText] = useState('');

  const fetchTodos = useCallback(async () => {
    const data = await api.request('/api/todos');
    if (data.todos) setTodos(data.todos);
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    await api.request('/api/todos', 'POST', { text: newTodoText });
    setNewTodoText('');
    fetchTodos();
  };

  const handleDeleteTodo = async (id) => {
    await api.request(`/api/todos/${id}`, 'DELETE');
    fetchTodos();
  };

  const handleToggleComplete = async (todo) => {
    await api.request(`/api/todos/${todo.id}`, 'PUT', { ...todo, completed: !todo.completed });
    fetchTodos();
  };

  const handleStartEditing = (todo) => {
    setEditingTodo(todo.id);
    setEditingText(todo.text);
  };

  const handleCancelEditing = () => {
    setEditingTodo(null);
    setEditingText('');
  };

  const handleUpdateTodo = async (e) => {
    e.preventDefault();
    if (!editingText.trim() || !editingTodo) return;
    await api.request(`/api/todos/${editingTodo}`, 'PUT', { text: editingText });
    setEditingTodo(null);
    setEditingText('');
    fetchTodos();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  return (
    <div className="app-container">
      <div className="todo-container">
        <div className="todo-header">
          <h1>My Todos</h1>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
        <form onSubmit={handleAddTodo} className="add-todo-form">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder="What needs to be done?"
          />
          <button type="submit">Add</button>
        </form>
        <ul className="todo-list">
          {todos.map((todo) => (
            <li key={todo.id} className="todo-item">
              {editingTodo === todo.id ? (
                <form onSubmit={handleUpdateTodo} className="edit-form">
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="save-btn">Save</button>
                  <button type="button" onClick={handleCancelEditing} className="cancel-btn">Cancel</button>
                </form>
              ) : (
                <>
                  <div className="todo-content" onClick={() => handleToggleComplete(todo)}>
                    <input type="checkbox" checked={todo.completed} readOnly />
                    <span className={`todo-text ${todo.completed ? 'completed' : ''}`}>
                      {todo.text}
                    </span>
                  </div>
                  <div className="todo-actions">
                    <button onClick={() => handleStartEditing(todo)} className="edit-btn">Edit</button>
                    <button onClick={() => handleDeleteTodo(todo.id)} className="delete-btn">Delete</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {isLoggedIn ? <TodoList setIsLoggedIn={setIsLoggedIn} /> : <AuthForm setIsLoggedIn={setIsLoggedIn} />}
    </GoogleOAuthProvider>
  );
}
