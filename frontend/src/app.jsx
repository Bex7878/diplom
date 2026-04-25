import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SpotCheck from './SpotCheck';
import Login from './Login';

// A simple protected route component
const ProtectedRoute = ({ children }) => {
    // In a real app, you'd check for a session cookie or a token in localStorage/context
    // For now, we'll assume the backend handles session validation on API calls
    return children;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route 
                    path="/" 
                    element={
                        <ProtectedRoute>
                            <SpotCheck />
                        </ProtectedRoute>
                    } 
                />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;
