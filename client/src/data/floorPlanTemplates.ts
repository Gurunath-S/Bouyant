import { StarterTemplate } from '../types/floorPlanStudio';

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'empty',
    name: 'Clean Blank Canvas',
    description: 'A completely blank floor plan canvas ready for custom hall boundaries, structures, and stalls.',
    previewHallsCount: 0,
    previewStallsCount: 0,
    layoutData: {
      canvasWidth: 1400,
      canvasHeight: 850,
      gridSize: 20,
      snapInterval: 1,
      halls: [],
      facilities: [],
      annotations: [],
    },
    stalls: [],
  },
  {
    id: 'single-hall-30',
    name: 'Single Exhibition Hall (30 Stalls)',
    description: 'One large exhibition pavilion with 30 stalls, Main Entrance, Registration Desk, and Stage.',
    previewHallsCount: 1,
    previewStallsCount: 30,
    layoutData: {
      canvasWidth: 1400,
      canvasHeight: 850,
      gridSize: 20,
      snapInterval: 1,
      halls: [
        {
          id: 'hall-1',
          name: 'Main Exhibition Hall',
          x: 40,
          y: 40,
          width: 1320,
          height: 770,
          color: '#3b82f6',
        },
      ],
      facilities: [
        {
          id: 'fac-ent-1',
          type: 'entrance',
          label: 'MAIN ENTRANCE',
          x: 550,
          y: 790,
          width: 300,
          height: 28,
        },
        {
          id: 'fac-reg-1',
          type: 'registration',
          label: 'REGISTRATION DESK',
          x: 580,
          y: 710,
          width: 240,
          height: 40,
        },
        {
          id: 'fac-stage-1',
          type: 'stage',
          label: 'KEYNOTE PRESENTATION STAGE',
          x: 450,
          y: 60,
          width: 500,
          height: 60,
        },
        {
          id: 'fac-fc-1',
          type: 'food-court',
          label: 'CAFÉ & LOUNGE',
          x: 60,
          y: 60,
          width: 220,
          height: 100,
        },
        {
          id: 'fac-rest-1',
          type: 'restroom',
          label: 'RESTROOMS',
          x: 1140,
          y: 60,
          width: 200,
          height: 70,
        },
      ],
      annotations: [
        {
          id: 'ann-1',
          text: 'Main Pavilion • 30 Standard & Premium Stalls',
          x: 700,
          y: 150,
          fontSize: 14,
        },
      ],
    },
    stalls: Array.from({ length: 30 }, (_, i) => {
      const row = Math.floor(i / 10);
      const col = i % 10;
      const num = i + 1;
      const stallNumber = `A-${num < 10 ? '0' + num : num}`;
      const isCorner = col === 0 || col === 9;
      return {
        id: `stall-${num}`,
        stallNumber,
        category: isCorner ? 'CORNER' : 'STANDARD',
        price: isCorner ? 65000 : 50000,
        areaSqFt: 100,
        width: 70,
        height: 70,
        xPosition: 120 + col * 115,
        yPosition: 220 + row * 160,
        status: 'AVAILABLE',
      };
    }),
  },
  {
    id: 'twin-pavilion-60',
    name: 'Twin Pavilion Expo (Hall A & Hall B)',
    description: 'Two interconnected halls with a central connecting corridor, 60 stalls, food court, and VIP area.',
    previewHallsCount: 2,
    previewStallsCount: 60,
    layoutData: {
      canvasWidth: 1400,
      canvasHeight: 850,
      gridSize: 20,
      snapInterval: 1,
      halls: [
        {
          id: 'hall-a',
          name: 'Pavilion A (Engineering & Tech)',
          x: 40,
          y: 40,
          width: 620,
          height: 770,
          color: '#3b82f6',
        },
        {
          id: 'hall-b',
          name: 'Pavilion B (Industrial & Machinery)',
          x: 740,
          y: 40,
          width: 620,
          height: 770,
          color: '#8b5cf6',
        },
      ],
      facilities: [
        {
          id: 'fac-corridor',
          type: 'corridor',
          label: 'CENTRAL CONNECTING CORRIDOR',
          x: 660,
          y: 100,
          width: 80,
          height: 650,
          rotation: 0,
        },
        {
          id: 'fac-main-ent',
          type: 'entrance',
          label: 'MAIN LOBBY & RECEPTION',
          x: 550,
          y: 790,
          width: 300,
          height: 30,
        },
        {
          id: 'fac-dining',
          type: 'food-court',
          label: 'FOOD COURT & DINING PLAZA',
          x: 1080,
          y: 60,
          width: 260,
          height: 100,
        },
        {
          id: 'fac-vip',
          type: 'custom-zone',
          label: 'VIP & MEDIA LOUNGE',
          x: 60,
          y: 60,
          width: 220,
          height: 90,
        },
      ],
      annotations: [],
    },
    stalls: [
      // 30 Stalls in Hall A
      ...Array.from({ length: 30 }, (_, i) => {
        const row = Math.floor(i / 6);
        const col = i % 6;
        const num = i + 1;
        return {
          id: `stall-a-${num}`,
          stallNumber: `A-${num < 10 ? '0' + num : num}`,
          category: (i % 5 === 0 ? 'PREMIUM' : 'STANDARD') as any,
          price: i % 5 === 0 ? 75000 : 55000,
          areaSqFt: 100,
          width: 65,
          height: 65,
          xPosition: 80 + col * 90,
          yPosition: 190 + row * 110,
          status: 'AVAILABLE' as any,
        };
      }),
      // 30 Stalls in Hall B
      ...Array.from({ length: 30 }, (_, i) => {
        const row = Math.floor(i / 6);
        const col = i % 6;
        const num = i + 1;
        return {
          id: `stall-b-${num}`,
          stallNumber: `B-${num < 10 ? '0' + num : num}`,
          category: (i % 6 === 0 ? 'ISLAND' : 'STANDARD') as any,
          price: i % 6 === 0 ? 90000 : 55000,
          areaSqFt: 100,
          width: 65,
          height: 65,
          xPosition: 780 + col * 90,
          yPosition: 190 + row * 110,
          status: 'AVAILABLE' as any,
        };
      }),
    ],
  },
];
