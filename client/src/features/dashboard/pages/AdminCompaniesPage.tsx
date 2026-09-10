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
      c.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      c.regNo?.toLowerCase().includes(search.toLowerCase()) ||
      c.spcode?.toLowerCase().includes(search.toLowerCase()) ||
      c.companyCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-600" />
            Exhibitor Corporate Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">Audit registered corporate clients, official Reg No (04/26/ME/xx), staff SP Codes, and GST/PAN tax identifiers.</p>
        </div>

        <div className="max-w-xs w-full">
          <Input
            placeholder="Search by name, Reg No, SP Code, or GST..."
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
              <th className="py-3.5 px-4">Official Reg No.</th>
              <th className="py-3.5 px-4">Corporate Entity Name</th>
              <th className="py-3.5 px-4">SP Code</th>
              <th className="py-3.5 px-4">GST / Tax ID</th>
              <th className="py-3.5 px-4">Contact Person</th>
              <th className="py-3.5 px-4">Mobile & Email</th>
              <th className="py-3.5 px-4">Industry Domain</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3.5 px-4">
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded inline-block text-[11px]">
                    {c.regNo || c.companyCode}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-bold text-slate-900">{c.name}</td>
                <td className="py-3.5 px-4">
                  {c.spcode ? (
                    <span className="font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                      {c.spcode}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">—</span>
                  )}
                </td>
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
