import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";

// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import CompleteProfile from "@/pages/CompleteProfile";
import Home from "@/pages/Home";
import CreateRequest from "@/pages/CreateRequest";
import RequestDetail from "@/pages/RequestDetail";
import CreateAvailability from "@/pages/CreateAvailability";
import Crews from "@/pages/Crews";
import CreateCrew from "@/pages/CreateCrew";
import CrewDetail from "@/pages/CrewDetail";
import ClubList from "@/pages/ClubList";
import ClubDetail from "@/pages/ClubDetail";
import Favorites from "@/pages/Favorites";
import Profile from "@/pages/Profile";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, player } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to complete profile if not complete
  if (player && !player.profile_complete && window.location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  return children;
};

// Public Route (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, player } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (isAuthenticated && player?.profile_complete) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <Landing />
          </PublicRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />

      {/* Profile completion (semi-protected) */}
      <Route
        path="/complete-profile"
        element={
          <ProtectedRoute>
            <CompleteProfile />
          </ProtectedRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/new"
        element={
          <ProtectedRoute>
            <CreateRequest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/:id"
        element={
          <ProtectedRoute>
            <RequestDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/availability/new"
        element={
          <ProtectedRoute>
            <CreateAvailability />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crews"
        element={
          <ProtectedRoute>
            <Crews />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crews/new"
        element={
          <ProtectedRoute>
            <CreateCrew />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crews/:id"
        element={
          <ProtectedRoute>
            <CrewDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clubs"
        element={
          <ProtectedRoute>
            <ClubList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clubs/:id"
        element={
          <ProtectedRoute>
            <ClubDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/favorites"
        element={
          <ProtectedRoute>
            <Favorites />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-center" />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
