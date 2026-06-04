import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Home, Calendar, LogOut, Clock, MapPin, Shield, XCircle, AlertTriangle, Edit2, Save } from 'lucide-react';

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state || { first_name: "Player", role: "user", email: "" };

  const [activeMenu, setActiveMenu] = useState('book'); 
  const [bookingTab, setBookingTab] = useState('current'); 
  
  const [bookings, setBookings] = useState([]);
  const [adminBookings, setAdminBookings] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- MODAL STATES ---
  const [bookingToCancel, setBookingToCancel] = useState(null); 
  const [cancelMessage, setCancelMessage] = useState(null); 
  
  // --- ADMIN MODAL STATES ---
  const [adminBookingToCancel, setAdminBookingToCancel] = useState(null); 
  const [editBooking, setEditBooking] = useState(null); 
  const [adminError, setAdminError] = useState(null); 

  const handleLogout = () => navigate('/');

  const selectSport = (sportName) => {
    navigate('/book', { state: { user: user, sport: sportName } });
  };

  useEffect(() => {
    if (activeMenu === 'my-bookings') {
      const fetchBookings = async () => {
        setLoading(true);
        try {
          const response = await axios.get(`http://localhost:8000/my-bookings/${user.email}`);
          const fetchedData = Array.isArray(response.data) ? response.data : response.data.bookings || [];
          setBookings(fetchedData);
          setError(null);
        } catch (err) {
          setError("Could not load bookings. Ensure your backend is running.");
        } finally {
          setLoading(false);
        }
      };
      fetchBookings();
    }
  }, [activeMenu, user.email]);

  useEffect(() => {
    if (activeMenu === 'admin' && user.role === 'admin') {
      const fetchAdminBookings = async () => {
        setLoading(true);
        try {
          const response = await axios.get(`http://localhost:8000/admin/all-bookings`);
          setAdminBookings(response.data);
          setError(null);
        } catch (err) {
          setError("Could not load system data. Ensure your backend is running.");
        } finally {
          setLoading(false);
        }
      };
      fetchAdminBookings();
    }
  }, [activeMenu, user.role]);

  // --- USER CANCEL LOGIC ---
  const executeCancel = async () => {
    if (!bookingToCancel) return;
    try {
      const response = await axios.delete(`http://localhost:8000/cancel-booking/${bookingToCancel}`);
      if (response.data.error) {
        setBookingToCancel(null);
        setCancelMessage(response.data.error);
        return;
      }
      setBookings(prevBookings => prevBookings.filter(b => b._id !== bookingToCancel));
      setBookingToCancel(null);
    } catch (err) {
      setBookingToCancel(null);
      setCancelMessage("Server crashed. Check FastAPI logs.");
    }
  };

  // --- ADMIN SYSTEM CANCEL LOGIC ---
  const executeAdminCancel = async () => {
    if (!adminBookingToCancel) return;
    try {
      const response = await axios.delete(`http://localhost:8000/admin/cancel-booking/${adminBookingToCancel}`);
      if (response.data.error) {
        setAdminBookingToCancel(null);
        setCancelMessage(response.data.error);
        return;
      }
      setAdminBookings(prev => prev.filter(b => b._id !== adminBookingToCancel));
      setAdminBookingToCancel(null);
    } catch (err) {
      setAdminBookingToCancel(null);
      setCancelMessage("Failed to delete system booking. Check connection.");
    }
  };

  // --- ADMIN SYSTEM UPDATE LOGIC ---
  const executeAdminUpdate = async () => {
    if (!editBooking) return;
    
    if (!editBooking.start_time || !editBooking.end_time) {
      setAdminError("Please select both start and end times.");
      return;
    }

    // Calculate duration strictly from the dropdowns
    const calculatedDuration = parseInt(editBooking.end_time.split(':')[0]) - parseInt(editBooking.start_time.split(':')[0]);

    try {
      const payload = {
        court_id: editBooking.court_id,
        date: editBooking.date,
        start_time: editBooking.start_time,
        duration_hours: calculatedDuration
      };

      const response = await axios.put(`http://localhost:8000/admin/update-booking/${editBooking._id}`, payload);
      
      setAdminBookings(prev => prev.map(b => b._id === editBooking._id ? { ...b, ...payload, total_charged: response.data.new_total } : b));
      setEditBooking(null); 
      setAdminError(null);

    } catch (err) {
      setAdminError(err.response?.data?.error || "Failed to update database.");
    }
  };

  // --- TIME GENERATION LOGIC (Mirrored from BookingPage.jsx) ---
  const getAdminStartTimes = () => {
    const times = [];
    for (let i = 0; i < 24; i++) {
      const military = `${i.toString().padStart(2, '0')}:00`;
      const ampm = i >= 12 ? 'PM' : 'AM';
      const displayHour = i === 0 ? 12 : (i > 12 ? i - 12 : i);
      times.push({ value: military, label: `${military} (${displayHour} ${ampm})` });
    }
    return times;
  };

  const getAdminEndTimes = (startTime) => {
    if (!startTime) return [];
    const startHour = parseInt(startTime.split(':')[0]);
    const times = [];
    for (let i = startHour + 1; i <= 24; i++) {
      const military = i === 24 ? "24:00" : `${i.toString().padStart(2, '0')}:00`;
      const ampm = i === 24 ? 'AM' : (i >= 12 ? 'PM' : 'AM');
      const displayHour = i === 24 ? 12 : (i === 0 ? 12 : (i > 12 ? i - 12 : i));
      times.push({ value: military, label: `${military} (${displayHour} ${ampm})` });
    }
    return times;
  };

  const now = new Date();
  const getBookingEndTime = (dateStr, startTimeStr, duration) => {
    const startDateTime = new Date(`${dateStr}T${startTimeStr}:00`);
    return new Date(startDateTime.getTime() + (duration * 60 * 60 * 1000));
  };

  const currentBookings = bookings.filter(b => getBookingEndTime(b.date, b.start_time, b.duration_hours) > now);
  const previousBookings = bookings.filter(b => getBookingEndTime(b.date, b.start_time, b.duration_hours) <= now);
  const displayedBookings = bookingTab === 'current' ? currentBookings : previousBookings;
  const totalSystemRevenue = adminBookings.reduce((sum, b) => sum + (b.total_charged || 0), 0);

  const inputStyle = { width: '100%', padding: '14px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', fontWeight: '600', color: '#0f172a', outline: 'none', marginBottom: '16px' };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '280px', backgroundColor: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', padding: '40px 24px', position: 'fixed', top: 0, left: 0, bottom: 0 }}>
        <div style={{ marginBottom: '60px', paddingLeft: '12px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.04em', lineHeight: '1' }}>BOOKING<br/><span style={{ color: '#2563eb' }}>HUB.</span></h2>
          {user.role === 'admin' && <span style={{ display: 'inline-block', marginTop: '10px', padding: '4px 10px', background: '#2563eb', color: '#fff', fontSize: '0.75rem', fontWeight: '800', borderRadius: '6px', letterSpacing: '1px' }}>ADMINISTRATOR</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          <button onClick={() => setActiveMenu('book')} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', backgroundColor: activeMenu === 'book' ? '#2563eb' : 'transparent', color: activeMenu === 'book' ? '#fff' : '#94a3b8', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Home size={22} /> Book Courts
          </button>
          <button onClick={() => setActiveMenu('my-bookings')} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', backgroundColor: activeMenu === 'my-bookings' ? '#2563eb' : 'transparent', color: activeMenu === 'my-bookings' ? '#fff' : '#94a3b8', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Calendar size={22} /> My Bookings
          </button>
          {user.role === 'admin' && (
            <button onClick={() => setActiveMenu('admin')} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', backgroundColor: activeMenu === 'admin' ? '#2563eb' : 'transparent', color: activeMenu === 'admin' ? '#fff' : '#94a3b8', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <Shield size={22} /> Admin Control
            </button>
          )}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '500', marginBottom: '16px', paddingLeft: '12px' }}>Logged in as <span style={{ color: '#fff', fontWeight: '800' }}>{user.first_name}</span></p>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', padding: '16px 20px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '800', cursor: 'pointer', transition: 'background 0.2s' }}>
            <LogOut size={20} /> Log Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ marginLeft: '280px', flex: 1, padding: '50px 60px' }}>
        
        {activeMenu === 'book' && (
          <div style={{ maxWidth: '1000px', animation: 'fadeIn 0.3s ease-out' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '40px' }}>WELCOME BACK, <span style={{ color: '#2563eb' }}>{user.first_name.toUpperCase()}.</span></h1>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '20px' }}>Select a Sport</h2>
            <div style={{ display: 'flex', gap: '30px' }}>
              <div onClick={() => selectSport('Badminton')} style={{ flex: 1, background: '#fff', borderRadius: '24px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 20px 40px rgba(0,0,0,0.04)', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                <img src="badminton.jpg" alt="Badminton" style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
                <div style={{ padding: '30px' }}><h3 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a' }}>BADMINTON</h3><p style={{ color: '#64748b', fontWeight: '600', fontSize: '1.1rem' }}>1500 PKR / Hour</p></div>
              </div>
              <div onClick={() => selectSport('Padel')} style={{ flex: 1, background: '#fff', borderRadius: '24px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 20px 40px rgba(0,0,0,0.04)', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                <img src="padel.jpg" alt="Padel" style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
                <div style={{ padding: '30px' }}><h3 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a' }}>PADEL</h3><p style={{ color: '#64748b', fontWeight: '600', fontSize: '1.1rem' }}>4000 PKR / Hour</p></div>
              </div>
            </div>
          </div>
        )}

        {activeMenu === 'my-bookings' && (
          <div style={{ maxWidth: '1000px', animation: 'fadeIn 0.3s ease-out' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '30px' }}>YOUR <span style={{ color: '#2563eb' }}>BOOKINGS.</span></h1>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '40px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' }}>
              <button onClick={() => setBookingTab('current')} style={{ background: 'none', border: 'none', fontSize: '1.2rem', fontWeight: '800', cursor: 'pointer', color: bookingTab === 'current' ? '#0f172a' : '#94a3b8', transition: 'color 0.2s', position: 'relative' }}>
                Current Bookings
                {bookingTab === 'current' && <div style={{ position: 'absolute', bottom: '-18px', left: 0, right: 0, height: '4px', backgroundColor: '#2563eb', borderRadius: '4px' }} />}
              </button>
              <button onClick={() => setBookingTab('previous')} style={{ background: 'none', border: 'none', fontSize: '1.2rem', fontWeight: '800', cursor: 'pointer', color: bookingTab === 'previous' ? '#0f172a' : '#94a3b8', transition: 'color 0.2s', position: 'relative' }}>
                Previous Bookings
                {bookingTab === 'previous' && <div style={{ position: 'absolute', bottom: '-18px', left: 0, right: 0, height: '4px', backgroundColor: '#2563eb', borderRadius: '4px' }} />}
              </button>
            </div>
            
            {loading ? <p style={{ fontWeight: '600', color: '#64748b', fontSize: '1.1rem' }}>Loading your history...</p> : error ? <div style={{ padding: '16px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '12px', fontWeight: '600' }}>{error}</div> : displayedBookings.length === 0 ? <p style={{ fontWeight: '600', color: '#64748b' }}>No bookings found.</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {displayedBookings.map((booking, idx) => (
                  <div key={booking._id || idx} style={{ background: '#fff', padding: '24px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <span style={{ padding: '6px 12px', backgroundColor: bookingTab === 'current' ? '#dbeafe' : '#f1f5f9', color: bookingTab === 'current' ? '#1d4ed8' : '#64748b', fontWeight: '800', fontSize: '0.85rem', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{bookingTab === 'current' ? 'Upcoming' : 'Completed'}</span>
                      <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '1.2rem' }}>{booking.total_charged} PKR</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}><MapPin size={20} color="#94a3b8" /><p style={{ fontWeight: '800', color: '#0f172a', fontSize: '1.2rem' }}>Court {booking.court_id}</p></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}><Calendar size={20} color="#94a3b8" /><p style={{ fontWeight: '600', color: '#64748b', fontSize: '1.05rem' }}>{booking.date}</p></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}><Clock size={20} color="#94a3b8" /><p style={{ fontWeight: '600', color: '#64748b', fontSize: '1.05rem' }}>{booking.start_time} <span style={{ opacity: 0.5 }}>({booking.duration_hours} hrs)</span></p></div>

                    {bookingTab === 'current' && (
                      <button onClick={() => setBookingToCancel(booking._id)} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '12px', fontSize: '1rem', fontWeight: '800', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'} onMouseOut={(e) => e.currentTarget.style.background = '#fef2f2'}>
                        <XCircle size={18} /> Cancel Booking
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- VIEW 3: MASTER ADMIN PANEL --- */}
        {activeMenu === 'admin' && user.role === 'admin' && (
          <div style={{ maxWidth: '1200px', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
              <div>
                <span style={{ display: 'inline-block', padding: '6px 16px', background: '#0f172a', color: '#fff', fontWeight: '800', fontSize: '0.85rem', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>Master Control</span>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1' }}>SYSTEM <span style={{ color: '#2563eb' }}>DATA.</span></h1>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>Total System Revenue</p>
                <p style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a' }}>{totalSystemRevenue.toLocaleString()} PKR</p>
              </div>
            </div>

            {loading ? <p style={{ fontWeight: '600', color: '#64748b', fontSize: '1.1rem' }}>Accessing secure database...</p> : error ? <div style={{ padding: '16px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '12px', fontWeight: '600' }}>{error}</div> : adminBookings.length === 0 ? <p style={{ fontWeight: '600', color: '#64748b' }}>No system bookings found.</p> : (
              <div style={{ background: '#fff', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.04)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <tr>
                      {['Player Info', 'Court', 'Date', 'Time', 'Duration', 'Total Paid', 'Actions'].map((header) => (
                        <th key={header} style={{ padding: '24px', fontWeight: '800', color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adminBookings.map((booking, idx) => (
                      <tr key={booking._id || idx} style={{ borderBottom: idx === adminBookings.length - 1 ? 'none' : '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                        
                        <td style={{ padding: '20px 24px' }}>
                          <p style={{ fontWeight: '800', color: '#0f172a', margin: 0, fontSize: '1.05rem' }}>{booking.user_name || 'Loading...'}</p>
                          <p style={{ fontWeight: '600', color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>{booking.user_phone || 'No Phone'}</p>
                          <p style={{ fontWeight: '500', color: '#94a3b8', fontSize: '0.85rem', margin: '2px 0 0 0' }}>{booking.user_email}</p>
                        </td>

                        <td style={{ padding: '20px 24px', fontWeight: '800', color: '#2563eb' }}>{booking.court_id}</td>
                        <td style={{ padding: '20px 24px', fontWeight: '500', color: '#64748b' }}>{booking.date}</td>
                        <td style={{ padding: '20px 24px', fontWeight: '600', color: '#0f172a' }}>{booking.start_time}</td>
                        <td style={{ padding: '20px 24px', fontWeight: '500', color: '#64748b' }}>{booking.duration_hours} {booking.duration_hours > 1 ? 'hrs' : 'hr'}</td>
                        <td style={{ padding: '20px 24px', fontWeight: '800', color: '#0f172a' }}>{booking.total_charged} PKR</td>
                        
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => {
                                // Dynamically calculate the end time string to pre-fill the modal
                                const endHour = parseInt(booking.start_time.split(':')[0]) + booking.duration_hours;
                                const end_time = endHour === 24 ? "24:00" : `${endHour.toString().padStart(2, '0')}:00`;
                                setEditBooking({ ...booking, end_time: end_time });
                              }}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                              title="Edit Booking"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => setAdminBookingToCancel(booking._id)}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                              title="Delete Booking"
                            >
                              <XCircle size={18} />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* --- ADMIN EDIT MODAL --- */}
      {editBooking && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '450px', borderRadius: '32px', padding: '40px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease-out' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', lineHeight: '1.1' }}>OVERRIDE <span style={{ color: '#2563eb' }}>DATA.</span></h3>
              <button onClick={() => {setEditBooking(null); setAdminError(null);}} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><XCircle size={28} /></button>
            </div>

            {adminError && (
              <div style={{ padding: '12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} /> {adminError}
              </div>
            )}

            <label style={{ display: 'block', fontWeight: '800', color: '#0f172a', marginBottom: '8px', fontSize: '0.9rem', textTransform: 'uppercase' }}>Target Court</label>
            <select value={editBooking.court_id} onChange={(e) => setEditBooking({...editBooking, court_id: e.target.value})} style={inputStyle}>
              {['B1', 'B2', 'P1', 'P2', 'P3'].map(court => <option key={court} value={court}>Court {court}</option>)}
            </select>

            <label style={{ display: 'block', fontWeight: '800', color: '#0f172a', marginBottom: '8px', fontSize: '0.9rem', textTransform: 'uppercase' }}>Match Date</label>
            <input type="date" value={editBooking.date} onChange={(e) => setEditBooking({...editBooking, date: e.target.value})} style={inputStyle} />

            <div style={{ display: 'flex', gap: '16px' }}>
              
              {/* REPLACED DURATION WITH DYNAMIC END TIME */}
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontWeight: '800', color: '#0f172a', marginBottom: '8px', fontSize: '0.9rem', textTransform: 'uppercase' }}>Start Time</label>
                <select 
                  value={editBooking.start_time} 
                  onChange={(e) => setEditBooking({...editBooking, start_time: e.target.value, end_time: ''})} 
                  style={inputStyle}
                >
                  <option value="" disabled>Select Start</option>
                  {getAdminStartTimes().map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontWeight: '800', color: '#0f172a', marginBottom: '8px', fontSize: '0.9rem', textTransform: 'uppercase' }}>End Time</label>
                <select 
                  value={editBooking.end_time || ''} 
                  onChange={(e) => setEditBooking({...editBooking, end_time: e.target.value})} 
                  disabled={!editBooking.start_time} 
                  style={{ ...inputStyle, opacity: !editBooking.start_time ? 0.5 : 1 }}
                >
                  <option value="" disabled>Select End</option>
                  {getAdminEndTimes(editBooking.start_time).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

            </div>

            <button onClick={executeAdminUpdate} style={{ width: '100%', padding: '16px', marginTop: '10px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '800', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }} onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'} onMouseOut={(e) => e.currentTarget.style.background = '#0f172a'}>
              <Save size={20} /> FORCE UPDATE
            </button>
          </div>
        </div>
      )}

      {/* --- ADMIN DELETE CONFIRMATION MODAL --- */}
      {adminBookingToCancel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '32px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease-out' }}>
            <AlertTriangle size={60} color="#ef4444" style={{ margin: '0 auto', marginBottom: '20px' }} />
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', marginBottom: '10px', lineHeight: '1.1' }}>ADMIN OVERRIDE</h3>
            <p style={{ color: '#64748b', fontSize: '1.05rem', fontWeight: '500', marginBottom: '30px' }}>Permanently delete this user's reservation from the database?</p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={() => setAdminBookingToCancel(null)} style={{ flex: 1, padding: '16px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: '800', cursor: 'pointer', transition: 'background 0.2s' }}>Cancel</button>
              <button onClick={executeAdminCancel} style={{ flex: 1, padding: '16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: '800', cursor: 'pointer', transition: 'background 0.2s' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* --- STANDARD USER CONFIRMATION MODALS --- */}
      {bookingToCancel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '32px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease-out' }}>
            <AlertTriangle size={60} color="#ef4444" style={{ margin: '0 auto', marginBottom: '20px' }} />
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', marginBottom: '10px', lineHeight: '1.1' }}>CANCEL MATCH?</h3>
            <p style={{ color: '#64748b', fontSize: '1.05rem', fontWeight: '500', marginBottom: '30px' }}>This action cannot be undone. You will lose your reserved slot.</p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={() => setBookingToCancel(null)} style={{ flex: 1, padding: '16px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: '800', cursor: 'pointer', transition: 'background 0.2s' }}>Keep It</button>
              <button onClick={executeCancel} style={{ flex: 1, padding: '16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: '800', cursor: 'pointer', transition: 'background 0.2s' }}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}

      {cancelMessage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '32px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease-out' }}>
            <XCircle size={60} color="#ef4444" style={{ margin: '0 auto', marginBottom: '20px' }} />
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', marginBottom: '10px', lineHeight: '1.1' }}>ACTION FAILED</h3>
            <p style={{ color: '#64748b', fontSize: '1.05rem', fontWeight: '500', marginBottom: '30px' }}>{cancelMessage}</p>
            <button onClick={() => setCancelMessage(null)} style={{ width: '100%', padding: '16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: '800', cursor: 'pointer', transition: 'background 0.2s' }}>Got it</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;