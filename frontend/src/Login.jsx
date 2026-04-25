import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
            const response = await axios.post(`${apiUrl}/api/auth/login`, 
                `username=${username}&password=${password}`, 
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    withCredentials: true
                }
            );
            
            if (response.status === 200) {
                navigate('/');
            }
        } catch (err) {
            setError('Invalid username or password');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg">
                <h3 className="text-2xl font-bold text-center">Login to your account</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mt-4">
                        <div>
                            <label className="block" htmlFor="username">Username</label>
                            <input 
                                type="text" 
                                placeholder="Username"
                                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mt-4">
                            <label className="block">Password</label>
                            <input 
                                type="password" 
                                placeholder="Password"
                                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex flex-col items-center justify-between">
                            <button className="w-full px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-900">Login</button>
                            <div className="mt-4 text-grey-dark">
                                Don't have an account? 
                                <Link to="/register" className="text-blue-600 hover:underline ml-1">
                                    Sign up
                                </Link>
                            </div>
                        </div>
                        {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
