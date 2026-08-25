import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../services/api/apiClient';
import { Company } from '../../../types';
import { Building2, Search, FileText } from 'lucide-react';
import { Input } from '../../../components/ui/Input';

export const AdminCompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/companies');
      setCompanies(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.gstNumber?.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-600" />
            Exhibitor Corporate Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">Audit registered corporate clients, GST/PAN tax identifiers, and contact leads.</p>
        </div>

        <div className="max-w-xs w-full">
          <Input
            placeholder="Search by company or GST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
              <th className="py-3.5 px-4">Company Code</th>
              <th className="py-3.5 px-4">Corporate Entity Name</th>
              <th className="py-3.5 px-4">GST / Tax ID</th>
              <th className="py-3.5 px-4">Contact Person</th>
              <th className="py-3.5 px-4">Mobile & Email</th>
              <th className="py-3.5 px-4">Industry Domain</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{c.companyCode}</td>
                <td className="py-3.5 px-4 font-bold text-slate-900">{c.name}</td>
                <td className="py-3.5 px-4 font-mono text-slate-600">{c.gstNumber || 'N/A'}</td>
                <td className="py-3.5 px-4 font-semibold">{c.contactPerson}</td>
                <td className="py-3.5 px-4 text-slate-500">{c.mobile} • {c.email}</td>
                <td className="py-3.5 px-4 font-bold text-slate-700">{c.industry}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
