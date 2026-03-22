import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('username');
        if (token && storedUser) {
            setUser({ username: storedUser });
        }
        setLoading(false);
    }, [token]);

    const login = async (username, password) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch('http://localhost:8000/token', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('username', data.username);
        setToken(data.access_token);
        setUser({ username: data.username });
        return data;
    };

    const signup = async (username, email, password) => {
        const response = await fetch('http://localhost:8000/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Signup failed');
        }

        return await response.json();
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, signup, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
