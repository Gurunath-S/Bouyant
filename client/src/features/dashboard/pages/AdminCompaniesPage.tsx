import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../services/api/apiClient';
import { Company } from '../../../types';
import { Building2, Search } from 'lucide-react';
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
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile?.toLowerCase().includes(search.toLowerCase()) ||
      c.industry?.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase()) ||
      c.state?.toLowerCase().includes(search.toLowerCase()) ||
      c.companyCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-600" />
            Exhibitor Corporate Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Directory of registered exhibitor corporate profiles, key contacts, industry domains, and GST tax identifiers.
          </p>
        </div>

        <div className="max-w-xs w-full">
          <Input
            placeholder="Search by company, contact, GST, or industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
              <th className="py-3.5 px-4">Corporate Entity Name</th>
              <th className="py-3.5 px-4">Contact Person</th>
              <th className="py-3.5 px-4">Mobile & Email</th>
              <th className="py-3.5 px-4">Industry Domain</th>
              <th className="py-3.5 px-4">Location</th>
              <th className="py-3.5 px-4">GST / Tax ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  Loading exhibitors...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No exhibitor companies found.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{c.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.companyCode && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {c.companyCode}
                        </span>
                      )}
                      {c.website && (
                        <a
                          href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-purple-600 hover:underline"
                        >
                          Website
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{c.contactPerson}</div>
                    {c.designation && (
                      <div className="text-[11px] text-slate-500">{c.designation}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-800 font-medium">{c.mobile || '—'}</div>
                    <div className="text-[11px] text-slate-500">{c.email || '—'}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {c.industry || 'General'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <div>{[c.city, c.state].filter(Boolean).join(', ') || '—'}</div>
                    {c.country && c.country !== 'India' && (
                      <div className="text-[11px] text-slate-400">{c.country}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {c.gstNumber ? (
                      <span className="font-mono text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                        {c.gstNumber}
                      </span>
                    ) : c.panNumber ? (
                      <span className="font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                        PAN: {c.panNumber}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

