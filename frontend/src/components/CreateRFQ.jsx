import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Zap, Calendar, Settings2, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';

function CreateRFQ() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    bid_start_time: '',
    bid_close_time: '',
    forced_bid_close_time: '',
    trigger_window_minutes: 10,
    extension_duration_minutes: 5,
    extension_type: 'BID_RECEIVED',
    pickup_date: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const closeTime = new Date(formData.bid_close_time);
    const forceCloseTime = new Date(formData.forced_bid_close_time);
    if (forceCloseTime <= closeTime) {
      setError('Forced close time must be strictly greater than bid close time.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    } 

    setLoading(true);
    try {
      const apiResponse = await fetch('http://localhost:5000/api/rfqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const responseData = await apiResponse.json();
      if (!apiResponse.ok) throw new Error(responseData.error || 'Failed to create RFQ');
      
      toast.success('RFQ successfully created!');
      navigate(`/rfq/${responseData.id}`);
    } catch (submitError) {
      setError(submitError.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-3.5 bg-white/50 backdrop-blur-sm transition-all focus:bg-white hover:border-gray-300";
  const labelClasses = "block text-sm font-semibold text-gray-700 mb-1.5";

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-6">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="glass-card rounded-2xl p-6 md:p-10 relative overflow-hidden">
        
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full opacity-10 blur-2xl"></div>

        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <PackageCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Create New RFQ</h1>
            <p className="text-gray-500 text-sm mt-1">Configure auction parameters and auto-extension rules.</p>
          </div>
        </div>
        
        {error && (
          <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl text-sm font-medium shadow-sm flex items-start">
            <Zap className="mr-2 text-red-500 shrink-0 mt-0.5" size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm mr-3 font-bold">1</span>
              Basic Information
            </h3>
            <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100 space-y-6">
              <div>
                <label className={labelClasses}>RFQ Name / Reference ID</label>
                <input type="text" name="name" required value={formData.name} onChange={handleChange} className={inputClasses} placeholder="e.g., Express Freight: Delhi to Mumbai" />
              </div>
              
              <div>
                <label className={labelClasses}>Pickup / Service Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Calendar size={18} />
                  </div>
                  <input type="date" name="pickup_date" required value={formData.pickup_date} onChange={handleChange} className={`${inputClasses} pl-10`} />
                </div>
              </div>
            </div>
          </div>

          
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm mr-3 font-bold">2</span>
              Auction Timeline
            </h3>
            <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClasses}>Bid Start Time</label>
                <input type="datetime-local" name="bid_start_time" required value={formData.bid_start_time} onChange={handleChange} className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>Bid Close Time</label>
                <input type="datetime-local" name="bid_close_time" required value={formData.bid_close_time} onChange={handleChange} className={inputClasses} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClasses}>Forced Bid Close Time <span className="text-red-500">*</span></label>
                <p className="text-xs text-gray-500 mb-2 font-medium">The absolute maximum time the auction can extend to, regardless of rules.</p>
                <input type="datetime-local" name="forced_bid_close_time" required value={formData.forced_bid_close_time} onChange={handleChange} className={`${inputClasses} border-orange-200 focus:border-orange-500 focus:ring-orange-500`} />
              </div>
            </div>
          </div>

          
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm mr-3 font-bold"><Settings2 size={16}/></span>
              Extension Rules (British Auction)
            </h3>
            <div className="bg-indigo-50/30 p-6 rounded-xl border border-indigo-100 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClasses}>Trigger Window (Minutes)</label>
                  <div className="relative">
                    <input type="number" name="trigger_window_minutes" min="1" required value={formData.trigger_window_minutes} onChange={handleChange} className={`${inputClasses} pr-16`} />
                    <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 text-sm font-medium">mins</span>
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>Extension Duration (Minutes)</label>
                  <div className="relative">
                    <input type="number" name="extension_duration_minutes" min="1" required value={formData.extension_duration_minutes} onChange={handleChange} className={`${inputClasses} pr-16`} />
                    <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 text-sm font-medium">mins</span>
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClasses}>Extension Trigger Condition</label>
                <select name="extension_type" value={formData.extension_type} onChange={handleChange} className={`${inputClasses} appearance-none cursor-pointer font-medium`}>
                  <option value="BID_RECEIVED">Any bid received within trigger window</option>
                  <option value="RANK_CHANGE">Any rank change within trigger window</option>
                  <option value="L1_CHANGE">L1 (Lowest Bidder) change within trigger window</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-bold text-lg shadow-xl shadow-blue-500/30 disabled:opacity-70 transform hover:-translate-y-0.5 flex justify-center items-center">
              {loading ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div> Creating Auction...</>
              ) : 'Publish RFQ Auction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateRFQ;
