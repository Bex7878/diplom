import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SpotCheck from './SpotCheck';
import Login from './Login';
import Register from './Register';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route 
                        path="/" 
                        element={
                            <ProtectedRoute>
                                <SpotCheck />
                            </ProtectedRoute>
                        } 
                    />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
