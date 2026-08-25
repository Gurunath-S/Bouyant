import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { companyService } from '../../../services/companies/companyService';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Building2, ShieldCheck, CheckCircle2, Save, FileText } from 'lucide-react';

export const CompanyProfilePage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (user?.company) {
      Object.keys(user.company).forEach((key) => {
        setValue(key, (user.company as any)[key]);
      });
    }
  }, [user, setValue]);

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      setSuccessMsg('');
      setErrorMsg('');

      let updatedCompany;
      if (user?.companyId) {
        updatedCompany = await companyService.updateCompany(user.companyId, data);
      } else {
        updatedCompany = await companyService.createCompany(data);
      }

      if (user) {
        setUser({
          ...user,
          companyId: updatedCompany.id,
          company: updatedCompany,
        });
      }

      setSuccessMsg('Corporate profile updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update company profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-600" />
          Exhibitor Corporate Profile
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your official corporate entity details, GST/PAN tax identifiers, and contact information for exhibition bookings and invoices.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        {/* Section 1: Business Identity */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider text-blue-600">
            1. Corporate Identity
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Official Company Name"
              placeholder="TechCorp Global Solutions Pvt Ltd"
              {...register('name', { required: 'Company name is required' })}
              error={errors.name?.message as string}
            />
            <Input
              label="Industry / Business Domain"
              placeholder="Information Technology & SaaS"
              {...register('industry', { required: 'Industry is required' })}
              error={errors.industry?.message as string}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Exhibitor Category"
              placeholder="Enterprise Hardware / Software"
              {...register('category', { required: 'Category is required' })}
              error={errors.category?.message as string}
            />
            <Input
              label="Corporate Website URL"
              placeholder="https://www.techcorpglobal.com"
              {...register('website')}
            />
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider text-blue-600">
            2. Contact Person & Address
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Contact Person Name"
              placeholder="Alex Rivera"
              {...register('contactPerson', { required: 'Contact person is required' })}
              error={errors.contactPerson?.message as string}
            />
            <Input
              label="Designation"
              placeholder="Head of Marketing"
              {...register('designation', { required: 'Designation is required' })}
              error={errors.designation?.message as string}
            />
            <Input
              label="Mobile Number"
              placeholder="+1 (555) 019-2834"
              {...register('mobile', { required: 'Mobile number is required' })}
              error={errors.mobile?.message as string}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Corporate Email"
              type="email"
              placeholder="alex@techcorpglobal.com"
              {...register('email', { required: 'Email is required' })}
              error={errors.email?.message as string}
            />
            <Input
              label="City"
              placeholder="San Francisco"
              {...register('city', { required: 'City is required' })}
              error={errors.city?.message as string}
            />
            <Input
              label="State / Province"
              placeholder="California"
              {...register('state', { required: 'State is required' })}
              error={errors.state?.message as string}
            />
          </div>

          <Input
            label="Full Registered Office Address"
            placeholder="100 Tech Park Way, Suite 400"
            {...register('address', { required: 'Address is required' })}
            error={errors.address?.message as string}
          />
        </div>

        {/* Section 3: Tax Identifiers */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider text-blue-600 flex items-center gap-2">
            <FileText className="w-4 h-4" /> 3. Tax Identifiers (for GST & Invoicing)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="GST Registration Number"
              placeholder="27AAACT29381Z6"
              {...register('gstNumber')}
            />
            <Input
              label="PAN Number"
              placeholder="AAACT29381"
              {...register('panNumber')}
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button type="submit" variant="primary" isLoading={loading} leftIcon={<Save className="w-4 h-4" />}>
            Save Corporate Profile
          </Button>
        </div>
      </form>
    </div>
  );
};
