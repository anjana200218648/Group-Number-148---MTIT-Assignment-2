import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../api";

interface Item {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  supplier_id: string;
}

const FALLBACK_IMAGE_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="24" font-family="Arial, sans-serif">No Image</text>
  </svg>`
)}`;

export default function SupplierDashboard() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const supplierId = localStorage.getItem("supplierId");

  const loadItems = () => {
    if (!token) {
        navigate("/login"); return;
    }
    fetch(buildApiUrl("/items/") + (supplierId ? `?supplier_id=${encodeURIComponent(supplierId)}` : ""), {
        headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(e => console.error("Failed to fetch supplier items", e));
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("name", newItemName);
    formData.append("price", newItemPrice);
    formData.append("quantity", newItemQty);
    formData.append("supplier_id", supplierId || "Unknown");
    if (selectedImage) {
        formData.append("image", selectedImage);
    }

    try {
        const response = await fetch(buildApiUrl("/items/"), {
            method: "POST",
            headers: {
               "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            await loadItems(); // Refresh the list from the real database
            setShowAddModal(false);
            setNewItemName(""); setNewItemPrice(""); setNewItemQty("");
            setSelectedImage(null); setPreview(null);
        } else {
            const err = await response.json();
            alert("Failed to add item: " + (err.detail || "Unknown Error"));
        }
    } catch (e) {
        alert("API connection error");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-brand-200">
        <h2 className="text-2xl font-bold text-brand-600 tracking-tight">Supplier Dashboard ({supplierId})</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-sm hover:shadow-md"
        >
          Add New Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.length === 0 && <p className="text-brand-500 p-4">No items yet. Add one!</p>}
        {items.map(item => (
          <div
            key={item.id}
            className="bg-white rounded-2xl shadow-sm border border-brand-200 overflow-hidden hover:shadow-md transition-shadow transform hover:-translate-y-0.5 duration-200"
          >
            <div className="h-48 bg-brand-100 relative">
              <img
                src={item.image_url || FALLBACK_IMAGE_URL}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                }}
              />
            </div>
            <div className="p-4 flex flex-col items-start h-full">
              <h3 className="font-bold text-xl mb-1 text-brand-600 line-clamp-2">{item.name}</h3>
              <p className="text-brand-500 text-lg">Price: <span className="font-semibold text-brand-600">${item.price.toFixed(2)}</span></p>
              <p className="text-brand-500 text-lg">Quantity: <span className="font-semibold text-brand-600">{item.quantity}</span></p>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-lg border border-brand-200">
            <h3 className="text-xl font-bold mb-4">Add New Stock Item</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-600">Item Name</label>
                <input
                  required
                  type="text"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="mt-1 w-full border border-brand-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-brand-600">Price ($)</label>
                  <input
                    required
                    min="0"
                    type="number"
                    step="0.01"
                    value={newItemPrice}
                    onChange={e => setNewItemPrice(e.target.value)}
                    className="mt-1 w-full border border-brand-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-brand-600">Quantity</label>
                  <input
                    required
                    min="0"
                    type="number"
                    value={newItemQty}
                    onChange={e => setNewItemQty(e.target.value)}
                    className="mt-1 w-full border border-brand-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-600">Item Image (Required)</label>
                <input required type="file" accept="image/*" onChange={handleImageChange} className="mt-1 w-full p-2" />
                {preview && <img src={preview} alt="Preview" className="mt-2 h-32 w-full object-cover rounded" />}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-brand-100 text-brand-600 rounded-xl font-semibold hover:bg-brand-200 transition-colors border border-brand-200"
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold transition-colors shadow-sm hover:shadow-md disabled:opacity-50"
                >
                    {loading ? "Saving..." : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
