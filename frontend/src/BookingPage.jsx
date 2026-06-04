import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown, ArrowLeft, CheckCircle } from 'lucide-react'; // Added Arrow and Checkmark

function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Catches the data from the Dashboard
  const { user, sport } = location.state || { user: { first_name: "Player" }, sport: "Badminton" };

  const [courtId, setCourtId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  
  // MODAL STATE: Holds the receipt data to show in the pop-up
  const [receipt, setReceipt] = useState(null);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    setStartTime(''); setEndTime('');
  }, [date]);

  const getAvailableStartTimes = () => {
    if (!date) return [];
    let startHour = date === today ? new Date().getHours() + 1 : 0;
    const times = [];
    for (let i = startHour; i < 24; i++) {
      const military = `${i.toString().padStart(2, '0')}:00`;
      const ampm = i >= 12 ? 'PM' : 'AM';
      const displayHour = i === 0 ? 12 : (i > 12 ? i - 12 : i);
      times.push({ value: military, label: `${military} (${displayHour} ${ampm})` });
    }
    return times;
  };

  const getAvailableEndTimes = () => {
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

  let calculatedDuration = startTime && endTime ? parseInt(endTime.split(':')[0]) - parseInt(startTime.split(':')[0]) : 0;
  const estimatedTotal = calculatedDuration > 0 ? calculatedDuration * (sport === 'Badminton' ? 1500 : 4000) : 0;

  const handleBooking = async () => {
    if (!courtId || !date || !startTime || !endTime) {
      return setErrorMsg('Please complete all fields before confirming.');
    }

    try {
      const response = await axios.post("http://localhost:8000/book-court", {
        user_email: user.email,
        court_id: courtId,
        date: date,
        start_time: startTime,
        duration_hours: calculatedDuration,
        status: "Reserved",
        total_charged: 0
      });

      // INSTEAD OF A TEXT MESSAGE, WE TRIGGER THE MODAL!
      setReceipt({
        court: response.data.court,
        total: response.data.total_paid,
        date: date,
        duration: calculatedDuration
      });
      setErrorMsg(null);
      
    } catch (error) {
      setErrorMsg(error.response?.data?.error || "Connection error.");
    }
  };

  const dropdownStyle = {
    width: '100%', padding: '16px', appearance: 'none', background: '#f8fafc', 
    border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem', 
    fontWeight: '600', color: '#0f172a', outline: 'none', cursor: 'pointer'
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '40px', position: 'relative' }}>
      
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* BACK ARROW & HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
          <button 
            onClick={() => navigate('/dashboard', { state: user })}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '50px', height: '50px', background: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
          >
            <ArrowLeft size={24} color="#0f172a" />
          </button>
          <h1 style={{ fontSize: '3rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.04em', textTransform: 'uppercase' }}>
            {sport} <span style={{ color: '#2563eb' }}>BOOKING</span>
          </h1>
        </div>

        {/* BOOKING FORM */}
        <div style={{ background: 'white', padding: '50px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.04)' }}>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '20px' }}>1. Select Court</h2>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '40px' }}>
            {(sport === 'Badminton' ? ['B1', 'B2'] : ['P1', 'P2', 'P3']).map((id) => (
              <button
                key={id} onClick={() => setCourtId(id)}
                style={{ flex: 1, padding: '20px', fontSize: '1.2rem', fontWeight: '800', borderRadius: '12px', cursor: 'pointer', border: courtId === id ? 'none' : '2px solid #e2e8f0', background: courtId === id ? '#2563eb' : '#fff', color: courtId === id ? '#fff' : '#0f172a' }}
              >
                Court {id}
              </button>
            ))}
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '20px' }}>2. Date & Time</h2>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Date</label>
              <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} style={dropdownStyle} />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Start</label>
              <div style={{ position: 'relative' }}>
                <select value={startTime} onChange={(e) => { setStartTime(e.target.value); setEndTime(''); }} style={dropdownStyle}>
                  <option value="" disabled>Select Start</option>
                  {getAvailableStartTimes().map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} size={20} />
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>End</label>
              <div style={{ position: 'relative' }}>
                <select value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!startTime} style={{...dropdownStyle, opacity: !startTime ? 0.5 : 1 }}>
                  <option value="" disabled>Select End</option>
                  {getAvailableEndTimes().map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} size={20} />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div style={{ padding: '15px', borderRadius: '10px', marginBottom: '20px', fontWeight: '600', textAlign: 'center', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>
              {errorMsg}
            </div>
          )}

          <button 
            onClick={handleBooking}
            style={{ width: '100%', marginTop: '20px', padding: '20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.2rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>CONFIRM BOOKING</span>
            <span>{estimatedTotal > 0 ? `${estimatedTotal} PKR` : ''}</span>
          </button>
        </div>
      </div>

      {/* --- THE SUCCESS MODAL --- */}
      {receipt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          
          <div style={{ background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '32px', padding: '50px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', animation: 'fadeIn 0.3s ease-out' }}>
            
            <CheckCircle size={80} color="#2563eb" style={{ margin: '0 auto', marginBottom: '20px' }} />
            
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1', marginBottom: '10px' }}>
              YOU'RE IN,<br/>{user.first_name.toUpperCase()}.
            </h2>
            <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: '500', marginBottom: '30px' }}>
              Your reservation has been secured in the database.
            </p>

            <div style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '16px', padding: '20px', textAlign: 'left', marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#64748b', fontWeight: '600' }}>Sport</span>
                <span style={{ color: '#0f172a', fontWeight: '800' }}>{sport}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#64748b', fontWeight: '600' }}>Court</span>
                <span style={{ color: '#0f172a', fontWeight: '800' }}>{receipt.court}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#64748b', fontWeight: '600' }}>Date</span>
                <span style={{ color: '#0f172a', fontWeight: '800' }}>{receipt.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '2px dashed #cbd5e1', marginTop: '10px' }}>
                <span style={{ color: '#0f172a', fontWeight: '800' }}>Total Paid</span>
                <span style={{ color: '#2563eb', fontWeight: '800', fontSize: '1.2rem' }}>{receipt.total} PKR</span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/dashboard', { state: user })}
              style={{ width: '100%', padding: '20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '1.1rem', fontWeight: '800', cursor: 'pointer' }}
            >
              Back to Dashboard
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

export default BookingPage;