import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { buildApiUrl } from "../api";

interface Item {
  id: string;
  name: string;
  price: number;
  quantity: number;
  supplier_id: string;
  image_url?: string;
}

const FALLBACK_IMAGE_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="24" font-family="Arial, sans-serif">No Image</text>
  </svg>`
)}`;

export default function UserDashboard() {
  const [suppliers, setSuppliers] = useState<{id: string, name: string}[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(buildApiUrl("/suppliers/"))
      .then(res => res.json())
      .then(data => setSuppliers(data))
      .catch(e => console.error("Failed to load suppliers:", e));
  }, []);

  const fetchItems = (supplier_id: string) => {
    setLoading(true);
    setSelectedSupplier(supplier_id);
    fetch(`${buildApiUrl("/items/")}?supplier_id=${encodeURIComponent(supplier_id)}`)
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(e => console.error("Failed to load items:", e))
      .finally(() => setLoading(false));
  };

  const clearSelection = () => {
    setSelectedSupplier(null);
    setItems([]);
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-brand-200">
        <h2 className="text-2xl font-bold text-brand-600 tracking-tight">Customer View</h2>
        {selectedSupplier && (
           <button
             onClick={clearSelection}
             className="text-sm bg-brand-100 text-brand-600 px-3 py-1 rounded-xl hover:bg-brand-200 border border-brand-300 transition-colors font-semibold shadow-sm hover:shadow-md"
           >
             Back to Suppliers
           </button>
        )}
      </div>

      {!selectedSupplier ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.length === 0 && <p className="text-brand-500">No suppliers available.</p>}
            {suppliers.map(sup => (
                <div 
                    key={sup.id} 
                    onClick={() => fetchItems(sup.id)}
                    className="bg-white p-6 rounded-2xl shadow-sm cursor-pointer border border-brand-200 hover:shadow-md transition-all transform hover:-translate-y-0.5 duration-200 flex flex-col justify-center items-center h-32"
                >
                    <h3 className="text-xl font-bold text-brand-600">{sup.name}</h3>
                    <p className="text-sm text-brand-400 mt-2">Click to view items</p>
                </div>
            ))}
         </div>
      ) : (
         <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
            <h3 className="text-xl md:text-2xl font-bold text-brand-600 tracking-tight">Items from {selectedSupplier}</h3>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 text-brand-400 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Search items..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-brand-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
                    />
                </div>
            </div>

            {loading ? (
                <p>Loading items...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {filteredItems.length === 0 && <p className="text-brand-500 col-span-full">No items found.</p>}
                    
                    {filteredItems.map(item => (
                        <div
                          key={item.id}
                          className="bg-white rounded-2xl shadow-sm border border-brand-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow transform hover:-translate-y-0.5 duration-200"
                        >
                            <div className="h-40 bg-brand-100 relative">
                                <img
                                    src={item.image_url || FALLBACK_IMAGE_URL}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                                    }}
                                />
                                
                                {item.quantity === 0 && (
                                    <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">Out of Stock</div>
                                )}
                                {item.quantity > 0 && item.quantity <= 10 && (
                                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">Low Stock ({item.quantity} left)</div>
                                )}
                            </div>
                            
                            <div className="p-4 flex flex-col flex-grow">
                                <h4 className="font-bold text-lg text-brand-600 line-clamp-2">{item.name}</h4>
                                <div className="mt-auto pt-2 flex justify-between items-center">
                                    <span className="font-bold text-xl text-brand-500">${item.price.toFixed(2)}</span>
                                    <span className={`text-sm ${item.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        Qty: {item.quantity}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
         </div>
      )}
    </div>
  );
}
