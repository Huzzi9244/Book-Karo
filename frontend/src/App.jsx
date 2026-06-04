import React, { useState } from 'react';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react'; // Re-importing just the eyes
import { useNavigate } from 'react-router-dom'; // NEW IMPORT

function App() {
  const navigate = useNavigate(); // Initialize the navigate hook
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); // Stores our custom errors
  
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', phone: '', email: '', password: ''
  });

  // Updates storage when typing and clears errors
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage(''); // Hide error as soon as they start typing again
  };

  // This fixes the "Ghost Text" by wiping the state clean when you toggle
  const handleToggle = () => {
    setIsLogin(!isLogin);
    setErrorMessage('');
    setFormData({ first_name: '', last_name: '', phone: '', email: '', password: '' });
  };

  const handleSubmit = async () => {
    // 1. FRONTEND VALIDATION
    if (isLogin) {
      if (!formData.email || !formData.password) {
        return setErrorMessage('Email and Password are required fields.');
      }
    } else {
      if (!formData.first_name || !formData.last_name || !formData.phone || !formData.email || !formData.password) {
        return setErrorMessage('All fields are strictly required.');
      }
    }

    if (!formData.email.includes('@')) {
      return setErrorMessage("Please enter a valid email containing '@'.");
    }

    // 2. BACKEND COMMUNICATION
    try {
      if (isLogin) {
        const response = await axios.post("http://localhost:8000/signin", {
          email: formData.email,
          password: formData.password
        });
        
        // This fixes the Fake Success bug!
        if (response.data.error) {
          return setErrorMessage(response.data.error);
        }

        navigate('/dashboard', { state: { ...response.data, email: formData.email } });
        
      } else {
        const response = await axios.post("http://localhost:8000/signup", {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          role: "user"
        });

        if (response.data.error) {
          return setErrorMessage(response.data.error);
        }

        alert("Account Created! You can now log in.");
        handleToggle(); // Automatically switches to login and clears the form
      }
    } catch (error) {
      setErrorMessage("Could not connect to the server. Is FastAPI running?");
    }
  };

  return (
    <div className="auth-container">
      
      <div className="brand-section">
        <div>
          <span className="brand-tag">Booking Hub</span>
          <h1>
            PLAY.<br/>
            SWEAT.<br/>
            <span>REPEAT.</span>
          </h1>
        </div>
        <div>
          <p className="brand-footer">Badminton & Padel Courts</p>
        </div>
      </div>

      <div className="form-section">
        <div className="form-header">
          <h2>{isLogin ? 'Welcome back.' : 'Join the club.'}</h2>
          <p>{isLogin ? 'Enter your details to access your dashboard.' : 'Sign up to start booking instantly.'}</p>
        </div>

        {/* Display Errors Beautifully */}
        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}

        <form>
          {!isLogin && (
            <div className="input-row">
              {/* Added value={} to all inputs. This makes them "controlled" */}
              <input type="text" name="first_name" value={formData.first_name} placeholder="First Name" onChange={handleChange} className="clean-input" />
              <input type="text" name="last_name" value={formData.last_name} placeholder="Last Name" onChange={handleChange} className="clean-input" />
            </div>
          )}
          
          {!isLogin && (
            <input type="tel" name="phone" value={formData.phone} placeholder="Phone Number" onChange={handleChange} className="clean-input" />
          )}

          <input type="email" name="email" value={formData.email} placeholder="Email address" onChange={handleChange} className="clean-input" />
          
          {/* The new Password Container with Eye Icon */}
          <div className="password-container">
            <input 
              type={showPassword ? "text" : "password"} 
              name="password" 
              value={formData.password} 
              placeholder="Password" 
              onChange={handleChange} 
              className="clean-input" 
            />
            <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button type="button" onClick={handleSubmit} className="primary-button">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="toggle-text">
          {isLogin ? "New around here?" : "Already a member?"}
          <span className="toggle-link" onClick={handleToggle}>
            {isLogin ? 'Sign up' : 'Log in'}
          </span>
        </div>
      </div>

    </div>
  );
}

export default App;