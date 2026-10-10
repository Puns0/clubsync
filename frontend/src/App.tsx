import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';

function App() {
  return (
    <div className="min-h-screen bg-brand-offwhite text-brand-ink selection:bg-brand-vermilion selection:text-white">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/clubs" element={<div className="p-8">Clubs Directory Placeholder</div>} />
          <Route path="/schedule" element={<div className="p-8">My Schedule Placeholder</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
