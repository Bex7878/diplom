import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SpotCheck from './SpotCheck';
import Login from './Login';
import Register from './Register';
import LotSearch from './LotSearch';
import Layout from './Layout';
import AdminPanel from './AdminPanel';
import TopRisks from './TopRisks';

// A simple protected route component
const ProtectedRoute = ({ children, adminOnly = false }) => {
    const userRole = localStorage.getItem('userRole');
    
    // In a real app, you'd also verify the session with the backend
    if (!userRole) {
        return <Navigate to="/login" />;
    }

    if (adminOnly && userRole !== 'ROLE_ADMIN') {
        return <Navigate to="/" />;
    }

    return <Layout>{children}</Layout>;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route 
                    path="/" 
                    element={
                        <ProtectedRoute>
                            <SpotCheck />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/lots" 
                    element={
                        <ProtectedRoute>
                            <LotSearch />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/top-risks" 
                    element={
                        <ProtectedRoute>
                            <TopRisks />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/admin" 
                    element={
                        <ProtectedRoute adminOnly={true}>
                            <AdminPanel />
                        </ProtectedRoute>
                    } 
                />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;
