import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
            const response = await axios.post(`${apiUrl}/api/auth/register`, {
                username,
                password,
                role: 'ROLE_USER'
            });
            
            if (response.status === 200) {
                setSuccess('Registration successful! Redirecting to login...');
                setTimeout(() => navigate('/login'), 2000);
            }
        } catch (err) {
            setError(err.response?.data || 'Registration failed. Username might be taken.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg w-96">
                <h3 className="text-2xl font-bold text-center">Create an account</h3>
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
                        <div className="mt-4">
                            <label className="block">Confirm Password</label>
                            <input 
                                type="password" 
                                placeholder="Confirm Password"
                                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex flex-col items-center justify-between">
                            <button className="w-full px-6 py-2 mt-4 text-white bg-green-600 rounded-lg hover:bg-green-700">Register</button>
                            <div className="mt-4 text-grey-dark">
                                Already have an account? 
                                <Link to="/login" className="text-blue-600 hover:underline ml-1">
                                    Log in
                                </Link>
                            </div>
                        </div>
                        {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                        {success && <p className="text-green-500 text-sm mt-2 text-center">{success}</p>}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
