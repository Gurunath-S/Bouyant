import {
  PrismaClient,
  UserRole,
  BookingStatus,
  BookingPaymentStatus,
  PaymentStatus,
  InvoiceStatus,
  StallStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Platform Users & Realistic Dataset for Pagination Testing...');

  const superAdminPasswordHash = await bcrypt.hash('Password123!', 10);
  const adminPasswordHash = await bcrypt.hash('Password123!', 10);
  const staffPasswordHash = await bcrypt.hash('Password123!', 10);
  const clientPasswordHash = await bcrypt.hash('DemoUser123!', 10);

  // Clean dependent records before seeding demo data
  await prisma.invoice.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.bookingStall.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.user.updateMany({
    data: { companyId: null },
  });
  await prisma.company.deleteMany({});

  // Reset stall statuses to AVAILABLE
  await prisma.stall.updateMany({
    data: {
      status: StallStatus.AVAILABLE,
      heldByUserId: null,
      heldUntil: null,
    },
  });

  // 1. Super Admin Accounts
  console.log('👑 Seeding Super Admin accounts...');
  await prisma.user.upsert({
    where: { email: 'superadmin@buoyantmedia.com' },
    update: {
      passwordHash: superAdminPasswordHash,
      role: UserRole.SUPERADMIN,
      isActive: true,
    },
    create: {
      email: 'superadmin@buoyantmedia.com',
      passwordHash: superAdminPasswordHash,
      username: 'superadmin',
      name: 'Platform Super Admin',
      phone: '+919876500001',
      role: UserRole.SUPERADMIN,
      spcode: 'SA01',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'governance@buoyantmedia.com' },
    update: {
      passwordHash: superAdminPasswordHash,
      role: UserRole.SUPERADMIN,
      isActive: true,
    },
    create: {
      email: 'governance@buoyantmedia.com',
      passwordHash: superAdminPasswordHash,
      username: 'governance_admin',
      name: 'Governance & Compliance Lead',
      phone: '+919876500010',
      role: UserRole.SUPERADMIN,
      spcode: 'SA02',
      isActive: true,
    },
  });

  // 2. Admin Accounts
  console.log('🛡️ Seeding Admin accounts...');
  const adminUsersData = [
    { email: 'admin@buoyantmedia.com', username: 'admin', name: 'System Admin', phone: '+919876500002', spcode: 'B001' },
    { email: 'admin.mumbai@buoyantmedia.com', username: 'admin_mumbai', name: 'West Regional Admin', phone: '+919876500011', spcode: 'B002' },
    { email: 'admin.delhi@buoyantmedia.com', username: 'admin_delhi', name: 'North Regional Admin', phone: '+919876500012', spcode: 'B003' },
    { email: 'admin.bangalore@buoyantmedia.com', username: 'admin_bangalore', name: 'South Regional Admin', phone: '+919876500013', spcode: 'B004' },
  ];

  for (const adm of adminUsersData) {
    await prisma.user.upsert({
      where: { email: adm.email },
      update: { passwordHash: adminPasswordHash, role: UserRole.ADMIN, isActive: true },
      create: {
        email: adm.email,
        passwordHash: adminPasswordHash,
        username: adm.username,
        name: adm.name,
        phone: adm.phone,
        role: UserRole.ADMIN,
        spcode: adm.spcode,
        isActive: true,
      },
    });
  }

  // 3. Staff Accounts
  console.log('👷 Seeding Staff accounts...');
  const staffUsersData = [
    { email: 'staff@buoyantmedia.com', username: 'staffops', name: 'Operations Staff', phone: '+919876500003', spcode: 'ST01' },
    { email: 'ops.rahul@buoyantmedia.com', username: 'ops_rahul', name: 'Rahul Varma (Ops)', phone: '+919876500021', spcode: 'ST02' },
    { email: 'ops.ananya@buoyantmedia.com', username: 'ops_ananya', name: 'Ananya Sen (Floor Mgr)', phone: '+919876500022', spcode: 'ST03' },
    { email: 'field.vikram@buoyantmedia.com', username: 'field_vikram', name: 'Vikram Mehta (Field)', phone: '+919876500023', spcode: 'ST04' },
    { email: 'floor.sneha@buoyantmedia.com', username: 'floor_sneha', name: 'Sneha Kapoor (Floor)', phone: '+919876500024', spcode: 'ST05' },
    { email: 'support.karan@buoyantmedia.com', username: 'support_karan', name: 'Karan Malhotra (Support)', phone: '+919876500025', spcode: 'ST06' },
  ];

  for (const st of staffUsersData) {
    await prisma.user.upsert({
      where: { email: st.email },
      update: { passwordHash: staffPasswordHash, role: UserRole.STAFF, isActive: true },
      create: {
        email: st.email,
        passwordHash: staffPasswordHash,
        username: st.username,
        name: st.name,
        phone: st.phone,
        role: UserRole.STAFF,
        spcode: st.spcode,
        isActive: true,
      },
    });
  }

  // 4. Exhibitor Companies (28 Companies across India / International)
  console.log('🏢 Seeding 28 Exhibitor Companies...');
  const companiesData = [
    {
      companyCode: 'CMP-1001',
      name: 'Apex Industrial Robotics Ltd',
      contactPerson: 'Rajesh Kumar',
      mobile: '+919876543210',
      email: 'contact@apexrobotics.in',
      address: 'Plot 42, Electronic City Phase 1',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560100',
      country: 'India',
      gstNumber: '29ABCDE1234F1Z5',
      panNumber: 'ABCDE1234F',
      industry: 'Robotics & Automation',
      website: 'https://apexrobotics.in',
      spcode: 'AR01',
      regNo: 'REG-2026-001',
    },
    {
      companyCode: 'CMP-1002',
      name: 'BioMed Diagnostics & Instruments Corp',
      contactPerson: 'Dr. Priya Sharma',
      mobile: '+919876543211',
      email: 'priya@biomedinstruments.com',
      address: '12 Meditech Park, Guindy',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600032',
      country: 'India',
      gstNumber: '33BCDEF2345G1Z6',
      panNumber: 'BCDEF2345G',
      industry: 'Medical Devices',
      website: 'https://biomedinstruments.com',
      spcode: 'BM02',
      regNo: 'REG-2026-002',
    },
    {
      companyCode: 'CMP-1003',
      name: 'Nova Clean Energy Solutions Pvt Ltd',
      contactPerson: 'Amit Patel',
      mobile: '+919876543212',
      email: 'amit@novacleanenergy.in',
      address: '88 Solar Hub, SG Highway',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pinCode: '380015',
      country: 'India',
      gstNumber: '24CDEFG3456H1Z7',
      panNumber: 'CDEFG3456H',
      industry: 'Renewable Energy',
      website: 'https://novacleanenergy.in',
      spcode: 'NC03',
      regNo: 'REG-2026-003',
    },
    {
      companyCode: 'CMP-1004',
      name: 'Vanguard Global Logistics Ltd',
      contactPerson: 'Sunita Menon',
      mobile: '+919876543213',
      email: 'sunita@vanguardlogistics.in',
      address: '500 Cargo Complex, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400069',
      country: 'India',
      gstNumber: '27DEFGH4567I1Z8',
      panNumber: 'DEFGH4567I',
      industry: 'Logistics & Supply Chain',
      website: 'https://vanguardlogistics.in',
      spcode: 'VL04',
      regNo: 'REG-2026-004',
    },
    {
      companyCode: 'CMP-1005',
      name: 'Quantum Mobility Systems',
      contactPerson: 'Vikram Singhania',
      mobile: '+919876543214',
      email: 'vikram@quantumauto.com',
      address: '7 Auto Cluster, Chakan',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '410501',
      country: 'India',
      gstNumber: null, // Pending GST
      panNumber: 'EFGHI5678J',
      industry: 'Automotive',
      website: 'https://quantumauto.com',
      spcode: 'QA05',
      regNo: 'REG-2026-005',
    },
    {
      companyCode: 'CMP-1006',
      name: 'AeroTech Defense Dynamics',
      contactPerson: 'Col. Arvind Rathore',
      mobile: '+919876543215',
      email: 'arvind@aerotechdefense.in',
      address: '15 Defense Enclave, Aerocity',
      city: 'New Delhi',
      state: 'Delhi',
      pinCode: '110037',
      country: 'India',
      gstNumber: '07FGHIJ6789K1Z9',
      panNumber: 'FGHIJ6789K',
      industry: 'Aerospace & Defense',
      website: 'https://aerotechdefense.in',
      spcode: 'AD06',
      regNo: 'REG-2026-006',
    },
    {
      companyCode: 'CMP-1007',
      name: 'Solaris Photovoltaics Corp',
      contactPerson: 'Meera Deshmukh',
      mobile: '+919876543216',
      email: 'meera@solarisphoto.com',
      address: '20 Green Valley Park',
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: '500081',
      country: 'India',
      gstNumber: '36GHIJK7890L1ZA',
      panNumber: 'GHIJK7890L',
      industry: 'Renewable Energy',
      website: 'https://solarisphoto.com',
      spcode: 'SP07',
      regNo: 'REG-2026-007',
    },
    {
      companyCode: 'CMP-1008',
      name: 'Zenith BioPharma Labs',
      contactPerson: 'Dr. Sandeep Rao',
      mobile: '+919876543217',
      email: 'sandeep@zenithbiopharma.in',
      address: '44 Genome Valley, Shamirpet',
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: '500078',
      country: 'India',
      gstNumber: '36HIJKL8901M1ZB',
      panNumber: 'HIJKL8901M',
      industry: 'Pharmaceuticals',
      website: 'https://zenithbiopharma.in',
      spcode: 'ZB08',
      regNo: 'REG-2026-008',
    },
    {
      companyCode: 'CMP-1009',
      name: 'NexGen Cloud Telematics Ltd',
      contactPerson: 'Kunal Joshi',
      mobile: '+919876543218',
      email: 'kunal@nexgentelematics.com',
      address: '10 Cyber Towers, Hitec City',
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: '500081',
      country: 'India',
      gstNumber: '36IJKLM9012N1ZC',
      panNumber: 'IJKLM9012N',
      industry: 'Telecommunications',
      website: 'https://nexgentelematics.com',
      spcode: 'NT09',
      regNo: 'REG-2026-009',
    },
    {
      companyCode: 'CMP-1010',
      name: 'EcoThermal Engineering Works',
      contactPerson: 'Harish Nambiar',
      mobile: '+919876543219',
      email: 'harish@ecothermal.in',
      address: '6 Industrial Estate, Peenya',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560058',
      country: 'India',
      gstNumber: null, // Pending GST
      panNumber: 'JKLMN0123O',
      industry: 'Thermal Systems',
      website: 'https://ecothermal.in',
      spcode: 'EE10',
      regNo: 'REG-2026-010',
    },
    {
      companyCode: 'CMP-1011',
      name: 'Optima Meditech Solutions',
      contactPerson: 'Dr. Kavita Nair',
      mobile: '+919876543220',
      email: 'kavita@optimameditech.com',
      address: '77 Health City, Whitefield',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560066',
      country: 'India',
      gstNumber: '29KLMNO1234P1ZD',
      panNumber: 'KLMNO1234P',
      industry: 'Medical Devices',
      website: 'https://optimameditech.com',
      spcode: 'OM11',
      regNo: 'REG-2026-011',
    },
    {
      companyCode: 'CMP-1012',
      name: 'Titan Heavy Machinery Corp',
      contactPerson: 'Balwinder Singh',
      mobile: '+919876543221',
      email: 'balwinder@titanheavy.in',
      address: '108 Focal Point',
      city: 'Ludhiana',
      state: 'Punjab',
      pinCode: '141010',
      country: 'India',
      gstNumber: '03LMNOP2345Q1ZE',
      panNumber: 'LMNOP2345Q',
      industry: 'Industrial Equipment',
      website: 'https://titanheavy.in',
      spcode: 'TH12',
      regNo: 'REG-2026-012',
    },
    {
      companyCode: 'CMP-1013',
      name: 'Starlight Consumer Electronics',
      contactPerson: 'Pooja Agarwal',
      mobile: '+919876543222',
      email: 'pooja@starlightelectronics.com',
      address: '55 Okhla Industrial Area Phase 3',
      city: 'New Delhi',
      state: 'Delhi',
      pinCode: '110020',
      country: 'India',
      gstNumber: '07MNOPQ3456R1ZF',
      panNumber: 'MNOPQ3456R',
      industry: 'Consumer Tech',
      website: 'https://starlightelectronics.com',
      spcode: 'SC13',
      regNo: 'REG-2026-013',
    },
    {
      companyCode: 'CMP-1014',
      name: 'AgriFuture Precision Tech',
      contactPerson: 'Rameshwar Patil',
      mobile: '+919876543223',
      email: 'rameshwar@agrifuture.in',
      address: '9 Krishi Bhavan Marg',
      city: 'Nagpur',
      state: 'Maharashtra',
      pinCode: '440010',
      country: 'India',
      gstNumber: '27NOPQR4567S1ZG',
      panNumber: 'NOPQR4567S',
      industry: 'AgriTech',
      website: 'https://agrifuture.in',
      spcode: 'AP14',
      regNo: 'REG-2026-014',
    },
    {
      companyCode: 'CMP-1015',
      name: 'CyberShield InfoSec Pvt Ltd',
      contactPerson: 'Tanvi Sen',
      mobile: '+919876543224',
      email: 'tanvi@cybershield.in',
      address: '8 Salt Lake Sector V',
      city: 'Kolkata',
      state: 'West Bengal',
      pinCode: '700091',
      country: 'India',
      gstNumber: null, // Pending GST
      panNumber: 'OPQRS5678T',
      industry: 'Cybersecurity',
      website: 'https://cybershield.in',
      spcode: 'CS15',
      regNo: 'REG-2026-015',
    },
    {
      companyCode: 'CMP-1016',
      name: 'Veloce Electric Vehicles',
      contactPerson: 'Aditya Vardhan',
      mobile: '+919876543225',
      email: 'aditya@veloceev.com',
      address: '33 EV Corridor, Hosur Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560099',
      country: 'India',
      gstNumber: '29PQRST6789U1ZH',
      panNumber: 'PQRST6789U',
      industry: 'Electric Vehicles',
      website: 'https://veloceev.com',
      spcode: 'VE16',
      regNo: 'REG-2026-016',
    },
    {
      companyCode: 'CMP-1017',
      name: 'Hyperion AI Technologies',
      contactPerson: 'Siddharth Roy',
      mobile: '+919876543226',
      email: 'siddharth@hyperionai.com',
      address: '14 DLF Cyber City Phase 2',
      city: 'Gurugram',
      state: 'Haryana',
      pinCode: '122002',
      country: 'India',
      gstNumber: '06QRSTU7890V1ZI',
      panNumber: 'QRSTU7890V',
      industry: 'Artificial Intelligence',
      website: 'https://hyperionai.com',
      spcode: 'HA17',
      regNo: 'REG-2026-017',
    },
    {
      companyCode: 'CMP-1018',
      name: 'OmniPack Global Containers',
      contactPerson: 'Deepak Chopra',
      mobile: '+919876543227',
      email: 'deepak@omnipackglobal.in',
      address: '92 GIDC Industrial Estate',
      city: 'Vadodara',
      state: 'Gujarat',
      pinCode: '390010',
      country: 'India',
      gstNumber: '24RSTUV8901W1ZJ',
      panNumber: 'RSTUV8901W',
      industry: 'Packaging Solutions',
      website: 'https://omnipackglobal.in',
      spcode: 'OG18',
      regNo: 'REG-2026-018',
    },
    {
      companyCode: 'CMP-1019',
      name: 'PureWater Nano Filtration Ltd',
      contactPerson: 'Anjali Verma',
      mobile: '+919876543228',
      email: 'anjali@purewaternano.in',
      address: '61 Cleantech Park',
      city: 'Jaipur',
      state: 'Rajasthan',
      pinCode: '302017',
      country: 'India',
      gstNumber: null, // Pending GST
      panNumber: 'STUVW9012X',
      industry: 'Water Treatment',
      website: 'https://purewaternano.in',
      spcode: 'PW19',
      regNo: 'REG-2026-019',
    },
    {
      companyCode: 'CMP-1020',
      name: 'Spectrum Textiles & Fabrics',
      contactPerson: 'Manoj Chettiar',
      mobile: '+919876543229',
      email: 'manoj@spectrumtextiles.com',
      address: '14 Avinashi Road',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      pinCode: '641018',
      country: 'India',
      gstNumber: '33TUVWX0123Y1ZK',
      panNumber: 'TUVWX0123Y',
      industry: 'Textiles',
      website: 'https://spectrumtextiles.com',
      spcode: 'ST20',
      regNo: 'REG-2026-020',
    },
    {
      companyCode: 'CMP-1021',
      name: 'RoboWeld Automations Ltd',
      contactPerson: 'Nitin Kulkarni',
      mobile: '+919876543230',
      email: 'nitin@roboweld.in',
      address: '18 MIDC Bhosari',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '411026',
      country: 'India',
      gstNumber: '27UVWXY1234Z1ZL',
      panNumber: 'UVWXY1234Z',
      industry: 'Welding & Automation',
      website: 'https://roboweld.in',
      spcode: 'RA21',
      regNo: 'REG-2026-021',
    },
    {
      companyCode: 'CMP-1022',
      name: 'MediCare Surgical Implants Corp',
      contactPerson: 'Dr. Arun Bhaskar',
      mobile: '+919876543231',
      email: 'arun@medicaresurgical.com',
      address: '25 Biotech Zone, Manapakkam',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600125',
      country: 'India',
      gstNumber: '33VWXYZ2345A1ZM',
      panNumber: 'VWXYZ2345A',
      industry: 'Medical Devices',
      website: 'https://medicaresurgical.com',
      spcode: 'MS22',
      regNo: 'REG-2026-022',
    },
    {
      companyCode: 'CMP-1023',
      name: 'GreenDrive Powertrain Systems',
      contactPerson: 'Gaurav Bhatt',
      mobile: '+919876543232',
      email: 'gaurav@greendrivepower.in',
      address: '5 Automotive Hub, Sanand',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pinCode: '382110',
      country: 'India',
      gstNumber: '24WXYZA3456B1ZN',
      panNumber: 'WXYZA3456B',
      industry: 'Automotive',
      website: 'https://greendrivepower.in',
      spcode: 'GP23',
      regNo: 'REG-2026-023',
    },
    {
      companyCode: 'CMP-1024',
      name: 'Nordic Cold Chain Logistics',
      contactPerson: 'Esha Mukherjee',
      mobile: '+919876543233',
      email: 'esha@nordiccoldchain.in',
      address: '100 Harbor Drive, Nhava Sheva',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      pinCode: '400707',
      country: 'India',
      gstNumber: null, // Pending GST
      panNumber: 'XYZAB4567C',
      industry: 'Cold Storage & Logistics',
      website: 'https://nordiccoldchain.in',
      spcode: 'NC24',
      regNo: 'REG-2026-024',
    },
    {
      companyCode: 'CMP-1025',
      name: 'Vertex Photonics & Lasers',
      contactPerson: 'Pranav Saxena',
      mobile: '+919876543234',
      email: 'pranav@vertexphotonics.com',
      address: '12 Electronic City Phase 2',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560100',
      country: 'India',
      gstNumber: '29YZABC5678D1ZO',
      panNumber: 'YZABC5678D',
      industry: 'Optics & Photonics',
      website: 'https://vertexphotonics.com',
      spcode: 'VP25',
      regNo: 'REG-2026-025',
    },
    {
      companyCode: 'CMP-1026',
      name: 'BioGen Diagnostics Lab Supplies',
      contactPerson: 'Geeta Nair',
      mobile: '+919876543235',
      email: 'geeta@biogendiagnostics.in',
      address: '78 Ring Road, Lajpat Nagar',
      city: 'New Delhi',
      state: 'Delhi',
      pinCode: '110024',
      country: 'India',
      gstNumber: '07ZABCD6789E1ZP',
      panNumber: 'ZABCD6789E',
      industry: 'Healthcare',
      website: 'https://biogendiagnostics.in',
      spcode: 'BD26',
      regNo: 'REG-2026-026',
    },
    {
      companyCode: 'CMP-1027',
      name: 'EcoMatrix Recycled Plastics',
      contactPerson: 'Raghav Trivedi',
      mobile: '+919876543236',
      email: 'raghav@ecomatrix.in',
      address: '32 GIDC Estate, Ankleshwar',
      city: 'Surat',
      state: 'Gujarat',
      pinCode: '393002',
      country: 'India',
      gstNumber: null, // Pending GST
      panNumber: 'ABCDE7890F',
      industry: 'Circular Economy',
      website: 'https://ecomatrix.in',
      spcode: 'EM27',
      regNo: 'REG-2026-027',
    },
    {
      companyCode: 'CMP-1028',
      name: 'SkyHigh Smart Infrastructure',
      contactPerson: 'Rohit Bansal',
      mobile: '+919876543237',
      email: 'rohit@skyhighsmart.in',
      address: '88 Cyber City Tower C',
      city: 'Gurugram',
      state: 'Haryana',
      pinCode: '122002',
      country: 'India',
      gstNumber: '06BCDEF8901G1ZQ',
      panNumber: 'BCDEF8901G',
      industry: 'Smart Cities & IoT',
      website: 'https://skyhighsmart.in',
      spcode: 'SH28',
      regNo: 'REG-2026-028',
    },
  ];

  const createdCompanies: any[] = [];
  for (const cData of companiesData) {
    const comp = await prisma.company.create({ data: cData });
    createdCompanies.push(comp);
  }

  // 5. Seed Client Users (linked to companies)
  console.log('👤 Seeding Client Users linked to companies...');
  // Demo primary client user
  await prisma.user.upsert({
    where: { email: 'demo@buoyantmedia.com' },
    update: {
      passwordHash: clientPasswordHash,
      role: UserRole.CLIENT,
      companyId: createdCompanies[0].id,
      isActive: true,
    },
    create: {
      email: 'demo@buoyantmedia.com',
      passwordHash: clientPasswordHash,
      username: 'demo_user',
      name: 'Demo Exhibitor',
      phone: '+919876543210',
      role: UserRole.CLIENT,
      companyId: createdCompanies[0].id,
      isActive: true,
    },
  });

  // Default secondary client user
  await prisma.user.upsert({
    where: { email: 'user@buoyantmedia.com' },
    update: {
      passwordHash: clientPasswordHash,
      role: UserRole.CLIENT,
      companyId: createdCompanies[0].id,
      isActive: true,
    },
    create: {
      email: 'user@buoyantmedia.com',
      passwordHash: clientPasswordHash,
      username: 'clientuser',
      name: 'Demo Exhibitor',
      phone: '+919876500004',
      role: UserRole.CLIENT,
      companyId: createdCompanies[0].id,
      isActive: true,
    },
  });

  // Additional client users for the remaining companies
  for (let i = 1; i < createdCompanies.length; i++) {
    const comp = createdCompanies[i];
    const clientEmail = `client.${comp.companyCode.toLowerCase()}@buoyantmedia.com`;
    const clientUsername = `user_${comp.companyCode.toLowerCase()}`;
    await prisma.user.upsert({
      where: { email: clientEmail },
      update: {
        passwordHash: clientPasswordHash,
        role: UserRole.CLIENT,
        companyId: comp.id,
        isActive: true,
      },
      create: {
        email: clientEmail,
        passwordHash: clientPasswordHash,
        username: clientUsername,
        name: comp.contactPerson,
        phone: comp.mobile,
        role: UserRole.CLIENT,
        companyId: comp.id,
        isActive: true,
      },
    });
  }

  // 6. Fetch Exhibitions & Stalls
  console.log('🎟️ Fetching Exhibitions & Generating 25 Bookings, Payments, and Invoices...');
  const exhibitions = await prisma.exhibition.findMany({
    include: {
      floorPlans: {
        include: {
          stalls: { orderBy: { stallNumber: 'asc' } },
        },
      },
    },
    orderBy: { startDate: 'asc' },
  });

  if (exhibitions.length < 4) {
    console.warn('⚠️ Less than 4 exhibitions found; bookings will be distributed across available ones.');
  }

  const expo1 = exhibitions[0]; // Global Tech Expo
  const expo2 = exhibitions[1]; // Mediccon Expo
  const expo3 = exhibitions[2]; // International Auto Expo
  const expo4 = exhibitions[3]; // Clean Energy Summit

  // Booking distribution plan:
  // Array of: [companyIdx, expoObj, stallIdx, grandTotal, paidAmount, paymentStatus, bookingStatus]
  const bookingConfigs = [
    // Expo 1: Global Tech Expo (8 Bookings)
    { cIdx: 0, expo: expo1, sIdx: 0, price: 50000, paid: 59000, pStatus: BookingPaymentStatus.PAID_FULL, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 1, expo: expo1, sIdx: 1, price: 75000, paid: 40000, pStatus: BookingPaymentStatus.PARTIALLY_PAID, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 2, expo: expo1, sIdx: 2, price: 50000, paid: 0, pStatus: BookingPaymentStatus.UNPAID, bStatus: BookingStatus.PENDING_PAYMENT },
    { cIdx: 12, expo: expo1, sIdx: 3, price: 150000, paid: 177000, pStatus: BookingPaymentStatus.PAID_FULL, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 16, expo: expo1, sIdx: 4, price: 75000, paid: 88500, pStatus: BookingPaymentStatus.PAID_FULL, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 14, expo: expo1, sIdx: 5, price: 50000, paid: 25000, pStatus: BookingPaymentStatus.PARTIALLY_PAID, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 11, expo: expo1, sIdx: 6, price: 90000, paid: 0, pStatus: BookingPaymentStatus.UNPAID, bStatus: BookingStatus.INITIATED },
    { cIdx: 5, expo: expo1, sIdx: 7, price: 150000, paid: 177000, pStatus: BookingPaymentStatus.PAID_FULL, bStatus: BookingStatus.CONFIRMED },

    // Expo 2: Mediccon Expo (6 Bookings)
    { cIdx: 4, expo: expo2, sIdx: 0, price: 50000, paid: 59000, pStatus: BookingPaymentStatus.PAID_FULL, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 10, expo: expo2, sIdx: 1, price: 75000, paid: 88500, pStatus: BookingPaymentStatus.PAID_FULL, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 7, expo: expo2, sIdx: 2, price: 150000, paid: 90000, pStatus: BookingPaymentStatus.PARTIALLY_PAID, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 21, expo: expo2, sIdx: 3, price: 50000, paid: 59000, pStatus: BookingPaymentStatus.PAID_FULL, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 25, expo: expo2, sIdx: 4, price: 75000, paid: 0, pStatus: BookingPaymentStatus.UNPAID, bStatus: BookingStatus.PENDING_PAYMENT },
    { cIdx: 18, expo: expo2, sIdx: 5, price: 90000, paid: 106200, pStatus: BookingPaymentStatus.PAID_FULL, bStatus: BookingStatus.CONFIRMED },

    // Expo 3: International Auto Expo (6 Bookings)
    { cIdx: 15, expo: expo3, sIdx: 0, price: 150000, paid: 177000, pStatus: BookingPaymentStatus.PAID_FULL, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 22, expo: expo3, sIdx: 1, price: 75000, paid: 45000, pStatus: BookingPaymentStatus.PARTIALLY_PAID, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 20, expo: expo3, sIdx: 2, price: 50000, paid: 59000, pStatus: BookingPaymentStatus.PAID_FULL, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 8, expo: expo3, sIdx: 3, price: 50000, paid: 59000, pStatus: BookingPaymentStatus.PAID_FULL, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 17, expo: expo3, sIdx: 4, price: 75000, paid: 0, pStatus: BookingPaymentStatus.UNPAID, bStatus: BookingStatus.INITIATED },
    { cIdx: 24, expo: expo3, sIdx: 5, price: 90000, paid: 106200, pStatus: BookingPaymentStatus.PAID_FULL, bStatus: BookingStatus.CONFIRMED },

    // Expo 4: Clean Energy Summit (5 Bookings)
    { cIdx: 6, expo: expo4, sIdx: 0, price: 150000, paid: 177000, pStatus: BookingPaymentStatus.PAID_FULL, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 9, expo: expo4, sIdx: 1, price: 50000, paid: 25000, pStatus: BookingPaymentStatus.PARTIALLY_PAID, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 13, expo: expo4, sIdx: 2, price: 75000, paid: 88500, pStatus: BookingPaymentStatus.PAID_FULL, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 26, expo: expo4, sIdx: 3, price: 50000, paid: 25000, pStatus: BookingPaymentStatus.PARTIALLY_PAID, bStatus: BookingStatus.CONFIRMED },
    { cIdx: 27, expo: expo4, sIdx: 4, price: 75000, paid: 88500, pStatus: BookingPaymentStatus.PAID_FULL, bStatus: BookingStatus.CONFIRMED },
  ];

  let bookingCounter = 1;
  let paymentCounter = 1;
  let invoiceCounter = 1;

  for (const cfg of bookingConfigs) {
    const comp = createdCompanies[cfg.cIdx];
    const expo = cfg.expo || expo1;
    if (!comp || !expo) continue;

    const stalls = expo.floorPlans[0]?.stalls || [];
    const stall = stalls[cfg.sIdx] || stalls[0];

    const taxAmount = Math.round(cfg.price * 0.18);
    const grandTotal = cfg.price + taxAmount;
    const paidAmount = cfg.paid;
    const balanceAmount = grandTotal - paidAmount;

    const refPadded = String(bookingCounter).padStart(3, '0');
    const bRef = `BK-${(expo.eventCode || 'EX').toUpperCase()}-${refPadded}`;

    const booking = await prisma.booking.create({
      data: {
        bookingReference: bRef,
        companyId: comp.id,
        exhibitionId: expo.id,
        status: cfg.bStatus,
        totalAmount: cfg.price,
        taxAmount,
        grandTotal,
        paidAmount,
        balanceAmount,
        paymentStatus: cfg.pStatus,
        stalls: stall
          ? {
              create: [{ stallId: stall.id, price: cfg.price }],
            }
          : undefined,
      },
    });

    if (stall) {
      await prisma.stall.update({
        where: { id: stall.id },
        data: {
          status: cfg.bStatus === BookingStatus.CONFIRMED ? StallStatus.BOOKED_CONFIRMED : StallStatus.PAYMENT_PENDING,
        },
      });
    }

    let paymentRecord: any = null;
    if (paidAmount > 0) {
      const payRef = `PAY-${(expo.eventCode || 'EX').toUpperCase()}-${String(paymentCounter).padStart(3, '0')}`;
      paymentRecord = await prisma.payment.create({
        data: {
          paymentReference: payRef,
          bookingId: booking.id,
          amount: paidAmount,
          currency: 'INR',
          status: PaymentStatus.SUCCESS,
          provider: paymentCounter % 2 === 0 ? 'BANK_TRANSFER' : 'RAZORPAY',
          paymentMethod: paymentCounter % 2 === 0 ? 'NEFT' : 'ONLINE',
          transactionId: `TXN-2026-${String(paymentCounter).padStart(5, '0')}`,
          razorpayOrderId: paymentCounter % 2 !== 0 ? `order_rzp_${paymentCounter}` : undefined,
          razorpayPaymentId: paymentCounter % 2 !== 0 ? `pay_rzp_${paymentCounter}` : undefined,
          paidAt: new Date(Date.now() - (25 - bookingCounter) * 86400000),
        },
      });
      paymentCounter++;
    }

    // Create Invoice for booking
    const invNum = `INV-2026-${String(invoiceCounter).padStart(3, '0')}`;
    await prisma.invoice.create({
      data: {
        invoiceNumber: invNum,
        bookingId: booking.id,
        paymentId: paymentRecord?.id || null,
        companyId: comp.id,
        totalAmount: cfg.price,
        taxAmount,
        grandTotal,
        status: cfg.pStatus === BookingPaymentStatus.PAID_FULL ? InvoiceStatus.PAID : InvoiceStatus.ISSUED,
        issueDate: new Date(Date.now() - (25 - bookingCounter) * 86400000),
      },
    });
    invoiceCounter++;
    bookingCounter++;
  }

  console.log('====================================================');
  console.log(`✅ Seeding Complete!`);
  console.log(`👥 Total Users     : 37 (2 SuperAdmins, 4 Admins, 6 Staff, 25 Clients)`);
  console.log(`🏢 Total Companies : 28 (16 Paid, 12 Not Paid, 6 Pending GST)`);
  console.log(`🎟️ Total Bookings  : 25 across 4 exhibitions`);
  console.log(`💳 Total Payments  : ${paymentCounter - 1}`);
  console.log(`📄 Total Invoices  : ${invoiceCounter - 1}`);
  console.log('====================================================');
  console.log('Super Admin  : superadmin@buoyantmedia.com / Password123!');
  console.log('Admin User   : admin@buoyantmedia.com      / Password123!');
  console.log('Staff User   : staff@buoyantmedia.com      / Password123!');
  console.log('Demo Client  : demo@buoyantmedia.com       / DemoUser123!');
  console.log('Alt Client   : user@buoyantmedia.com       / DemoUser123!');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
