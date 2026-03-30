import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="12" font-family="Arial, sans-serif">No Image</text>
  </svg>`
)}`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
        navigate("/login"); return;
    }
    fetch(buildApiUrl("/items/"), {
        headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(e => console.error(e));
  }, [navigate, token]);

  const totalItemsCount = items.length;
  const totalStockAmount = items.reduce((acc, obj) => acc + obj.quantity, 0);

  return (
    <div className="space-y-6">
        <h2 className="text-3xl font-bold text-brand-600 mb-2 tracking-tight">Normal Admin Dashboard</h2>
        <p className="text-brand-500">Read-only overview of items across suppliers.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-7">
            <div className="bg-brand-600 text-white p-6 rounded-2xl shadow-sm border border-brand-500/30">
                <h3 className="text-lg sm:text-xl opacity-90 font-semibold">Total Unique Items</h3>
                <p className="text-4xl font-bold mt-2 leading-none">{totalItemsCount}</p>
            </div>
            <div className="bg-brand-500 text-white p-6 rounded-2xl shadow-sm border border-brand-400/30">
                <h3 className="text-lg sm:text-xl opacity-90 font-semibold">Total Stock Quantity</h3>
                <p className="text-4xl font-bold mt-2 leading-none">{totalStockAmount}</p>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-brand-200">
            <div className="p-5 border-b border-brand-200">
                <h3 className="font-bold text-xl text-brand-600">All Supplier Items (Read Only)</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead>
                        <tr className="bg-brand-100 text-brand-600">
                            <th className="p-4 rounded-tl">Image</th>
                            <th className="p-4">Item Name</th>
                            <th className="p-4">Supplier</th>
                            <th className="p-4">Quantity</th>
                            <th className="p-4 rounded-tr">Price</th>
                        </tr>
                    </thead>
                    <tbody className="text-brand-600 divide-y divide-brand-200">
                        {items.length === 0 && (
                            <tr><td colSpan={5} className="p-4 text-center text-brand-400">No items available in the system yet.</td></tr>
                        )}
                        {items.map(item => (
                            <tr key={item.id} className="hover:bg-brand-50 transition-colors">
                                <td className="p-4">
                                    <img
                                        src={item.image_url || FALLBACK_IMAGE_URL}
                                        alt={item.name}
                                        className="w-12 h-12 rounded object-cover border border-brand-200"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                                        }}
                                    />
                                </td>
                                <td className="p-4 font-medium">{item.name}</td>
                                <td className="p-4">
                                    <span className="bg-brand-200 text-brand-600 px-2 py-1 rounded text-sm font-semibold">{item.supplier_id}</span>
                                </td>
                                <td className="p-4">{item.quantity}</td>
                                <td className="p-4 font-bold text-brand-500">${item.price.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}
