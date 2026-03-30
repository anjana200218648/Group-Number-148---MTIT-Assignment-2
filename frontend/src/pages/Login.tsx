import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [supplierId, setSupplierId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (role: string) => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
             role, 
             supplier_id: role === "Supplier" ? supplierId || "Supplier 1" : undefined 
        })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("userRole", role);
        if (data.supplier_id) {
           localStorage.setItem("supplierId", data.supplier_id);
        }

        if (role === "User") navigate("/user");
        else if (role === "Supplier") navigate("/supplier");
        else if (role === "Admin") navigate("/admin");
        else if (role === "Super Admin") navigate("/superadmin");
      } else {
        alert("Login failed");
      }
    } catch (e) {
      alert("Error connecting to backend API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] py-8">
      <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-md border border-brand-200 max-w-md w-full text-center">
        <h2 className="text-3xl font-bold mb-3 text-brand-600 tracking-tight">Login to StockSync</h2>
        <p className="mb-7 text-brand-500">Select your role to access the system:</p>
        
        <div className="flex flex-col gap-4">
          <button 
            disabled={loading}
            onClick={() => handleLogin("User")}
            className="w-full bg-brand-200 hover:bg-brand-300 text-brand-600 font-semibold py-3 rounded-xl transition-colors shadow-sm hover:shadow-md"
          >
            Login as User (Customer)
          </button>

          <div className="border border-brand-200 p-4 rounded-xl bg-brand-50 mt-2">
              <input 
                  type="text" 
                  placeholder="Supplier ID (e.g. Supp A)" 
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full p-2 mb-2 border border-brand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button 
                disabled={loading}
                onClick={() => handleLogin("Supplier")}
                className="w-full bg-brand-300 hover:bg-brand-400 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm hover:shadow-md"
              >
                Login as Supplier
              </button>
          </div>
          
          <button 
            disabled={loading}
            onClick={() => handleLogin("Admin")}
            className="w-full bg-brand-400 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm hover:shadow-md mt-2"
          >
            Login as Admin
          </button>

          <button 
            disabled={loading}
            onClick={() => handleLogin("Super Admin")}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm hover:shadow-md"
          >
            Secure Login: Super Admin
          </button>
        </div>
      </div>
    </div>
  );
}
