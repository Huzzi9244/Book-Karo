CourtSync (Booking Hub)

CourtSync is a high-performance, full-stack sports facility reservation system. It provides a seamless experience for players to book courts and a comprehensive "Master Control" panel for administrators to manage system revenue, user data, and real-time reservation scheduling.
🚀 Key Technologies

    Frontend: React (Vite) with a modern, glassmorphism-inspired UI.

    Backend: FastAPI (Python) for rapid, asynchronous request handling.

    Database: MongoDB for flexible, document-based data storage.

    DevOps/Integration: Axios for HTTP communication and CORS middleware for secure cross-origin requests.

🛠 Core Features

    Intelligent Scheduling: Built-in "Double-Booking Engine" that calculates time-slot overlaps to prevent scheduling conflicts.

    Admin Override: A master control dashboard allowing administrators to cancel or modify any existing booking with instant database synchronization.

    Lazy Evaluation: Automated status management that updates expired bookings from "Reserved" to "Completed" dynamically upon retrieval.

    Role-Based Access Control: Differentiated views for standard players and facility administrators.

💻 How to Run This Project

To run this project locally, ensure you have Python and Node.js installed on your machine.
1. Backend Setup

    Open your terminal and navigate to the backend folder:
    Bash

    cd backend

    Install the necessary dependencies:
    Bash

    pip install fastapi uvicorn pymongo pydantic

    Start the server:
    Bash

    uvicorn main:app --reload

2. Frontend Setup

    Open a new terminal window and navigate to the frontend folder:
    Bash

    cd frontend

    Install dependencies:
    Bash

    npm install

    Start the development server:
    Bash

    npm run dev

3. Database

    Ensure you have MongoDB Compass installed and running on localhost:27017.

    The backend will automatically create the sports_booking_db and initialize the courts collection on the first launch.

### 📸 Project Preview
![Admin Dashboard](ss/Screenshot (123).png)
