import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Clock, AlertCircle, TrendingDown, Activity, Tag, ShieldAlert, ArrowLeft, ArrowDown, Send, CheckCircle2, Info, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function RFQDetails() {
  const { id } = useParams();
  const [rfq, setRfq] = useState(null);
  const [bids, setBids] = useState([]);
  const [logs, setLogs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isAuctionActive, setIsAuctionActive] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isExtending, setIsExtending] = useState(false);

  const prevCloseDiffRef = useRef(null);
  const isActiveRef = useRef(false);
  const hasStartedRef = useRef(false);


  const [bidForm, setBidForm] = useState({
    supplier_id: '',
    freight_charges: '',
    origin_charges: '',
    destination_charges: '',
    transit_time: '',
    quote_validity: ''
  });
  const [bidError, setBidError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRFQDetails = async () => {
    try {
      const apiResponse = await fetch(`http://localhost:5000/api/rfqs/${id}`);
      const responseData = await apiResponse.json();
      setRfq(responseData);
      setBids(responseData.bids || []);
      setLogs(responseData.activity_logs || []);
    } catch (apiError) {
      console.error(apiError);
    }
  };

  useEffect(() => {
    fetchRFQDetails();
    fetch('http://localhost:5000/api/suppliers')
      .then(apiResponse => apiResponse.json())
      .then(responseData => setSuppliers(responseData));

    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_rfq', id);
    });

    newSocket.on('new_bid', (newBid) => {
      setBids(prev => {
        const updated = [...prev, newBid];
        return updated.sort((a, b) => parseFloat(a.total_cost) - parseFloat(b.total_cost) || new Date(a.created_at) - new Date(b.created_at));
      });
    });

    newSocket.on('auction_extended', ({ new_close_time }) => {
      setRfq(prev => ({ ...prev, bid_close_time: new_close_time }));
      setIsExtending(true);
      setTimeout(() => setIsExtending(false), 2000);
    });

    newSocket.on('activity_log_updated', (newLog) => {
      setLogs(prev => [newLog, ...prev]);
    });

    setLoading(false);

    return () => newSocket.disconnect();
  }, [id]);

  useEffect(() => {
    if (!rfq) return;

    const updateTimer = () => {
      const now = new Date();
      const startTime = new Date(rfq.bid_start_time);
      const closeTime = new Date(rfq.bid_close_time);
      const forcedClose = new Date(rfq.forced_bid_close_time);
      
      const closeDiff = closeTime.getTime() - now.getTime();


      if (now >= startTime && !hasStartedRef.current && now < closeTime) {
        toast.success("Bidding has been started!", { icon: '🚀' });
        hasStartedRef.current = true;
      }
      
      if (now > forcedClose) {
        if (isActiveRef.current) {
          toast.error("Bidding has been force closed!", { icon: '🛑' });
          isActiveRef.current = false;
        }
        setIsAuctionActive(false);
        setTimeRemaining('Force Closed');
      } else if (now > closeTime) {
        if (isActiveRef.current) {
          toast.error("Bidding has been closed!", { icon: '🛑' });
          isActiveRef.current = false;
        }
        setIsAuctionActive(false);
        setTimeRemaining('Closed');
      } else if (now < startTime) {
        setIsAuctionActive(false);
        setTimeRemaining('Not Started');
      } else {
        if (!isActiveRef.current) {
           isActiveRef.current = true;
        }
        setIsAuctionActive(true);
        

        if (prevCloseDiffRef.current !== null) {
          if (prevCloseDiffRef.current > 60000 && closeDiff <= 60000) {
            toast('Only 1 minute left!', { 
              icon: '⏳', 
              duration: 5000,
              style: { background: '#fef08a', color: '#854d0e', fontWeight: 'bold' } 
            });
          }
        }
        
        const hours = Math.floor(closeDiff / (1000 * 60 * 60));
        const mins = Math.floor((closeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((closeDiff % (1000 * 60)) / 1000);
        
        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
      
      prevCloseDiffRef.current = closeDiff;
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rfq]);

  const handleBidSubmit = async (event) => {
    event.preventDefault();
    setBidError('');
    setSubmitting(true);
    try {
      const apiResponse = await fetch(`http://localhost:5000/api/rfqs/${id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bidForm)
      });
      const responseData = await apiResponse.json();
      if (!apiResponse.ok) throw new Error(responseData.error || 'Failed to submit bid');
      
      setBidForm({
        ...bidForm,
        freight_charges: '',
        origin_charges: '',
        destination_charges: '',
        transit_time: '',
        quote_validity: ''
      });
      fetchRFQDetails();
    } catch (submitError) {
      setBidError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses = "w-full text-sm font-bold bg-white text-gray-900 rounded-xl border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-3 transition-all";

  if (loading || !rfq) return (
    <div className="flex justify-center items-center h-[60vh]">
      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-12">
      <Link to="/" className="inline-flex items-center text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors mb-6 uppercase tracking-widest">
        <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
      </Link>
      <div className="relative rounded-3xl bg-gray-900 overflow-hidden mb-8 shadow-2xl">
        
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        {isExtending && (
          <div className="absolute inset-0 bg-yellow-500/20 animate-pulse z-0"></div>
        )}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 transform translate-x-1/3 -translate-y-1/4"></div>

        <div className="relative z-10 p-8 md:p-10 flex flex-col lg:flex-row gap-8 justify-between items-center">
          
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
              <span className="px-3 py-1 bg-white/10 text-blue-300 text-xs font-black uppercase tracking-widest rounded-lg border border-white/10 flex items-center backdrop-blur-md">
                <Tag size={12} className="mr-1.5" /> REF: {rfq.id}
              </span>
              <span className={`px-3 py-1 text-xs font-black uppercase tracking-widest rounded-lg border flex items-center ${isAuctionActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                {isAuctionActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>}
                {isAuctionActive ? 'Live Auction' : 'Closed'}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">{rfq.name}</h1>
            
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 mt-6 text-sm font-semibold text-gray-400">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-gray-500">Pickup Date</span>
                <span className="text-gray-200">{format(new Date(rfq.pickup_date), 'PP')}</span>
              </div>
              <div className="h-8 w-px bg-gray-700 hidden sm:block"></div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-gray-500">Started</span>
                <span className="text-gray-200">{format(new Date(rfq.bid_start_time), 'PP p')}</span>
              </div>
              <div className="h-8 w-px bg-gray-700 hidden sm:block"></div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-gray-500 flex items-center"><ShieldAlert size={10} className="mr-1"/> Forced Close</span>
                <span className="text-rose-400">{format(new Date(rfq.forced_bid_close_time), 'PP p')}</span>
              </div>
            </div>
          </div>

          
          <div className="shrink-0 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-blue-400 mb-2">
              {isAuctionActive ? 'Time Remaining' : 'Final Status'}
            </p>
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl min-w-[280px]">
              <div className="text-4xl md:text-6xl font-black text-white tracking-tighter tabular-nums flex items-center justify-center drop-shadow-lg">
                {isAuctionActive && <Clock size={32} className="mr-4 text-blue-500 opacity-80" />}
                {timeRemaining}
              </div>
              {isExtending && <div className="text-yellow-400 text-sm font-black uppercase tracking-widest mt-3 animate-bounce">Auction Extended!</div>}
            </div>
          </div>
        </div>

        <div className="bg-blue-600/20 backdrop-blur-md border-t border-blue-500/20 p-4 px-8 flex items-center gap-4 text-blue-100 text-sm">
          <Info size={20} className="text-blue-400 shrink-0" />
          <p className="font-medium">
            <span className="font-bold text-white uppercase tracking-wider text-xs mr-2 border border-blue-400/30 px-2 py-0.5 rounded">Rules</span> 
            Extends by <strong className="text-white">{rfq.extension_duration_minutes} mins</strong> if a trigger (<strong className="text-white">{rfq.extension_type.replace('_', ' ')}</strong>) occurs in the last <strong className="text-white">{rfq.trigger_window_minutes} mins</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
              <TrendingDown size={28} className="mr-3 text-emerald-500" /> 
              Live Order Book
            </h2>
            <span className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-200">
              {bids.length} Bids
            </span>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/80 text-[10px] uppercase tracking-widest font-black text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-5 w-20">Rank</th>
                    <th className="px-6 py-5">Supplier Name</th>
                    <th className="px-6 py-5 text-right hidden md:table-cell">Details</th>
                    <th className="px-6 py-5 text-right text-gray-900">Total Quote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bids.map((bid, index) => (
                    <tr key={bid.id} className={`group transition-all ${index === 0 ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : 'hover:bg-gray-50/80'}`}>
                      <td className="px-6 py-5">
                        {index === 0 ? (
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-black text-lg shadow-lg shadow-emerald-500/30 transform group-hover:scale-110 transition-transform">
                            L1
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 text-gray-400 font-bold text-sm border border-gray-200 group-hover:text-gray-600 transition-colors">
                            L{index + 1}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-extrabold text-gray-900 text-lg">{bid.supplier_name}</div>
                        <div className="text-xs text-gray-500 font-bold mt-1 flex items-center">
                          <Clock size={12} className="mr-1 opacity-50" />
                          Placed at {format(new Date(bid.created_at), 'HH:mm:ss')}
                        </div>
                        <div className="text-[11px] text-gray-400 font-bold mt-2 block md:hidden bg-gray-50 p-2 rounded-lg">
                          F: {bid.freight_charges} | O: {bid.origin_charges} | D: {bid.destination_charges}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right hidden md:table-cell">
                        <div className="inline-flex flex-col items-end gap-1 text-xs font-bold text-gray-500">
                          <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">Freight: ₹{parseFloat(bid.freight_charges).toFixed(2)}</span>
                          <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">Origin: ₹{parseFloat(bid.origin_charges).toFixed(2)}</span>
                          <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">Dest: ₹{parseFloat(bid.destination_charges).toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className={`font-black text-2xl tracking-tight ${index === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                          ₹{parseFloat(bid.total_cost).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bids.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-24 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-6 border-2 border-dashed border-gray-200">
                          <TrendingDown size={32} className="text-gray-300" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">No Bids Yet</h3>
                        <p className="text-gray-500 font-medium">The order book is empty. Waiting for the first supplier.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          
          {/* Submit Form */}
          <div className={`bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 relative overflow-hidden transition-all ${!isAuctionActive ? 'opacity-80 grayscale-[30%]' : ''}`}>
            {!isAuctionActive && (
              <div className="absolute inset-0 bg-gray-900/5 backdrop-blur-[2px] z-20 flex items-center justify-center flex-col p-6 text-center">
                <div className="w-16 h-16 bg-white text-gray-900 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                  <ShieldAlert size={32} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Auction Closed</h3>
                <p className="text-gray-600 font-bold text-sm">Bidding has concluded for this RFQ.</p>
              </div>
            )}
            
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center tracking-tight">
              <Send size={20} className="mr-3 text-blue-600" /> Submit Quote
            </h2>
            
            {bidError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm font-bold flex items-start">
                <AlertCircle className="mr-2 shrink-0 mt-0.5" size={16} />
                {bidError}
              </div>
            )}
            
            <form onSubmit={handleBidSubmit} className="space-y-4 relative z-10">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Supplier Profile</label>
                <select required name="supplier_id" value={bidForm.supplier_id} onChange={event => setBidForm({...bidForm, supplier_id: event.target.value})} className={`${inputClasses} bg-gray-50`}>
                  <option value="" disabled>Select your company...</option>
                  {suppliers.map(supplierOption => <option key={supplierOption.id} value={supplierOption.id}>{supplierOption.name}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Freight (₹)</label>
                  <input type="number" step="0.01" min="0" required value={bidForm.freight_charges} onChange={event => setBidForm({...bidForm, freight_charges: event.target.value})} className={inputClasses} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Origin (₹)</label>
                  <input type="number" step="0.01" min="0" required value={bidForm.origin_charges} onChange={event => setBidForm({...bidForm, origin_charges: event.target.value})} className={inputClasses} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Dest (₹)</label>
                  <input type="number" step="0.01" min="0" required value={bidForm.destination_charges} onChange={event => setBidForm({...bidForm, destination_charges: event.target.value})} className={inputClasses} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Transit</label>
                  <input type="text" required placeholder="e.g. 3 Days" value={bidForm.transit_time} onChange={event => setBidForm({...bidForm, transit_time: event.target.value})} className={inputClasses} />
                </div>
              </div>
              
              <div className="pt-2">
                <div className="flex justify-between items-end mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100/50">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Value</span>
                  <span className="text-3xl font-black text-blue-700 tracking-tight">
                    ₹{((parseFloat(bidForm.freight_charges||0) + parseFloat(bidForm.origin_charges||0) + parseFloat(bidForm.destination_charges||0)).toLocaleString(undefined, {minimumFractionDigits: 2}))}
                  </span>
                </div>
                <button type="submit" disabled={!isAuctionActive || submitting} className="w-full bg-gray-900 text-white py-4 px-6 rounded-xl hover:bg-blue-600 transition-colors duration-300 font-black text-lg shadow-xl shadow-gray-900/10 disabled:opacity-50 flex justify-center items-center group">
                  {submitting ? 'Processing...' : 'Place Bid Now'} 
                  {!submitting && <ArrowUpRight size={20} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                </button>
              </div>
            </form>
          </div>

          {/* Activity Log */}
          <div className="bg-gray-900 rounded-3xl shadow-xl shadow-gray-900/20 p-6 h-[400px] flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"></div>
            
            <h2 className="text-xl font-black text-white mb-6 flex items-center tracking-tight relative z-10">
              <Activity size={20} className="mr-3 text-blue-500" /> Live Feed
            </h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar relative z-10">
              {logs.map((log, index) => (
                <div key={index} className="flex gap-4 text-sm relative group animate-slide-up">
                  <div className="absolute left-[15px] top-8 bottom-[-24px] w-px bg-gray-800 group-last:hidden"></div>
                  <div className="relative z-10 flex-shrink-0 mt-1">
                    {log.type === 'EXTENSION' ? (
                      <div className="w-8 h-8 rounded-xl bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center shadow-lg shadow-yellow-500/10">
                        <Clock size={14} className="text-yellow-400 font-bold" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/50 flex items-center justify-center shadow-lg shadow-blue-500/10">
                        <CheckCircle2 size={14} className="text-blue-400" />
                      </div>
                    )}
                  </div>
                  <div className={`flex-1 p-4 rounded-2xl border ${log.type === 'EXTENSION' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-gray-800/50 border-gray-700/50'}`}>
                    <p className={`font-bold leading-snug ${log.type === 'EXTENSION' ? 'text-yellow-200' : 'text-gray-200'}`}>{log.message}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-2 font-black">{format(new Date(log.timestamp), 'HH:mm:ss')}</p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Activity size={40} className="text-gray-800 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest text-gray-600">Awaiting Activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RFQDetails;
