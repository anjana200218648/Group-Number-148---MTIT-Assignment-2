import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Item {
  id: string;
  name: string;
  price: number;
  quantity: number;
  supplier_id: string;
}

interface ReportData {
  total_items: number;
  total_value: number;
  supplier_count: number;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Temporary state for edits
  const [editPrice, setEditPrice] = useState("");
  const [editQty, setEditQty] = useState("");

  const token = localStorage.getItem("token");

  const loadData = useCallback(async () => {
    if (!token) {
        navigate("/login"); return;
    }
    
    try {
        const [itemsRes, reportsRes] = await Promise.all([
            fetch(buildApiUrl("/items/"), { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(buildApiUrl("/reports/"), { headers: { "Authorization": `Bearer ${token}` } })
        ]);
        
        if (itemsRes.ok) setItems(await itemsRes.json());
        if (reportsRes.ok) setReportData(await reportsRes.json());
    } catch (e) {
        console.error("Failed to fetch superadmin data", e);
    }
  }, [token, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditClick = (item: Item) => {
    setEditingId(item.id);
    setEditPrice(item.price.toString());
    setEditQty(item.quantity.toString());
  };

  const handleSaveClick = async (id: string) => {
    if (!token) return;
    const valPrice = parseFloat(editPrice);
    const valQty = parseInt(editQty);
    
    if (isNaN(valPrice) || isNaN(valQty)) {
        alert("Invalid numbers"); return;
    }

    try {
        const res = await fetch(buildApiUrl(`/items/${id}`), {
            method: "PUT",
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ price: valPrice, quantity: valQty })
        });
        
        if (res.ok) {
            setEditingId(null);
            loadData(); // refresh everything
        } else {
            const err = await res.json();
            alert("Update failed: " + (err.detail || ""));
        }
    } catch (e) {
        alert("Network error");
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
        const res = await fetch(buildApiUrl(`/items/${id}`), {
            method: "DELETE",
            headers: { 
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (res.ok) {
            loadData();
        } else {
            const err = await res.json();
            alert("Delete failed: " + (err.detail || ""));
        }
    } catch (e) {
        alert("Network error");
    }
  };

  const downloadReport = (format: string) => {
    // In a real app we'd trigger a backend download or generate CSV via blob.
    if (!reportData) return alert("No data yet");
    
    // Simulate real report build
    let content = `Total Value: $${reportData.total_value}\nTotal Items: ${reportData.total_items}\nSuppliers: ${reportData.supplier_count}\n\n`;
    content += `Item Name, Supplier, Price, Qty\n`;
    items.forEach(i => content += `${i.name}, ${i.supplier_id}, ${i.price}, ${i.quantity}\n`);
    
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `inventory_report.${format.toLowerCase()}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Convert real items into chart data grouped by supplier to fulfill analytics requirement
  const chartData = Object.values(items.reduce((acc, obj) => {
      if (!acc[obj.supplier_id]) {
          acc[obj.supplier_id] = { name: obj.supplier_id, stockValue: 0 };
      }
      acc[obj.supplier_id].stockValue += (obj.price * obj.quantity);
      return acc;
  }, {} as Record<string, {name: string, stockValue: number}>));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center bg-brand-600 text-white p-6 rounded-2xl shadow-sm gap-4">
        <div>
          <h2 className="text-3xl font-bold">Super Admin Dashboard</h2>
          <p className="mt-2 text-brand-100 opacity-90">Full control over stock pricing, quantities, and LIVE reports.</p>
        </div>
        <div className="space-x-4 shrink-0">
            <button onClick={() => downloadReport('CSV')} className="bg-brand-500 hover:bg-brand-400 font-semibold py-2 px-4 rounded transition-colors text-white shadow">
                Download CSV
            </button>
            <button onClick={() => downloadReport('TXT')} className="bg-white text-brand-600 hover:bg-gray-100 font-semibold py-2 px-4 rounded transition-colors shadow">
                Download TXT Snapshot
            </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-200">
        <h3 className="text-2xl font-bold mb-2 text-brand-600 border-b border-brand-200 pb-2">Analytics Overview</h3>
        {reportData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-4">
                <div className="bg-brand-50 p-4 rounded text-center border border-brand-200">
                    <p className="text-sm text-brand-500 font-bold uppercase tracking-wider">Total Value</p>
                    <p className="text-3xl text-brand-600 font-bold">${reportData.total_value.toFixed(2)}</p>
                </div>
                <div className="bg-brand-50 p-4 rounded text-center border border-brand-200">
                    <p className="text-sm text-brand-500 font-bold uppercase tracking-wider">Avg Stock Qty</p>
                    <p className="text-3xl text-brand-600 font-bold">{reportData.total_items}</p>
                </div>
                <div className="bg-brand-50 p-4 rounded text-center border border-brand-200">
                    <p className="text-sm text-brand-500 font-bold uppercase tracking-wider">Total Suppliers</p>
                    <p className="text-3xl text-brand-600 font-bold">{reportData.supplier_count}</p>
                </div>
            </div>
        )}

        <div className="h-[400px] w-full mt-8">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#A0522D" />
                    <YAxis stroke="#A0522D" />
                    <Tooltip contentStyle={{ backgroundColor: '#F5F5DC', borderColor: '#CD853F' }} cursor={{fill: '#DEB887', opacity: 0.2}} />
                    <Legend />
                    <Bar dataKey="stockValue" name="Stock Value ($)" fill="#8B4513" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-200 overflow-hidden">
        <div className="p-6 border-b border-brand-200">
            <h3 className="text-2xl font-bold text-brand-600">Stock Management (Live Edit)</h3>
            <p className="text-brand-500 mt-1">Directly update price and quantity for any item from any supplier via API.</p>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
            <thead>
                <tr className="bg-brand-100 text-brand-600">
                <th className="p-4 rounded-tl">Item</th>
                <th className="p-4">Supplier</th>
                <th className="p-4">Price ($)</th>
                <th className="p-4">Quantity</th>
                <th className="p-4 rounded-tr">Actions</th>
                </tr>
            </thead>
            <tbody className="text-brand-600 divide-y divide-brand-200">
                {items.length === 0 && <tr><td colSpan={5} className="p-4 text-center">No items found</td></tr>}
                {items.map(item => (
                <tr key={item.id} className="hover:bg-brand-50 transition-colors">
                    <td className="p-4 font-bold">{item.name}</td>
                    <td className="p-4">{item.supplier_id}</td>
                    <td className="p-4">
                    {editingId === item.id ? (
                        <input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        value={editPrice} 
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-24 border border-brand-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    ) : (
                        <span>${item.price.toFixed(2)}</span>
                    )}
                    </td>
                    <td className="p-4">
                    {editingId === item.id ? (
                        <input 
                        type="number" 
                        min="0"
                        value={editQty} 
                        onChange={(e) => setEditQty(e.target.value)}
                        className="w-24 border border-brand-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    ) : (
                        <span>{item.quantity}</span>
                    )}
                    </td>
                    <td className="p-4">
                    {editingId === item.id ? (
                        <div className="space-x-2">
                            <button 
                                onClick={() => handleSaveClick(item.id)}
                                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-shadow"
                            >
                                Save
                            </button>
                            <button 
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-300 hover:bg-gray-400 text-gray-800 shadow-sm hover:shadow-md transition-shadow"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <div className="space-x-2 flex">
                            <button 
                                onClick={() => handleEditClick(item)}
                                className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-brand-400 hover:bg-brand-500 text-white shadow-sm hover:shadow-md transition-shadow"
                            >
                                Edit
                            </button>
                            <button 
                                onClick={() => handleDeleteClick(item.id)}
                                className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-shadow"
                            >
                                Delete
                            </button>
                        </div>
                    )}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
