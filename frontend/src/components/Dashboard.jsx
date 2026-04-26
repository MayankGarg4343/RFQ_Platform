import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Plus, IndianRupee, Activity, Box, ArrowRight, TrendingUp, CheckCircle, Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function Dashboard() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/rfqs')
      .then(apiResponse => apiResponse.json())
      .then(fetchedRfqs => {
        setRfqs(fetchedRfqs);
        setLoading(false);
      })
      .catch(fetchError => {
        console.error(fetchError);
        setLoading(false);
      });
  }, []);

  const getStatus = (rfq) => {
    const now = new Date();
    const close = new Date(rfq.bid_close_time);
    const forceClose = new Date(rfq.forced_bid_close_time);

    if (now > forceClose) return 'Force Closed';
    if (now > close) return 'Closed';
    return 'Active';
  };

  const getStatusColor = (status) => {
    if (status === 'Active') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (status === 'Closed') return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const activeCount = rfqs.filter(rfqItem => getStatus(rfqItem) === 'Active').length;
  const closedCount = rfqs.filter(rfqItem => getStatus(rfqItem) !== 'Active').length;

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Manage and monitor all your requests for quotation in real-time.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="glass-card px-6 py-4 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Flame size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Auctions</p>
              <p className="text-2xl font-black text-gray-900">{activeCount}</p>
            </div>
          </div>
          <div className="glass-card px-6 py-4 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-gray-50 text-gray-600 rounded-xl">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-black text-gray-900">{closedCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {rfqs.map((rfqItem, index) => {
          const status = getStatus(rfqItem);
          const closeTime = new Date(rfqItem.bid_close_time);
          
          return (
            <Link 
              key={rfqItem.id} 
              to={`/rfq/${rfqItem.id}`} 
              className="group relative bg-white/60 backdrop-blur-xl border border-white rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-1 overflow-hidden"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-gradient-to-br from-blue-100/50 to-indigo-100/50 blur-2xl group-hover:scale-150 transition-transform duration-500 -z-10"></div>
              
              <div className="flex justify-between items-start mb-6">
                <span className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-black rounded-lg border flex items-center ${getStatusColor(status)}`}>
                  {status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>}
                  {status}
                </span>
                <div className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <ArrowRight size={16} />
                </div>
              </div>
              
              <h3 className="font-extrabold text-xl text-gray-900 leading-tight line-clamp-2 mb-6 group-hover:text-blue-600 transition-colors">
                {rfqItem.name}
              </h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center text-sm font-medium text-gray-600">
                  <Clock size={16} className="mr-3 text-gray-400" />
                  <span>Closes: <span className="text-gray-900">{closeTime.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></span>
                </div>
                
                {status === 'Active' ? (
                  <div className="flex items-center text-sm font-bold text-orange-600 bg-orange-50/80 px-3 py-2 rounded-xl border border-orange-100/50 w-max">
                    <Activity size={16} className="mr-2" />
                    Ends in {formatDistanceToNow(closeTime)}
                  </div>
                ) : (
                  <div className="flex items-center text-sm font-bold text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 w-max">
                    <CheckCircle size={16} className="mr-2" />
                    Auction Finalized
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lowest Bid</p>
                <div className="flex items-center">
                  {rfqItem.lowest_bid ? (
                    <>
                      <span className="text-2xl font-black text-gray-900 tracking-tight">
                        ₹{parseFloat(rfqItem.lowest_bid).toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-gray-300">No bids yet</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}

        {rfqs.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 glass-card rounded-3xl border-dashed border-2 border-gray-200">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mb-6">
              <Box size={40} className="text-blue-500" />
            </div>
            <h3 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">Empty Dashboard</h3>
            <p className="text-gray-500 font-medium mb-8 max-w-sm text-center">You haven't created any Requests for Quotation yet. Let's get started.</p>
            <Link to="/create" className="inline-flex items-center bg-gray-900 text-white px-8 py-4 rounded-2xl hover:shadow-2xl hover:shadow-gray-900/20 transition-all font-bold text-lg transform hover:-translate-y-1">
              <Plus size={24} className="mr-2" />
              Create New RFQ
            </Link>
          </div>
        )}
        
      </div>
    </div>
  );
}

export default Dashboard;
