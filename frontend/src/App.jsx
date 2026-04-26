import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import CreateRFQ from './components/CreateRFQ';
import RFQDetails from './components/RFQDetails';
import { Package, Plus } from 'lucide-react';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster position="top-right" />
      <div className="min-h-screen flex flex-col selection:bg-blue-200 selection:text-blue-900">
        <header className="glass sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between transition-all duration-300">
            <Link to="/" className="flex items-center space-x-2 text-blue-600 group">
              <div className="bg-blue-600 text-white p-2 rounded-xl group-hover:bg-blue-700 group-hover:scale-105 transition-all shadow-md shadow-blue-500/30">
                <Package size={24} />
              </div>
              <span className="text-xl md:text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                AuctionPro
              </span>
            </Link>
            <nav>
              <Link to="/create" className="flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold text-sm shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transform">
                <Plus size={18} className="mr-1.5 hidden sm:inline-block" />
                <span>Create RFQ</span>
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in relative z-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-slow -z-10 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-slow -z-10 transform translate-x-1/3 -translate-y-1/4 pointer-events-none" style={{ animationDelay: '1s' }}></div>
          
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CreateRFQ />} />
            <Route path="/rfq/:id" element={<RFQDetails />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
